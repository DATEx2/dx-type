// dx-meter.js — DATEx2 Base Class for Numeric Meters & Odometers.
//
// exports: DxMeter, uiNum
// used_by: src/client/components/dx-number.js, src/client/components/dx-odometer.js

import { DxBase, rootWin } from './dx-base.js';

// ─── Self-contained uiNum formatter (ported faithfully from ww3/uiNum.js) ───
export class uiNum {
    static format(value, type = 'number', comma = ',', prefix = '', suffix = ' €') {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return '';

        const isNegative = numVal < 0;
        const absValue = Math.abs(numVal);

        let decimals = 0;
        if (type.includes('number-1dec')) {
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
        if (isNegative) {
            finalPrefix = '– ';
        } else if (numVal > 0 && prefix.includes('+')) {
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
        return this.hasAttribute('data-static');
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
        this.setAttribute('data-static', 'true');
    }
}

if (rootWin) {
    rootWin.DxMeter = DxMeter;
    rootWin.UiMeter = DxMeter;  // backward compat alias
    rootWin.uiNum = uiNum;
}
