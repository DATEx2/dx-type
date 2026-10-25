// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, finishReveal, REVEAL_CONTAINER_SEL } from '../base/dx-revealing.js';
import { unpackTemplate, prepareTemplateContent, cleanupTypedDOM, isElementHidden, syncSectionHeaderTyping } from '../base/dx-typing.js';
import { defCustomElement, isReducedMotionActive, rootWin } from '../base/dx-base.js';
import { DX_ANIM, observeIO, unobserveIO, observeLookaheadIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        let childrenTriggered = false;
        this._triggerChildren = () => {
            if (childrenTriggered) return;
            childrenTriggered = true;
            const isTestEnv = (typeof process !== 'undefined' && Boolean(process.versions?.node)) ||
                (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) ||
                /jsdom/i.test(rootWin?.navigator?.userAgent || '');
            const syncMode = isTestEnv || isReducedMotionActive() || this.isRevealed;
            const deferredTypeChildren = [];
            this.querySelectorAll('dx-counter, dx-number, dx-type, dx-type-sda').forEach(child => {
                // STRICT: DO NOT trigger children that belong to a deeper/nested reveal container!
                if (child.closest(REVEAL_CONTAINER_SEL) !== this) return;

                // If child is inside a closed details/accordion (and not in summary) or hidden button, DO NOT trigger it!
                const closedDetails = !child.closest('summary') && child.closest('details:not([open])');
                if (closedDetails && this.contains(closedDetails)) {
                    child._observeSelf?.();
                    return;
                }

                const hiddenParent = child.closest('.hidden, [hidden], .favorite-product__button--saved');
                if (hiddenParent && this.contains(hiddenParent) && !hiddenParent.closest('.favorite-product--saved')) {
                    child._observeSelf?.();
                    return;
                }
                if (child.classList?.contains('es-review-part-2') || (typeof child.hasAttribute === 'function' && child.hasAttribute('data-manual'))) {
                    return;
                }
                if (isElementHidden(child)) {
                    child._observeSelf?.();
                    return;
                }

                const tag = (child.tagName || '').toUpperCase();
                if (tag === 'DX-TYPE' || tag === 'DX-TYPE-SDA') {
                    if (!child.classList.contains(DX_ANIM.TYPED)) {
                        removeFromIdleQueue(child);
                        if (typeof child._checkAndTrigger === 'function') {
                            child._inViewport = true;
                            child._parentReady = true;
                            child._checkAndTrigger(true);
                        }
                        if (isReducedMotionActive() || this.isRevealed) {
                            child.classList.add(DX_ANIM.TYPED);
                            cleanupTypedDOM(child);
                            syncSectionHeaderTyping(child);
                        } else {
                            unpackTemplate(child);
                            child.classList.add(DX_ANIM.TYPING);
                            syncSectionHeaderTyping(child);
                        }
                    }
                    return;
                }

                if (typeof child._checkAndTrigger === 'function') {
                    child._inViewport = true;
                    child._parentReady = true;
                    child._checkAndTrigger(true);
                }
            });
        };

        if (this.isRevealed) {
            this._triggerChildren();
            return;
        }

        this._syncTimingAttributes();

        // 1. Trigger Reveal Animation (-110px threshold)
        observeIO(this, () => {
            if (isElementHidden(this)) return false;
            removeFromIdleQueue(this);
            unobserveLookaheadIO(this);
            this._inViewport = true;
            unpackTemplate(this);

            if (isReducedMotionActive()) {
                this.markRevealed();
                this._triggerChildren();
                return;
            }

            this._checkAndTrigger();
        });

        // 2. Preemptive Lookahead (+500px): unpack deferred <template> on reveal container and preemptively unpack child <dx-type-sda> into DOM (with opacity: 0, zero active animations)
        observeLookaheadIO(this, (el) => {
            if (isElementHidden(el)) return false;
            queueIdleUnpack(el, (t) => {
                if (rootWin?.__dxHasScrolled && t.querySelector?.(':scope > template')) {
                    unpackTemplate(t);
                } else {
                    prepareTemplateContent(t);
                }
            });
            if (!rootWin?.__dxHasScrolled) return;
            el.querySelectorAll?.('dx-type, dx-type-sda')?.forEach(child => {
                if (child.classList?.contains('es-review-part-2') || (typeof child.hasAttribute === 'function' && child.hasAttribute('data-manual'))) return;
                if (child.closest?.(REVEAL_CONTAINER_SEL) === el && !child.isTyped && !isElementHidden(child)) {
                    queueIdleUnpack(child, (c) => unpackTemplate(c), true);
                }
            });
        });

        // Background Pre-warm on Idle: ONLY inside <template>.content / off-DOM, NEVER in live DOM!
        if (this.querySelector?.(':scope > dx-s[w], :scope > template') && !isElementHidden(this)) {
            queueIdleUnpack(this, (el) => {
                prepareTemplateContent(el);
            });
        }
    }

    _startRevealing() {
        if (this._isRevealingStarted || this.isRevealed) return;
        this.addEventListener('animationend', this._onAnimEnd);
        this.addEventListener('animationcancel', this._onAnimEnd);
        super._startRevealing();
        if (!this._animStarted) {
            this.querySelectorAll?.('dx-type, dx-type-sda')?.forEach(child => {
                if (child.classList?.contains('es-review-part-2') || (typeof child.hasAttribute === 'function' && child.hasAttribute('data-manual'))) return;
                if (child.closest?.(REVEAL_CONTAINER_SEL) === this && !child.isTyped && !child._unpacked && !isElementHidden(child)) {
                    queueIdleUnpack(child, (c) => prepareTemplateContent(c), true);
                }
            });
        }
    }

    _onAnimEnd = (e) => {
        if (e.target !== this) return;
        if (e.type === 'animationcancel') {
            finishReveal(this, e);
            this.removeEventListener('animationend', this._onAnimEnd);
            this.removeEventListener('animationcancel', this._onAnimEnd);
            return;
        }
        if (finishReveal(this, e) || this.isRevealed) {
            this.removeEventListener('animationend', this._onAnimEnd);
            this.removeEventListener('animationcancel', this._onAnimEnd);
        }
    };

    disconnectedCallback() {
        super.disconnectedCallback?.();
        unobserveLookaheadIO(this);
        removeFromIdleQueue(this);
        this.removeEventListener('animationend', this._onAnimEnd);
        this.removeEventListener('animationcancel', this._onAnimEnd);
    }
}

defCustomElement('dx-reveal-sda', DxRevealSda);
defCustomElement('ui-reveal-sda', DxRevealSda);
