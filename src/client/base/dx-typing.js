// dx-typing.js — DATEx2 Base Class & Lifecycle for Typewriter Components.
//
// exports: DxTyping, unpackTemplate, onTypewriterEnd, cleanupTypedDOM, ensureElementsUpToTarget, bootstrapTypewriterObserver
// used_by: src/client/components/dx-type.js, src/client/components/dx-type-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { observeIO, getIO, DX_ANIM } from './dx-scheduler.js';

export function getTypewriterObserver(win) {
    return getIO(win);
}

// ─── Standalone unpackTemplate (for elements that aren't dx-* instances) ─────
export function unpackTemplate(el) {
    if (!el) return false;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return false;
    const tpl = el.querySelector(':scope > template');
    if (tpl && tpl.content) {
        if (!el.getAttribute('role')) el.setAttribute('role', 'text');
        const st = el.querySelector(':scope > s-t');
        if (st) {
            if (!el.getAttribute('aria-label')) {
                const raw = (st.textContent || '').replace(/\s+/g, ' ').trim();
                if (raw) el.setAttribute('aria-label', raw);
            }
        }
        tpl.replaceWith(tpl.content);
        const t = el.querySelector(':scope > t');
        if (t) t.setAttribute('aria-hidden', 'true');
        el.classList.add(DX_ANIM.TYPING);

        // Deterministic Safety Fallback: guarantee cleanup if animationend is dropped (e.g. fast scroll)
        if (!el._safetyTimer && typeof setTimeout === 'function') {
            const delay = parseFloat(el.style?.getPropertyValue('--d')) || parseFloat(el.getAttribute?.('delay') || el.getAttribute?.('d')) || 0;
            const duration = parseFloat(el.style?.getPropertyValue('--t')) || parseFloat(el.getAttribute?.('duration') || el.getAttribute?.('t')) || 580;
            const hasEmbeds = !!el.querySelector('dx-odometer, ui-odometer, dx-number, ui-number, .tw-embed');
            const maxDuration = hasEmbeds ? duration + 1600 : duration;
            const safetyDur = delay + maxDuration + 5000; // 5s true fallback, rely on events
            const startTs = Date.now();
            el._safetyTimer = setTimeout(() => {
                el._safetyTimer = null;
                // Guard against synchronous test mock timers (e.g. win.setTimeout = fn => fn())
                if (Date.now() - startTs < safetyDur - 50) return;
                if (!el.classList.contains(DX_ANIM.TYPED)) {
                    if (typeof el.markTyped === 'function') {
                        el.markTyped();
                    } else {
                        DxTyping.prototype.markTyped.call(el);
                    }
                }
            }, safetyDur);
        }

        return true;
    }
    return false;
}

// ─── Observe element for JIT template unpack via Singleton IO ────────────────
export function observeTypewriter(el) {
    if (!el) return;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return;
    observeIO(el, unpackTemplate);
}

// ─── Mount guard: only triggers on correct animation name ────────────────────
export function mountTypewriter(el, e) {
    if (e && e.animationName && e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
    if (!el) return;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return;
    observeTypewriter(el);
}

// ─── Ensure all elements up to and including a target are unpacked ────────────
export function ensureElementsUpToTarget(target) {
    if (!target) return;
    const doc = target.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    // Query both old class-based and new tag-based selectors for backward compat
    const elements = doc.querySelectorAll('dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda');

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;

        const isTargetOrBefore = (el === target) ||
            (target.contains && target.contains(el)) ||
            !!(target.compareDocumentPosition && (target.compareDocumentPosition(el) & 2));
        if (!isTargetOrBefore) continue;

        unpackTemplate(el);
    }
}

// ─── DOM Cleanup on Animation End (.TYPED transition) ────────────────────────
export function cleanupTypedDOM(typeEl) {
    if (!typeEl || typeEl._cleanedUp) return;
    typeEl._cleanedUp = true;

    if (typeEl._safetyTimer) {
        clearTimeout(typeEl._safetyTimer);
        typeEl._safetyTimer = null;
    }

    const doc = typeEl.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    // 1. Remove raw template wrappers if any remain
    const directTpl = typeEl.querySelector(':scope > template');
    if (directTpl) directTpl.remove();

    // 2. Remove <t> layer completely so that all <w>, <c>, etc. fly away from DOM, leaving only <s-t>
    const tLayer = typeEl.querySelector(':scope > t, t');
    if (tLayer) {
        tLayer.remove();
    }

    // 3. Guarantee that all child meters inside <s-t> are marked static and have their static HTML populated
    const stMeters = typeEl.querySelectorAll ? typeEl.querySelectorAll('s-t dx-odometer, s-t ui-odometer, s-t dx-number, s-t ui-number') : [];
    for (let i = 0; i < stMeters.length; i++) {
        const m = stMeters[i];
        if (typeof m.makeStatic === 'function') m.makeStatic();
        if (typeof m.getStaticHTML === 'function' && !m.textContent.trim()) {
            m.innerHTML = m.getStaticHTML();
        }
    }

    typeEl.removeAttribute('aria-label');
}

