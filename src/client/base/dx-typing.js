// dx-typing.js — DATEx2 Base Class & Lifecycle for Typewriter Components.
//
// exports: DxTyping, unpackTemplate, onTypewriterEnd, cleanupTypedDOM, ensureElementsUpToTarget, bootstrapTypewriterObserver
// used_by: src/client/components/dx-type.js, src/client/components/dx-type-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { observeIO, unobserveIO, queueIdleUnpack, removeFromIdleQueue, getIO, DX_ANIM } from './dx-scheduler.js';
import { generateRibbonHtml } from './dx-meter.js';

export function getTypewriterObserver(win) {
    return getIO(win);
}

// ─── Prepare template content strictly inside DocumentFragment (<template>.content) ─────
export function prepareTemplateContent(el) {
    if (!el) return false;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return false;

    const tpl = el.querySelector(':scope > template');
    if (!tpl || !tpl.content) return false;
    if (tpl._prepared) return true;
    // If <template> is empty (SSR compact mode), dynamically create <t> from <s-t>
    let tLayer = tpl.content.querySelector('t');
    if (!tLayer) {
        const st = el.querySelector(':scope > s-t');
        if (st) {
            const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
            if (doc) {
                tLayer = doc.createElement('t');
                tLayer.setAttribute('aria-hidden', 'true');
                const style = el.getAttribute('style') || '';
                const uMatch = style.match(/--u:([\d.]+)/);
                const speed = uMatch ? parseFloat(uMatch[1]) : 40;
                const charDur = Math.round(speed * 3.5);
                tLayer.setAttribute('style', `animation-duration:${charDur}ms`);
                tLayer.innerHTML = st.innerHTML;
                tpl.content.appendChild(tLayer);
            }
        }
    }

    if (tLayer) {
        const words = tLayer.querySelectorAll('w:not([data-ready])');
        if (words.length > 0) {
            const style = el.getAttribute('style') || '';
            const dMatch = style.match(/--d:([\d.]+)/);
            const bMatch = style.match(/--b:([\d.]+)/);
            const uMatch = style.match(/--u:([\d.]+)/);
            const delay = dMatch ? parseFloat(dMatch[1]) : 0;
            const offset = bMatch ? parseFloat(bMatch[1]) : 0;
            const speed = uMatch ? parseFloat(uMatch[1]) : 40;

            let charIdx = 0;
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                const cUiNum = w.querySelector('i.c-ui-num');
                if (cUiNum) {
                    const exactDelay = Math.round(delay + (offset + charIdx++) * speed);
                    cUiNum.style.animationDelay = `${exactDelay}ms`;
                    const odo = cUiNum.querySelector('dx-odometer, ui-odometer');
                    if (odo) {
                        odo.style.setProperty('--d', exactDelay);
                    }
                } else if (!w.querySelector('i')) {
                    const text = w.textContent || '';
                    if (text) {
                        const chars = text.match(/&[a-z0-9]+;|./gu) || [];
                        let inner = '';
                        for (let j = 0; j < chars.length; j++) {
                            const ch = chars[j];
                            const exactDelay = Math.round(delay + (offset + charIdx++) * speed);
                            const cClass = (ch === '·' || ch === '•') ? ' class="bullet-dot"' : '';
                            inner += `<i${cClass} style="animation-delay:${exactDelay}ms">${ch}</i>`;
                        }
                        w.innerHTML = inner;
                    }
                } else {
                    charIdx += w.querySelectorAll('i').length;
                }
                w.setAttribute('data-ready', 'true');
            }
        }

        // Populate drums for embedded meters in tLayer
        const odometers = tLayer.querySelectorAll('dx-odometer, ui-odometer');
        for (let i = 0; i < odometers.length; i++) {
            const odo = odometers[i];
            odo.classList.remove('data-static');
            if (!odo.querySelector('b')) {
                const val = odo.getAttribute('percent') || odo.getAttribute('value') || odo.textContent.trim();
                const numVal = parseFloat(val) || 0;
                const type = odo.getAttribute('type') || 'int';
                const comma = odo.getAttribute('comma') || ',';
                const prefix = odo.getAttribute('prefix') || '';
                const suffix = odo.getAttribute('suffix') || '';
                const start = odo.getAttribute('start') || null;
                odo.innerHTML = generateRibbonHtml(numVal, type, comma, prefix, suffix, start);
            }
        }

        // Guarantee data-last="true" and last-char class on the final <i>
        const allI = tLayer.querySelectorAll('i');
        if (allI.length > 0) {
            const lastI = allI[allI.length - 1];
            lastI.setAttribute('data-last', 'true');
            lastI.classList.add('last-char');
        }
    }
    return true;
}

