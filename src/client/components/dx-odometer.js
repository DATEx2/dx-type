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
import { DX_ANIM } from '../base/dx-scheduler.js';

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

        this._timeoutId = setTimeout(() => {
            if (!this._initialized && !this.querySelector('.odometer-ribbon-inner')) this.init();
        }, 0);
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

                if (digitVal === 0 && formattedNumberStr.length > 1 && !startAttr) {
                    for (let j = 0; j <= 10; j++) ribbonValuesHtml += makeVal(j % 10, j === 0, j === 10);
                    totalItems = 11;
                    finalIndex = 10;
                } else if (startAttr) {
                    if (startDigitVal === digitVal && type === 'year') {
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
                    for (let j = 0; j <= digitVal; j++) ribbonValuesHtml += makeVal(j, j === 0, j === digitVal);
                    totalItems = digitVal + 1;
                    finalIndex = digitVal;
                }

                const finalPosPercent = -((finalIndex / totalItems) * 100).toFixed(4);
                const yearDelay = (type === 'year') ? ' --year-base-delay: 1000ms;' : '';
                const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${i};${yearDelay}"`;

                odoInsideHtml += span('odometer-digit',
                    span('odometer-digit-spacer', char) +
                    span('odometer-digit-inner',
                        span('odometer-ribbon',
                            span('odometer-ribbon-inner', ribbonValuesHtml, `data-final-pos="${finalPosPercent}%" ${ribbonStyle}`)
                        )
                    )
                );
            } else {
                odoInsideHtml += span('odometer-formatting-mark', char);
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
