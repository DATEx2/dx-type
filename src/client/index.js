// src/client/index.js — Barrel export for all dx-* client components.
//
// Usage: import { DxType, DxTypeSda, DxReveal, ... } from '@datex2/dx-type/client';

// Base classes & lifecycle functions
export { DxBase, rootWin, isReducedMotionActive } from './base/dx-base.js';
export { DX_ANIM, getIO, observeIO, unobserveIO, getLookaheadIO, observeLookaheadIO, unobserveLookaheadIO, queueIdleUnpack, removeFromIdleQueue, queueIdleCleanup, flushIdleCleanup, registerRAF, unregisterRAF, onAllAnimationsEnd, setSdaGaps, getSdaGaps, gateIOUntil, flushScrollGate, isScrollRestored } from './base/dx-scheduler.js';
export { DxTyping, unpackTemplate, prepareTemplateContent, observeTypewriter, mountTypewriter, ensureElementsUpToTarget, onTypewriterEnd, cleanupTypedDOM, bootstrapTypewriterObserver, getTypewriterObserver, buildTypingLayer, HEX_LUT, syncSectionHeaderTyping, SECTION_HEADER_SEL, DX_CHAR_DURATION } from './base/dx-typing.js';
export { DxRevealing, finishReveal, startReveal, getNextStaggerDelay, resetStaggerTimeline } from './base/dx-revealing.js';
export { DxMeter, uiNum, formatNumber, generateRibbonHtml, generateDataO, expandOdometerDrums } from './base/dx-meter.js';

// Components (each self-registers its custom element on import)
export { DxType } from './components/dx-type.js';
export { DxTypeSda } from './components/dx-type-sda.js';
export { DxReveal } from './components/dx-reveal.js';
export { DxRevealSda } from './components/dx-reveal-sda.js';
export { DxTypeReady } from './components/dx-type-ready.js';
export { DxNumber } from './components/dx-number.js';
export { DxOdometer } from './components/dx-odometer.js';
export { DxCounter } from './components/dx-counter.js';
export { DxCheck } from './components/dx-check.js';

// Typewriter & Meter String Utilities
export { ssrDxType, ssrDxReveal, ssrDxOdometer, tokenize } from '../server/index.js';
