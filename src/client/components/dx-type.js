import { DxTyping, onTypewriterEnd } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM } from '../base/dx-scheduler.js';

export class DxType extends DxTyping {
    connectedCallback() {
        this._syncTimingAttributes();
        if (!this.isTyped) {
            if (this.querySelector(':scope > template')) {
                this.unpackTemplate();
            }

            const lastChar = this.querySelector('dx-t [data-last="true"], dx-t .last-char, [data-last="true"], .last-char');
            if (lastChar && !lastChar._hasTwEnd) {
                lastChar._hasTwEnd = true;
                lastChar.addEventListener('animationend', (ev) => {
                    onTypewriterEnd(lastChar, ev);
                }, { once: true });
            }

        }
    }
}

defCustomElement('dx-type', DxType);
defCustomElement('ui-type', DxType);

