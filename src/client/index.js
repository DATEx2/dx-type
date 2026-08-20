// src/client/index.js — Barrel export for all dx-* client components.
//
// Usage: import { DxType, DxTypeSda, DxReveal, ... } from '@datex2/dx-type/client';

// Base classes & lifecycle functions
export { DxBase, rootWin } from './base/dx-base.js';
export { DX_ANIM, getIO, observeIO, unobserveIO, registerRAF, unregisterRAF, setSdaGaps, getSdaGaps } from './base/dx-scheduler.js';
export { DxTyping, unpackTemplate, observeTypewriter, mountTypewriter, ensureElementsUpToTarget, onTypewriterEnd, cleanupTypedDOM, bootstrapTypewriterObserver, getTypewriterObserver } from './base/dx-typing.js';
export { DxRevealing, finishReveal, startReveal } from './base/dx-revealing.js';
export { DxMeter, uiNum } from './base/dx-meter.js';

// Components (each self-registers its custom element on import)
export { DxType } from './components/dx-type.js';
export { DxTypeSda } from './components/dx-type-sda.js';
export { DxReveal } from './components/dx-reveal.js';
export { DxRevealSda } from './components/dx-reveal-sda.js';
export { DxTypeReady } from './components/dx-type-ready.js';
export { DxNumber } from './components/dx-number.js';
export { DxOdometer } from './components/dx-odometer.js';
