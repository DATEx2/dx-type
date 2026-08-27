// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, finishReveal } from '../base/dx-revealing.js';
import { unpackTemplate, prepareTemplateContent } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

const REVEAL_CONTAINER_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        this._syncTimingAttributes();

        this._triggerChildren = () => {
            this.querySelectorAll('dx-counter, dx-number, dx-type-sda, dx-type').forEach(child => {
                // If child is inside a closed details/accordion (and not in summary) or hidden button, DO NOT trigger it!
                const closedDetails = !child.closest('summary') && child.closest('details:not([open])');
                if (closedDetails && this.contains(closedDetails)) return;

                const hiddenParent = child.closest('.hidden, [hidden], .favorite-product__button--saved');
                if (hiddenParent && this.contains(hiddenParent) && !hiddenParent.closest('.favorite-product--saved')) return;

                if (typeof child._checkAndTrigger === 'function') {
                    if (child.closest(REVEAL_CONTAINER_SEL) === this) {
                        child._inViewport = true;
                        child._parentReady = true;
                        setTimeout(() => {
                            child._checkAndTrigger();
                        }, 100);
                    }
                }
                const tag = (child.tagName || '').toUpperCase();
                if (tag === 'DX-TYPE-SDA' || tag === 'DX-TYPE') {
                    if (!child.classList.contains(DX_ANIM.TYPED)) {
                        unpackTemplate(child);
                        child.classList.add(DX_ANIM.TYPING);
                    }
                }
            });
        };

        observeIO(this, (el) => {
            removeFromIdleQueue(el);
            unpackTemplate(el);
            el.classList.add(DX_ANIM.REVEALING);
            this._triggerChildren();
        });

        // Background Pre-warm on Idle: ONLY inside <template>.content, NEVER in live DOM!
        queueIdleUnpack(this, (el) => {
            prepareTemplateContent(el);
        });

        this.addEventListener('animationend', this._onAnimEnd);
    }

    _onAnimEnd = (e) => {
        if (e.target !== this) return;
        finishReveal(this, e);
        if (this.isRevealed) {
            this.removeEventListener('animationend', this._onAnimEnd);
        }
    };

    disconnectedCallback() {
        this.removeEventListener('animationend', this._onAnimEnd);
    }
}

defCustomElement('dx-reveal-sda', DxRevealSda);
defCustomElement('ui-reveal-sda', DxRevealSda);
