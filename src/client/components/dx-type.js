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
            this.addEventListener('animationend', this._onAnimEnd);
        }
    }

    _onAnimEnd = (e) => {
        if (e.animationName === DX_ANIM.KF_TYPE_IN || e.animationName === DX_ANIM.KF_TYPE_SDA) {
            const target = e.target;
            if (target.classList?.contains('last-char') || target.hasAttribute?.('last-char') || target.getAttribute?.('data-last') === 'true') {
                onTypewriterEnd(target, e);
            } else {
                if (!this._lastC) {
                    const allC = this.querySelectorAll('i, [data-last]');
                    this._lastC = allC.length ? allC[allC.length - 1] : null;
                }
                if (target === this._lastC) {
                    onTypewriterEnd(target, e);
                }
            }
        }
    };

    disconnectedCallback() {
        this.removeEventListener('animationend', this._onAnimEnd);
    }
}

defCustomElement('dx-type', DxType);
defCustomElement('ui-type', DxType);
