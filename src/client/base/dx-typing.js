// dx-typing.js — DATEx2 Base Class & Lifecycle for Typewriter Components.
//
// exports: DxTyping, unpackTemplate, onTypewriterEnd, cleanupTypedDOM, ensureElementsUpToTarget, bootstrapTypewriterObserver
// used_by: src/client/components/dx-type.js, src/client/components/dx-type-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { observeIO, DX_ANIM } from './dx-scheduler.js';

// ─── Standalone unpackTemplate (for elements that aren't dx-* instances) ─────
export function unpackTemplate(el) {
    if (!el) return false;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return false;
    const tpl = el.querySelector(':scope > template');
    if (tpl && tpl.content) {
        el.replaceChildren(tpl.content);
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

    const doc = typeEl.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    const performCleanup = () => {
        // Remove s-t now that live DOM is unpacked and finalized
        const st = typeEl.querySelector(':scope > s-t');
        if (st) st.remove();

        const cleanChildren = (parent) => {
            const frag = doc.createDocumentFragment();
            const chs = parent?.childNodes;
            if (chs) {
                for (let i = 0; i < chs.length; i++) {
                    const cl = cleanNode(chs[i]);
                    if (cl) frag.appendChild(cl);
                }
            }
            return frag;
        };

        const cleanNode = (node) => {
            if (!node) return null;
            if (node.nodeType === 3) return node; // Text node
            if (node.nodeType === 1) {
                const tag = node.tagName;
                if (tag === 'UI-ODOMETER' || tag === 'DX-ODOMETER' ||
                    tag === 'UI-NUMBER' || tag === 'DX-NUMBER' ||
                    node.classList.contains('tw-embed')) {
                    return node;
                }
                if (tag === 'C') {
                    if (node.querySelector && node.querySelector('ui-odometer, dx-odometer, ui-number, dx-number, .tw-embed')) {
                        return cleanChildren(node);
                    }
                    return doc.createTextNode(node.textContent || '');
                }
                if (tag === 'W') {
                    if (node.classList.contains('word') || (node.textContent && node.textContent.includes('-'))) {
                        const span = doc.createElement('span');
                        span.className = 'word';
                        span.appendChild(cleanChildren(node));
                        if (typeof span.normalize === 'function') span.normalize();
                        return span;
                    }
                    return cleanChildren(node);
                }
                const clone = node.cloneNode(false);
                clone.appendChild(cleanChildren(node));
                if (typeof clone.normalize === 'function') clone.normalize();
                return clone;
            }
            return null;
        };

        const directTpl = typeEl.querySelector(':scope > template');
        if (directTpl) directTpl.remove();

        const tWrapper = typeEl.querySelector(':scope > t');
        if (tWrapper) {
            typeEl.replaceChildren(cleanChildren(tWrapper));
        } else if (typeEl.querySelector('c, w')) {
            typeEl.replaceChildren(cleanChildren(typeEl));
        }

        if (typeof typeEl.normalize === 'function') typeEl.normalize();
        typeEl.removeAttribute('aria-label');

        const deferFn = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout;
        deferFn(() => {
            typeEl.style.minHeight = '';
        });
    };

    performCleanup();
}

// ─── onTypewriterEnd — called when last <c> finishes animating ───────────────
export function onTypewriterEnd(cEl, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.animationName === DX_ANIM.KF_PLAY_TOGGLE) return false;
    }
    if (!cEl) return false;

    // Find parent: support both dx-* tags and legacy class-based selectors
    const parent = cEl.closest('dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda');
    if (parent) {
        if (parent.classList.contains(DX_ANIM.TYPED)) return false;

        const allC = parent.querySelectorAll('c');
        const lastC = allC.length ? allC[allC.length - 1] : null;
        const isLastChar = (cEl === lastC) || (lastC && (cEl.contains(lastC) || lastC.contains(cEl)));
        const isEmbed = cEl.classList.contains('tw-embed') || !!cEl.querySelector?.('.tw-embed');

        if (!isLastChar && !isEmbed) return false;

        parent._typed = (parent._typed || 0) + 1;
        if (parent._toType === undefined) {
            parent._toType = 1 + parent.querySelectorAll('ui-odometer.tw-embed, dx-odometer.tw-embed').length;
        }
        const toType = parent._toType;

        if (parent._typed >= toType) {
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
    get isTyped() {
        return this.classList.contains(DX_ANIM.TYPED);
    }

    markTyped() {
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
