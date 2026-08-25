// dx-counter.js — DATEx2 <dx-counter> Web Component (100% Pure CSS / GPU Counter).
//
// Hardware-accelerated numeric counter using CSS @property, @keyframes and counter().
// Renders dynamic slot structure with threshold delays for thousand/million groups.
// Pure ES2026 — zero external dependencies, 0 forced reflows.
//
// exports: DxCounter
// used_by: src/client/index.js

import { DxMeter } from '../base/dx-meter.js';
import { rootWin, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';

const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda';
const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal';

// Proprietățile CSS GPU (--dxc-*) sunt înregistrate declarativ în dx-counter.css via @property.
// Nu este necesară înregistrarea din JS (ar fi redundantă și ignorată de browser).



export class DxCounter extends DxMeter {
    static get observedAttributes() {
        return ['prefix', 'suffix', 'comma', 'type', 'percent', 'value', 'duration'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal || !this._initialized || this._isRendering) return;
        // percent/value/duration changes are handled exclusively by val() — never re-render
        if (name === 'percent' || name === 'value' || name === 'duration') return;
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

    constructor() {
        super();
        this._animationStarted = false;
        this._inViewport = false;
        this._parentReady = false;
        this._pendingVal = null;
        this._timeoutId = null;
        this._isRendering = false;
        this._onAnimEndBound = this._onAnimEnd.bind(this);
    }

    connectedCallback() {
        if (this._initialized) return;

        const inST = typeof this.closest === 'function' ? !!this.closest('s-t') : false;
        if (inST) {
            this.makeStatic();
            this.innerHTML = this.getStaticHTML();
            return;
        }

        const isSsr = typeof this.querySelector === 'function' && Boolean(this.querySelector('.dx-num-wrap'));
        if (isSsr) {
            this.init();
            return;
        }

        // Use setTimeout(0) only for dynamically created elements
        setTimeout(() => {
            if (this.isConnected && !this._initialized) {
                this.init();
            }
        }, 0);
    }

    getStaticHTML() {
        const valAttr = this.getAttribute('percent') || this.getAttribute('value') || this.textContent;
        const numericValue = parseFloat(valAttr);
        if (isNaN(numericValue)) return this.textContent.trim();
        return this.formatValue(numericValue);
    }

    isReadyToAnimate() {
        const parentC = typeof this.closest === 'function' ? this.closest('c') : null;
        const parentReveal = typeof this.closest === 'function' ? this.closest(REVEAL_PARENT_SEL) : null;
        if (!parentC && !parentReveal) {
            this._inViewport = true;
            this._parentReady = true;
            return true;
        }
        if (this._inViewport && !this._parentReady) {
            if (parentReveal) {
                if (parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains('revealed') || parentReveal.classList.contains('revealing') || (parentReveal.hasAttribute && parentReveal.hasAttribute('data-static')))) {
                    this._parentReady = true;
                }
            }
        }
        return Boolean(this._inViewport && this._parentReady);
    }

    getDuration() {
        if (this.hasAttribute('duration')) {
            const parsed = parseFloat(this.getAttribute('duration'));
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const t = parseFloat(this.style.getPropertyValue('--t')) || parseFloat(this.closest('[style*="--t"]')?.style.getPropertyValue('--t')) || 0;
        return t > 0 ? t : 600;
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
        const wrap = this.querySelector('.dx-num');
        if (wrap) {
            const elB = wrap.querySelector('.dx-b');
            const elSepB = wrap.querySelector('.dx-sep-b');
            const elM = wrap.querySelector('.dx-m');
            const elSepM = wrap.querySelector('.dx-sep-m');
            const elK = wrap.querySelector('.dx-k');
            const elSepK = wrap.querySelector('.dx-sep-k');
            const elRadix = wrap.querySelector('.dx-radix');
            const elDec = wrap.querySelector('.dx-dec');

            const hasB = target >= 1e9 || start >= 1e9;
            const hasM = target >= 1e6 || start >= 1e6;
            const hasK = target >= 1e3 || start >= 1e3;
            const cfg = this.getFormatConfig();
            const hasDec = cfg.comma !== '' && cfg.type !== 'int' && (tParts.dec > 0 || sParts.dec > 0 || cfg.type.includes('number'));

            const setDisp = (el, v) => {
                if (el && el.style.display !== v) el.style.display = v;
            };

            setDisp(elB, hasB ? 'inline' : 'none');
            setDisp(elSepB, hasB ? 'inline' : 'none');
            setDisp(elM, hasM ? 'inline' : 'none');
            setDisp(elSepM, hasM ? 'inline' : 'none');
            setDisp(elK, hasK ? 'inline' : 'none');
            setDisp(elSepK, hasK ? 'inline' : 'none');
            setDisp(elRadix, hasDec ? 'inline' : 'none');
            setDisp(elDec, hasDec ? 'inline' : 'none');
        }
    }

    render() {
        this._isRendering = true;
        const cfg = this.getFormatConfig();
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue))
            ? this._targetValue
            : this.getNumericValue();
        const formattedFull = this.formatValue(targetVal);

        let wrap = this.querySelector('.dx-num-wrap');
        let st = this.querySelector('s-t');

        if (!wrap) {
            this.innerHTML =
                `<s-t>${formattedFull}</s-t>`
                + `<span class="dx-num-wrap">`
                + `<span class="dx-pfx">${cfg.prefix || ''}</span>`
                + `<span class="dx-num">`
                + `<span class="dx-b" style="display: none;"></span><span class="dx-sep-b" style="display: none;"> </span>`
                + `<span class="dx-m" style="display: none;"></span><span class="dx-sep-m" style="display: none;"> </span>`
                + `<span class="dx-k" style="display: none;"></span><span class="dx-sep-k" style="display: none;"> </span>`
                + `<span class="dx-u"></span>`
                + `<span class="dx-radix">${cfg.comma || ','}</span>`
                + `<span class="dx-dec"></span>`
                + `</span>`
                + `<span class="dx-sfx">${cfg.suffix || ''}</span>`
                + `</span>`;
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
        const num = this.querySelector('.dx-num');
        if (num) {
            this._elB = num.querySelector('.dx-b');
            this._elSepB = num.querySelector('.dx-sep-b');
            this._elM = num.querySelector('.dx-m');
            this._elSepM = num.querySelector('.dx-sep-m');
            this._elK = num.querySelector('.dx-k');
            this._elSepK = num.querySelector('.dx-sep-k');
            this._elRadix = num.querySelector('.dx-radix');
            this._elDec = num.querySelector('.dx-dec');
        }
        this._cachedCfg = this.getFormatConfig();
    }

    _onAnimEnd(e) {
        if (e && e.target && !e.target.classList.contains('dx-num')) return;
        this._value = this._targetValue;
        this._updateCounterVars(this._value);

        this.classList.remove('dx-counter-running');
        this.makeStatic();

        const st = this.querySelector('s-t');
        if (st) {
            st.textContent = this.formatValue(this._value);
        }
        const num = this.querySelector('.dx-num');
        if (num) {
            num.removeEventListener('animationend', this._onAnimEndBound);
        }
    }

    _updateCounterVars(currentVal) {
        if (!this._elDec && !this._elRadix) {
            this._cacheDOMElements();
        }
        const c = this._decompose(currentVal);
        if (c.b !== this._lastB) { this.style.setProperty('--dxc-b', String(c.b)); this._lastB = c.b; }
        if (c.m !== this._lastM) { this.style.setProperty('--dxc-m', String(c.m)); this._lastM = c.m; }
        if (c.k !== this._lastK) { this.style.setProperty('--dxc-k', String(c.k)); this._lastK = c.k; }
        if (c.u !== this._lastU) { this.style.setProperty('--dxc-u', String(c.u)); this._lastU = c.u; }
        if (c.dec !== this._lastDec) { this.style.setProperty('--dxc-dec', String(c.dec)); this._lastDec = c.dec; }

        const hasB = currentVal >= 1e9;
        const hasM = currentVal >= 1e6;
        const hasK = currentVal >= 1e3;
        const cfg = this._cachedCfg || this.getFormatConfig();
        const hasDec = cfg.comma !== '' && cfg.type !== 'int' && (c.dec > 0 || cfg.type.includes('number'));

        if (hasB !== this._lastHasB) {
            if (this._elB) this._elB.style.display = hasB ? 'inline' : 'none';
            if (this._elSepB) this._elSepB.style.display = hasB ? 'inline' : 'none';
            this._lastHasB = hasB;
        }
        if (hasM !== this._lastHasM) {
            if (this._elM) this._elM.style.display = hasM ? 'inline' : 'none';
            if (this._elSepM) this._elSepM.style.display = hasM ? 'inline' : 'none';
            this._lastHasM = hasM;
        }
        if (hasK !== this._lastHasK) {
            if (this._elK) this._elK.style.display = hasK ? 'inline' : 'none';
            if (this._elSepK) this._elSepK.style.display = hasK ? 'inline' : 'none';
            this._lastHasK = hasK;
        }
        if (hasDec !== this._lastHasDec) {
            if (this._elRadix) this._elRadix.style.display = hasDec ? 'inline' : 'none';
            if (this._elDec) this._elDec.style.display = hasDec ? 'inline' : 'none';
            this._lastHasDec = hasDec;
        }
    }

    _checkAndTrigger() {
        const ready = this.isReadyToAnimate();
        if (!ready) return;

        if (this._pendingVal) {
            const { targetValue, duration } = this._pendingVal;
            this._pendingVal = null;
            this._animationStarted = true;
            this.val(targetValue, duration);
            return;
        }

        if (!this._animationStarted) {
            const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this.getNumericValue();
            this._animationStarted = true;

            if (this._value !== targetVal) {
                const isActionBar = this.classList && this.classList.contains('ui-add-to-cart-total');
                const dur = this.hasAttribute('duration') ? parseFloat(this.getAttribute('duration')) : (isActionBar ? 600 : this.getDuration());
                const d = this.hasAttribute('delay') ? parseFloat(this.getAttribute('delay')) : (isActionBar ? 200 : 0);

                this.style.setProperty('--dxc-duration', `${dur}ms`);
                this.style.setProperty('--dxc-delay', `${d}ms`);
                this.style.setProperty('--t', `${dur}ms`);
                this.style.setProperty('--delay', `${d}ms`);
                this._updateCounterVars(targetVal);
            }
        }
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;
        this._animationStarted = false;
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }

        const inST = typeof this.closest === 'function' ? !!this.closest('s-t') : false;
        const isStatic = inST || this.hasAttribute('data-static') || (this.classList && this.classList.contains('data-static') && !this.classList.contains('ui-add-to-cart-total'));
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue) && this._targetValue !== 0)
            ? this._targetValue
            : (parseFloat(this.getAttribute('percent')) || this.getNumericValue() || 0);
        const hasSsrMarkup = typeof this.querySelector === 'function' && Boolean(this.querySelector('.dx-num-wrap'));
        if (isStatic || (!this.hasAttribute('start') && hasSsrMarkup)) {
            this._value = targetVal;
            this._animationStarted = true;
        } else {
            this._value = this.hasAttribute('start') ? (parseFloat(this.getAttribute('start')) || 0) : 0;
        }

        if (!hasSsrMarkup) {
            this.render();
        } else {
            this._cacheDOMElements();
        }
        this.setAccessibility(targetVal);

        // Action bar elements are visible immediately
        const parentC = typeof this.closest === 'function' ? this.closest('c') : null;
        const parentReveal = typeof this.closest === 'function' ? this.closest(REVEAL_PARENT_SEL) : null;
        const noScrollParent = !parentC && !parentReveal;

        if (noScrollParent || isStatic) {
            this._inViewport = true;
            this._parentReady = true;
        } else {
            observeIO(this, () => {
                this._inViewport = true;
                this._checkAndTrigger();
            });
        }

        if (isStatic) {
            this.makeStatic();
            return;
        }

        if (parentC) {
            const parentType = this.closest(TYPE_PARENT_SEL);
            if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains('typed') || parentType.hasAttribute('data-static'))) {
                this._parentReady = true;
            } else {
                parentC.addEventListener('animationstart', (e) => {
                    if (e.target === parentC) {
                        this._parentReady = true;
                        this._checkAndTrigger();
                    }
                }, { once: true });
            }
        } else if (parentReveal) {
            if (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains('revealed') || parentReveal.classList.contains('revealing') || parentReveal.hasAttribute('data-static')) {
                this._parentReady = true;
            } else {
                const onParentAnim = () => {
                    this._parentReady = true;
                    this._checkAndTrigger();
                };
                parentReveal.addEventListener('animationstart', onParentAnim, { once: true });
                parentReveal.addEventListener('transitionstart', onParentAnim, { once: true });
                parentReveal.addEventListener('animationend', onParentAnim, { once: true });
                const choiceParent = this.closest('.form-control--checkbox-button, .details-product-option');
                if (choiceParent && choiceParent !== parentReveal) {
                    choiceParent.addEventListener('animationstart', onParentAnim, { once: true });
                    choiceParent.addEventListener('transitionstart', onParentAnim, { once: true });
                }
            }
        } else {
            this._parentReady = true;
        }

        this._checkAndTrigger();
    }

    disconnectedCallback() {
        if (this._timeoutId) { clearTimeout(this._timeoutId); this._timeoutId = null; }
    }

    val(newValue, duration) {
        if (!this._initialized) this.init();
        if (newValue === undefined) return (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this._value;

        const parsedValue = parseFloat(newValue) || 0;
        this._targetValue = parsedValue;

        if (this._initialized && this._value === parsedValue && !this._pendingVal) {
            this.setAccessibility(parsedValue);
            return this;
        }

        const animDuration = (duration !== undefined && duration !== null) ? duration : this.getDuration();
        const ready = this.isReadyToAnimate();

        if (!ready && animDuration > 0) {
            this._pendingVal = { targetValue: parsedValue, duration: animDuration };
            this.setAttribute('percent', parsedValue);
            this.setAccessibility(parsedValue);
            return this;
        }

        this._animationStarted = true;
        this._pendingVal = null;
        this._value = parsedValue;
        this.setAttribute('percent', parsedValue);
        this.setAccessibility(parsedValue);

        // Update static <s-t>
        const st = this.querySelector('s-t');
        if (st) st.textContent = this.formatValue(parsedValue);

        // 100% pure declarative GPU CSS transition
        this.style.setProperty('--dxc-duration', `${animDuration}ms`);
        this.style.setProperty('--dxc-delay', '0ms');
        this.style.setProperty('--t', `${animDuration}ms`);
        this.style.setProperty('--d', '0ms');
        this.style.setProperty('--delay', '0ms');
        this._updateCounterVars(parsedValue);

        return this;
    }
}

// Auto-register custom element
defCustomElement('dx-counter', DxCounter);

if (rootWin) {
    Object.assign(rootWin, { DxCounter });
}
