// dx-scheduler.js — DATEx2 Singleton Scheduler (IO, rAF Batcher, Constants).
//
// exports: getIO, observeIO, unobserveIO, registerRAF, unregisterRAF, DX_ANIM
// used_by: src/client/components/*.js

const rootWin = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null);

// ─── Constants ───────────────────────────────────────────────────────────────
export const DX_ANIM = Object.freeze({
    // Final-state classes (normalized to dx-* prefix)
    TYPED:        'dx-typed',
    TYPING:       'dx-typing',
    REVEALED:     'dx-revealed',
    REVEALING:    'dx-revealing',
    TYPE_GUARD:   'type-guard',
    REVEAL_GUARD: 'reveal-guard',

    // Keyframe names emitted by CSS
    KF_TYPE_SDA:      'dx-type-sda',
    KF_REVEAL_SDA:    'dx-reveal-sda',
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

// ─── Singleton IntersectionObserver (Zero-Reflow JIT Template Unpack & SDA) ──
let ioInstance = null;
const activeIoElements = new Map();
const ioCallbacks = new WeakMap();

let ioLookaheadInstance = null;
const ioLookaheadCallbacks = new WeakMap();

let _sdaTopGap = '0%';
let _sdaBottomGap = '-110px';

// ─── Scroll-Restoration IO Gating ───────────────────────────────────────────
// Pe paginile unde scroll-ul se restaurează asincron (pagini de produs DATEx2),
// reținem elementele în coadă și nu le atașăm la IntersectionObserver înainte ca
// restaurarea scroll-ului să fie finalizată, evitând evaluări IO premature la scrollY = 0
// și crearea de straturi GPU off-screen.
let isScrollGated = false;
const pendingIoQueue = new Set();
const pendingLookaheadQueue = new Set();

const isCheckoutOrCart = (typeof location !== 'undefined') && /(?:^|\/)(?:checkout|cart|account)(?:\/|$)/i.test(location.pathname || '');
const isProductPage = !isCheckoutOrCart && (typeof location !== 'undefined') && /^\/(?:[a-z]{2}\/)?products?\//i.test(location.pathname || '');
if (isProductPage && rootWin && !rootWin.__dxScrollRestored && !rootWin.__sdaReadyPerformanceTime && typeof rootWin.IntersectionObserver === 'function') {
    isScrollGated = true;
}

export function isScrollRestored() {
    return !isScrollGated;
}

export function flushScrollGate() {
    if (!isScrollGated && pendingIoQueue.size === 0 && pendingLookaheadQueue.size === 0) return;
    isScrollGated = false;
    if (rootWin) rootWin.__dxScrollRestored = true;

    // 1. Flush lookahead queue
    if (pendingLookaheadQueue.size > 0) {
        const lookaheadObs = getLookaheadIO();
        for (const el of pendingLookaheadQueue) {
            if (el && el.isConnected) {
                if (lookaheadObs) {
                    lookaheadObs.observe(el);
                } else {
                    const cb = ioLookaheadCallbacks.get(el);
                    if (cb) {
                        ioLookaheadCallbacks.delete(el);
                        cb(el);
                    }
                }
            }
        }
        pendingLookaheadQueue.clear();
    }

    // 2. Flush active IO queue
    if (pendingIoQueue.size > 0) {
        const obs = getIO();
        for (const el of pendingIoQueue) {
            if (el && el.isConnected) {
                if (obs) {
                    obs.observe(el);
                } else {
                    const cb = activeIoElements.get(el) || ioCallbacks.get(el);
                    activeIoElements.delete(el);
                    ioCallbacks.delete(el);
                    if (cb) {
                        try { cb(el); } catch (err) { console.error('[dx-type] IO callback error:', err); }
                    }
                }
            }
        }
        pendingIoQueue.clear();
    }
}

export function gateIOUntil(promise) {
    if (!promise || typeof promise.then !== 'function') return;
    isScrollGated = true;
    promise.then(() => {
        flushScrollGate();
    }).catch(err => {
        console.error('[dx-type] gateIOUntil promise rejected:', err);
        flushScrollGate();
    });
}

// Ascultăm automat evenimentele native emise la finalizarea restaurării scroll-ului
if (rootWin && typeof rootWin.addEventListener === 'function') {
    const onReady = () => {
        flushScrollGate();
    };
    rootWin.addEventListener('sda-ready', onReady, { once: true });
    rootWin.addEventListener('type-ready', onReady, { once: true });
}

export function formatMarginValue(v) {
    if (!v || v === '0' || v === '0%' || v === '0px' || v === 0) return '0px';
    if (typeof v === 'number') return `${v}px`;
    if (typeof v === 'string') return v.trim();
    return '0px';
}

export function setSdaGaps(top = '0%', bottom = '0%') {
    if (_sdaTopGap === top && _sdaBottomGap === bottom) return;
    _sdaTopGap = top;
    _sdaBottomGap = bottom;
    if (ioInstance) {
        ioInstance.disconnect();
        ioInstance = null;
        const obs = getIO();
        if (obs && activeIoElements.size > 0) {
            for (const [el] of activeIoElements.entries()) {
                if (el && el.isConnected) obs.observe(el);
            }
        }
    }
}

export function getSdaGaps() {
    const winTop = rootWin?.sdaTopGap ?? rootWin?.__dxTypeConfig?.sdaTopGap;
    const winBottom = rootWin?.sdaBottomGap ?? rootWin?.__dxTypeConfig?.sdaBottomGap;

    let defaultBottom = _sdaBottomGap;
    if (isCheckoutOrCart) {
        defaultBottom = '0px';
    } else if (winBottom === undefined && typeof rootWin !== 'undefined') {
        const isShort = (typeof rootWin.matchMedia === 'function')
            ? rootWin.matchMedia('(height < 500px)').matches
            : Boolean(rootWin?.innerHeight && rootWin.innerHeight < 500);
        if (isShort) {
            defaultBottom = '-40px';
        }
    }

    return {
        sdaTopGap: winTop !== undefined ? winTop : _sdaTopGap,
        sdaBottomGap: winBottom !== undefined ? winBottom : defaultBottom
    };
}

if (rootWin && typeof rootWin.matchMedia === 'function') {
    try {
        const mq = rootWin.matchMedia('(orientation: landscape) and (height < 500px)');
        const onLandscapeChange = () => {
            if (ioInstance) {
                ioInstance.disconnect();
                ioInstance = null;
                const obs = getIO();
                if (obs && activeIoElements.size > 0) {
                    for (const [el] of activeIoElements.entries()) {
                        if (el && el.isConnected) obs.observe(el);
                    }
                }
            }
        };
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', onLandscapeChange);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(onLandscapeChange);
        }
    } catch (_) {}
}

const _isJsdomEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

function ioLookaheadHandler(entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.isIntersecting) {
            const el = entry.target;
            if (ioLookaheadInstance) ioLookaheadInstance.unobserve(el);
            const cb = ioLookaheadCallbacks.get(el);
            if (cb) {
                ioLookaheadCallbacks.delete(el);
                cb(el);
            }
        }
    }
}

