import { DxTyping, onTypewriterEnd } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM } from '../base/dx-scheduler.js';

export class DxType extends DxTyping {
    connectedCallback() {
        this._syncTimingAttributes();
        if (!this.isTyped) {
            this.unpackTemplate();
            this.addEventListener('animationend', this._onAnimEnd);
        }
    }

    _onAnimEnd = (e) => {
        if (e.animationName === DX_ANIM.KF_TYPE_IN || e.animationName === DX_ANIM.KF_TYPE_SDA) {
            const target = e.target;
            if (target.classList?.contains('last-char') || target.hasAttribute?.('last-char')) {
                onTypewriterEnd(target, e);
            } else {
                const allC = this.querySelectorAll('c');
                if (allC.length && target === allC[allC.length - 1]) {
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