// ─── Standalone unpackTemplate (mounts template.content into live DOM) ─────
export function unpackTemplate(el) {
    if (!el) return false;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return false;

    // If user prefers reduced motion, never unpack template into live DOM.
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.classList.add(DX_ANIM.TYPED);
        return false;
    }

    const tpl = el.querySelector(':scope > template');
    if (tpl && tpl.content) {
        prepareTemplateContent(el);
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

        // Deterministic cleanup timer for whenever a typewriter is unpacked
        const style = el.getAttribute('style') || '';
        const tMatch = style.match(/--t:([\d.]+)/);
        const dMatch = style.match(/--d:([\d.]+)/);
        const dur = (tMatch ? parseFloat(tMatch[1]) : 600) + (dMatch ? parseFloat(dMatch[1]) : 0) + 400;
        setTimeout(() => {
            if (!el.classList.contains(DX_ANIM.TYPED)) {
                if (typeof el.markTyped === 'function') el.markTyped();
                else cleanupTypedDOM(el);
            }
        }, Math.max(500, Math.min(dur, 2500)));

        return true;
    }
    return false;
}

export function isElementHidden(el) {
    if (!el) return true;
    if (!el.closest('summary') && el.closest('details:not([open])')) return true;
    const hiddenParent = el.closest('.hidden, [hidden], .favorite-product__button--saved');
    if (hiddenParent && !hiddenParent.closest('.favorite-product--saved')) return true;
    return false;
}

// ─── Observe element for JIT template unpack via Singleton IO & Idle Queue ───
export function observeTypewriter(el) {
    if (!el) return;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return;
    observeIO(el, (targetEl) => {
        if (isElementHidden(targetEl)) return;
        removeFromIdleQueue(targetEl);
        unpackTemplate(targetEl);
        targetEl.classList.add(DX_ANIM.TYPING);
    });
    queueIdleUnpack(el, (targetEl) => {
        prepareTemplateContent(targetEl);
    });
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
            const allC = parent.querySelectorAll('t i, t c, i, c, [data-last]');
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
        const charDone = !lastC || !!parent._charDone;

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
    if (!el?.querySelector || el.classList.contains(DX_ANIM.TYPED)) return;
    // If inside a closed <details> (and NOT in <summary>), do not observe for viewport intersection until opened!
    const closedDetails = !el.closest('summary') && el.closest('details:not([open])');
    if (closedDetails) return;

    if (el.querySelector(':scope > template')) {
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

    // When a <details> accordion opens, unpack & trigger nested typewriters
    document.addEventListener('toggle', (e) => {
        const details = e.target;
        if (details && details.tagName === 'DETAILS' && details.open) {
            details.querySelectorAll('dx-type-sda, dx-type').forEach(typeEl => {
                if (!typeEl.classList.contains(DX_ANIM.TYPED)) {
                    unpackTemplate(typeEl);
                    typeEl.classList.add(DX_ANIM.TYPING);
                }
            });
            details.querySelectorAll('dx-counter, dx-number').forEach(child => {
                if (typeof child._checkAndTrigger === 'function') {
                    child._inViewport = true;
                    child._parentReady = true;
                    child._checkAndTrigger();
                }
            });
        }
    }, true);
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
