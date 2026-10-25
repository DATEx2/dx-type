// dx-revealing.js — DATEx2 Base Class & Lifecycle for Reveal Components.
//
// exports: DxRevealing, finishReveal, startReveal, REVEAL_CONTAINER_SEL, getNextStaggerDelay, resetStaggerTimeline
// used_by: src/client/components/dx-reveal.js, src/client/components/dx-reveal-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { DX_ANIM } from './dx-scheduler.js';

export const REVEAL_CONTAINER_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

// ─── Stagger Coordinator for .staggered elements ─────────────────────────────
let lastStaggerTime = 0;
const STAGGER_INITIAL_STEP_MS = 80;
const STAGGER_MIN_STEP_MS = 40;
const STAGGER_STEP_DECREMENT = 5;
const MAX_STAGGER_QUEUE_MS = 1200;

let currentStaggerStep = STAGGER_INITIAL_STEP_MS;

// Frame-budgeted queue for _triggerChildren on animationstart so clamped cards never unpack 1,700+ DOM nodes in a single frame
const pendingChildTriggers = [];
let childTriggerRaf = 0;
let triggersInCurrentFrame = 0;
let lastTriggerFrameTs = 0;
const MAX_TRIGGERS_PER_FRAME = 2;

function flushPendingChildTriggers() {
    childTriggerRaf = 0;
    triggersInCurrentFrame = 0;
    lastTriggerFrameTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let processed = 0;
    while (pendingChildTriggers.length > 0 && processed < MAX_TRIGGERS_PER_FRAME) {
        const fn = pendingChildTriggers.shift();
        if (fn) {
            fn();
            processed++;
            triggersInCurrentFrame++;
        }
    }
    if (pendingChildTriggers.length > 0 && typeof requestAnimationFrame === 'function') {
        childTriggerRaf = requestAnimationFrame(flushPendingChildTriggers);
    }
}

function scheduleChildTrigger(fn) {
    const isTestEnv = (typeof process !== 'undefined' && Boolean(process.versions?.node)) ||
        (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) ||
        /jsdom/i.test(rootWin?.navigator?.userAgent || '') ||
        typeof requestAnimationFrame !== 'function';
    if (isTestEnv) {
        fn();
        return;
    }
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastTriggerFrameTs > 12) {
        triggersInCurrentFrame = 0;
        lastTriggerFrameTs = now;
    }
    if (pendingChildTriggers.length === 0 && triggersInCurrentFrame < MAX_TRIGGERS_PER_FRAME) {
        triggersInCurrentFrame++;
        fn();
        return;
    }
    pendingChildTriggers.push(fn);
    if (!childTriggerRaf) {
        childTriggerRaf = requestAnimationFrame(flushPendingChildTriggers);
    }
}

export function getNextStaggerDelay(el) {
    if (!el || !el.classList || !el.classList.contains('staggered')) {
        return null;
    }
    const stepAttr = (typeof el.getAttribute === 'function') ? (el.getAttribute('data-stagger-step') || el.getAttribute('data-step')) : null;
    const customStep = stepAttr ? parseInt(stepAttr, 10) : null;
    const initialStep = (customStep && !isNaN(customStep)) ? customStep : ((rootWin && typeof rootWin.__dxStaggerStep === 'number') ? rootWin.__dxStaggerStep : STAGGER_INITIAL_STEP_MS);
    const defaultMinStep = (rootWin && typeof rootWin.__dxStaggerMinStep === 'number') ? rootWin.__dxStaggerMinStep : STAGGER_MIN_STEP_MS;
    const minStep = (customStep && !isNaN(customStep)) ? Math.min(defaultMinStep, customStep) : defaultMinStep;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    
    let scheduledTime;
    if (lastStaggerTime <= now) {
        // Queue is idle: first element starts immediately, step resets to initialStep
        scheduledTime = now;
        currentStaggerStep = initialStep;
        lastStaggerTime = now + currentStaggerStep;
    } else {
        // Queue is active: schedule at next slot, decrement step down to minStep
        scheduledTime = lastStaggerTime;
        currentStaggerStep = Math.max(minStep, currentStaggerStep - STAGGER_STEP_DECREMENT);
        lastStaggerTime += currentStaggerStep;
    }
    
    const maxQueueAttr = (typeof el.getAttribute === 'function') ? el.getAttribute('data-stagger-max') : null;
    const maxQueue = (maxQueueAttr && !isNaN(parseInt(maxQueueAttr, 10))) ? parseInt(maxQueueAttr, 10) : ((rootWin && typeof rootWin.__dxStaggerMax === 'number') ? rootWin.__dxStaggerMax : MAX_STAGGER_QUEUE_MS);

    // Clamp to avoid extreme queues if many elements arrive
    if (lastStaggerTime - now > maxQueue) {
        lastStaggerTime = now + maxQueue;
    }

    const baseDelayStr = el.getAttribute('delay') ?? el.getAttribute('d');
    const baseDelay = baseDelayStr !== null ? (parseInt(baseDelayStr, 10) || 0) : 0;

    return Math.max(0, Math.round(scheduledTime - now)) + baseDelay;
}

