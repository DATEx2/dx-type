// dx-odometer.js — DATEx2 <dx-odometer> Web Component (Mechanical drum odometer).
//
// Read-only, one-time animation, self-cleanup after completion.
// Light DOM — SSR pre-renders <dx-d data-seq> digits, CSS animates via ::before + translateY GPU.
// Zero Shadow DOM, zero runtime DOM construction.
// Pure ES2026 — zero external dependencies.
//
// exports: DxOdometer
// used_by: src/client/index.js

import { DxMeter, expandOdometerDrums } from '../base/dx-meter.js';
import { rootWin, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';
import { onTypewriterEnd } from '../base/dx-typing.js';

const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda';

export class DxOdometer extends DxMeter {
    constructor() {
        super();
        this._animDone = false;
        this._animStarted = false;
        this._digitCount = 0;
        this._digitsDone = 0;
        this._twDelayId = null;
        this._fallbackTimer = null;
    }

    expandDrums() {
        expandOdometerDrums(this);
    }

    unpackDataO(dataO) {
        if (!dataO) return;
        const drums = dataO.split(',');
        let digitsHtml = '';
        for (let i = 0; i < drums.length; i++) {
            const seq = drums[i];
            const lastChar = seq.slice(-1) || '0';
            const finalPos = seq.length > 1 ? -((seq.length - 1) * 100) : 0;
            const expandedSeq = [...seq].join('\n');
            digitsHtml += `<dx-d data-seq="${expandedSeq}" style="--p:${finalPos}%">${lastChar}</dx-d>`;
        }
        let b = this.querySelector('b');
        if (!b) {
            b = document.createElement('b');
            const sfx = this.querySelector('.ui-sfx');
            if (sfx) this.insertBefore(b, sfx);
            else this.appendChild(b);
        }
        b.innerHTML = digitsHtml;
    }

    connectedCallback() {
        const dataO = this.getAttribute('data-o');
        if (dataO && !this.querySelector('dx-d') && !this.closest('dx-s, t-s') && !this.classList.contains('data-static')) {
            this.unpackDataO(dataO);
        }

        expandOdometerDrums(this);

        if (this._initialized) return;
        this._initialized = true;

        // Inside <dx-s> or <t-s> = static context, nothing to animate
        if (this.closest('dx-s, t-s')) {
            this.classList.add('data-static');
            return;
        }

        // Already static (SSR marked)
        if (this.classList.contains('data-static')) return;

        // Listen for animation completion on <dx-d>::before
        this.addEventListener('animationend', this._onAnimEnd);

        // Suppress animation events from bubbling to parent typewriter
        this.addEventListener('animationstart', (e) => {
            if (e?.stopPropagation) e.stopPropagation();
        }, { passive: true });

        const parentChar = typeof this.closest === 'function' ? this.closest(':is(dx-c, t-c, i, c)') : null;
        const parentReveal = typeof this.closest === 'function' ? this.closest(REVEAL_PARENT_SEL) : null;
        const parentType = typeof this.closest === 'function' ? this.closest(TYPE_PARENT_SEL) : null;

        if (parentChar) {
            if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains('typed') || parentType.hasAttribute('data-static'))) {
                this._animDone = true;
                this.makeStatic();
            } else {
                parentChar.addEventListener('animationstart', (e) => {
                    if (e.target === parentChar) {
                        let u = 40;
                        if (parentChar.style?.getPropertyValue('--u')) {
                            u = parseFloat(parentChar.style.getPropertyValue('--u'));
                        } else if (parentType?.style?.getPropertyValue('--u')) {
                            u = parseFloat(parentType.style.getPropertyValue('--u'));
                        } else {
                            const computedU = parseFloat(getComputedStyle(parentChar).getPropertyValue('--u'));
                            if (!isNaN(computedU) && computedU > 0) u = computedU;
                        }
                        if (isNaN(u) || u <= 0) u = 40;

                        this._twDelayId = setTimeout(() => {
                            this.startAnimation();
                        }, u * 0.35);
                    }
                }, { once: true });

                // Safety fallback for parentChar
                const charDelay = parseFloat(parentChar.style?.animationDelay) || parseFloat(this.style?.getPropertyValue('--d')) || 0;
                this._fallbackTimer = setTimeout(() => {
                    if (!this._animStarted && !this._animDone && this.isConnected) {
                        this.startAnimation();
                    }
                }, charDelay + 600);
            }
        } else if (parentReveal) {
            if (parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains('revealed') || parentReveal.classList.contains('revealing') || (parentReveal.hasAttribute && parentReveal.hasAttribute('data-static')))) {
                this.startAnimation();
            } else {
                const onParentAnim = () => {
                    this.startAnimation();
                };
                parentReveal.addEventListener('animationstart', onParentAnim, { once: true });
                parentReveal.addEventListener('transitionstart', onParentAnim, { once: true });
                parentReveal.addEventListener('animationend', onParentAnim, { once: true });
            }
        } else {
            const inFooter = this.closest('footer, .ins-tile--footer, #tile-footer-MNure7');
            if (!inFooter) {
                observeIO(this, () => {
                    const delay = parseFloat(this.style?.getPropertyValue('--d')) || parseFloat(this.getAttribute('delay')) || 0;
                    if (delay > 0) {
                        this._twDelayId = setTimeout(() => this.startAnimation(), delay);
                    } else {
                        this.startAnimation();
                    }
                });
            }
        }
    }

    startAnimation() {
        if (this._animStarted || this._animDone || this.classList.contains('data-static') || !this.isConnected) return;
        this._animStarted = true;
        if (this._fallbackTimer) {
            clearTimeout(this._fallbackTimer);
            this._fallbackTimer = null;
        }

        expandOdometerDrums(this);

        const digits = this.querySelectorAll('dx-d[data-seq]');
        this._digitCount = digits.length || this.querySelectorAll('.odometer-ribbon-inner').length || 1;

        if (this._digitCount === 0) {
            this._animDone = true;
            this.makeStatic();
            onTypewriterEnd(this);
            return;
        }

        this.classList.add(DX_ANIM.TYPING);

        // Safety timeout: ensure embedded meter always resolves so parent typewriter never hangs
        const maxDur = 1400 + (this._digitCount * 60) + 600;
        setTimeout(() => {
            if (!this._animDone && this.isConnected) {
                this._animDone = true;
                const twEmbed = this.classList.contains('tw-embed') || !!this.closest(TYPE_PARENT_SEL);
                if (!twEmbed) {
                    this.makeStatic();
                } else {
                    onTypewriterEnd(this);
                }
            }
        }, maxDur);
    }

    _onAnimEnd = (e) => {
        if (this._animDone) return;

        // Count animation ends from <dx-d> elements or legacy .odometer-ribbon-inner
        const target = e.target;
        if (!target || (target.tagName !== 'DX-D' && !target.classList?.contains('odometer-ribbon-inner'))) return;

        e.stopPropagation();

        if (!this._digitCount) {
            const dCount = this.querySelectorAll('dx-d[data-seq]').length;
            const spanCount = this.querySelectorAll('.odometer-ribbon-inner').length;
            this._digitCount = dCount || spanCount || 1;
        }

        this._digitsDone++;

        if (this._digitsDone >= this._digitCount) {
            this._animDone = true;
            const twEmbed = this.classList.contains('tw-embed') || !!this.closest(TYPE_PARENT_SEL);
            if (!twEmbed) {
                this.makeStatic();
            } else {
                onTypewriterEnd(this);
            }
        }
    };

    getStaticHTML() {
        const valAttr = this.getAttribute('percent') || this.getAttribute('value') || this.textContent;
        const numericValue = parseFloat(valAttr);
        if (isNaN(numericValue)) return this.textContent.trim();
        return this.formatValue(numericValue);
    }

    disconnectedCallback() {
        this.removeEventListener('animationend', this._onAnimEnd);
        if (this._twDelayId) {
            clearTimeout(this._twDelayId);
            this._twDelayId = null;
        }
        if (this._fallbackTimer) {
            clearTimeout(this._fallbackTimer);
            this._fallbackTimer = null;
        }
    }

    /** Read-only — throws if called with a new value. */
    val(newValue) {
        if (newValue === undefined) {
            return parseFloat(this.getAttribute('percent') || this.getAttribute('value') || this.textContent) || 0;
        }
        const parsed = parseFloat(newValue) || 0;
        const current = parseFloat(this.getAttribute('percent') || this.getAttribute('value') || this.textContent) || 0;
        if (parsed === current) return this;
        this.update();
    }

    /** Read-only — throws unconditionally. */
    update() {
        throw new Error("dx-odometer is read-only");
    }
}

if (rootWin) {
    rootWin.DxOdometer = rootWin.uiOdometer = rootWin.UiOdometer = DxOdometer;
}
defCustomElement('dx-odometer', DxOdometer);
defCustomElement('ui-odometer', DxOdometer);
