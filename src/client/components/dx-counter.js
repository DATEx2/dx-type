// dx-counter.js — DATEx2 <dx-counter> Web Component (100% Pure CSS / GPU Counter).
//
// Hardware-accelerated numeric counter using CSS @property, @keyframes and counter().
// Renders dynamic slot structure with threshold delays for thousand/million groups.
// Pure ES2026 — zero external dependencies, 0 forced reflows.
//
// exports: DxCounter
// used_by: src/client/index.js

import { DxNumber } from './dx-number.js';
import { rootWin, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO, registerRAF, unregisterRAF } from '../base/dx-scheduler.js';
import { onTypewriterEnd } from '../base/dx-typing.js';

const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda';
const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal';

// ─── 1. Cache Unic la Nivel de Modul pentru CSS Houdini ──────────────────────
// Default to centralized rAF batcher for 60-144 FPS locked frame rates across all tables
const SUPPORTS_HOUDINI = false;

// Inregistrare proprietati CSS GPU (--dxc-*) via CSS.registerProperty dacă browserul suportă
if (SUPPORTS_HOUDINI) {
    const props = [
        '--dxc-b', '--dxc-m', '--dxc-k', '--dxc-u', '--dxc-dec',
        '--dxc-from-b', '--dxc-to-b', '--dxc-from-m', '--dxc-to-m',
        '--dxc-from-k', '--dxc-to-k', '--dxc-from-u', '--dxc-to-u',
        '--dxc-from-dec', '--dxc-to-dec'
    ];
    props.forEach(p => {
        try {
            CSS.registerProperty({
                name: p,
                syntax: '<integer>',
                initialValue: 0,
                inherits: true
            });
        } catch (e) {}
    });
}

let _supportsHoudiniOverride = null;

export class DxCounter extends DxNumber {
    static get observedAttributes() {
        return ['prefix', 'suffix', 'comma', 'type', 'percent', 'value', 'duration'];
    }

    static get supportsHoudini() {
        if (_supportsHoudiniOverride !== null) return _supportsHoudiniOverride;
        return SUPPORTS_HOUDINI;
    }

    static set supportsHoudini(val) {
        _supportsHoudiniOverride = val;
    }

    get value() {
        return this._value;
    }

    set value(val) {
        this.val(val);
    }

    constructor() {
        super();
        this._onAnimEndBound = this._onAnimEnd.bind(this);
    }