// ─── onTypewriterEnd — called when last <c> finishes animating or odometer completes ───
export function onTypewriterEnd(cEl, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.animationName === DX_ANIM.KF_PLAY_TOGGLE) return false;
        if (event.animationName === DX_ANIM.KF_TYPE_SDA) return false;
    }
    if (!cEl) return false;

    // Find parent: support both dx-* tags and legacy class-based selectors
    const parent = cEl.closest('dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda');
    if (parent) {
        if (parent.classList.contains(DX_ANIM.TYPED)) return false;
        if (parent.querySelector(':scope > template')) return false;

        const isEmbed = cEl.tagName === 'DX-ODOMETER' || cEl.tagName === 'UI-ODOMETER' ||
                        cEl.tagName === 'DX-NUMBER' || cEl.tagName === 'UI-NUMBER';

        if (!parent._lastC) {
            const allC = parent.querySelectorAll('t c, c');
            parent._lastC = allC.length ? allC[allC.length - 1] : null;
        }
        const lastC = parent._lastC;

        const isLastChar = !isEmbed && ((cEl === lastC) || (cEl.getAttribute?.('data-last') === 'true') || (cEl.classList?.contains('last-char')) || (lastC && (cEl.contains(lastC) || lastC.contains(cEl))));

        if (!isLastChar && !isEmbed) return false;

        if (isLastChar) {
            parent._charDone = true;
        }
        if (isEmbed) {
            cEl._animDone = true;
        }

        // Query all embedded meters in parent active <t> layer
        const tLayer = parent.querySelector(':scope > t, t') || parent;
        const embeds = Array.from(tLayer.querySelectorAll('dx-odometer, ui-odometer, dx-number, ui-number'));
        const allEmbedsDone = embeds.length === 0 || embeds.every(e => e._animDone || e.isStatic || e.classList.contains('data-static'));
        const charDone = !!parent._charDone;

        // ONLY mark parent as typed when BOTH last char is done AND all embedded meters have finished!
        if (charDone && allEmbedsDone) {
            if (typeof parent.markTyped === 'function') {
                parent.markTyped();
            } else {
                DxTyping.prototype.markTyped.call(parent);
            }
        }
    }
    return false;
}

// ─── Base Class DxTyping ─────────────────────────────────────────────────────
export class DxTyping extends DxBase {
    static get observedAttributes() {
        return ['delay', 'd', 'duration', 't'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        this._syncTimingAttributes();
    }

    _syncTimingAttributes() {
        const delay = this.getAttribute('delay') ?? this.getAttribute('d');
        if (delay !== null) {
            this.style.setProperty('--d', String(parseInt(delay, 10) || 0));
        }
        const duration = this.getAttribute('duration') ?? this.getAttribute('t');
        if (duration !== null) {
            this.style.setProperty('--t', String(parseInt(duration, 10) || 0));
        }
    }

    get isTyped() {
        return this.classList.contains(DX_ANIM.TYPED);
    }

    unpackTemplate() {
        return unpackTemplate(this);
    }

    markTyped() {
        if (this.querySelector(':scope > template')) return; // NEVER mark typed if template is still in DOM!
        if (this._safetyTimer) {
            clearTimeout(this._safetyTimer);
            this._safetyTimer = null;
        }
        if (this.cls) {
            this.cls({ [DX_ANIM.TYPING]: 0, [DX_ANIM.TYPED]: 1 });
        } else {
            this.classList.remove(DX_ANIM.TYPING);
            this.classList.add(DX_ANIM.TYPED);
        }
        if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
            rootWin.__datex2TriggerPendingUiNumbers(this);
        }
        cleanupTypedDOM(this);
    }
}

const checkAndObserve = (el) => {
    if (el?.querySelector && el.querySelector(':scope > template') && !el.classList.contains(DX_ANIM.TYPED)) {
        observeTypewriter(el);
    }
};

// ─── Auto-Bootstrap at DOM Ready ─────────────────────────────────────────────
export function bootstrapTypewriterObserver(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root) return;
    const elements = root.querySelectorAll('dx-type-sda, dx-reveal-sda, dx-type, .type-sda, ui-type-sda, .type, .TYPE');
    for (let i = 0; i < elements.length; i++) {
        checkAndObserve(elements[i]);
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bootstrapTypewriterObserver(), { once: true });
    } else {
        bootstrapTypewriterObserver();
    }
}

// ─── Global Exports ──────────────────────────────────────────────────────────
if (rootWin) {
    Object.assign(rootWin, {
        DxTyping, UiTyping: DxTyping, unpackTemplate, mountTypewriter,
        observeTypewriter, ensureElementsUpToTarget, onTypewriterEnd,
        __twEnd: onTypewriterEnd, __datex2CleanupTypedDOM: cleanupTypedDOM,
        bootstrapTypewriterObserver
    });
}
