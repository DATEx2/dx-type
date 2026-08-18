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

    const isSSR = typeEl.classList.contains(DX_ANIM.TYPE_GUARD) || typeEl.closest('.' + DX_ANIM.TYPE_GUARD) !== null;

    const performCleanup = () => {
        const st = typeEl.querySelector(':scope > s-t');
        if (st) {
            // Remove the temporary typewriter tree (<t> and <template>)
            const tWrapper = typeEl.querySelector(':scope > t, :scope > template');
            if (tWrapper) {
                tWrapper.remove();
            }
        } else {
            // Fallback for legacy / direct elements without <s-t>
            const cleanNode = (node) => {
                if (!node) return null;
                if (node.nodeType === 3) return node; // Text node
                if (node.nodeType === 1) {
                    // Keep Web Components and embedded numbers intact
                    const tag = node.tagName;
                    if (tag === 'UI-ODOMETER' || tag === 'DX-ODOMETER' ||
                        tag === 'UI-NUMBER' || tag === 'DX-NUMBER' ||
                        node.classList.contains('tw-embed')) {
                        return node;
                    }
                    // <c> node (character) -> unwrap its content
                    if (tag === 'C') {
                        if (node.querySelector && node.querySelector('ui-odometer, dx-odometer, ui-number, dx-number, .tw-embed')) {
                            const fragment = doc.createDocumentFragment();
                            Array.from(node.childNodes).forEach(ch => {
                                const cl = cleanNode(ch);
                                if (cl) fragment.appendChild(cl);
                            });
                            return fragment;
                        }
                        return doc.createTextNode(node.textContent || '');
                    }
                    // <w> node (word) -> if compound word, preserve as <span class="word">
                    if (tag === 'W') {
                        if (node.classList.contains('word') || (node.textContent && node.textContent.includes('-'))) {
                            const span = doc.createElement('span');
                            span.className = 'word';
                            Array.from(node.childNodes).forEach(ch => {
                                const cl = cleanNode(ch);
                                if (cl) span.appendChild(cl);
                            });
                            if (typeof span.normalize === 'function') span.normalize();
                            return span;
                        }
                        const fragment = doc.createDocumentFragment();
                        Array.from(node.childNodes).forEach(ch => {
                            const cl = cleanNode(ch);
                            if (cl) fragment.appendChild(cl);
                        });
                        return fragment;
                    }
                    // All other elements (<b>, <a>, <span>, <br>, <strong>, etc.)
                    // PRESERVE the element with its attributes, clean children recursively
                    const clone = node.cloneNode(false);
                    Array.from(node.childNodes).forEach(ch => {
                        const cl = cleanNode(ch);
                        if (cl) clone.appendChild(cl);
                    });
                    if (typeof clone.normalize === 'function') clone.normalize();
                    return clone;
                }
                return null;
            };

            const directTpl = typeEl.querySelector(':scope > template');
            const tWrapper = typeEl.querySelector(':scope > t, :scope > template > t');

            if (directTpl && tWrapper) {
                const childNodes = Array.from(tWrapper.childNodes);
                const fragment = doc.createDocumentFragment();
                childNodes.forEach(child => {
                    const cleaned = cleanNode(child);
                    if (cleaned) fragment.appendChild(cleaned);
                });
                typeEl.replaceChildren(fragment);
            } else if (tWrapper) {
                const childNodes = Array.from(tWrapper.childNodes);
                const fragment = doc.createDocumentFragment();
                childNodes.forEach(child => {
                    const cleaned = cleanNode(child);
                    if (cleaned) fragment.appendChild(cleaned);
                });
                if (typeof tWrapper.replaceWith === 'function') {
                    tWrapper.replaceWith(fragment);
                } else if (tWrapper.parentNode) {
                    tWrapper.parentNode.replaceChild(fragment, tWrapper);
                }
            } else if (typeEl.querySelector('c, w')) {
                const childNodes = Array.from(typeEl.childNodes);
                const fragment = doc.createDocumentFragment();
                childNodes.forEach(child => {
                    const cleaned = cleanNode(child);
                    if (cleaned) fragment.appendChild(cleaned);
                });
                typeEl.replaceChildren(fragment);
            }
        }

        if (typeof typeEl.normalize === 'function') typeEl.normalize();
        typeEl.removeAttribute('aria-label');

        const deferFn = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout;
        deferFn(() => {
            typeEl.style.minHeight = '';
        });
    };

    if (isSSR || typeEl.querySelector(':scope > s-t')) {
        performCleanup();
    } else {
        setTimeout(performCleanup, 50);
    }
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
        parent._typed = (parent._typed || 0) + 1;
        if (parent._toType === undefined) {
            parent._toType = 1 + parent.querySelectorAll('ui-odometer.tw-embed, dx-odometer.tw-embed').length;
        }
        const toType = parent._toType;

        if (parent._typed >= toType) {
            if (typeof parent.markTyped === 'function') {
                parent.markTyped();
            } else {
                if (parent.cls) {
                    parent.cls({ [DX_ANIM.TYPING]: 0, [DX_ANIM.TYPED]: 1 });
                } else {
                    parent.classList.remove(DX_ANIM.TYPING);
                    parent.classList.add(DX_ANIM.TYPED);
                }
                if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
                    rootWin.__datex2TriggerPendingUiNumbers(parent);
                }
                cleanupTypedDOM(parent);
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

// ─── Auto-Bootstrap at DOM Ready & Dynamic Insertions ────────────────────────
export function bootstrapTypewriterObserver(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root) return;
    // Support both dx-* tags and legacy class-based selectors
    const elements = root.querySelectorAll('dx-type-sda, dx-reveal-sda, .type-sda, ui-type-sda, .type, .TYPE');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el && el.querySelector && el.querySelector(':scope > template') && !el.classList.contains(DX_ANIM.TYPED)) {
            observeTypewriter(el);
        }
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bootstrapTypewriterObserver(), { once: true });
    } else {
        bootstrapTypewriterObserver();
    }

    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        const MATCH_SELECTOR = 'dx-type-sda, dx-reveal-sda, .type-sda, ui-type-sda, .type, .TYPE';
        const mutObs = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const added = mutations[i].addedNodes;
                for (let j = 0; j < added.length; j++) {
                    const node = added[j];
                    if (node && node.nodeType === 1) {
                        if (node.matches && node.matches(MATCH_SELECTOR)) {
                            if (node.querySelector && node.querySelector(':scope > template') && !node.classList.contains(DX_ANIM.TYPED)) {
                                observeTypewriter(node);
                            }
                        }
                        if (node.querySelectorAll) {
                            const nested = node.querySelectorAll(MATCH_SELECTOR);
                            for (let k = 0; k < nested.length; k++) {
                                const el = nested[k];
                                if (el.querySelector && el.querySelector(':scope > template') && !el.classList.contains(DX_ANIM.TYPED)) {
                                    observeTypewriter(el);
                                }
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
    rootWin.DxTyping = DxTyping;
    rootWin.UiTyping = DxTyping;  // backward compat alias
    rootWin.unpackTemplate = unpackTemplate;
    rootWin.mountTypewriter = mountTypewriter;
    rootWin.observeTypewriter = observeTypewriter;
    rootWin.ensureElementsUpToTarget = ensureElementsUpToTarget;
    rootWin.onTypewriterEnd = onTypewriterEnd;
    rootWin.__twEnd = onTypewriterEnd;
    rootWin.__datex2CleanupTypedDOM = cleanupTypedDOM;
    rootWin.bootstrapTypewriterObserver = bootstrapTypewriterObserver;
}
