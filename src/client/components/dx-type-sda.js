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

        const hasTemplate = !!this.querySelector(':scope > template');
        const isSdaSupported = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');

        // When scrolled into view, IO unpacks template and triggers time-based typing animation
        if (hasTemplate || !isSdaSupported) {
            observeIO(this, (el) => {
                unpackTemplate(el);
                if (!isSdaSupported) {
                    el.classList.add(DX_ANIM.TYPING);
                }
            });
        }
    }

    _onAnimStart = (e) => {
        if (e.target !== this) return;
        if (e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
        e.stopPropagation();
        observeTypewriter(this);
    };

    _onAnimEnd = (e) => {
        if (e.animationName === DX_ANIM.KF_TYPE_SDA) return;
        if (e.animationName === DX_ANIM.KF_TYPE_IN) {
            const target = e.target;
            if (target.classList?.contains('last-char') || target.hasAttribute?.('last-char') || target.getAttribute?.('data-last') === 'true') {
                onTypewriterEnd(target, e);
            } else {
                if (!this._lastC) {
                    const allC = this.querySelectorAll('c');
                    this._lastC = allC.length ? allC[allC.length - 1] : null;
                }
                if (this._lastC && target === this._lastC) {
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
