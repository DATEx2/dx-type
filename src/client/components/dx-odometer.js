// dx-odometer.js — DATEx2 <dx-odometer> Web Component (Mechanical drum odometer).
//
// Read-only, one-time animation, self-cleanup after completion.
// Uses CSS scroll-driven animations (SDA) for ribbon rolling.
// Pure ES2026 — zero external dependencies.
//
// exports: DxOdometer
// used_by: src/client/index.js

import { DxMeter } from '../base/dx-meter.js';
import { rootWin } from '../base/dx-base.js';
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

        const formatted = this.formatValue(numericValue);

        // Regex split matching formatted text structure (identical to SSR generateRibbonHtml)
        const numberPartMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formatted);
        const prefixText = (numberPartMatch?.[1] || '').trim();
        const mainDigits = numberPartMatch?.[2] || '';
        const radixMark = numberPartMatch?.[3] || '';
        const decimalDigits = numberPartMatch?.[4] || '';
        const suffixText = (numberPartMatch?.[5] || '').trim();

        const formattedNumberStr = mainDigits + radixMark + decimalDigits;

        const startAttr = this.getAttribute('start');
        let formattedStartStr = null;
        if (startAttr) {
            const startNumeric = parseFloat(startAttr);
            if (!isNaN(startNumeric)) {
                const formattedStart = this.formatValue(startNumeric);
                const startMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formattedStart);
                formattedStartStr = (startMatch?.[2] || '') + (startMatch?.[3] || '') + (startMatch?.[4] || '');
            }
        }

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
                    for (let j = 0; j <= 10; j++) {
                        const val = j % 10;
                        const lastClass = (j === 10) ? ' odometer-last-value' : '';
                        const firstClass = (j === 0) ? ' odometer-first-value' : '';
                        ribbonValuesHtml += `<span class="odometer-value${firstClass}${lastClass}">${val}</span>`;
                    }
                    totalItems = 11;
                    finalIndex = 10;
                } else if (startAttr) {
                    if (startDigitVal === digitVal && type === 'year') {
                        ribbonValuesHtml = `<span class="odometer-value odometer-first-value odometer-last-value">${digitVal}</span>`;
                        totalItems = 1;
                        finalIndex = 0;
                    } else {
                        let currentVal = startDigitVal;
                        let count = 0;
                        while (true) {
                            const isFirst = (count === 0);
                            const isLast = (currentVal === digitVal && count > 0);
                            const firstClass = isFirst ? ' odometer-first-value' : '';
                            const lastClass = isLast ? ' odometer-last-value' : '';
                            ribbonValuesHtml += `<span class="odometer-value${firstClass}${lastClass}">${currentVal}</span>`;
                            count++;
                            if (isLast) break;
                            currentVal++;
                            if (currentVal > 9) currentVal = 0;
                            if (count > 20) break;
                        }
                        totalItems = count;
                        finalIndex = count - 1;
                    }
                } else {
                    for (let j = 0; j <= digitVal; j++) {
                        const lastClass = (j === digitVal) ? ' odometer-last-value' : '';
                        const firstClass = (j === 0) ? ' odometer-first-value' : '';
                        ribbonValuesHtml += `<span class="odometer-value${firstClass}${lastClass}">${j}</span>`;
                    }
                    totalItems = digitVal + 1;
                    finalIndex = digitVal;
                }

                const finalPosPercent = -((finalIndex / totalItems) * 100).toFixed(4);
                const yearDelay = (type === 'year') ? ' --year-base-delay: 1000ms;' : '';
                const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${i};${yearDelay}"`;
                odoInsideHtml += `<span class="odometer-digit">` +
                    `<span class="odometer-digit-spacer">${char}</span>` +
                    `<span class="odometer-digit-inner">` +
                        `<span class="odometer-ribbon">` +
                            `<span class="odometer-ribbon-inner" data-final-pos="${finalPosPercent}%" ${ribbonStyle}>` +
                                `${ribbonValuesHtml}` +
                            `</span>` +
                        `</span>` +
                    `</span>` +
                `</span>`;
            } else {
                odoInsideHtml += `<span class="odometer-formatting-mark">${char}</span>`;
            }
        }

        const prefixHasSpace = (numberPartMatch?.[1] || '').endsWith(' ');
        const prefixSpace = prefixHasSpace ? ' ' : '';
        const suffixHasSpace = (numberPartMatch?.[5] || '').startsWith(' ');
        const suffixSpace = suffixHasSpace ? ' ' : '';

        const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefixSpace}</span>` : '';
        const sfxHtml = suffixText ? `<span class="ui-sfx">${suffixSpace}${suffixText}</span>` : '';

        this.innerHTML = `${pfxHtml}<span class="ui-odo"><span class="odometer odometer-theme-datex2"><span class="odometer-inside">${odoInsideHtml}</span></span></span>${sfxHtml}`;

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
        throw new Error("dx-odometer is read-only");
    }

    /** Read-only — throws unconditionally. */
    update() {
        throw new Error("dx-odometer is read-only");
    }
}

if (rootWin) {
    rootWin.DxOdometer = DxOdometer;
    rootWin.uiOdometer = DxOdometer;  // backward compat alias
    rootWin.UiOdometer = DxOdometer;  // backward compat alias
    if (rootWin.customElements && !rootWin.customElements.get('dx-odometer')) {
        rootWin.customElements.define('dx-odometer', DxOdometer);
    }
}
