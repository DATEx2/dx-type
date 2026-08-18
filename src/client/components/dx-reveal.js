// dx-reveal.js — DATEx2 <dx-reveal> Web Component (Direct / Hero Reveal).
//
// Hero-domain reveal, triggered by .type-ready ancestor.
// Zero inline handlers.
//
// exports: DxReveal
// used_by: src/client/index.js

import { DxRevealing } from '../base/dx-revealing.js';
import { defCustomElement } from '../base/dx-base.js';

export class DxReveal extends DxRevealing {
    connectedCallback() {
        if (!this.classList.contains('reveal')) {
            this.classList.add('reveal');
        }
    }
}

defCustomElement('dx-reveal', DxReveal);
