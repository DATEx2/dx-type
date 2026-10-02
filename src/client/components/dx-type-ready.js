// dx-type-ready.js — DATEx2 <dx-type-ready> Web Component (Deprecated container).
//
// DEPRECATED: This component no longer gates typewriter readiness.
// All animation triggering is now IO-driven via dx-scheduler.js.
// Kept as display:contents container for backward compatibility with existing HTML.
//
// exports: DxTypeReady
// used_by: src/client/index.js

import { DxBase, defCustomElement } from '../base/dx-base.js';

export class DxTypeReady extends DxBase {
    connectedCallback() {
        // No-op: readiness gating moved to IO (dx-scheduler.js).
        // Element preserved as display:contents for backward compat.
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
