// dx-odometer.js — DATEx2 <dx-odometer> Web Component (Mechanical drum odometer).
//
// Read-only, one-time animation, self-cleanup after completion.
// Uses CSS scroll-driven animations (SDA) for ribbon rolling.
// Pure ES2026 — zero external dependencies.
//
// exports: DxOdometer
// used_by: src/client/index.js

import { DxMeter, parseNumParts } from '../base/dx-meter.js';
import { rootWin, span, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';

export class DxOdometer extends DxMeter {
    constructor() {
        super();
        this._timeoutId = null;
        this._ribbonsDone = 0;
        this._ribbonCount = 0;
        this._animDone = false;

        // Internal ribbon completion handler — no inline onanimationend needed
        const handleRibbonDone = (e) => {
            if (e.type === 'animationend' && e.animationName !== DX_ANIM.KF_RUN_ODOMETER && e.animationName !== DX_ANIM.KF_ODO_ROLL) return;
            if (e.type === 'transitionend' && e.propertyName !== 'transform') return;
            e.stopPropagation();

            if (this._animDone) return;

            if (this._ribbonCount === 0) {
                this._ribbonCount = this.querySelectorAll('.odometer-ribbon-inner').length;
            }

            this._ribbonsDone++;

            if (this._ribbonsDone >= this._ribbonCount && this._ribbonCount > 0) {
                this._animDone = true;

                // Freeze to static HTML and release GPU
                this.makeStatic();
                this.innerHTML = this.getStaticHTML();

                // Signal typewriter parent that embedded odometer is done
                if (this.classList.contains('tw-embed') && typeof rootWin?.__twEnd === 'function') {
                    rootWin.__twEnd(this);
                }
            }
        };

        // Suppress animation/transition events from bubbling to parent typewriter
        this.addEventListener('animationstart', (e) => { if (e?.stopPropagation) e.stopPropagation(); }, { passive: true });
        this.addEventListener('transitionstart', (e) => { if (e?.stopPropagation) e.stopPropagation(); }, { passive: true });
        this.addEventListener('animationend', handleRibbonDone);
        this.addEventListener('transitionend', handleRibbonDone);
    }

    connectedCallback() {
        if (this.isStatic) return;
        if (this._initialized) return;

        // If SSR already generated ribbon HTML, just mark initialized
        if (this.querySelector('.odometer-ribbon-inner')) {
            this._initialized = true;
            return;
        }

        const typeReadyParent = this.closest('.type-ready, dx-type-ready, ui-type-ready');
        const twEmbed = this.classList.contains('tw-embed');

        if (typeReadyParent || twEmbed) {
            this._timeoutId = setTimeout(() => {
                if (!this._initialized && !this.querySelector('.odometer-ribbon-inner')) this.init();
            }, 0);
        } else {
            // Standalone odometer: trigger on scroll via singleton IO
            observeIO(this, () => {
                if (!this._initialized && !this.querySelector('.odometer-ribbon-inner')) this.init();
            });
        }
    }

    init() {
        this._initialized = true;
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }

        const valAttr = this.getAttribute('percent') || this.getAttribute('value') || this.textContent;
        const type = this.getAttribute('type') || 'int';

        const numericValue = parseFloat(valAttr);
        if (isNaN(numericValue)) return;

        const np = parseNumParts(this.formatValue(numericValue));
        const formattedNumberStr = np.digits + np.radix + np.decimals;

        const startAttr = this.getAttribute('start');
        let formattedStartStr = null;
        if (startAttr) {
            const startNumeric = parseFloat(startAttr);
            if (!isNaN(startNumeric)) {
                const sp = parseNumParts(this.formatValue(startNumeric));
                formattedStartStr = sp.digits + sp.radix + sp.decimals;
            }
        }

        const makeVal = (v, isF, isL) => span(`odometer-value${isF ? ' odometer-first-value' : ''}${isL ? ' odometer-last-value' : ''}`, v);

        let odoInsideHtml = '';
        for (let i = 0; i < formattedNumberStr.length; i++) {
            const char = formattedNumberStr[i];
            if (char >= '0' && char <= '9') {
                const digitVal = parseInt(char, 10);

                let ribbonValuesHtml = '';
                let totalItems = 0;
                let finalIndex = 0;

                let startDigitVal = 0;
                if (formattedStartStr) {
                    const paddedStart = formattedStartStr.padStart(formattedNumberStr.length, '0');
                    startDigitVal = parseInt(paddedStart[i], 10);
                    if (isNaN(startDigitVal)) startDigitVal = 0;
                }

                const isYear = (type === 'year');

                if (isYear && startAttr) {
                    if (startDigitVal === digitVal) {
                        ribbonValuesHtml = makeVal(digitVal, true, true);
                        totalItems = 1;
                        finalIndex = 0;
                    } else {
                        let currentVal = startDigitVal;
                        let count = 0;
                        while (true) {
                            const isFirst = (count === 0);
                            const isLast = (currentVal === digitVal && count > 0);
                            ribbonValuesHtml += makeVal(currentVal, isFirst, isLast);
                            count++;
                            if (isLast || count > 20) break;
                            currentVal = (currentVal + 1) % 10;
                        }
                        totalItems = count;
                        finalIndex = count - 1;
                    }
                } else {
                    // Multi-rotation mechanical drum cascade (0-1-2-3-4-5-6-7-8-9-0):
                    // Each digit ribbon spins through at least 1-2 full sets of 0-9 before locking on target!
                    const digitFromRight = formattedNumberStr.length - 1 - i;
                    const fullSpins = Math.min(3, Math.max(1, digitFromRight + 1));
                    const diff = (digitVal - startDigitVal + 10) % 10;
                    let totalSteps = (fullSpins * 10) + diff;
                    if (totalSteps === 0) totalSteps = 10;

                    for (let step = 0; step <= totalSteps; step++) {
                        const val = (startDigitVal + step) % 10;
                        const isFirst = (step === 0);
                        const isLast = (step === totalSteps);
                        ribbonValuesHtml += makeVal(val, isFirst, isLast);
                    }
                    totalItems = totalSteps + 1;
                    finalIndex = totalSteps;
                }

                const finalPosPercent = -((finalIndex / totalItems) * 100).toFixed(4);
                const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${i};"`;

                odoInsideHtml += span('odometer-digit',
                    span('odometer-digit-spacer', char) +
                    span('odometer-digit-inner',
                        span('odometer-ribbon',
                            span('odometer-ribbon-inner', ribbonValuesHtml, `data-final-pos="${finalPosPercent}%" ${ribbonStyle}`)
                        )
                    )
                );
            } else {
                odoInsideHtml += span('odometer-formatting-mark', char === ' ' ? '&nbsp;' : char);
            }
        }

        const pfxHtml = span('ui-pfx', np.pfx ? `${np.pfx}${np.pfxSpace}` : '');
        const sfxHtml = span('ui-sfx', np.sfx ? `${np.sfxSpace}${np.sfx}` : '');
        const odoHtml = span('ui-odo', span('odometer odometer-theme-datex2', span('odometer-inside', odoInsideHtml)));

        this.innerHTML = `${pfxHtml}${odoHtml}${sfxHtml}`;

        // Inherit --d from <c> parent
        const parentC = this.closest('c');
        if (parentC) {
            const cW = parentC.closest('w');
            if (cW) {
                const wVal = cW.style.getPropertyValue('--w');
                if (wVal) this.style.setProperty('--w', wVal);
            }
            const iVal = parentC.style.getPropertyValue('--I');
            if (iVal) this.style.setProperty('--I', iVal);
        }
        const parentType = this.closest('.TYPE, .type, .TYPE-, dx-type, dx-type-sda, ui-type, ui-type-sda');
        if (parentType) {
            const typeD = parentType.style.getPropertyValue('--d');
            if (typeD && typeD.trim() !== '') {
                this.style.setProperty('--d', typeD.trim());
            }
        }
    }

    getStaticHTML() {
        const valAttr = this.getAttribute('percent') || this.getAttribute('value') || this.textContent;
        const numericValue = parseFloat(valAttr);
        if (isNaN(numericValue)) return this.textContent.trim();
        return this.formatValue(numericValue);
    }

    disconnectedCallback() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
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