export function getLookaheadIO() {
    if (ioLookaheadInstance) return ioLookaheadInstance;
    const IO = rootWin?.IntersectionObserver;
    if (typeof IO === 'function') {
        ioLookaheadInstance = new IO(ioLookaheadHandler, {
            root: null,
            rootMargin: '500px 0px 500px 0px',
            threshold: 0
        });
    }
    return ioLookaheadInstance;
}

export function observeLookaheadIO(el, callback) {
    if (!el) return;
    ioLookaheadCallbacks.set(el, callback);
    if (isScrollGated) {
        pendingLookaheadQueue.add(el);
        return;
    }
    const obs = getLookaheadIO();
    if (obs) {
        obs.observe(el);
    } else {
        callback(el);
    }
}

export function unobserveLookaheadIO(el) {
    if (!el) return;
    pendingLookaheadQueue.delete(el);
    ioLookaheadCallbacks.delete(el);
    if (ioLookaheadInstance) ioLookaheadInstance.unobserve(el);
}

function ioHandler(entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.isIntersecting) {
            const el = entry.target;
            const cb = activeIoElements.get(el) || ioCallbacks.get(el);
            if (cb) {
                try {
                    const res = cb(el);
                    if (res !== false) {
                        unobserveIO(el);
                    }
                } catch (err) {
                    console.error('[dx-type] IO callback error:', err);
                    unobserveIO(el);
                }
            } else {
                unobserveIO(el);
            }
        }
    }
}

