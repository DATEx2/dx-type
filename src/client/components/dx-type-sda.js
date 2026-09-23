// dx-type-sda.js — DATEx2 <dx-type-sda> Web Component (Scroll-Driven / JIT Typewriter).
//
// SDA-domain typewriter: CSS sensor (animation-timeline: view()) triggers SDA keyframe,
// which fires animationstart → IO observes for JIT template unpack.
// Zero inline handlers — everything is wired in connectedCallback.
//
// exports: DxTypeSda
// used_by: src/client/index.js

import { DxTyping, unpackTemplate, prepareTemplateContent, isElementHidden, syncSectionHeaderTyping, SECTION_HEADER_SEL } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO, unobserveIO, observeLookaheadIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

export class DxTypeSda extends DxTyping {
    connectedCallback() {
        if (this.isTyped) {
            const secHeader = this.closest?.(SECTION_HEADER_SEL);
            if (secHeader) secHeader.classList.add(DX_ANIM.TYPED);
            return;
        }
        this._syncTimingAttributes();

        // 1. Preemptive JIT Lookahead Unpack (+500px or idle queue)
        if (this.querySelector(':scope > template') || this.querySelector(':scope > dx-s[w]')) {
            observeLookaheadIO(this, (el) => {
                removeFromIdleQueue(el);
                unpackTemplate(el);
            });
            queueIdleUnpack(this, (el) => {
                prepareTemplateContent(el);
            });
        }

        // 2. Trigger Typing Animation (When crossing -110px threshold past actionbar/footer)
        observeIO(this, (el) => {
            if (el.isTyped || el.classList.contains(DX_ANIM.TYPED)) return;
            if (isElementHidden(el)) return;
            el._inViewport = true;

            const triggerTyping = () => {
                if (el.isTyped || el.classList.contains(DX_ANIM.TYPED)) return;
                removeFromIdleQueue(el);
                unobserveLookaheadIO(el);
                unpackTemplate(el); // Fast no-op if already unpacked by lookahead/idle
                el.classList.add(DX_ANIM.TYPING);
                syncSectionHeaderTyping(el);
            };

            const isHeader = !!el.closest?.(SECTION_HEADER_SEL);
            const parentRev = el.closest?.(REVEAL_PARENT_SEL);
            if (!isHeader && parentRev && !parentRev.classList.contains(DX_ANIM.REVEALED) && !parentRev.classList.contains(DX_ANIM.REVEALING)) {
                // If parent reveal container hasn't started yet, wait for it to start revealing
                const onParentStart = () => {
                    parentRev.removeEventListener('animationstart', onParentStart);
                    triggerTyping();
                };
                parentRev.addEventListener('animationstart', onParentStart, { once: true });
                return;
            }

            triggerTyping();
        });
    }

    disconnectedCallback() {
        unobserveIO(this);
        unobserveLookaheadIO(this);
        removeFromIdleQueue(this);
    }
}

defCustomElement('dx-type-sda', DxTypeSda);
defCustomElement('ui-type-sda', DxTypeSda);
