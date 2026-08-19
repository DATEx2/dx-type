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
import { observeIO } from '../base/dx-scheduler.js';

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        this._syncTimingAttributes();

        // When scrolled into view, trigger time-based reveal animation
        observeIO(this, (el) => {
            el.classList.add('reveal-active');
            const tpl = el.querySelector(':scope > template');
            if (tpl && tpl.content) tpl.replaceWith(tpl.content);
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
