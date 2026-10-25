// dx-type-sda.js — DATEx2 <dx-type-sda> Web Component (Scroll-Driven / JIT Typewriter).
//
// SDA-domain typewriter: CSS sensor (animation-timeline: view()) triggers SDA keyframe,
// which fires animationstart → IO observes for JIT template unpack.
// Zero inline handlers — everything is wired in connectedCallback.
//
// exports: DxTypeSda
// used_by: src/client/index.js

import { DxTyping, unpackTemplate, prepareTemplateContent, cleanupTypedDOM, isElementHidden, syncSectionHeaderTyping, SECTION_HEADER_SEL } from '../base/dx-typing.js';
import { defCustomElement, isReducedMotionActive, rootWin } from '../base/dx-base.js';
import { DX_ANIM, observeIO, unobserveIO, observeLookaheadIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue } from '../base/dx-scheduler.js';

const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

export class DxTypeSda extends DxTyping {
    connectedCallback() {
        this._isSdaConnected = true;
        if (this.isTyped) {
            cleanupTypedDOM(this);
            const secHeader = this.closest?.(SECTION_HEADER_SEL);
            if (secHeader) secHeader.classList.add(DX_ANIM.TYPED);
            return;
        }

        this._syncTimingAttributes();

        const inDrawer = this.closest?.('.spec-drawer, [role="dialog"].spec-drawer');
        if (inDrawer) {
            this._managedBySpecDrawer = true;
            return;
        }

        if (this.classList?.contains('es-review-part-2') || (typeof this.hasAttribute === 'function' && this.hasAttribute('data-manual'))) {
            this._manualControl = true;
            return;
        }

        const isHeader = !!this.closest?.(SECTION_HEADER_SEL);
        const parentRev = !isHeader ? this.closest?.(REVEAL_PARENT_SEL) : null;
        if (parentRev && !parentRev.isRevealed && !parentRev.classList.contains(DX_ANIM.REVEALED) && !parentRev.classList.contains(DX_ANIM.REVEALING) && !parentRev._inViewport) {
            this._managedByParentReveal = true;
            return;
        }

        this._observeSelf();
    }

    _observeSelf() {
        if (this._isObservedSelf || this.isTyped || this._manualControl || this.classList?.contains('es-review-part-2') || (typeof this.hasAttribute === 'function' && this.hasAttribute('data-manual'))) return;
        this._isObservedSelf = true;

        // 1. Preemptive JIT Lookahead Unpack (+500px or idle queue)
        if (this.querySelector(':scope > template') || this.querySelector(':scope > dx-s[w]')) {
            observeLookaheadIO(this, (el) => {
                if (isElementHidden(el)) return false;
                queueIdleUnpack(el, (t) => {
                    if (rootWin?.__dxHasScrolled) unpackTemplate(t);
                    else prepareTemplateContent(t);
                });
            });
            if (!isElementHidden(this)) {
                queueIdleUnpack(this, (el) => {
                    prepareTemplateContent(el);
                });
            }
        }

        // 2. Trigger Typing Animation (When crossing -110px threshold past actionbar/footer)
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
            const parentDelay = parentRev ? parseFloat(parentRev.style?.getPropertyValue('--d') || parentRev.getAttribute?.('delay') || parentRev.getAttribute?.('d') || 0) : 0;
            const ownDelay = parseFloat(el.style?.getPropertyValue('--d') || el.getAttribute?.('delay') || el.getAttribute?.('d') || 0);
            const parentIsPaused = !!(parentRev && (parentRev.isPaused || parentRev.classList?.contains('dx-paused') || parentRev.hasAttribute?.('paused')));
            const parentHasPendingDelay = parentRev && !parentRev.isRevealed && !parentRev.classList.contains(DX_ANIM.REVEALED) && !parentRev._animStarted && (
                parentIsPaused ||
                (typeof AnimationEvent !== 'undefined' && parentDelay > 0 && ownDelay < parentDelay) ||
                (!parentRev.classList.contains(DX_ANIM.REVEALING) && !(parentDelay > 0 && ownDelay >= parentDelay))
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

defCustomElement('dx-type-sda', DxTypeSda);
defCustomElement('ui-type-sda', DxTypeSda);
