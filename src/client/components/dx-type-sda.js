// dx-type-sda.js — DATEx2 <dx-type-sda> Web Component (Scroll-Driven / JIT Typewriter).
//
// SDA-domain typewriter: CSS sensor (animation-timeline: view()) triggers SDA keyframe,
// which fires animationstart → IO observes for JIT template unpack.
// Zero inline handlers — everything is wired in connectedCallback.
//
// exports: DxTypeSda
// used_by: src/client/index.js

import { DxTyping, unpackTemplate, onTypewriterEnd } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';

export class DxTypeSda extends DxTyping {
    connectedCallback() {
        if (this.isTyped) return;
        this._syncTimingAttributes();

        this.addEventListener('animationend', this._onAnimEnd);

        // When scrolled into view, IO unpacks template and triggers time-based typing animation
        observeIO(this, (el) => {
            unpackTemplate(el);
            el.classList.add('type-active');
        });
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
defCustomElement('ui-type-sda', DxTypeSda);
