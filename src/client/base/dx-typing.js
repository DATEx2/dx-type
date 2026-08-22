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

    const label = typeEl.getAttribute('aria-label') || typeEl.tagName;
    console.log('[dx-type] 🧹 Running cleanupTypedDOM on:', label, typeEl);

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
    const stMeters = typeEl.querySelectorAll('s-t dx-odometer, s-t ui-odometer, s-t dx-number, s-t ui-number');
    for (let i = 0; i < stMeters.length; i++) {
        const m = stMeters[i];
        if (typeof m.makeStatic === 'function') m.makeStatic();
        if (typeof m.getStaticHTML === 'function') {
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
            console.log('[dx-type] 🔤 Last character animation completed for:', parent.getAttribute('aria-label') || parent.tagName, cEl);
        }
        if (isEmbed) {
            cEl._animDone = true;
            console.log('[dx-type] ⏱️ Embedded meter animation completed for:', cEl.getAttribute('aria-label') || cEl.textContent.trim(), cEl);
            console.trace('[dx-type] 🔍 Trace for embedded meter end:');
        }

        // Query all embedded meters in parent active <t> layer
        const tLayer = parent.querySelector(':scope > t, t') || parent;
        const embeds = Array.from(tLayer.querySelectorAll('dx-odometer, ui-odometer, dx-number, ui-number'));
        const allEmbedsDone = embeds.length === 0 || embeds.every(e => e._animDone || e.isStatic || e.getAttribute('data-static') === 'true');
        const charDone = !!parent._charDone;

        console.log('[dx-type] 🚦 Gate check for "' + (parent.getAttribute('aria-label') || parent.tagName) + '": charDone=' + charDone + ', allEmbedsDone=' + allEmbedsDone + ' (' + embeds.length + ' embeds)');

        // ONLY mark parent as typed when BOTH last char is done AND all embedded meters have finished!
        if (charDone && allEmbedsDone) {
            console.log('[dx-type] ✅ All conditions met! Marking typed and triggering cleanup for:', parent.getAttribute('aria-label') || parent.tagName);
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

// ─── Auto-Bootstrap at DOM Ready & Dynamic Insertions ────────────────────────
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

    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        const MATCH_SELECTOR = 'dx-type-sda, dx-reveal-sda, dx-type, .type-sda, ui-type-sda, .type, .TYPE';
        const mutObs = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const added = mutations[i].addedNodes;
                for (let j = 0; j < added.length; j++) {
                    const node = added[j];
                    if (node && node.nodeType === 1) {
                        if (node.matches && node.matches(MATCH_SELECTOR)) {
                            checkAndObserve(node);
                        }
                        if (node.querySelectorAll) {
                            const nested = node.querySelectorAll(MATCH_SELECTOR);
                            for (let k = 0; k < nested.length; k++) {
                                checkAndObserve(nested[k]);
                            }
                        }
                    }
                }
            }
        });
        mutObs.observe(document.documentElement, { childList: true, subtree: true });
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
