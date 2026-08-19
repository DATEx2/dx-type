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
        if (!this._pristineHTML && typeof document !== 'undefined' && document.body?.classList?.contains('dx-type-record')) {
            this._pristineHTML = this.innerHTML;
        }
    }

    replay() {
        if (this._pristineHTML) {
            this.innerHTML = this._pristineHTML;
            const types = this.querySelectorAll('dx-type, dx-type-sda');
            for (const t of types) {
                if (typeof t.unpackTemplate === 'function') t.unpackTemplate();
            }
            return true;
        }
        return false;
    }
}

defCustomElement('dx-type-ready', DxTypeReady);
