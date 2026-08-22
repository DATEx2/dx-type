// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, finishReveal } from '../base/dx-revealing.js';
import { defCustomElement } from '../base/dx-base.js';
import { observeIO, DX_ANIM } from '../base/dx-scheduler.js';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        this._syncTimingAttributes();

        observeIO(this, (el) => {
            console.log(`[dx-reveal-sda:IO] <dx-reveal-sda> entered viewport at ${performance.now().toFixed(1)}ms`);
            el.unpackTemplate();
            el.classList.add(DX_ANIM.REVEALING);
        });

        this.addEventListener('animationstart', this._onAnimStart);
        this.addEventListener('animationend', this._onAnimEnd);
    }

    _onAnimStart = (e) => {
        if (e.target !== this) return;
        console.log(`[dx-reveal-sda:anim-start] <dx-reveal-sda> animationstart at ${performance.now().toFixed(1)}ms`);
    };

    _onAnimEnd = (e) => {
        if (e.target !== this) return;
        console.log(`[dx-reveal-sda:anim-end] <dx-reveal-sda> animationend at ${performance.now().toFixed(1)}ms`);
        finishReveal(this, e);
        if (this.isRevealed) {
            this.removeEventListener('animationstart', this._onAnimStart);
            this.removeEventListener('animationend', this._onAnimEnd);
        }
    };

    disconnectedCallback() {
        this.removeEventListener('animationstart', this._onAnimStart);
        this.removeEventListener('animationend', this._onAnimEnd);
    }
}

defCustomElement('dx-reveal-sda', DxRevealSda);
defCustomElement('ui-reveal-sda', DxRevealSda);
