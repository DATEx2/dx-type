// dx-odometer.js — DATEx2 <dx-odometer> Web Component (Mechanical drum odometer).
//
// Read-only, one-time animation, self-cleanup after completion.
// Uses Shadow DOM and CSS scroll-driven animations (SDA) for ribbon rolling.
// Pure ES2026 — zero external dependencies.
//
// exports: DxOdometer
// used_by: src/client/index.js

import { DxMeter, parseNumParts, generateOdometerFrames } from '../base/dx-meter.js';
import { rootWin, span, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';

function pruneMiddleFrames(drumValues) {
    const len = drumValues.length;
    if (len < 10) return drumValues;

    const removeCount = Math.floor(len / 5);
    if (removeCount <= 0) return drumValues;

    const keepStart = 3;
    const keepEnd = 4;
    const midCount = len - keepStart - keepEnd;
    if (midCount <= removeCount) return drumValues;

    const step = midCount / (removeCount + 1);
    const dropIndices = new Set();
    for (let r = 1; r <= removeCount; r++) {
        const dropIdx = keepStart + Math.round(r * step) - 1;
        dropIndices.add(dropIdx);
    }

    return drumValues.filter((_, idx) => !dropIndices.has(idx));
}

let odometerStyleSheet = null;

function getOdometerStyleSheet() {
    if (!odometerStyleSheet && typeof CSSStyleSheet !== 'undefined') {
        try {
            odometerStyleSheet = new CSSStyleSheet();
            odometerStyleSheet.replaceSync(`
                :host {
                    display: inline-flex !important;
                    align-items: baseline !important;
                    vertical-align: baseline !important;
                    position: relative !important;
                    font-family: inherit !important;
                    font-size: inherit !important;
                    font-style: inherit !important;
                    color: inherit !important;
                    line-height: inherit !important;
                    letter-spacing: inherit !important;
                    word-spacing: inherit !important;
                }
                slot {
                    display: inline !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    opacity: 0.001 !important;
                    pointer-events: none !important;
                    z-index: -1 !important;
                }
                .odometer, .odometer-inside, .odometer-digit, .ui-odo, .odometer-formatting-mark {
                    display: inline-flex !important;
                    align-items: baseline !important;
                    vertical-align: baseline !important;
                    line-height: inherit !important;
                }
                .ui-sfx, .ui-pfx {
                    display: inline-block !important;
                    white-space: pre !important;
                    vertical-align: baseline !important;
                    line-height: inherit !important;
                }
                .odometer-digit {
                    position: relative !important;
                    overflow: visible !important;
                    display: inline-flex !important;
                    align-items: baseline !important;
                    vertical-align: baseline !important;
                }
                .odometer-digit-spacer {
                    visibility: hidden !important;
                    opacity: 0 !important;
                    color: transparent !important;
                    display: inline-block !important;
                    line-height: inherit !important;
                    pointer-events: none !important;
                    user-select: none !important;
                }
                .odometer-digit-inner {
                    position: absolute !important;
                    inset: 0 !important;
                    overflow: hidden !important;
                    line-height: inherit !important;
                    text-align: left !important;
                }
                .odometer-ribbon {
                    display: block !important;
                    height: 100% !important;
                    line-height: inherit !important;
                }
                .odometer-ribbon-inner {
                    display: block !important;
                    line-height: inherit !important;
                    transform: translateY(var(--initial-pos, 0%));
                    animation-name: run-odometer !important;
                    animation-duration: calc((var(--odo-dur, 1400ms) - (var(--digit-r, 0) * var(--odo-stag, 60ms))) * var(--A, 1)) !important;
                    animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1) !important;
                    animation-fill-mode: both !important;
                    animation-delay: calc(((var(--d, 0) * 1ms) + (var(--I, 0) * (var(--u, 40) * 1ms + var(--c, 0ms))) + (var(--u, 40) * 0.35 * 1ms) + (var(--digit-r, 0) * var(--odo-stag, 60ms))) * var(--A, 1)) !important;
                    animation-play-state: running !important;
                }
                .odometer-value {
                    display: block !important;
                    text-align: center !important;
                    line-height: inherit !important;
                }
                @keyframes run-odometer {
                    0% {
                        transform: translateY(var(--initial-pos, 0%));
                    }
                    100% {
                        transform: translateY(var(--final-pos, 0%));
                    }
                }
                :host([data-static="true"]) .odometer-ribbon-inner {
                    animation: none !important;
                    transform: translateY(var(--final-pos, 0%)) !important;
                }
            `);
        } catch (err) {
            odometerStyleSheet = null;
        }
    }
    return odometerStyleSheet;
}

const SDA_PARENT_SEL = 'dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda, .TYPE-, .REVEAL-, ui-type-sda, ui-reveal-sda';
const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda';

export class DxOdometer extends DxMeter {
    constructor() {
        super();
        this._timeoutId = null;
        this._ribbonsDone = 0;
        this._ribbonCount = 0;
        this._animDone = false;
        this._inViewport = false;
        this._parentReady = false;

        // Internal ribbon completion handler
        const handleRibbonDone = (e) => {
            if (!e.target || !e.target.classList || !e.target.classList.contains('odometer-ribbon-inner')) return;
            if (e.animationName !== DX_ANIM.KF_RUN_ODOMETER && e.animationName !== DX_ANIM.KF_ODO_ROLL && e.animationName !== 'run-odometer' && e.animationName !== 'odo-roll') return;
            e.stopPropagation();

            if (this._animDone) return;

            const shadow = this.shadowRoot || this;
            const allRibbons = shadow.querySelectorAll('.odometer-ribbon-inner');
            this._ribbonCount = allRibbons.length;

            if (!this._completedRibbons) this._completedRibbons = new Set();
            this._completedRibbons.add(e.target);

            if (this._completedRibbons.size >= this._ribbonCount && this._ribbonCount > 0) {
                this._animDone = true;

                // Freeze to static state and notify typewriter parent
                this.makeStatic();

                if (this.classList.contains('tw-embed') && typeof rootWin?.__twEnd === 'function') {
                    rootWin.__twEnd(this);
                }
            }
        };

        // Suppress animation events from bubbling to parent typewriter
        if (typeof this.addEventListener === 'function') {
            this.addEventListener('animationstart', (e) => { if (e?.stopPropagation) e.stopPropagation(); }, { passive: true });
            this.addEventListener('animationend', handleRibbonDone);
        }

        this._handleRibbonDone = handleRibbonDone;
    }

    connectedCallback() {
        if (this.isStatic) return;
        if (this._initialized) return;

        const inST = !!this.closest('s-t');
        if (inST) {
            this._initialized = true;
            this.makeStatic();
            this.innerHTML = this.getStaticHTML();
            return;
        }

        const shadow = this.shadowRoot;
        const hasExistingDom = (shadow && shadow.querySelector('.odometer-ribbon-inner')) || this.querySelector('.odometer-ribbon-inner');
        if (hasExistingDom) {
            this._initialized = true;
            this._ribbonCount = (shadow || this).querySelectorAll('.odometer-ribbon-inner').length;
            const twEmbed = this.classList.contains('tw-embed');
            if (!twEmbed) {
                observeIO(this, (el) => {
                    el.classList.add(DX_ANIM.TYPING);
                });
            }
            return;
        }

        const typeReadyParent = this.closest('.type-ready, dx-type-ready');
        const twEmbed = this.classList.contains('tw-embed');
        const parentC = this.closest('c');

        if (typeReadyParent || twEmbed || parentC) {
            this._timeoutId = setTimeout(() => {
                if (!this._initialized) {
                    this.init();
                    this.classList.add(DX_ANIM.TYPING);
                }
            }, 0);
        } else {
            // Standalone odometer: trigger on scroll via singleton IO
            observeIO(this, (el) => {
                if (!this._initialized) {
                    this.init();
                }
                el.classList.add(DX_ANIM.TYPING);
            });
        }
    }

    init() {
        this._initialized = true;
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }

        if (this.closest('s-t') || this.isStatic) {
            this.makeStatic();
            this.innerHTML = this.getStaticHTML();
            return;
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

        const allDigits = [];
        for (let i = 0; i < formattedNumberStr.length; i++) {
            const c = formattedNumberStr[i];
            if (c >= '0' && c <= '9') allDigits.push(c);
        }
        const targetDigitsStr = allDigits.join('');

        let startDigitsStr = null;
        if (formattedStartStr) {
            const startDigits = [];
            for (let i = 0; i < formattedStartStr.length; i++) {
                const c = formattedStartStr[i];
                if (c >= '0' && c <= '9') startDigits.push(c);
            }
            startDigitsStr = startDigits.join('');
        }

        const isYear = (type === 'year');
        const isYearWithStart = isYear && startDigitsStr && startDigitsStr.length === targetDigitsStr.length;

        // Determine leading-zero positions at animation start.
        // A leading zero is a digit that starts at 0 and all digits to its left also start at 0.
        // The rightmost digit is NEVER a leading zero (always show at least "0").
        // E.g. for target=600 with no start: start="000" → positions 0,1 are leading zeros → "  0W".
        const startDigitsForLeading = [];
        for (let i = 0; i < targetDigitsStr.length; i++) {
            startDigitsForLeading.push(
                (startDigitsStr && startDigitsStr[i] !== undefined)
                    ? parseInt(startDigitsStr[i], 10)
                    : 0
            );
        }
        let firstSignificant = startDigitsForLeading.length;
        for (let i = 0; i < startDigitsForLeading.length; i++) {
            if (startDigitsForLeading[i] !== 0) { firstSignificant = i; break; }
        }
        // If ALL start digits are 0, the rightmost digit is still significant (show "0", not blank)
        if (firstSignificant >= startDigitsForLeading.length) {
            firstSignificant = startDigitsForLeading.length - 1;
        }
        const lastLeadingZeroIdx = firstSignificant - 1;

        let digitIndex = 0;
        let odoInsideHtml = '';

        for (let i = 0; i < formattedNumberStr.length; i++) {
            const char = formattedNumberStr[i];
            if (char >= '0' && char <= '9') {
                const curDigitIdx = digitIndex++;
                const digitR = targetDigitsStr.length - 1 - curDigitIdx;
                const targetD = parseInt(targetDigitsStr[curDigitIdx], 10);
                const startD = (startDigitsStr && startDigitsStr[curDigitIdx] !== undefined)
                    ? parseInt(startDigitsStr[curDigitIdx], 10)
                    : 0;

                let drumValues = [];
                if (isYearWithStart) {
                    if (startD === targetD) {
                        drumValues.push(targetD);
                    } else {
                        let cur = startD;
                        drumValues.push(cur);
                        while (cur !== targetD) {
                            cur = (cur + 1) % 10;
                            drumValues.push(cur);
                            if (drumValues.length > 20) break;
                        }
                    }
                } else {
                    const cycles = digitR === 0 ? 2 : (digitR === 1 ? 1 : 0);
                    const totalSteps = cycles * 10 + ((targetD - startD + 10) % 10);
                    const effectiveSteps = (totalSteps === 0 && cycles === 0) ? 0 : totalSteps;

                    let cur = startD;
                    drumValues.push(cur);
                    for (let s = 0; s < effectiveSteps; s++) {
                        cur = (cur + 1) % 10;
                        drumValues.push(cur);
                    }
                    drumValues = pruneMiddleFrames(drumValues);
                }

                // Mechanical odometer: leading-zero digits show blank at start, not "0".
                // Replace first drum value (0) with non-breaking space so the ribbon
                // naturally scrolls: [blank] → 1 → 2 → ... → targetD
                const isLeadingZero = !isYear && curDigitIdx <= lastLeadingZeroIdx;
                if (isLeadingZero && drumValues.length > 0 && drumValues[0] === 0) {
                    drumValues[0] = '&nbsp;';
                }

                const totalItems = drumValues.length;
                const finalIndex = totalItems - 1;
                let ribbonValuesHtml = '';
                for (let f = 0; f < totalItems; f++) {
                    const val = drumValues[f];
                    const isFirst = (f === 0);
                    const isLast = (f === totalItems - 1);
                    ribbonValuesHtml += makeVal(val, isFirst, isLast);
                }

                const finalPosPercent = totalItems > 1 ? -((finalIndex / totalItems) * 100).toFixed(4) : 0;
                const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${curDigitIdx}; --digit-r: ${digitR};"`;

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

        // Inherit --d from <c> parent
        const parentC = this.closest('c');
        if (parentC) {
            const cW = parentC.closest('w');
            if (cW) {
                const wVal = cW.style.getPropertyValue('--w');
                if (wVal && wVal.trim() !== '') this.style.setProperty('--w', wVal.trim());
            }
            const iVal = parentC.style.getPropertyValue('--i');
            if (iVal && iVal.trim() !== '') this.style.setProperty('--i', iVal.trim());
        }
        const parentType = this.closest('.TYPE, .type, .TYPE-, dx-type, dx-type-sda, ui-type, ui-type-sda');
        if (parentType) {
            const typeD = parentType.style.getPropertyValue('--d');
            if (typeD && typeD.trim() !== '') {
                this.style.setProperty('--d', typeD.trim());
            }
        }

        // Attach Shadow DOM
        let shadow = this.shadowRoot;
        if (!shadow) {
            try {
                shadow = this.attachShadow({ mode: 'open' });
            } catch (e) {
                shadow = null;
            }
        }

        if (shadow) {
            shadow.addEventListener('animationend', this._handleRibbonDone);
            shadow.addEventListener('transitionend', this._handleRibbonDone);

            const sheet = getOdometerStyleSheet();
            if (sheet && shadow.adoptedStyleSheets) {
                shadow.adoptedStyleSheets = [sheet];
            } else if (!shadow.querySelector('style')) {
                const styleEl = document.createElement('style');
                styleEl.textContent = `
                    :host { display: inline-flex !important; align-items: baseline !important; vertical-align: baseline !important; font-family: inherit !important; font-size: inherit !important; font-style: inherit !important; color: inherit !important; line-height: inherit !important; }
                    .odometer, .odometer-inside, .odometer-digit, .ui-odo, .ui-sfx, .ui-pfx, .odometer-formatting-mark { display: inline-flex !important; align-items: baseline !important; vertical-align: baseline !important; line-height: inherit !important; }
                    .odometer-digit { position: relative !important; overflow: visible !important; display: inline-flex !important; align-items: baseline !important; vertical-align: baseline !important; }
                    .odometer-digit-spacer { visibility: hidden !important; opacity: 0 !important; color: transparent !important; display: inline-block !important; line-height: inherit !important; pointer-events: none !important; user-select: none !important; }
                    .odometer-digit-inner { position: absolute !important; inset: 0 !important; overflow: hidden !important; line-height: inherit !important; }
                    .odometer-ribbon { display: block !important; height: 100% !important; line-height: inherit !important; }
                    .odometer-ribbon-inner { display: block !important; line-height: inherit !important; transform: translateY(var(--initial-pos, 0%)); animation: run-odometer calc((var(--odo-dur, 1400ms) - (var(--digit-r, 0) * var(--odo-stag, 60ms))) * var(--A, 1)) cubic-bezier(0.37, 0, 0.63, 1) calc(((var(--d, 0) * 1ms) + (var(--I, 0) * (var(--u, 40) * 1ms + var(--c, 0ms))) + (var(--u, 40) * 0.35 * 1ms) + (var(--digit-r, 0) * var(--odo-stag, 60ms))) * var(--A, 1)) both running !important; }
                    .odometer-value { display: block !important; text-align: center !important; line-height: inherit !important; }
                    @keyframes run-odometer { 0% { transform: translateY(var(--initial-pos, 0%)); } 100% { transform: translateY(var(--final-pos, 0%)); } }
                    :host([data-static="true"]) .odometer-ribbon-inner { animation: none !important; transform: translateY(var(--final-pos, 0%)) !important; }
                `;
                shadow.appendChild(styleEl);
            }
            shadow.innerHTML = `${pfxHtml}${odoHtml}${sfxHtml}<slot></slot>`;
        } else {
            this.innerHTML = `${pfxHtml}${odoHtml}${sfxHtml}`;
        }

        // Keep Light DOM text clean as accessible fallback inside <s-t>
        // Skip when embedded in a typewriter parent — the parent's <s-t> already covers this text.
        if (shadow && !this.classList.contains('tw-embed')) {
            this.innerHTML = `<s-t>${this.getStaticHTML()}</s-t>`;
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
