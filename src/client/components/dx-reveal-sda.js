// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, finishReveal, REVEAL_CONTAINER_SEL } from '../base/dx-revealing.js';
import { unpackTemplate, prepareTemplateContent, isElementHidden } from '../base/dx-typing.js';
import { defCustomElement, isReducedMotionActive } from '../base/dx-base.js';
import { DX_ANIM, observeIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;

        let childrenTriggered = false;
        this._triggerChildren = () => {
            if (childrenTriggered) return;
            childrenTriggered = true;
            this.querySelectorAll('dx-counter, dx-number, dx-type, dx-type-sda').forEach(child => {
                // If child is inside a closed details/accordion (and not in summary) or hidden button, DO NOT trigger it!
                const closedDetails = !child.closest('summary') && child.closest('details:not([open])');
                if (closedDetails && this.contains(closedDetails)) return;

                const hiddenParent = child.closest('.hidden, [hidden], .favorite-product__button--saved');
                if (hiddenParent && this.contains(hiddenParent) && !hiddenParent.closest('.favorite-product--saved')) return;

                // STRICT: DO NOT trigger children that belong to a deeper/nested reveal container!
                if (child.closest(REVEAL_CONTAINER_SEL) !== this) return;

                if (typeof child._checkAndTrigger === 'function') {
                    child._inViewport = true;
                    child._parentReady = true;
                    child._checkAndTrigger();
                }
                const tag = (child.tagName || '').toUpperCase();
                if (tag === 'DX-TYPE' || tag === 'DX-TYPE-SDA') {
                    if (!child.classList.contains(DX_ANIM.TYPED)) {
                        unpackTemplate(child);
                        child.classList.add(DX_ANIM.TYPING);
                    }
                }
            });
        };

        this._syncTimingAttributes();

        observeIO(this, () => {
            if (isElementHidden(this)) return false;
            removeFromIdleQueue(this);
            unpackTemplate(this);
            this._inViewport = true;

            if (isReducedMotionActive()) {
                this.markRevealed();
                this._triggerChildren();
                return;
            }

            this._checkAndTrigger();
        });

        // Background Pre-warm on Idle: ONLY inside <template>.content, NEVER in live DOM!
        queueIdleUnpack(this, (el) => {
            prepareTemplateContent(el);
        });
    }

    _startRevealing() {
        if (this._isRevealingStarted || this.isRevealed) return;
        this.addEventListener('animationend', this._onAnimEnd);
        this.addEventListener('animationcancel', this._onAnimEnd);
        super._startRevealing();
    }

    _onAnimEnd = (e) => {
        if (e.target !== this) return;
        finishReveal(this, e);
        this.removeEventListener('animationend', this._onAnimEnd);
        this.removeEventListener('animationcancel', this._onAnimEnd);
    };

    disconnectedCallback() {
        super.disconnectedCallback?.();
        this.removeEventListener('animationend', this._onAnimEnd);
        this.removeEventListener('animationcancel', this._onAnimEnd);
    }
}

defCustomElement('dx-reveal-sda', DxRevealSda);
defCustomElement('ui-reveal-sda', DxRevealSda);
