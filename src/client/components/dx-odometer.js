// dx-odometer.js — DATEx2 <dx-odometer> Web Component (Mechanical drum odometer).
//
// Read-only, one-time animation, self-cleanup after completion.
// Light DOM — SSR pre-renders <d data-seq> digits, CSS animates via ::before + translateY GPU.
// Zero Shadow DOM, zero runtime DOM construction.
// Pure ES2026 — zero external dependencies.
//
// exports: DxOdometer
// used_by: src/client/index.js

import { DxMeter } from '../base/dx-meter.js';
import { rootWin, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';
import { onTypewriterEnd } from '../base/dx-typing.js';

const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda';

export class DxOdometer extends DxMeter {
    constructor() {
        super();
        this._animDone = false;
        this._digitCount = 0;
        this._digitsDone = 0;
    }

    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;

        // Inside <s-t> = static context, nothing to animate
        if (this.closest('s-t')) {
            this.classList.add('data-static');
            return;
        }

        // Already static (SSR marked)
        if (this.classList.contains('data-static')) return;

        // Listen for animation completion on <d>::before
        this.addEventListener('animationend', this._onAnimEnd);

        // Suppress animation events from bubbling to parent typewriter
        this.addEventListener('animationstart', (e) => {
            if (e?.stopPropagation) e.stopPropagation();
        }, { passive: true });

        const twEmbed = this.classList.contains('tw-embed') || !!this.closest('dx-type, dx-type-sda, .type, .type-sda, ui-type, ui-type-sda');
        if (twEmbed) {
            const checkEmbedReady = () => {
                if (!this.isConnected || this._animDone) return;
                const dCount = this.querySelectorAll('d[data-seq]').length;
                const spanCount = this.querySelectorAll('.odometer-ribbon-inner').length;
                if (dCount === 0 && spanCount === 0 && !this.closest('template')) {
                    this._animDone = true;
                    onTypewriterEnd(this);
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkEmbedReady, { once: true });
            } else {
                requestAnimationFrame(checkEmbedReady);
            }
            // Safety timeout: ensure embedded meter always resolves so parent typewriter never hangs
            const delay = parseFloat(this.style.getPropertyValue('--d')) || 0;
            setTimeout(() => {
                if (!this._animDone && this.isConnected) {
                    this._animDone = true;
                    onTypewriterEnd(this);
                }
            }, delay + 1200);
        } else {
            const setupStandalone = () => {
                if (!this.isConnected || this._animDone || this.classList.contains('data-static')) return;
                const digits = this.querySelectorAll('d[data-seq]');
                this._digitCount = digits.length;
                if (this._digitCount === 0) {
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', setupStandalone, { once: true });
                        return;
                    }
                    this.classList.add('data-static');
                    return;
                }
                const parentType = this.closest(TYPE_PARENT_SEL);
                const inFooter = this.closest('footer, .ins-tile--footer, #tile-footer-MNure7');
                if (!parentType && !inFooter) {
                    observeIO(this, (el) => {
                        el.classList.add(DX_ANIM.TYPING);
                        setTimeout(() => {
                            if (!this._animDone && this.isConnected) {
                                this._animDone = true;
                                this.makeStatic();
                            }
                        }, 2500);
                    });
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupStandalone, { once: true });
            } else {
                requestAnimationFrame(setupStandalone);
            }
        }
    }

    _onAnimEnd = (e) => {
        if (this._animDone) return;

        // Count animation ends from <d> elements or legacy .odometer-ribbon-inner
        const target = e.target;
        if (!target || (target.tagName !== 'D' && !target.classList?.contains('odometer-ribbon-inner'))) return;

        e.stopPropagation();

        if (!this._digitCount) {
            const dCount = this.querySelectorAll('d[data-seq]').length;
            const spanCount = this.querySelectorAll('.odometer-ribbon-inner').length;
            this._digitCount = dCount || spanCount || 1;
        }

        this._digitsDone++;

        if (this._digitsDone >= this._digitCount) {
            this._animDone = true;
            const twEmbed = this.classList.contains('tw-embed') || !!this.closest('dx-type, dx-type-sda, .type, .type-sda, ui-type, ui-type-sda');
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
