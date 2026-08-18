// dx-type-sda.js — DATEx2 <dx-type-sda> Web Component (Scroll-Driven / JIT Typewriter).
//
// SDA-domain typewriter: CSS sensor (animation-timeline: view()) triggers SDA keyframe,
// which fires animationstart → IO observes for JIT template unpack.
// Zero inline handlers — everything is wired in connectedCallback.
//
// exports: DxTypeSda
// used_by: src/client/index.js

import { DxTyping, observeTypewriter } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM } from '../base/dx-scheduler.js';

export class DxTypeSda extends DxTyping {
    connectedCallback() {
        if (this.isTyped) return;

        // Listen for the SDA sensor animationstart to trigger JIT unpack
        this.addEventListener('animationstart', this._onAnimStart, { passive: true });
        this.addEventListener('animationend', this._onAnimEnd);

        // Also observe immediately in case IO should pre-unpack
        observeTypewriter(this);
    }

    _onAnimStart = (e) => {
        if (e.target !== this) return;
        if (e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
        e.stopPropagation();
        observeTypewriter(this);
    };

    _onAnimEnd = (e) => {
        if (e.animationName === DX_ANIM.KF_TYPE_SDA || e.animationName === DX_ANIM.KF_TYPE_IN) {
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
        this.removeEventListener('animationstart', this._onAnimStart);
        this.removeEventListener('animationend', this._onAnimEnd);
    }
}

defCustomElement('dx-type-sda', DxTypeSda);
