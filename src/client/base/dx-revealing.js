// dx-revealing.js — DATEx2 Base Class & Lifecycle for Reveal Components.
//
// exports: DxRevealing, finishReveal, startReveal
// used_by: src/client/components/dx-reveal.js, src/client/components/dx-reveal-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { DX_ANIM } from './dx-scheduler.js';

// ─── finishReveal — called on animationend for reveal components ─────────────
export function finishReveal(el, e) {
    if (!el) return;
    if (e && e.target && e.target !== el) return;
    if (e && e.animationName &&
        e.animationName !== DX_ANIM.KF_REVEAL_IN &&
        e.animationName !== DX_ANIM.KF_REVEAL_SDA &&
        e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
    if (typeof e?.stopPropagation === 'function') e.stopPropagation();

    if (typeof el.markRevealed === 'function') {
        el.markRevealed();
    } else {
        el.classList.remove('reveal-sda', 'reveal', DX_ANIM.REVEALING);
        el.classList.add(DX_ANIM.REVEALED);

        if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
            rootWin.__datex2TriggerPendingUiNumbers(el);
        }
    }
}

// ─── startReveal — called on animationstart for SDA sensor ───────────────────
export function startReveal(el, e) {
    if (!el || el.classList.contains(DX_ANIM.REVEALED) || el.classList.contains(DX_ANIM.REVEALING)) return;
    if (e && e.target && e.target !== el) return;
    if (e && e.animationName &&
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
    get isRevealed() {
        return this.classList.contains(DX_ANIM.REVEALED);
    }

    markRevealed() {
        this.classList.remove('reveal-sda', 'reveal', DX_ANIM.REVEALING);
        this.classList.add(DX_ANIM.REVEALED);

        if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
            rootWin.__datex2TriggerPendingUiNumbers(this);
        }
    }
}

// ─── Global Exports ──────────────────────────────────────────────────────────
if (rootWin) {
    rootWin.DxRevealing = DxRevealing;
    rootWin.UiRevealing = DxRevealing;  // backward compat alias
    rootWin.finishReveal = finishReveal;
    rootWin.startReveal = startReveal;
}
