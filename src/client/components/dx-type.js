// dx-type.js — DATEx2 <dx-type> Web Component (IO-Driven Typewriter).
//
// Unified with <dx-type-sda>: IntersectionObserver (IO) triggers typing animation.
// Zero dependency on .dx-type-ready ancestor — fully IO-driven.
// Zero inline handlers — everything is wired in connectedCallback.
//
// exports: DxType
// used_by: src/client/index.js

import { DxTyping, unpackTemplate, prepareTemplateContent, cleanupTypedDOM, isElementHidden, syncSectionHeaderTyping, SECTION_HEADER_SEL } from '../base/dx-typing.js';
import { defCustomElement, isReducedMotionActive } from '../base/dx-base.js';
import { DX_ANIM, observeIO, unobserveIO, observeLookaheadIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

export class DxType extends DxTyping {
    connectedCallback() {
        if (this.isTyped) {
            cleanupTypedDOM(this);
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

        // 2. Trigger Typing Animation via IO (same as dx-type-sda)
        observeIO(this, (el) => {
            if (el.isTyped || el.classList.contains(DX_ANIM.TYPED)) return;
            if (isElementHidden(el)) return false;
            el._inViewport = true;

            const triggerTyping = () => {
                if (el.isTyped || el.classList.contains(DX_ANIM.TYPED)) return;
                removeFromIdleQueue(el);
                unobserveLookaheadIO(el);

                if (isReducedMotionActive()) {
                    el.classList.add(DX_ANIM.TYPED);
                    cleanupTypedDOM(el);
                    syncSectionHeaderTyping(el);
                    return;
                }

                unpackTemplate(el); // Fast no-op if already unpacked by lookahead/idle
                el.classList.add(DX_ANIM.TYPING);
                syncSectionHeaderTyping(el);
            };

            const isHeader = !!el.closest?.(SECTION_HEADER_SEL);
            const parentRev = el.closest?.(REVEAL_PARENT_SEL);
            const parentHasPendingDelay = parentRev && !parentRev.isRevealed && !parentRev.classList.contains(DX_ANIM.REVEALED) && !parentRev._animStarted && (
                !parentRev.classList.contains(DX_ANIM.REVEALING) ||
                (typeof AnimationEvent !== 'undefined' && (parseFloat(parentRev.style?.getPropertyValue('--d') || parentRev.getAttribute?.('delay') || parentRev.getAttribute?.('d') || 0) > 0))
            );
            if (!isHeader && parentRev && parentHasPendingDelay) {
                // If parent reveal container hasn't started yet or is in its delay phase, wait for animationstart/animationend on parentRev itself
                const onParentStart = (e) => {
                    if (e && e.target && e.target !== parentRev) return;
                    parentRev.removeEventListener('animationstart', onParentStart);
                    parentRev.removeEventListener('animationend', onParentStart);
                    triggerTyping();
                };
                parentRev.addEventListener('animationstart', onParentStart);
                parentRev.addEventListener('animationend', onParentStart);
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

defCustomElement('dx-type', DxType);
defCustomElement('ui-type', DxType);
