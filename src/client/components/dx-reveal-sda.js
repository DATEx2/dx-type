// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, startReveal, finishReveal } from '../base/dx-revealing.js';
import { observeTypewriter } from '../base/dx-typing.js';
import { rootWin } from '../base/dx-base.js';
import { DX_ANIM } from '../base/dx-scheduler.js';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;

        // If element has a <template>, observe for JIT unpack
        const tpl = this.querySelector(':scope > template');
        if (tpl) {
            observeTypewriter(this);
        }

        // Attach animation lifecycle listeners (replaces inline onanimationstart/onanimationend)
        this.addEventListener('animationstart', this._onAnimStart, { passive: true });
        this.addEventListener('animationend', this._onAnimEnd);
    }

    _onAnimStart = (e) => {
        if (e.target !== this) return;
        startReveal(this, e);
    };

    _onAnimEnd = (e) => {
        if (e.target !== this) return;
        finishReveal(this, e);
        // Self-cleanup: remove listeners after reveal is done
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

if (rootWin?.customElements && typeof rootWin.HTMLElement !== 'undefined') {
    if (!rootWin.customElements.get('dx-reveal-sda')) {
        rootWin.customElements.define('dx-reveal-sda', DxRevealSda);
    }
}
