// dx-type.js — DATEx2 <dx-type> Web Component (Direct / Hero Typewriter).
//
// Typewriter on document timeline, triggered by .type-ready ancestor.
// Zero inline handlers — connectedCallback attaches everything internally.
//
// exports: DxType
// used_by: src/client/index.js

import { DxTyping } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';

export class DxType extends DxTyping {
    connectedCallback() {
        // Mark self for Hero-domain CSS targeting (animation paused until .type-ready)
        if (!this.classList.contains('type')) {
            this.classList.add('type');
        }
    }
}

defCustomElement('dx-type', DxType);
