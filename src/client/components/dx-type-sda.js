// dx-type-sda.js — DATEx2 <dx-type-sda> Web Component (Scroll-Driven / JIT Typewriter).
//
// SDA-domain typewriter: CSS sensor (animation-timeline: view()) triggers SDA keyframe,
// which fires animationstart → IO observes for JIT template unpack.
// Zero inline handlers — everything is wired in connectedCallback.
//
// exports: DxTypeSda
// used_by: src/client/index.js

import { DxTyping, unpackTemplate, prepareTemplateContent, isElementHidden, onTypewriterEnd } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

export class DxTypeSda extends DxTyping {
    connectedCallback() {
        if (this.isTyped) return;
        this._syncTimingAttributes();

        this.addEventListener('animationend', this._onAnimEnd);

        // When scrolled into view, Singleton IO unpacks template and triggers time-based typing animation
        observeIO(this, (el) => {
            if (isElementHidden(el)) return;
            removeFromIdleQueue(el);
            unpackTemplate(el);
            el.classList.add(DX_ANIM.TYPING);
        });

        // Background Pre-warm on Idle: ONLY inside <template>.content, NEVER in live DOM!
        if (this.querySelector(':scope > template')) {
            queueIdleUnpack(this, (el) => {
                prepareTemplateContent(el);
            });
        }
    }

    _onAnimEnd = (e) => {
        if (e.animationName === DX_ANIM.KF_TYPE_IN) {
            const target = e.target;
            if (target.classList?.contains('c-ui-num')) return;

            if (target.classList?.contains('last-char') || target.hasAttribute?.('last-char') || target.getAttribute?.('data-last') === 'true') {
                onTypewriterEnd(target, e);
            } else {
                if (!this._lastC) {
                    this._lastC = this.querySelector('dx-t [data-last="true"], dx-t .last-char, [data-last="true"], .last-char');
                    if (!this._lastC) {
                        const allC = this.querySelectorAll('dx-c:not(.c-ui-num)');
                        this._lastC = allC.length ? allC[allC.length - 1] : null;
                    }
                }
                if (this._lastC && target === this._lastC) {
                    onTypewriterEnd(target, e);
                }
            }
        }
    };

    disconnectedCallback() {
        this.removeEventListener('animationend', this._onAnimEnd);
    }
}

defCustomElement('dx-type-sda', DxTypeSda);
defCustomElement('ui-type-sda', DxTypeSda);
