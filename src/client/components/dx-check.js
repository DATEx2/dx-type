// dx-check.js — DATEx2 <dx-check> Web Component (Vectorized Checklist Bullet).
//
// Custom Web Component representing a modern, pixel-perfect checkmark icon.
// Automatically integrated into typewriter <dx-s> / <dx-t> dual layers.
//
// exports: DxCheck
// used_by: src/client/index.js

import { DxBase, defCustomElement } from '../base/dx-base.js';

export class DxCheck extends DxBase {
    connectedCallback() {
        if (!this.getAttribute('aria-hidden')) {
            this.setAttribute('aria-hidden', 'true');
        }
    }
}

defCustomElement('dx-check', DxCheck);
