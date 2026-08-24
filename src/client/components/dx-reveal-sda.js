// dx-reveal-sda.js — DATEx2 <dx-reveal-sda> Web Component (Scroll-Driven Reveal).
//
// SDA-domain reveal: CSS sensor (animation-timeline: view()) triggers SDA keyframe.
// animationstart → REVEALING (360ms time-based) → animationend → REVEALED.
// Zero inline handlers — all listeners attached in connectedCallback.
//
// exports: DxRevealSda
// used_by: src/client/index.js

import { DxRevealing, finishReveal } from '../base/dx-revealing.js';
import { unpackTemplate } from '../base/dx-typing.js';
import { defCustomElement } from '../base/dx-base.js';
import { observeIO, DX_ANIM } from '../base/dx-scheduler.js';

function getCardInfo(el) {
    const section = el.closest('section, [id*="section"], [class*="-section"]') || el.parentElement;
    const sectionName = section ? (section.id || section.className?.split(' ')[0] || section.tagName) : 'unknown';
    const cardTitle = el.querySelector('h1, h2, h3, h4, h5, [class*="-title"], [class*="-value"], .text-3xl, strong, .card-title')?.textContent?.trim() || el.textContent?.trim()?.slice(0, 20) || '';
    const dVal = el.style?.getPropertyValue('--d') || el.getAttribute('data-d') || '0';
    return { sectionName, cardTitle, dVal };
}

export class DxRevealSda extends DxRevealing {
    connectedCallback() {
        if (this.isRevealed) return;
        this._syncTimingAttributes();

        this._ioTime = 0;

        observeIO(this, (el) => {
            el._ioTime = Math.round(performance.now());
            unpackTemplate(el);
            el.classList.add(DX_ANIM.REVEALING);
            const now = Math.round(performance.now());
            const info = getCardInfo(el);
            console.log(`[IO → REVEALING] Section: "${info.sectionName}" | Card: "${info.cardTitle}" | --d: ${info.dVal}ms | IO: ${el._ioTime}ms | revealing: +${now - el._ioTime}ms later`);
        });

        this.addEventListener('animationend', this._onAnimEnd);
    }

    _onAnimEnd = (e) => {
        if (e.target !== this) return;
        const now = Math.round(performance.now());
        const info = getCardInfo(this);
        const ioDiff = this._ioTime ? (now - this._ioTime) : 0;
        console.log(`[REVEALED] Section: "${info.sectionName}" | Card: "${info.cardTitle}" | --d: ${info.dVal}ms | IO: ${this._ioTime}ms | revealed: +${ioDiff}ms later`);
        finishReveal(this, e);
        if (this.isRevealed) {
            this.removeEventListener('animationend', this._onAnimEnd);
        }
    };

    disconnectedCallback() {
        this.removeEventListener('animationend', this._onAnimEnd);
    }
}

defCustomElement('dx-reveal-sda', DxRevealSda);
defCustomElement('ui-reveal-sda', DxRevealSda);
