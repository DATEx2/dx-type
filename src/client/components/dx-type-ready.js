// dx-type-ready.js — DATEx2 <dx-type-ready> Web Component (Typewriter readiness container).
//
// Container that gates the `.type-ready` state for Hero-domain typewriter children.
// display: contents ensures zero layout impact.
//
// exports: DxTypeReady
// used_by: src/client/index.js

import { DxBase, defCustomElement } from '../base/dx-base.js';

export class DxTypeReady extends DxBase {
    connectedCallback() {
        if (!this.classList.contains('type-ready')) {
            this.classList.add('type-ready');
        }
    }
}

defCustomElement('dx-type-ready', DxTypeReady);
