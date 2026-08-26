// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, finishReveal } from '../base/dx-revealing.js';
import { unpackTemplate } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { observeIO, DX_ANIM } from '../base/dx-scheduler.js';

const REVEAL_CONTAINER_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        this._syncTimingAttributes();

        this._triggerChildren = () => {
            this.querySelectorAll('dx-counter, dx-number').forEach(child => {
                if (typeof child._checkAndTrigger === 'function') {
                    if (child.closest(REVEAL_CONTAINER_SEL) === this) {
                        child._inViewport = true;
                        child._parentReady = true;
                        child._checkAndTrigger();
                    }
                }
            });
        };

        observeIO(this, (el) => {
            unpackTemplate(el);
            el.classList.add(DX_ANIM.REVEALING);
            this._triggerChildren();
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
