// dx-scheduler.js — DATEx2 Singleton Scheduler (IO, rAF Batcher, Constants).
//
// exports: getIO, observeIO, unobserveIO, registerRAF, unregisterRAF, DX_ANIM
// used_by: src/client/components/*.js

const rootWin = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null);

// ─── Constants ───────────────────────────────────────────────────────────────
export const DX_ANIM = Object.freeze({
    // Final-state classes (uppercase = machine states, never in selectors as triggers)
    TYPED:     'TYPED',
    TYPING:    'TYPING',
    REVEALED:  'REVEALED',
    REVEALING: 'REVEALING',

    // SSR guard markers — prevent re-transpiling
    TYPE_GUARD:   'TYPE-',
    REVEAL_GUARD: 'REVEAL-',

    // Keyframe names emitted by CSS
    KF_TYPE_SDA:      'type-sda',
    KF_REVEAL_SDA:    'reveal-sda',
    KF_REVEAL_IN:     'reveal-in',
    KF_REVEAL_FADE:   'reveal-fade-in',
    KF_TYPE_IN:       'type-in',
    KF_SDA_SENSOR:    'sda-sensor',
    KF_PLAY_TOGGLE:   'play-toggle',
    KF_ODO_ROLL:      'odo-roll',
    KF_RUN_ODOMETER:  'run-odometer',

    // Durations (ms)
    REVEAL_DURATION: 360,
    TYPE_DURATION:   40,
});

// ─── Singleton IntersectionObserver (Zero-Reflow JIT Template Unpack) ────────
let ioInstance = null;
const ioCallbacks = new WeakMap();

function ioHandler(entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.isIntersecting) {
            const el = entry.target;
            if (ioInstance) ioInstance.unobserve(el);
            const cb = ioCallbacks.get(el);
            if (cb) {
                ioCallbacks.delete(el);
                cb(el);
            }
        }
    }
}

export function getIO() {
    if (ioInstance) return ioInstance;
    const IO = rootWin?.IntersectionObserver;
    if (typeof IO === 'function') {
        ioInstance = new IO(ioHandler, { rootMargin: '200px' });
    }
    return ioInstance;
}

/**
 * Observe an element with the singleton IO. Calls `callback(el)` once when visible.
 * If IO is unavailable, calls `callback(el)` immediately (SSR / Node fallback).
 */
export function observeIO(el, callback) {
    if (!el) return;
    const obs = getIO();
    if (obs) {
        ioCallbacks.set(el, callback);
        obs.observe(el);
    } else {
        callback(el);
    }
}

export function unobserveIO(el) {
    if (!el) return;
    ioCallbacks.delete(el);
    if (ioInstance) ioInstance.unobserve(el);
}

// ─── Centralized rAF Batch Ticker ────────────────────────────────────────────
const activeAnimations = new Set();
let rafId = null;

const raf = (typeof requestAnimationFrame !== 'undefined')
    ? requestAnimationFrame
    : ((typeof window !== 'undefined' && window.requestAnimationFrame)
        ? window.requestAnimationFrame.bind(window)
        : (cb => setTimeout(() => cb(Date.now()), 16)));

const caf = (typeof cancelAnimationFrame !== 'undefined')
    ? cancelAnimationFrame
    : ((typeof window !== 'undefined' && window.cancelAnimationFrame)
        ? window.cancelAnimationFrame.bind(window)
        : clearTimeout);

function tick(now) {
    if (activeAnimations.size === 0) {
        rafId = null;
        return;
    }
    const list = Array.from(activeAnimations);
    for (let i = 0; i < list.length; i++) {
        list[i]._stepAnimation(now);
    }
    if (activeAnimations.size > 0) {
        rafId = raf(tick);
    } else {
        rafId = null;
    }
}

/**
 * Register an element with a `_stepAnimation(now)` method to the global rAF loop.
 */
export function registerRAF(el) {
    activeAnimations.add(el);
    if (!rafId) {
        rafId = raf(tick);
    }
}

/**
 * Unregister an element from the global rAF loop.
 */
export function unregisterRAF(el) {
    activeAnimations.delete(el);
    if (activeAnimations.size === 0 && rafId) {
        caf(rafId);
        rafId = null;
    }
}