    init() {
        if (this._initialized) return;
        this._cacheDOMElements();
        const hasSsr = typeof this.querySelector === 'function' && Boolean(this.querySelector('.dx-num-wrap'));
        if (!hasSsr) {
            this.render();
        } else if (this.hasAttribute && this.hasAttribute('start') && this.getAttribute('start') !== '') {
            const startVal = parseFloat(this.getAttribute('start')) || 0;
            this._updateCounterVars(startVal);
        }
        super.init();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal || !this._initialized || this._isRendering) return;
        // percent/value/duration changes are handled exclusively by val() — never re-render
        if (name === 'percent' || name === 'value') {
            const p = parseFloat(newVal);
            if (!isNaN(p) && p !== this._value && this._initialized) {
                this.val(p);
            }
            return;
        }
        if (name === 'duration') return;
        // prefix/suffix/comma/type: patch existing DOM elements in-place, no render()
        const wrap = this.querySelector('.dx-num-wrap');
        if (!wrap) return; // not yet rendered — init() will handle it
        if (name === 'prefix') {
            const pfx = wrap.querySelector('.dx-pfx');
            if (pfx) pfx.textContent = newVal || '';
        } else if (name === 'suffix') {
            const sfx = wrap.querySelector('.dx-sfx');
            if (sfx) sfx.textContent = newVal || '';
        } else if (name === 'comma') {
            const radix = wrap.querySelector('.dx-radix');
            if (radix) radix.textContent = newVal || ',';
        }
        // 'type' changes only affect future formatValue calls, no DOM surgery needed
    }

    _decompose(val) {
        const num = Math.abs(parseFloat(val) || 0);
        const intPart = Math.floor(num);
        const decPart = Math.round((num - intPart) * 100);

        return {
            b: Math.floor(intPart / 1e9),
            m: Math.floor((intPart % 1e9) / 1e6),
            k: Math.floor((intPart % 1e6) / 1e3),
            u: Math.floor(intPart % 1e3),
            dec: decPart
        };
    }

    _setupTiming(start, target, dur) {
        const sParts = this._decompose(start);
        const tParts = this._decompose(target);

        let delayK = 0;
        let delayM = 0;
        let delayB = 0;
        let delayKHide = 0;
        let delayMHide = 0;

        if (start < target) {
            const totalDiff = target - start;
            if (totalDiff > 0) {
                if (start < 1e3 && target >= 1e3) {
                    const deltaK = (1e3 - start) / totalDiff;
                    const p = 1 - Math.sqrt(Math.max(0, 1 - deltaK));
                    delayK = Math.max(0, Math.round(p * dur));
                }
                if (start < 1e6 && target >= 1e6) {
                    const deltaM = (1e6 - start) / totalDiff;
                    const p = 1 - Math.sqrt(Math.max(0, 1 - deltaM));
                    delayM = Math.max(0, Math.round(p * dur));
                }
                if (start < 1e9 && target >= 1e9) {
                    const deltaB = (1e9 - start) / totalDiff;
                    const p = 1 - Math.sqrt(Math.max(0, 1 - deltaB));
                    delayB = Math.max(0, Math.round(p * dur));
                }
            }
        } else if (start > target) {
            const totalDiff = start - target;
            if (totalDiff > 0) {
                if (start >= 1e3 && target < 1e3) {
                    const deltaK = (start - 1e3) / totalDiff;
                    const p = 1 - Math.sqrt(Math.max(0, 1 - deltaK));
                    delayKHide = Math.max(0, Math.round(p * dur));
                }
                if (start >= 1e6 && target < 1e6) {
                    const deltaM = (start - 1e6) / totalDiff;
                    const p = 1 - Math.sqrt(Math.max(0, 1 - deltaM));
                    delayMHide = Math.max(0, Math.round(p * dur));
                }
            }
        }

        if (this._elB?.style) {
            this._elB.style.setProperty('--dxc-from-b', String(sParts.b));
            this._elB.style.setProperty('--dxc-to-b', String(tParts.b));
            this._elB.style.setProperty('--dxc-b', String(tParts.b));
            this._elB.style.setProperty('--dxc-duration', `${dur}ms`);
            this._elB.style.setProperty('--dxc-delay-b', `${delayB}ms`);
        }
        if (this._elM?.style) {
            this._elM.style.setProperty('--dxc-from-m', String(sParts.m));
            this._elM.style.setProperty('--dxc-to-m', String(tParts.m));
            this._elM.style.setProperty('--dxc-m', String(tParts.m));
            this._elM.style.setProperty('--dxc-duration', `${dur}ms`);
            this._elM.style.setProperty('--dxc-delay-m', `${delayM}ms`);
        }
        if (this._elK?.style) {
            this._elK.style.setProperty('--dxc-from-k', String(sParts.k));
            this._elK.style.setProperty('--dxc-to-k', String(tParts.k));
            this._elK.style.setProperty('--dxc-k', String(tParts.k));
            this._elK.style.setProperty('--dxc-duration', `${dur}ms`);
            this._elK.style.setProperty('--dxc-delay-k', `${delayK}ms`);
        }
        if (this._elU?.style) {
            this._elU.style.setProperty('--dxc-from-u', String(sParts.u));
            this._elU.style.setProperty('--dxc-to-u', String(tParts.u));
            this._elU.style.setProperty('--dxc-u', String(tParts.u));
            this._elU.style.setProperty('--dxc-duration', `${dur}ms`);
        }
        if (this._elDec?.style) {
            this._elDec.style.setProperty('--dxc-from-dec', String(sParts.dec));
            this._elDec.style.setProperty('--dxc-to-dec', String(tParts.dec));
            this._elDec.style.setProperty('--dxc-dec', String(tParts.dec));
            this._elDec.style.setProperty('--dxc-duration', `${dur}ms`);
        }

        // Set CSS Custom Properties on inline style for GPU interpolation (only if changed)
        const setProp = (p, v) => {
            const sVal = String(v);
            if (this.style.getPropertyValue(p) !== sVal) {
                this.style.setProperty(p, sVal);
            }
        };

        setProp('--dxc-from-b', sParts.b);
        setProp('--dxc-to-b', tParts.b);
        setProp('--dxc-from-m', sParts.m);
        setProp('--dxc-to-m', tParts.m);
        setProp('--dxc-from-k', sParts.k);
        setProp('--dxc-to-k', tParts.k);
        setProp('--dxc-from-u', sParts.u);
        setProp('--dxc-to-u', tParts.u);
        setProp('--dxc-from-dec', sParts.dec);
        setProp('--dxc-to-dec', tParts.dec);
        setProp('--dxc-b', tParts.b);
        setProp('--dxc-m', tParts.m);
        setProp('--dxc-k', tParts.k);
        setProp('--dxc-u', tParts.u);
        setProp('--dxc-dec', tParts.dec);
        setProp('--dxc-duration', `${dur}ms`);
        setProp('--dxc-delay-k', `${delayK}ms`);
        setProp('--dxc-delay-m', `${delayM}ms`);
        setProp('--dxc-delay-b', `${delayB}ms`);
        if (delayKHide > 0) setProp('--dxc-delay-k-hide', `${delayKHide}ms`);
        if (delayMHide > 0) setProp('--dxc-delay-m-hide', `${delayMHide}ms`);

        // Visibility toggles to avoid ghost whitespace for smaller numbers
        if (!this._elDec && !this._elU) {
            this._cacheDOMElements();
        }
        const hasB = target >= 1e9 || start >= 1e9;
        const hasM = target >= 1e6 || start >= 1e6;
        const hasK = target >= 1e3 || start >= 1e3;
        const cfg = this._cachedCfg || (typeof this.getFormatConfig === 'function' ? this.getFormatConfig() : {});
        const hasDec = cfg.comma !== '' && cfg.type !== 'int' && (tParts.dec > 0 || sParts.dec > 0 || (cfg.type && cfg.type.includes('number')));

        const setDisp = (el, v) => {
            if (el && el.style.display !== v) el.style.display = v;
        };

        setDisp(this._elB, hasB ? 'inline' : 'none');
        setDisp(this._elM, hasM ? 'inline' : 'none');
        setDisp(this._elK, hasK ? 'inline' : 'none');
        setDisp(this._elDec, hasDec ? 'inline' : 'none');
    }

    render() {
        this._isRendering = true;
        const cfg = this.getFormatConfig();
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue))
            ? this._targetValue
            : this.getNumericValue();
        const formattedFull = this.formatValue(targetVal);

        let wrap = this.querySelector('.dx-num-wrap');
        let st = this.querySelector('dx-s');

        if (!wrap) {
            const hasB = targetVal >= 1e9;
            const hasM = targetVal >= 1e6;
            const hasK = targetVal >= 1e3;
            const tParts = this._decompose(targetVal);
            const hasDec = cfg.comma !== '' && cfg.type !== 'int' && (tParts.dec > 0 || (cfg.type && cfg.type.includes('number')));

            const pfxHtml = cfg.prefix ? `<span class="dx-pfx">${cfg.prefix}</span>` : '';
            const sfxHtml = cfg.suffix ? `<span class="dx-sfx">${cfg.suffix}</span>` : '';
            const bHtml = `<span class="dx-b"${hasB ? '' : ' style="display: none;"'}></span>`;
            const mHtml = `<span class="dx-m"${hasM ? '' : ' style="display: none;"'}></span>`;
            const kHtml = `<span class="dx-k"${hasK ? '' : ' style="display: none;"'}></span>`;
            const uHtml = `<span class="dx-u"></span>`;
            const decHtml = `<span class="dx-dec"${hasDec ? '' : ' style="display: none;"'}>${cfg.comma || ','}</span>`;

            this.innerHTML =
                `<dx-s>${formattedFull}</dx-s>`
                + `<span class="dx-num-wrap">${pfxHtml}${bHtml}${mHtml}${kHtml}${uHtml}${decHtml}${sfxHtml}</span>`;
        } else {
            if (st && st.textContent !== formattedFull) {
                st.textContent = formattedFull;
            }
        }

        this._cacheDOMElements();
        const startVal = this._value !== undefined ? this._value : targetVal;
        this._updateCounterVars(startVal);
        this._isRendering = false;
    }

    _cacheDOMElements() {
        const wrap = typeof this.querySelector === 'function' ? this.querySelector('.dx-num-wrap') : null;
        if (wrap) {
            this._elB = wrap.querySelector('.dx-b');
            this._elM = wrap.querySelector('.dx-m');
            this._elK = wrap.querySelector('.dx-k');
            this._elU = wrap.querySelector('.dx-u');
            this._elDec = wrap.querySelector('.dx-dec');
            this._elPfx = wrap.querySelector('.dx-pfx');
            this._elSfx = wrap.querySelector('.dx-sfx');
        }
        this._cachedCfg = typeof this.getFormatConfig === 'function' ? this.getFormatConfig() : {};
    }

    _updateCounterVars(currentVal, isFinal = false) {
        if (!this._elDec && !this._elU) {
            this._cacheDOMElements();
        }
        const c = this._decompose(currentVal);
        const hasB = currentVal >= 1e9;
        const hasM = currentVal >= 1e6;
        const hasK = currentVal >= 1e3;
        const cfg = this._cachedCfg || (typeof this.getFormatConfig === 'function' ? this.getFormatConfig() : {});
        const radix = cfg.comma !== '' ? (cfg.comma || ',') : ',';
        const hasDec = cfg.comma !== '' && cfg.type !== 'int' && (c.dec > 0 || (cfg.type && cfg.type.includes('number')));

        if (this._elB) {
            const bStr = hasB ? String(c.b) : '';
            if (this._elB.textContent !== bStr) this._elB.textContent = bStr;
        }
        if (this._elM) {
            const mStr = hasM ? (hasB ? String(c.m).padStart(3, '0') : String(c.m)) : '';
            if (this._elM.textContent !== mStr) this._elM.textContent = mStr;
        }
        if (this._elK) {
            const kStr = hasK ? (hasM ? String(c.k).padStart(3, '0') : String(c.k)) : '';
            if (this._elK.textContent !== kStr) this._elK.textContent = kStr;
        }
        if (this._elU) {
            const uStr = hasK ? String(c.u).padStart(3, '0') : String(c.u);
            if (this._elU.textContent !== uStr) this._elU.textContent = uStr;
        }
        if (this._elDec) {
            const is1Dec = cfg.type && (cfg.type.includes('number-1dec') || cfg.type.includes('float-1dec'));
            const decVal = is1Dec ? Math.round(c.dec / 10) : String(c.dec).padStart(2, '0');
            const decStr = hasDec ? `${radix}${decVal}` : '';
            if (this._elDec.textContent !== decStr) this._elDec.textContent = decStr;
        }

        // Only toggle display when segment presence actually changes (Zero Forced Reflow / Layout Thrashing)
        if (hasB !== this._lastHasB) {
            if (this._elB) this._elB.style.display = hasB ? 'inline' : 'none';
            this._lastHasB = hasB;
        }
        if (hasM !== this._lastHasM) {
            if (this._elM) this._elM.style.display = hasM ? 'inline' : 'none';
            this._lastHasM = hasM;
        }
        if (hasK !== this._lastHasK) {
            if (this._elK) this._elK.style.display = hasK ? 'inline' : 'none';
            this._lastHasK = hasK;
        }
        if (hasDec !== this._lastHasDec) {
            if (this._elDec) this._elDec.style.display = hasDec ? 'inline' : 'none';
            this._lastHasDec = hasDec;
        }

        // Child elements (_elB, _elM, _elK, _elU, _elDec) display values via .textContent.
        // We write --dxc-* custom properties on children ONLY on final state or if Houdini mode is active.
        if (isFinal || DxCounter.supportsHoudini) {
            if (this._elB?.style) this._elB.style.setProperty('--dxc-b', (hasB ? String(c.b) : '0'));
            if (this._elM?.style) this._elM.style.setProperty('--dxc-m', (hasM ? String(c.m) : '0'));
            if (this._elK?.style) this._elK.style.setProperty('--dxc-k', (hasK ? String(c.k) : '0'));
            if (this._elU?.style) this._elU.style.setProperty('--dxc-u', String(c.u));
            if (this._elDec?.style) this._elDec.style.setProperty('--dxc-dec', String(c.dec));
        }

        // On the counter root element itself, keep --dxc-* updated when segment values change
        if (this.style && typeof this.style.setProperty === 'function') {
            if (c.b !== this._lastB) { this.style.setProperty('--dxc-b', String(c.b)); this._lastB = c.b; }
            if (c.m !== this._lastM) { this.style.setProperty('--dxc-m', String(c.m)); this._lastM = c.m; }
            if (c.k !== this._lastK) { this.style.setProperty('--dxc-k', String(c.k)); this._lastK = c.k; }
            if (c.u !== this._lastU) { this.style.setProperty('--dxc-u', String(c.u)); this._lastU = c.u; }
            if (c.dec !== this._lastDec) { this.style.setProperty('--dxc-dec', String(c.dec)); this._lastDec = c.dec; }
        }
    }

    _stepAnimation(now) {
        if (this._animStartTime === null || this._animStartTime === undefined) {
            this._animStartTime = now;
        }

        const elapsed = Math.max(0, now - this._animStartTime);
        const duration = this._animDuration;
        const targetValue = this._targetValue;
        const startValue = this._animStartValue;

        if (elapsed >= duration) {
            this._value = targetValue;
            this.setAttribute('percent', this._value);
            this.makeStatic();
            this.classList.remove('ui-number-running');
            this._updateCounterVars(targetValue, true);
            this.setAccessibility(targetValue);
            unregisterRAF(this);
            this._animDone = true;
            const twEmbed = this.classList.contains('tw-embed') || !!(typeof this.closest === 'function' && this.closest(TYPE_PARENT_SEL));
            if (twEmbed) {
                onTypewriterEnd(this);
            }
        } else {
            const progress = elapsed / duration;
            const easeProgress = progress * (2 - progress);
            this._value = startValue + (targetValue - startValue) * easeProgress;
            this._updateCounterVars(this._value, false);
        }
    }

    animateTo(targetValue, duration) {
        if (typeof this.removeAttribute === 'function') this.removeAttribute('data-static');
        this._targetValue = targetValue;
        this._animStartValue = (this._value !== undefined && !isNaN(this._value)) ? this._value : 0;
        this._animDuration = duration;
        this._animStartTime = null;
        this._lastTickTime = null;
        this._lastHasB = null;
        this._lastHasM = null;
        this._lastHasK = null;
        this._lastHasDec = null;
        this.classList.add('ui-number-running');
        this._updateCounterVars(this._animStartValue, false);
        registerRAF(this);
    }

    _onAnimEnd(e) {
        if (e && e.target && !e.target.classList.contains('dx-num')) return;
        this._value = this._targetValue;
        this._updateCounterVars(this._value, true);

        this.classList.remove('dx-counter-running');
        this.makeStatic();

        const st = this.querySelector('dx-s');
        if (st) {
            st.textContent = this.formatValue(this._value);
        }
        const num = this.querySelector('.dx-num');
        if (num) {
            num.removeEventListener('animationend', this._onAnimEndBound);
            num.removeEventListener('transitionend', this._onAnimEndBound);
        }

        this._animDone = true;
        const twEmbed = this.classList.contains('tw-embed') || !!(typeof this.closest === 'function' && this.closest(TYPE_PARENT_SEL));
        if (twEmbed) {
            onTypewriterEnd(this);
        }
    }

    val(newValue, duration) {
        if (!this._initialized) this.init();
        if (newValue === undefined) return (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this._value;

        const parsedValue = parseFloat(newValue) || 0;
        this._targetValue = parsedValue;

        const startVal = (this._value !== undefined && !isNaN(this._value)) ? this._value : 0;

        if (this._initialized && startVal === parsedValue && !this._pendingVal) {
            this.setAccessibility(parsedValue);
            return this;
        }

        const animDuration = (duration !== undefined && duration !== null) ? duration : (this.getDuration() || 600);
        const ready = this.isReadyToAnimate();

        if (!ready && animDuration > 0) {
            this._pendingVal = { targetValue: parsedValue, duration: animDuration };
            this.setAttribute('percent', parsedValue);
            this.setAccessibility(parsedValue);
            return this;
        }

        this._animationStarted = true;
        this._pendingVal = null;
        this.setAttribute('percent', parsedValue);
        this.setAccessibility(parsedValue);

        // Update static <dx-s>
        const st = this.querySelector('dx-s');
        if (st) st.textContent = this.formatValue(parsedValue);

        if (DxCounter.supportsHoudini) {
            // ── Mode 1: Pure declarative GPU CSS transition with threshold calculation ──
            unregisterRAF(this);
            this._setupTiming(startVal, parsedValue, animDuration);
            return this;
        }

        // ── Mode 2 (Default / Ultra-smooth 60-144 FPS Batched rAF): Zero layout thrashing ──
        this._value = startVal;
        if (animDuration > 0 && startVal !== parsedValue) {
            this.animateTo(parsedValue, animDuration);
        } else {
            unregisterRAF(this);
            this.classList.remove('ui-number-running');
            this._value = parsedValue;
            this._updateCounterVars(parsedValue);
            this.setAccessibility(parsedValue);
        }
        return this;
    }
}

// Auto-register custom element
defCustomElement('dx-counter', DxCounter);

if (rootWin) {
    Object.assign(rootWin, { DxCounter });
}
