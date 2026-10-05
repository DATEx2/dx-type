// dx-revealing.js — DATEx2 Base Class & Lifecycle for Reveal Components.
//
// exports: DxRevealing, finishReveal, startReveal, REVEAL_CONTAINER_SEL
// used_by: src/client/components/dx-reveal.js, src/client/components/dx-reveal-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { DX_ANIM } from './dx-scheduler.js';

export const REVEAL_CONTAINER_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

// ─── finishReveal — called on animationend for reveal components ─────────────
export function finishReveal(el, e) {
    if (!el) return;
    if (e && e.target && e.target !== el) return;
    if (e && e.animationName &&
        e.animationName !== 'dx-reveal-sda' &&
        e.animationName !== 'reveal-sda' &&
        e.animationName !== 'reveal-in' &&
        e.animationName !== 'reveal-fade-in' &&
        e.animationName !== DX_ANIM.KF_REVEAL_IN &&
        e.animationName !== DX_ANIM.KF_REVEAL_SDA &&
        e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
    if (typeof e?.stopPropagation === 'function') e.stopPropagation();

    if (typeof el.markRevealed === 'function') {
        el.markRevealed();
    } else {
        DxRevealing.prototype.markRevealed.call(el);
    }
}

// ─── startReveal — called on animationstart for SDA sensor ───────────────────
export function startReveal(el, e) {
    if (!el || el.classList.contains(DX_ANIM.REVEALED) || el.classList.contains(DX_ANIM.REVEALING)) return;
    if (e && e.target && e.target !== el) return;
    if (e && e.animationName &&
        e.animationName !== 'dx-type-sda' &&
        e.animationName !== 'type-sda' &&
        e.animationName !== DX_ANIM.KF_TYPE_SDA &&
        e.animationName !== DX_ANIM.KF_SDA_SENSOR) return;
    if (typeof e?.stopPropagation === 'function') e.stopPropagation();

    el.classList.add(DX_ANIM.REVEALING);
    if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
        rootWin.__datex2TriggerPendingUiNumbers(el);
    }
}

// ─── Base Class DxRevealing ──────────────────────────────────────────────────
export class DxRevealing extends DxBase {
    static get observedAttributes() {
        return ['delay', 'd', 'duration', 't', 'paused'];
    }

    constructor() {
        super();
        this._inViewport = false;
        this._isRevealingStarted = false;
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        if (name === 'paused') {
            if (newVal === null) {
                this.resume();
            }
            return;
        }
        this._syncTimingAttributes();
    }

    _syncTimingAttributes() {
        const delay = this.getAttribute('delay') ?? this.getAttribute('d');
        if (delay !== null) {
            this.style.setProperty('--d', String(parseInt(delay, 10) || 0));
        }
        const duration = this.getAttribute('duration') ?? this.getAttribute('t');
        if (duration !== null) {
            this.style.setProperty('--t', String(parseInt(duration, 10) || 0));
        }
    }

    get isRevealed() {
        return this.classList.contains(DX_ANIM.REVEALED);
    }

    get isPaused() {
        return !!(this.classList?.contains('dx-paused') || (typeof this.hasAttribute === 'function' ? this.hasAttribute('paused') : (this.getAttribute?.('paused') != null)));
    }

    pause() {
        this.classList?.add('dx-paused');
    }

    resume() {
        this.classList?.remove('dx-paused');
        if (typeof this.removeAttribute === 'function') {
            this.removeAttribute('paused');
        }
        if (this._inViewport && !this._isRevealingStarted && !this.isRevealed) {
            this._checkAndTrigger();
        }
    }

    getParentReveal() {
        return this.parentElement?.closest(REVEAL_CONTAINER_SEL) || null;
    }

    _checkAndTrigger() {
        if (this._isRevealingStarted || this.isRevealed) return;
        if (!this._inViewport) return;
        if (this.isPaused) return;

        const parentReveal = this.getParentReveal();
        if (parentReveal && !parentReveal.classList.contains(DX_ANIM.REVEALED) && !parentReveal.isRevealed) {
            // Parent reveal is still hidden or currently animating; wait for parent animationend!
            return;
        }

        this._startRevealing();
    }

    _startRevealing() {
        if (this._isRevealingStarted || this.isRevealed) return;
        this._isRevealingStarted = true;
        this.classList.add(DX_ANIM.REVEALING);
        if (typeof this._triggerChildren === 'function') {
            const delayStr = this.style.getPropertyValue('--d') || this.getAttribute('delay') || this.getAttribute('d') || '0';
            const delayMs = Math.max(0, parseFloat(delayStr) || 0);
            if (delayMs > 0) {
                this._childTriggerTimer = setTimeout(() => {
                    this._childTriggerTimer = null;
                    if (this.isConnected && !this.isRevealed) {
                        this._triggerChildren();
                    }
                }, delayMs);
            } else {
                this._triggerChildren();
            }
        }
    }

    _triggerNestedReveals() {
        const nestedReveals = this.querySelectorAll(REVEAL_CONTAINER_SEL);
        for (let i = 0; i < nestedReveals.length; i++) {
            const nested = nestedReveals[i];
            if (nested.parentElement?.closest(REVEAL_CONTAINER_SEL) === this) {
                if (typeof nested._checkAndTrigger === 'function') {
                    nested._checkAndTrigger();
                } else if (nested._inViewport) {
                    nested.classList.add(DX_ANIM.REVEALING);
                }
            }
        }
    }

    markRevealed() {
        if (this._childTriggerTimer) {
            clearTimeout(this._childTriggerTimer);
            this._childTriggerTimer = null;
        }
        this.classList.remove('reveal-sda', 'reveal', DX_ANIM.REVEALING);
        this.classList.add(DX_ANIM.REVEALED);

        if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
            rootWin.__datex2TriggerPendingUiNumbers(this);
        }

        if (typeof this._triggerChildren === 'function') {
            this._triggerChildren();
        }

        this._triggerNestedReveals();
    }

    disconnectedCallback() {
        if (this._childTriggerTimer) {
            clearTimeout(this._childTriggerTimer);
            this._childTriggerTimer = null;
        }
    }
}

// ─── Global Exports ──────────────────────────────────────────────────────────
if (rootWin) {
    Object.assign(rootWin, {
        DxRevealing, UiRevealing: DxRevealing, finishReveal, startReveal, REVEAL_CONTAINER_SEL
    });
}
