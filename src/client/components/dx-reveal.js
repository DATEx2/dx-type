// dx-reveal.js — DATEx2 <dx-reveal> Web Component (IO-Driven Reveal).
//
// Unified with <dx-reveal-sda>: IntersectionObserver (IO) triggers reveal animation.
// Zero dependency on .dx-type-ready ancestor — fully IO-driven.
// Zero inline handlers.
//
// exports: DxReveal
// used_by: src/client/index.js

import { DxRevealing, finishReveal, REVEAL_CONTAINER_SEL } from '../base/dx-revealing.js';
import { unpackTemplate, prepareTemplateContent } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

export class DxReveal extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        this._syncTimingAttributes();

        this._triggerChildren = () => {
            this.querySelectorAll('dx-counter, dx-number, dx-type').forEach(child => {
                const closedDetails = !child.closest('summary') && child.closest('details:not([open])');
                if (closedDetails && this.contains(closedDetails)) return;

                const hiddenParent = child.closest('.hidden, [hidden], .favorite-product__button--saved');
                if (hiddenParent && this.contains(hiddenParent) && !hiddenParent.closest('.favorite-product--saved')) return;

                if (child.closest(REVEAL_CONTAINER_SEL) !== this) return;

                if (typeof child._checkAndTrigger === 'function') {
                    child._inViewport = true;
                    child._parentReady = true;
                    child._checkAndTrigger();
                }
                const tag = (child.tagName || '').toUpperCase();
                if (tag === 'DX-TYPE') {
                    if (!child.classList.contains(DX_ANIM.TYPED)) {
                        unpackTemplate(child);
                        child.classList.add(DX_ANIM.TYPING);
                    }
                }
            });
        };

        // Always IO-driven (unified with dx-reveal-sda)
        observeIO(this, () => {
            removeFromIdleQueue(this);
            unpackTemplate(this);
            this._inViewport = true;
            this._checkAndTrigger();
        });

        // Background Pre-warm on Idle
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

defCustomElement('dx-reveal', DxReveal);
defCustomElement('ui-reveal', DxReveal);
