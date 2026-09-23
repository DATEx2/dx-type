// dx-meter.js — DATEx2 Base Class for Numeric Meters & Odometers.
//
// exports: DxMeter, uiNum
// used_by: src/client/components/dx-number.js, src/client/components/dx-odometer.js

import { DxBase, rootWin } from './dx-base.js';

// ─── Shared Numeric Parsing Helper ──────────────────────────────────────────
const NUM_RE = /^([^0-9]*?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)$/;

export function parseNumParts(str) {
    const m = NUM_RE.exec(str || '');
    return {
        pfx: (m?.[1] || '').trim(),
        digits: m?.[2] || '',
        radix: m?.[3] || '',
        decimals: m?.[4] || '',
        sfx: (m?.[5] || '').trim(),
        pfxSpace: (m?.[1] || '').endsWith(' ') ? ' ' : '',
        sfxSpace: (m?.[5] || '').startsWith(' ') ? ' ' : ''
    };
}

export function generateOdometerFrames(targetStr, startStr = null, isYear = false) {
    const L = targetStr.length;
    const targetNum = parseInt(targetStr, 10);

    if (startStr !== null && startStr !== undefined && startStr !== '') {
        const startNum = parseInt(startStr, 10);
        if (!isNaN(startNum) && !isNaN(targetNum) && targetNum >= startNum && (targetNum - startNum) <= 30) {
            const frames = [];
            for (let n = startNum; n <= targetNum; n++) {
                frames.push(String(n).padStart(L, ' '));
            }
            return frames;
        }
    }

    if (isNaN(targetNum) || targetNum === 0) {
        return [targetStr.padStart(L, ' ')];
    }

    const values = [];

    if (L === 1 || targetNum <= 20) {
        for (let i = 0; i <= targetNum; i++) values.push(i);
    } else if (L === 2) {
        values.push(0);
        values.push(10);
        let cur = 10;
        let step = 11;
        while (cur + step <= targetNum) {
            cur += step;
            values.push(cur);
        }
        while (cur < targetNum) {
            cur += 1;
            values.push(cur);
        }
    } else if (L === 3) {
        if (targetNum === 600) {
            const exact600 = [0, 10, 120, 231, 342, 453, 564, 575, 586, 597, 598, 599, 600];
            return exact600.map(v => String(v).padStart(L, ' '));
        }

        values.push(0);
        values.push(10);
        values.push(120);
        let cur = 120;
        let step = 111;
        while (cur + step <= targetNum - 20) {
            cur += step;
            values.push(cur);
        }
        while (cur + 11 <= targetNum - 8) {
            cur += 11;
            values.push(cur);
        }
        while (cur < targetNum) {
            cur += 1;
            values.push(cur);
        }
    } else if (L === 4) {
        values.push(0);
        values.push(10);
        values.push(120);
        values.push(1230);
        let cur = 1230;
        let step = 111;
        while (cur + step <= targetNum - 15) {
            cur += step;
            values.push(cur);
        }
        while (cur < targetNum) {
            cur += 1;
            values.push(cur);
        }
    }

    if (values[values.length - 1] !== targetNum) {
        values.push(targetNum);
    }

    const unique = [];
    for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (unique.length === 0 || v > unique[unique.length - 1]) {
            unique.push(v);
        }
    }

    return unique.map(v => String(v).padStart(L, ' '));
}

// ─── Self-contained uiNum formatter (ported faithfully from ww3/uiNum.js) ───
export class uiNum {
    static format(value, type = 'number', comma = ',', prefix = '', suffix = ' €') {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return '';

        const isNegative = numVal < 0;
        const absValue = Math.abs(numVal);

        let decimals = 0;
        if (type.includes('number-1dec') || type.includes('float')) {
            decimals = 1;
        } else if (type.includes('number')) {
            decimals = 2;
        } else if (type.includes('percent')) {
            decimals = (absValue % 1 !== 0) ? 2 : 0;
        } else {
            decimals = 0;
        }

        let numStr = absValue.toFixed(decimals);
        if (comma === ',') {
            numStr = numStr.replace('.', ',');
        }

        const parts = comma ? numStr.split(comma) : [numStr];
        let integerPart = parts[0];
        const decimalPart = parts[1] || '';

        // Add spaces for thousands (e.g. 1 299), except for year formatting
        if (!type.includes('year')) {
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }
        const formattedNum = decimalPart ? (integerPart + comma + decimalPart) : integerPart;

        let finalPrefix = prefix || '';
        if (isNegative && !prefix) {
            finalPrefix = '– ';
        } else if (numVal > 0 && prefix && prefix.includes('+')) {
            finalPrefix = '+ ';
        }

        let finalSuffix = suffix !== undefined && suffix !== null ? suffix : (type === 'percent' ? '%' : ' €');
        if (type === 'percent' && (suffix === undefined || suffix === null || suffix === ' €')) {
            finalSuffix = '%';
        }

        return `${finalPrefix}${formattedNum}${finalSuffix}`;
    }
}

