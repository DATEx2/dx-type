// dx-reveal.js — DATEx2 <dx-reveal> Web Component (Direct / Hero Reveal).
//
// Hero-domain reveal, triggered by .type-ready ancestor, or standalone on scroll.
// Zero inline handlers.
//
// exports: DxReveal
// used_by: src/client/index.js

import { DxRevealing, finishReveal } from '../base/dx-revealing.js';
import { defCustomElement } from '../base/dx-base.js';
import { observeIO } from '../base/dx-scheduler.js';

export class DxReveal extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        if (!this.classList.contains('reveal')) {
            this.classList.add('reveal');
        }

        const typeReady = this.closest('.type-ready, dx-type-ready, ui-type-ready');
        if (!typeReady) {
            // Standalone <dx-reveal>: trigger on scroll via singleton IO
            observeIO(this, (el) => {
                el.classList.add('reveal-active');
                const tpl = el.querySelector(':scope > template');
                if (tpl && tpl.content) tpl.replaceWith(tpl.content);
            });
        }

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

defCustomElement('dx-reveal', DxReveal);
defCustomElement('ui-reveal', DxReveal);