export function getIO() {
    if (ioInstance) return ioInstance;
    const IO = rootWin?.IntersectionObserver;
    if (typeof IO === 'function') {
        const gaps = getSdaGaps();
        const topMargin = formatMarginValue(gaps.sdaTopGap);
        const bottomMargin = formatMarginValue(gaps.sdaBottomGap);
        ioInstance = new IO(ioHandler, {
            root: null, // Visual Viewport (window)
            rootMargin: `${topMargin} 0px ${bottomMargin} 0px`,
            threshold: 0
        });
    }
    return ioInstance;
}

/**
 * Observe an element with the singleton IO. Calls `callback(el)` once when visible.
 * If IO is unavailable, calls `callback(el)` immediately (SSR / Node fallback).
 */
export function observeIO(el, callback) {
    if (!el) return;
    activeIoElements.set(el, callback);
    ioCallbacks.set(el, callback);
    if (isScrollGated) {
        pendingIoQueue.add(el);
        return;
    }
    const obs = getIO();
    if (obs) {
        obs.observe(el);
    } else {
        activeIoElements.delete(el);
        ioCallbacks.delete(el);
        try {
            callback(el);
        } catch (err) {
            console.error('[dx-type] IO callback error:', err);
        }
    }
}

export function unobserveIO(el) {
    if (!el) return;
    pendingIoQueue.delete(el);
    activeIoElements.delete(el);
    ioCallbacks.delete(el);
    if (ioInstance) ioInstance.unobserve(el);
}

// ─── Idle Unpack Queue (1 template per requestIdleCallback) ───────────────────
const idleQueue = [];
const idleQueueMap = new Map();
let isIdleScheduled = false;
let isPriorityScheduled = false;
let currentIdleHandle = null;

const scheduleIdle = (typeof window !== 'undefined' && window.requestIdleCallback)
    ? ((cb, timeout = 40) => window.requestIdleCallback(cb, { timeout }))
    : (cb => setTimeout(() => cb({ timeRemaining: () => 15, didTimeout: false }), 16));

function scheduleNextIdleSlice() {
    const hasPriorityHead = idleQueue.length > 0 && Boolean(idleQueue[0]?.priority);
    isIdleScheduled = true;
    isPriorityScheduled = hasPriorityHead;
    const baseTimeout = hasPriorityHead ? 16 : 40;
    currentIdleHandle = scheduleIdle(processNextIdle, baseTimeout);
}

function processNextIdle(deadline) {
    currentIdleHandle = null;
    isPriorityScheduled = false;
    let processed = 0;
    while (idleQueue.length > 0) {
        let item = null;
        while (idleQueue.length > 0) {
            const candidate = idleQueue.shift();
            if (candidate && !candidate.cancelled && candidate.el) {
                idleQueueMap.delete(candidate.el);
                item = candidate;
                break;
            }
        }
        if (!item) break;
        try {
            item.callback(item.el);
        } catch (e) {
            console.error('[dx-type] Idle unpack failed:', e);
        }
        processed++;
        const rem = deadline && typeof deadline.timeRemaining === 'function' ? deadline.timeRemaining() : 0;
        if (!item.priority && !deadline?.didTimeout && rem <= 2) break;
        const maxBatch = 1;
        if (processed >= maxBatch || (!item.priority && !deadline?.didTimeout && rem <= 4)) break;
    }
    if (idleQueue.length > 0) {
        scheduleNextIdleSlice();
    } else {
        isIdleScheduled = false;
    }
}

export function queueIdleUnpack(el, callback, priority = false) {
    if (!el) return;
    // Prevent duplicate entries in O(1); update callback if already queued
    const existing = idleQueueMap.get(el);
    if (existing && !existing.cancelled) {
        existing.callback = callback;
        if (priority && !existing.priority) {
            existing.cancelled = true;
            const promoted = { el, callback, cancelled: false, priority: true };
            idleQueueMap.set(el, promoted);
            idleQueue.unshift(promoted);
            if (isIdleScheduled && !isPriorityScheduled && currentIdleHandle !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(currentIdleHandle);
                scheduleNextIdleSlice();
            }
        }
        return;
    }
    const item = { el, callback, cancelled: false, priority: !!priority };
    idleQueueMap.set(el, item);
    if (priority) {
        idleQueue.unshift(item);
        if (isIdleScheduled && !isPriorityScheduled && currentIdleHandle !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(currentIdleHandle);
            scheduleNextIdleSlice();
            return;
        }
    } else {
        idleQueue.push(item);
    }
    if (!isIdleScheduled) {
        scheduleNextIdleSlice();
    }
}