export class DxMeter extends DxBase {
    constructor() {
        super();
        this._initialized = false;
        this._value = 0;
        this._targetValue = 0;
    }

    get isStatic() {
        return this.classList ? this.classList.contains('data-static') : false;
    }

    getNumericValue() {
        const valAttr = this.getAttribute('percent') || this.getAttribute('value') || this.textContent;
        const parsed = parseFloat(valAttr);
        return isNaN(parsed) ? 0 : parsed;
    }

    getFormatConfig() {
        return {
            type: this.getAttribute('type') || 'int',
            comma: this.getAttribute('comma') || ',',
            prefix: this.getAttribute('prefix') || '',
            suffix: this.getAttribute('suffix') || ''
        };
    }

    formatValue(val) {
        const cfg = this.getFormatConfig();
        return uiNum.format(val, cfg.type, cfg.comma, cfg.prefix, cfg.suffix);
    }

    setAccessibility(val) {
        if (this.getAttribute('aria-hidden') !== 'true') {
            this.setAttribute('aria-hidden', 'true');
        }
        const formatted = this.formatValue(val !== undefined ? val : this._value);
        const ariaLabel = formatted.replace(/·/g, '').replace(/\s+/g, ' ').trim().replace(/"/g, '&quot;');
        if (this.getAttribute('aria-label') !== ariaLabel) {
            this.setAttribute('aria-label', ariaLabel);
        }
    }

    makeStatic() {
        this.classList.add('data-static');
    }
}

export function pruneMiddleFrames(drumValues) {
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

export function formatNumber(val, type = 'int', comma = ',', prefix = '', suffix = '') {
    const num = parseFloat(val) || 0;
    let formatted = '';

    if (type.includes('number-1dec') || type === 'float' || type.startsWith('float')) {
        formatted = num.toFixed(1).replace('.', comma);
    } else if (type.includes('number-2dec') || type === 'number') {
        formatted = num.toFixed(2).replace('.', comma);
    } else if (type === 'int' || type.startsWith('int-') || type.startsWith('number-')) {
        const intVal = Math.round(num);
        const str = intVal.toString();
        // Thousands separator
        formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    } else {
        formatted = num.toString().replace('.', comma);
    }

    const pfx = prefix ? `${prefix}${prefix.endsWith(' ') ? '' : ' '}` : '';
    const noLeadingSpace = /^[%°"”″’'VvAaWw€$£]|\//.test(suffix);
    const sfx = suffix ? `${(suffix.startsWith(' ') || noLeadingSpace) ? '' : ' '}${suffix}` : '';
    return `${pfx}${formatted}${sfx}`;
}

export function generateRibbonHtml(numericValue, type = 'int', comma = ',', prefix = '', suffix = '', startValue = null) {
    const formatted = formatNumber(numericValue, type, comma, prefix, suffix);
    const numberPartMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formatted);
    const prefixText = (numberPartMatch?.[1] || '').trim();
    const mainDigits = numberPartMatch?.[2] || '';
    const radixMark = numberPartMatch?.[3] || '';
    const decimalDigits = numberPartMatch?.[4] || '';
    const suffixText = (numberPartMatch?.[5] || '').trim();

    const formattedNumberStr = mainDigits + radixMark + decimalDigits;
    const isYear = (type === 'year');

    let formattedStartStr = null;
    if (startValue !== null && startValue !== undefined && startValue !== '') {
        const startNumeric = parseFloat(startValue);
        if (!isNaN(startNumeric)) {
            const startFormatted = formatNumber(startNumeric, type, comma, prefix, suffix);
            const startMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(startFormatted);
            formattedStartStr = (startMatch?.[2] || '') + (startMatch?.[3] || '') + (startMatch?.[4] || '');
        }
    }

    const allDigits = [];
    for (let i = 0; i < formattedNumberStr.length; i++) {
        const c = formattedNumberStr[i];
        if (c >= '0' && c <= '9') allDigits.push(c);
    }
    const targetDigitsStr = allDigits.join('');
    const totalDigits = targetDigitsStr.length;

    let startDigitsStr = null;
    if (formattedStartStr) {
        const startDigits = [];
        for (let i = 0; i < formattedStartStr.length; i++) {
            const c = formattedStartStr[i];
            if (c >= '0' && c <= '9') startDigits.push(c);
        }
        startDigitsStr = startDigits.join('');
    }

    const isYearWithStart = isYear && startDigitsStr && startDigitsStr.length === targetDigitsStr.length;

    // Determine leading-zero positions at animation start
    // MUST NEVER blank the units digit (immediately before radix) or any decimal digits!
    let intDigitsCount = 0;
    for (let i = 0; i < mainDigits.length; i++) {
        if (mainDigits[i] >= '0' && mainDigits[i] <= '9') intDigitsCount++;
    }
    const maxLeadingZeroIdx = Math.max(-1, intDigitsCount - 2);

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
    if (firstSignificant >= startDigitsForLeading.length) {
        firstSignificant = startDigitsForLeading.length - 1;
    }
    const lastLeadingZeroIdx = Math.min(firstSignificant - 1, maxLeadingZeroIdx);

    let digitIndex = 0;
    let digitsHtml = '';

    for (let i = 0; i < formattedNumberStr.length; i++) {
        const char = formattedNumberStr[i];
        if (char >= '0' && char <= '9') {
            const curDigitIdx = digitIndex++;
            const digitR = totalDigits - 1 - curDigitIdx;
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
                const isSingleDigit = (totalDigits === 1);
                const cycles = isSingleDigit ? 0 : (digitR === 0 ? 2 : (digitR === 1 ? 1 : 0));
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
            const isLeadingZero = !isYear && curDigitIdx <= lastLeadingZeroIdx;
            if (isLeadingZero && drumValues.length > 0 && drumValues[0] === 0) {
                drumValues[0] = ' ';
            }

            const totalItems = drumValues.length;
            const finalIndex = totalItems - 1;
            const finalPosPercent = totalItems > 1 ? -((finalIndex / totalItems) * 100).toFixed(4) : 0;

            // Build data-seq: compact digit string on wire (stripout, zero &#10;)
            const seqStr = drumValues.map(v => v === ' ' ? ' ' : v).join('');

            digitsHtml += `<dx-d data-seq="${seqStr}" style="--p:${finalPosPercent}%">${char}</dx-d>`;
        } else {
            digitsHtml += `<span class="ui-radix">${char}</span>`;
        }
    }

    const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefix.endsWith(' ') ? '' : ' '}</span>` : '';
    const hasExplicitSpace = suffix.startsWith(' ');
    const noSfxSpace = /^[%°"”″’'VvAaWw€$£]|\//.test(suffixText);
    const suffixSpace = (hasExplicitSpace || !noSfxSpace) ? (suffixText ? ' ' : '') : '';
    const sfxHtml = suffixText ? `<span class="ui-sfx">${suffixSpace}${suffixText}</span>` : '';

    return `${pfxHtml}<b>${digitsHtml}</b>${sfxHtml}`;
}

/**
 * Generate compact data-o string for an odometer (e.g. " 123456, 12467890,01234679124567890").
 * @returns {string}
 */
export function generateDataO(numericValue, type = 'int', comma = ',', prefix = '', suffix = '', startValue = null) {
    const html = generateRibbonHtml(numericValue, type, comma, prefix, suffix, startValue);
    const seqs = [];
    const re = /data-seq="([^"]*)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        seqs.push(m[1]);
    }
    return seqs.join(',');
}

/**
 * Expand compact wire-format data-seq (e.g. " 123456") into \n-separated staves in memory.
 * Also computes and sets --p translation percentage if missing.
 * Runs on client DOM directly via setAttribute, immune to HTML minifiers.
 * @param {Element|Document} root
 */
export function expandOdometerDrums(root) {
    if (!root) return;
    const digits = root.querySelectorAll ? root.querySelectorAll('dx-d[data-seq]') : [];
    for (let i = 0; i < digits.length; i++) {
        const d = digits[i];
        const seq = d.getAttribute('data-seq');
        if (seq && !seq.includes('\n') && seq.length > 1) {
            d.setAttribute('data-seq', [...seq].join('\n'));
        }
        if (seq && d.style && typeof d.style.getPropertyValue === 'function' && !d.style.getPropertyValue('--p')) {
            const totalItems = seq.includes('\n') ? seq.split('\n').length : seq.length;
            const finalPosPercent = totalItems > 1 ? -(((totalItems - 1) / totalItems) * 100).toFixed(4) : 0;
            d.style.setProperty('--p', `${finalPosPercent}%`);
        }
    }
}

if (rootWin) {
    Object.assign(rootWin, { DxMeter, UiMeter: DxMeter, uiNum, generateRibbonHtml, generateDataO, expandOdometerDrums });
}