export function resetStaggerTimeline() {
    lastStaggerTime = 0;
    currentStaggerStep = STAGGER_INITIAL_STEP_MS;
}

// ─── finishReveal — called on animationend for reveal components ─────────────
export function finishReveal(el, e) {
    if (!el) return false;
    if (e && e.target && e.target !== el) return false;
    if (e && e.animationName &&
        e.animationName !== 'dx-reveal-sda' &&
        e.animationName !== 'reveal-sda' &&
        e.animationName !== 'reveal-in' &&
        e.animationName !== 'reveal-fade-in' &&
        e.animationName !== 'dx-checkout-diffuse' &&
        e.animationName !== 'dx-reveal-diffuse' &&
        e.animationName !== DX_ANIM.KF_REVEAL_IN &&
        e.animationName !== DX_ANIM.KF_REVEAL_SDA &&
        e.animationName !== DX_ANIM.KF_REVEAL_FADE) return false;
    if (typeof e?.stopPropagation === 'function') e.stopPropagation();

    el._animStarted = true;
    if (typeof el._triggerChildren === 'function') {
        el._triggerChildren();
    }

    if (typeof el.markRevealed === 'function') {
        el.markRevealed();
    } else {
        DxRevealing.prototype.markRevealed.call(el);
    }
    return true;
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

    el._animStarted = true;
    el.classList.add(DX_ANIM.REVEALING);
    if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
        rootWin.__datex2TriggerPendingUiNumbers(el);
    }
}

// ─── Base Class DxRevealing ──────────────────────────────────────────────────
export class DxRevealing extends DxBase {
    static get observedAttributes() {
        return ['delay', 'd', 'duration', 't', 'paused', 'cis', 'h'];
    }

    constructor() {
        super();
        this._inViewport = false;
        this._isRevealingStarted = false;
        this._animStarted = false;
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
        const cis = this.getAttribute('cis') ?? this.getAttribute('h');
        if (cis !== null) {
            this.style.setProperty('--dx-cis', cis);
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

        if (this.classList && this.classList.contains('staggered')) {
            const staggerDelay = getNextStaggerDelay(this);
            if (staggerDelay !== null && staggerDelay !== undefined) {
                this.style.setProperty('--d', String(staggerDelay));
            }
        }

        const delayStr = this.style?.getPropertyValue?.('--d') || this.getAttribute?.('delay') || this.getAttribute?.('d') || '0';
        const delayMs = Math.max(0, parseFloat(delayStr) || 0);

        if (delayMs === 0 || typeof AnimationEvent === 'undefined') {
            this._animStarted = true;
        }

        this.classList.add(DX_ANIM.REVEALING);

        if (typeof this._triggerChildren === 'function') {
            if (delayMs > 0 && typeof AnimationEvent !== 'undefined') {
                const onStart = (e) => {
                    if (e && e.target && e.target !== this) return;
                    if (e && e.animationName &&
                        e.animationName !== 'dx-diffuse-optics' &&
                        e.animationName !== 'dx-reveal-sda' &&
                        e.animationName !== 'reveal-sda' &&
                        e.animationName !== 'reveal-in' &&
                        e.animationName !== 'reveal-fade-in' &&
                        e.animationName !== 'dx-checkout-diffuse' &&
                        e.animationName !== 'dx-reveal-diffuse' &&
                        e.animationName !== DX_ANIM.KF_REVEAL_IN &&
                        e.animationName !== DX_ANIM.KF_REVEAL_SDA &&
                        e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
                    this.removeEventListener('animationstart', onStart);
                    this._animStarted = true;
                    this._triggerChildren();
                };
                this.addEventListener('animationstart', onStart);
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
        if (typeof this._triggerChildren === 'function') {
            this._triggerChildren();
        }
        this.classList.remove('reveal-sda', 'reveal', DX_ANIM.REVEALING);
        this.classList.add(DX_ANIM.REVEALED);

        if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
            rootWin.__datex2TriggerPendingUiNumbers(this);
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
        DxRevealing, UiRevealing: DxRevealing, finishReveal, startReveal, REVEAL_CONTAINER_SEL, getNextStaggerDelay, resetStaggerTimeline
    });
}