export function removeFromIdleQueue(el) {
    if (!el) return;
    const existing = idleQueueMap.get(el);
    if (existing) {
        existing.cancelled = true;
        idleQueueMap.delete(el);
    }
}

// ─── Idle Cleanup Queue (1 cleanup per requestIdleCallback slot) ─────────────
const idleCleanupQueue = [];
const idleCleanupMap = new Map();
let isCleanupIdleScheduled = false;

function processNextIdleCleanup(deadline) {
    if (idleCleanupQueue.length === 0) {
        isCleanupIdleScheduled = false;
        return;
    }
    // When under pressure (didTimeout or busy frame), process strictly 1 item to avoid scroll frame jank.
    // When real idle time is available (> 3ms), process up to 4 items in a batch.
    const isUnderPressure = !deadline || deadline.didTimeout || deadline.timeRemaining() <= 3;
    const maxItems = isUnderPressure ? 1 : 4;
    let processed = 0;

    while (idleCleanupQueue.length > 0 && processed < maxItems) {
        const item = idleCleanupQueue.shift();
        if (item && !item.cancelled && item.el) {
            idleCleanupMap.delete(item.el);
            try {
                item.callback(item.el);
            } catch (e) {
                console.error('[dx-type] Idle cleanup failed:', e);
            }
            processed++;
        }
        if (deadline && !deadline.didTimeout && deadline.timeRemaining() <= 2) {
            break;
        }
    }

    if (idleCleanupQueue.length > 0) {
        scheduleIdle(processNextIdleCleanup);
    } else {
        isCleanupIdleScheduled = false;
    }
}

export function queueIdleCleanup(el, callback) {
    if (!el || idleCleanupMap.has(el)) return;
    const item = { el, callback, cancelled: false };
    idleCleanupMap.set(el, item);
    idleCleanupQueue.push(item);
    if (!isCleanupIdleScheduled) {
        isCleanupIdleScheduled = true;
        scheduleIdle(processNextIdleCleanup);
    }
}

export function flushIdleCleanup(el) {
    if (!el) return;
    const item = idleCleanupMap.get(el);
    if (item && !item.cancelled) {
        item.cancelled = true;
        idleCleanupMap.delete(el);
        try { item.callback(item.el); } catch (e) {}
    }
}

if (rootWin) {
    Object.assign(rootWin, {
        setSdaGaps,
        getSdaGaps
    });
}

// ─── Centralized rAF Batch Ticker ────────────────────────────────────────────
const activeAnimations = new Set();
const animEndListeners = new Set();
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

function notifyAnimEnd() {
    if (animEndListeners.size > 0) {
        const listeners = Array.from(animEndListeners);
        animEndListeners.clear();
        for (let i = 0; i < listeners.length; i++) {
            listeners[i]();
        }
    }
}

function tick(now) {
    if (activeAnimations.size === 0) {
        rafId = null;
        notifyAnimEnd();
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
        notifyAnimEnd();
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
    if (activeAnimations.size === 0) {
        if (rafId) {
            caf(rafId);
            rafId = null;
        }
        notifyAnimEnd();
    }
}

/**
 * Subscribe a callback to fire when all currently active rAF animations complete.
 */
export function onAllAnimationsEnd(callback) {
    if (typeof callback !== 'function') return;
    if (activeAnimations.size === 0) {
        callback();
        return;
    }
    animEndListeners.add(callback);
}

if (rootWin) {
    Object.assign(rootWin, {
        setSdaGaps,
        getSdaGaps,
        dxScheduler: {
            registerRAF,
            unregisterRAF,
            onAllAnimationsEnd,
            getActiveAnimationsCount: () => activeAnimations.size,
            gateIOUntil,
            flushScrollGate,
            isScrollRestored,
            isScrollGated: () => isScrollGated
        }
    });
}
