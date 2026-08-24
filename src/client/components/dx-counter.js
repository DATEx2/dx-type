// dx-counter.js — DATEx2 <dx-counter> Web Component (100% Pure CSS / GPU-accelerated numeric counter).
//
// Uses CSS @property, @keyframes, and counter() for zero-CPU animation on the Compositor thread.
// Supports Action Bar visibility gate, Typewriter embed readiness, and dynamic .val() updates.
// Pure ES2026 — zero external dependencies.
//
// exports: DxCounter
// used_by: src/client/index.js

import { DxMeter, parseNumParts, uiNum } from '../base/dx-meter.js';
import { rootWin, defCustomElement } from '../base/dx-base.js';
import { DX_ANIM, observeIO } from '../base/dx-scheduler.js';

const SDA_PARENT_SEL = 'dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda, .TYPE-, .REVEAL-, ui-type-sda, ui-reveal-sda';
const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda';
const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal';

export class DxCounter extends DxMeter {
    static get observedAttributes() {
        return ['prefix', 'suffix', 'comma', 'type', 'hide-zero', 'empty-zero', 'percent', 'value'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal && this._initialized && !this._isRendering) {
            if (name === 'percent' || name === 'value') {
                this.val(newVal, 0);
            } else {
                this.render();
            }
        }
    }

    constructor() {
        super();
        this._animationStarted = false;
        this._inViewport = false;
        this._parentReady = false;
        this._pendingVal = null;
        this._timeoutId = null;
        this._twDelayId = null;
        this._isRendering = false;
        this._onAnimEndBound = this._onAnimEnd.bind(this);
    }

    connectedCallback() {
        if (this.isStatic) return;
        if (this._initialized) return;

        const inST = !!this.closest('s-t');
        if (inST) {
            this.makeStatic();
            this.innerHTML = this.getStaticHTML();
            return;
        }

        const schedule = (typeof queueMicrotask === 'function') ? queueMicrotask : (cb => setTimeout(cb, 0));
        schedule(() => {
            if (this.isConnected && !this._initialized) {
                this.init();
            }
        });
    }

    getStaticHTML() {
        const valAttr = this.getAttribute('percent') || this.getAttribute('value') || this.textContent;
        const numericValue = parseFloat(valAttr);
        if (isNaN(numericValue)) return this.textContent.trim();
        if ((this.hasAttribute('hide-zero') || this.hasAttribute('empty-zero')) && numericValue === 0) {
            return '';
        }
        return this.formatValue(numericValue);
    }

    isReadyToAnimate() {
        if (this._inViewport && !this._parentReady) {
            const parentC = this.closest('c');
            const parentReveal = this.closest(REVEAL_PARENT_SEL);
            if (!parentC && !parentReveal) {
                this._parentReady = true;
            } else if (parentReveal) {
                if (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains('revealed') || parentReveal.classList.contains('revealing') || parentReveal.hasAttribute('data-static')) {
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

    _setupTiming(startVal, targetVal, duration) {
        const start = Math.abs(parseFloat(startVal) || 0);
        const target = Math.abs(parseFloat(targetVal) || 0);
        const dur = (duration !== undefined && duration !== null) ? duration : this.getDuration();

        const sParts = this._decompose(start);
        const tParts = this._decompose(target);

        // Quad Ease-Out timing inversion: t = 1 - sqrt(1 - delta)
        let delayK = 0, delayM = 0, delayB = 0;
        let delayKHide = 0, delayMHide = 0, delayBHide = 0;

        if (target > start) {
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

        // Set CSS Custom Properties on inline style for GPU interpolation
        this.style.setProperty('--start-b', sParts.b);
        this.style.setProperty('--target-b', tParts.b);
        this.style.setProperty('--start-m', sParts.m);
        this.style.setProperty('--target-m', tParts.m);
        this.style.setProperty('--start-k', sParts.k);
        this.style.setProperty('--target-k', tParts.k);
        this.style.setProperty('--start-u', sParts.u);
        this.style.setProperty('--target-u', tParts.u);
        this.style.setProperty('--start-dec', sParts.dec);
        this.style.setProperty('--target-dec', tParts.dec);
        this.style.setProperty('--t', `${dur}ms`);
        this.style.setProperty('--delay-k', `${delayK}ms`);
        this.style.setProperty('--delay-m', `${delayM}ms`);
        this.style.setProperty('--delay-b', `${delayB}ms`);
        if (delayKHide > 0) this.style.setProperty('--delay-k-hide', `${delayKHide}ms`);
        if (delayMHide > 0) this.style.setProperty('--delay-m-hide', `${delayMHide}ms`);

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

            if (elB) elB.style.display = hasB ? 'inline' : 'none';
            if (elSepB) elSepB.style.display = hasB ? 'inline' : 'none';
            if (elM) elM.style.display = hasM ? 'inline' : 'none';
            if (elSepM) elSepM.style.display = hasM ? 'inline' : 'none';
            if (elK) elK.style.display = hasK ? 'inline' : 'none';
            if (elSepK) elSepK.style.display = hasK ? 'inline' : 'none';
            if (elRadix) elRadix.style.display = hasDec ? 'inline' : 'none';
            if (elDec) elDec.style.display = hasDec ? 'inline' : 'none';
        }
    }

    render() {
        this._isRendering = true;
        const cfg = this.getFormatConfig();
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this.getNumericValue();
        const formattedFull = this.formatValue(targetVal);

        // Ensure static <s-t> layer exists for SEO, screen readers and Ctrl+F
        let st = this.querySelector(':scope > s-t');
        if (!st) {
            st = document.createElement('s-t');
            this.prepend(st);
        }
        st.textContent = formattedFull;

        // Ensure dynamic GPU slot structure exists
        let wrap = this.querySelector(':scope > .dx-num-wrap');
        if (!wrap) {
            wrap = document.createElement('span');
            wrap.className = 'dx-num-wrap';
            wrap.innerHTML = `<span class="dx-pfx">${cfg.prefix}</span>`
                + `<span class="dx-num">`
                + `<span class="dx-b"></span><span class="dx-sep-b"> </span>`
                + `<span class="dx-m"></span><span class="dx-sep-m"> </span>`
                + `<span class="dx-k"></span><span class="dx-sep-k"> </span>`
                + `<span class="dx-u"></span>`
                + `<span class="dx-radix">${cfg.comma || ','}</span>`
                + `<span class="dx-dec"></span>`
                + `</span>`
                + `<span class="dx-sfx">${cfg.suffix}</span>`;
            this.appendChild(wrap);
        } else {
            const pfx = wrap.querySelector('.dx-pfx');
            if (pfx) pfx.textContent = cfg.prefix;
            const sfx = wrap.querySelector('.dx-sfx');
            if (sfx) sfx.textContent = cfg.suffix;
            const radix = wrap.querySelector('.dx-radix');
            if (radix) radix.textContent = cfg.comma || ',';
        }

        const startVal = this._value !== undefined ? this._value : 0;
        this._setupTiming(startVal, targetVal, this.getDuration());
        this._isRendering = false;
    }

    _onAnimEnd(e) {
        if (e && e.target && !e.target.classList.contains('dx-num')) return;
        this._value = this._targetValue;
        this.classList.remove('dx-counter-running');
        this.makeStatic();

        const st = this.querySelector(':scope > s-t');
        if (st) {
            st.textContent = this.formatValue(this._value);
        }
        const num = this.querySelector('.dx-num');
        if (num) {
            num.removeEventListener('animationend', this._onAnimEndBound);
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

            const dur = this.getDuration();
            const d = parseFloat(this.style.getPropertyValue('--d')) || parseFloat(this.closest('[style*="--d"]')?.style.getPropertyValue('--d')) || 0;

            const startAnim = () => {
                const num = this.querySelector('.dx-num');
                if (num) {
                    num.addEventListener('animationend', this._onAnimEndBound, { once: true });
                }
                this.classList.add('dx-counter-running');
            };

            if (d > 0) {
                this._timeoutId = setTimeout(startAnim, d);
            } else {
                startAnim();
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

        const isStatic = this.classList.contains('data-static') || this.isStatic || !!this.closest('s-t');
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue) && this._targetValue !== 0)
            ? this._targetValue
            : (parseFloat(this.getAttribute('percent')) || this.getNumericValue() || 0);
        this._targetValue = targetVal;

        if (isStatic) {
            this._value = targetVal;
            this._animationStarted = true;
        } else {
            this._value = this.hasAttribute('start') ? (parseFloat(this.getAttribute('start')) || 0) : 0;
        }

        this.render();
        this.setAccessibility(targetVal);

        if (isStatic) {
            this.makeStatic();
            return;
        }

        this._inViewport = false;

        // Viewport IO Singleton
        observeIO(this, () => {
            this._inViewport = true;
            this._checkAndTrigger();
        });

        // Parent animation readiness
        const parentC = this.closest('c');
        const parentReveal = this.closest(REVEAL_PARENT_SEL);

        if (parentC) {
            const parentType = this.closest(TYPE_PARENT_SEL);
            if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains('typed') || parentType.hasAttribute('data-static'))) {
                this._parentReady = true;
            } else {
                parentC.addEventListener('animationstart', (e) => {
                    if (e.target === parentC) {
                        const u = (parentC.style && parseFloat(parentC.style.getPropertyValue('--u'))) || 40;
                        this._twDelayId = setTimeout(() => {
                            this._parentReady = true;
                            this._checkAndTrigger();
                        }, u * 0.35);
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
        if (this._twDelayId) { clearTimeout(this._twDelayId); this._twDelayId = null; }
        this.classList.remove('dx-counter-running');
    }

    val(newValue, duration) {
        if (!this._initialized) this.init();
        if (newValue === undefined) return (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this._value;

        const parsedValue = parseFloat(newValue) || 0;
        const startVal = this._value !== undefined ? this._value : 0;
        this._targetValue = parsedValue;
        this._value = parsedValue;

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
        this.setAttribute('percent', parsedValue);
        this.setAccessibility(parsedValue);

        // Update static <s-t>
        const st = this.querySelector(':scope > s-t');
        if (st) st.textContent = this.formatValue(parsedValue);

        if (animDuration > 0) {
            this._setupTiming(startVal, parsedValue, animDuration);

            // Restart CSS GPU animation without forced layout reflow
            const num = this.querySelector('.dx-num');
            if (num) {
                num.removeEventListener('animationend', this._onAnimEndBound);
                num.addEventListener('animationend', this._onAnimEndBound, { once: true });
                num.style.animationName = 'none';
                if (typeof window !== 'undefined' && window.getComputedStyle) {
                    window.getComputedStyle(num).animationName; // Style recalc flush only
                }
                num.style.animationName = '';
            }
            this.classList.remove('data-static');
            this.classList.add('dx-counter-running');
        } else {
            this._setupTiming(parsedValue, parsedValue, 0);
            this.classList.remove('dx-counter-running');
            this.makeStatic();
        }

        return this;
    }
}

// Auto-register custom element
defCustomElement('dx-counter', DxCounter);

if (rootWin) {
    Object.assign(rootWin, { DxCounter });
}
