// dx-number.js — DATEx2 <dx-number> Web Component (Lightweight animated numeric counter).
//
// Uses centralized rAF batch ticker from dx-scheduler.
// Supports Action Bar visibility gate and typewriter-embed mode.
// Pure ES2026 — zero external dependencies.
//
// exports: DxNumber
// used_by: src/client/index.js

import { DxMeter, parseNumParts } from '../base/dx-meter.js';
import { rootWin, span, defCustomElement } from '../base/dx-base.js';
import { registerRAF, unregisterRAF, DX_ANIM, observeIO } from '../base/dx-scheduler.js';

// ─── Viewport Detection & Logging Helpers ─────────────────────────────────────
function getElDesc(el) {
    if (!el) return '<dx-number>';
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    const val = el.getAttribute('percent') || el.getAttribute('value') || '';
    const sfx = el.getAttribute('suffix') || '';
    return `<dx-number${id}${cls}> (${val}${sfx})`;
}

// ─── Parent selectors (dx-* tags + legacy class/tag selectors) ───────────────
const SDA_PARENT_SEL = 'dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda, .TYPE-, .REVEAL-, ui-type-sda, ui-reveal-sda';
const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda';
const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal';

export class DxNumber extends DxMeter {
    static get observedAttributes() {
        return ['prefix', 'suffix', 'comma', 'type', 'hide-zero', 'empty-zero'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal && this._initialized && !this._isRendering) {
            this.render();
        }
    }

    constructor() {
        super();
        this._animationStarted = false;
        this._inViewport = false;
        this._parentReady = false;
        this._pendingVal = null;
        this._timeoutId = null;
        this._numSpan = null;
        this._isRendering = false;
    }

    connectedCallback() {
        if (this.isStatic) return;
        if (this._initialized) return;

        const inST = typeof this.closest === 'function' && !!this.closest('s-t');
        if (inST) {
            this.makeStatic();
            this.innerHTML = this.getStaticHTML();
            return;
        }

        const isSsr = typeof this.querySelector === 'function' && Boolean(this.querySelector('.ui-num'));
        if (isSsr) {
            this.init();
            return;
        }

        // Strip SSR placeholder text/spans immediately to prevent duplication
        // before render() generates its own span structure.
        if (this.childNodes.length && typeof this.querySelector === 'function' && !this.querySelector('.ui-num')) {
            this.textContent = '';
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
            const parentC = typeof this.closest === 'function' ? this.closest('c') : null;
            const parentReveal = typeof this.closest === 'function' ? this.closest(REVEAL_PARENT_SEL) : null;
            if (!parentC && !parentReveal) {
                this._parentReady = true;
            } else if (parentReveal) {
                if (parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains('revealed') || parentReveal.classList.contains('revealing') || (parentReveal.hasAttribute && parentReveal.hasAttribute('data-static')))) {
                    this._parentReady = true;
                }
            }
        }
        return Boolean(this._inViewport && this._parentReady);
    }

    getDuration() {
        if (this.hasAttribute && this.hasAttribute('duration')) {
            const parsed = parseFloat(this.getAttribute('duration'));
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const t = parseFloat(this.style?.getPropertyValue?.('--t') || '') || parseFloat(typeof this.closest === 'function' ? this.closest('[style*="--t"]')?.style?.getPropertyValue?.('--t') : 0) || 0;
        return t > 0 ? t : 600;
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
            
            if (this._value !== targetVal) {
                this._animationStarted = true;
                const dur = this.getDuration();
                const d = parseFloat(this.style?.getPropertyValue?.('--d') || '') || parseFloat(typeof this.closest === 'function' ? this.closest('[style*="--d"]')?.style?.getPropertyValue?.('--d') : 0) || 0;
                if (d > 0) {
                    setTimeout(() => this.val(targetVal, dur), d);
                } else {
                    this.val(targetVal, dur);
                }
            } else {
                this._animationStarted = true;
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
        const isStatic = (this.classList && this.classList.contains('data-static')) || this.isStatic || inST;
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue) && this._targetValue !== 0)
            ? this._targetValue
            : (parseFloat(this.getAttribute('percent')) || this.getNumericValue() || 0);
        this._targetValue = targetVal;

        const hasSsr = typeof this.querySelector === 'function' && Boolean(this.querySelector('.ui-num'));
        if (isStatic || (this.hasAttribute && !this.hasAttribute('start'))) {
            this._value = targetVal;
            this._animationStarted = true;
        } else {
            this._value = (this.hasAttribute && parseFloat(this.getAttribute('start'))) || 0;
        }

        if (!hasSsr) {
            this.render();
        } else {
            this._numSpan = this.querySelector('.ui-num');
            this._pfxSpan = this.querySelector('.ui-pfx:not(.ui-pfx-pad)');
            this._sfxSpan = this.querySelector('.ui-sfx');
            this._cacheTextNodes();
        }

        this._inViewport = false;

        // 1. Condition #1: In-viewport observer (Singleton IO)
        observeIO(this, () => {
            this._inViewport = true;
            this._checkAndTrigger();
        });

        // 2. Condition #2: Parent animation readiness
        const parentC = typeof this.closest === 'function' ? this.closest('c') : null;
        const parentReveal = typeof this.closest === 'function' ? this.closest(REVEAL_PARENT_SEL) : null;

        if (parentC) {
            const parentType = typeof this.closest === 'function' ? this.closest(TYPE_PARENT_SEL) : null;
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
            if (parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains('revealed') || parentReveal.classList.contains('revealing') || (parentReveal.hasAttribute && parentReveal.hasAttribute('data-static')))) {
                this._parentReady = true;
            } else {
                const onParentAnim = () => {
                    this._parentReady = true;
                    this._checkAndTrigger();
                };
                parentReveal.addEventListener('animationstart', onParentAnim, { once: true });
                parentReveal.addEventListener('transitionstart', onParentAnim, { once: true });
                parentReveal.addEventListener('animationend', onParentAnim, { once: true });
                const choiceParent = typeof this.closest === 'function' ? this.closest('.form-control--checkbox-button, .details-product-option') : null;
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
        unregisterRAF(this);
        this.classList.remove('ui-number-running');
    }

    val(newValue, duration) {
        if (!this._initialized) this.init();
        if (newValue === undefined) return (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this._value;

        const parsedValue = parseFloat(newValue) || 0;
        this._targetValue = parsedValue;

        if (this._initialized && this._value === parsedValue && !this._pendingVal) {
            this.render();
            this.setAccessibility(parsedValue);
            return this;
        }

        const animDuration = (duration !== undefined && duration !== null) ? duration : this.getDuration();
        const ready = this.isReadyToAnimate();

        // If not yet ready to animate (e.g. element off-screen or Action Bar sliding up), defer execution
        if (!ready && animDuration > 0) {
            this._pendingVal = { targetValue: parsedValue, duration: animDuration };
            this.setAttribute('percent', parsedValue);
            this.setAccessibility(parsedValue);
            return this;
        }

        this._animationStarted = true;
        this._pendingVal = null;

        if (animDuration > 0 && this._value !== parsedValue) {
            this.setAttribute('percent', parsedValue);
            this.setAccessibility(parsedValue);
            this.animateTo(parsedValue, animDuration);
        } else {
            unregisterRAF(this);
            this.classList.remove('ui-number-running');
            this._value = parsedValue;
            this.setAttribute('percent', this._value);
            this.render();
            this.setAccessibility(parsedValue);
        }
        return this;
    }

    animateTo(targetValue, duration) {
        if (typeof this.removeAttribute === 'function') this.removeAttribute('data-static');
        this._targetValue = targetValue;
        this._animStartValue = this._value;
        this._animDuration = duration;
        this._animStartTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        this.classList.add('ui-number-running');
        this.render();
        registerRAF(this);
    }

    _stepAnimation(now) {
        const elapsed = Math.max(0, now - this._animStartTime);
        const duration = this._animDuration;
        const targetValue = this._targetValue;
        const startValue = this._animStartValue;

        if (elapsed >= duration) {
            this._value = targetValue;
            this.setAttribute('percent', this._value);
            this.makeStatic();
            this.classList.remove('ui-number-running');
            this.render();
            this.setAccessibility(targetValue);
            unregisterRAF(this);
        } else {
            const progress = elapsed / duration;
            const easeProgress = progress * (2 - progress);
            this._value = startValue + (targetValue - startValue) * easeProgress;
            this._updateFrameDisplay(targetValue);
        }
    }

    _updateFrameDisplay(targetVal) {
        // hide-zero fast path — use cached TextNode, avoid innerHTML
        if ((this.hasAttribute('hide-zero') || this.hasAttribute('empty-zero')) && (this._value === 0 || Math.abs(this._value) < 0.0001)) {
            if (this._numTextNode) this._numTextNode.nodeValue = '';
            if (this._padTextNode) this._padTextNode.nodeValue = '';
            return;
        }

        // Must have cached TextNode from render() — if missing, do full render once
        if (!this._numTextNode) { this.render(); return; }

        const p = parseNumParts(this.formatValue(this._value));
        const numText = `${p.digits}${p.radix}${p.decimals}`;

        // Update number text via nodeValue (NO layout invalidation)
        if (this._numTextNode.nodeValue !== numText) {
            this._numTextNode.nodeValue = numText;
        }

        // Update pad prefix (leading zeros) via nodeValue
        if (this._padTextNode) {
            const effectiveTarget = (targetVal !== undefined && !isNaN(targetVal)) ? targetVal : this.getNumericValue();
            let padPrefix = '';
            if (effectiveTarget !== undefined && !isNaN(effectiveTarget) && this._value !== effectiveTarget) {
                const tp = parseNumParts(this.formatValue(effectiveTarget));
                if (tp.digits.length > p.digits.length) {
                    padPrefix = tp.digits.slice(0, tp.digits.length - p.digits.length).replace(/\d/g, '0');
                }
            }
            if (this._padTextNode.nodeValue !== padPrefix) {
                this._padTextNode.nodeValue = padPrefix;
            }
        }
    }

    // Cache TextNode references inside .ui-num for zero-invalidation rAF updates.
    // Called once after render() builds/updates DOM structure.
    _cacheTextNodes() {
        const numSpan = this._numSpan;
        if (!numSpan) { this._numTextNode = null; this._padTextNode = null; return; }
        const padEl = numSpan.querySelector('.ui-pad');
        if (padEl) {
            // Pad element exists: cache its TextNode and the sibling TextNode for digits
            this._padTextNode = padEl.firstChild;
            if (!this._padTextNode || this._padTextNode.nodeType !== 3) {
                this._padTextNode = document.createTextNode('');
                padEl.appendChild(this._padTextNode);
            }
            this._numTextNode = padEl.nextSibling;
            if (!this._numTextNode || this._numTextNode.nodeType !== 3) {
                this._numTextNode = document.createTextNode('');
                numSpan.appendChild(this._numTextNode);
            }
        } else {
            // No pad: cache the single TextNode for digits
            this._padTextNode = null;
            this._numTextNode = numSpan.firstChild;
            if (!this._numTextNode || this._numTextNode.nodeType !== 3) {
                this._numTextNode = document.createTextNode('');
                numSpan.appendChild(this._numTextNode);
            }
        }
    }

    render() {
        if (this._isRendering) return;
        this._isRendering = true;
        try {
            if ((this.hasAttribute('hide-zero') || this.hasAttribute('empty-zero')) && (this._value === 0 || Math.abs(this._value) < 0.0001)) {
                if (this.innerHTML !== '') {
                    this.innerHTML = '';
                    this._numSpan = null;
                    this._pfxSpan = null;
                    this._sfxSpan = null;
                    this._numTextNode = null;
                    this._padTextNode = null;
                }
                if (!this.getAttribute('aria-label')) this.setAccessibility(0);
                return;
            }

            const p = parseNumParts(this.formatValue(this._value));
            const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this.getNumericValue();
            
            let pfxPadHtml = '';
            let padPrefix = '';

            if (!this.isStatic && targetVal !== undefined && !isNaN(targetVal) && this._value !== targetVal) {
                const tp = parseNumParts(this.formatValue(targetVal));
                if (this._value === 0 && targetVal > 0 && tp.pfx.includes('+') && !p.pfx.includes('+')) {
                    pfxPadHtml = span('ui-pfx ui-pfx-pad', `${tp.pfx}${tp.pfxSpace}`);
                } else if (!p.pfx && tp.pfx) {
                    pfxPadHtml = span('ui-pfx ui-pfx-pad', `${tp.pfx}${tp.pfxSpace}`);
                }
                const targetDigits = tp.digits;
                const currentDigits = p.digits;
                if (targetDigits.length > currentDigits.length) {
                    const padLen = targetDigits.length - currentDigits.length;
                    padPrefix = targetDigits.slice(0, padLen).replace(/\d/g, '0');
                }
            }

            const pfxStr = p.pfx ? `${p.pfx}${p.pfxSpace}` : '';
            const sfxStr = p.sfx ? `${p.sfxSpace}${p.sfx}` : '';
            const numText = `${p.digits}${p.radix}${p.decimals}`;

            let numSpan = this._numSpan || (this._numSpan = this.querySelector('.ui-num'));

            // Fast-path: Direct TextNode updates when DOM structure is already intact
            if (numSpan && this.contains(numSpan)) {
                // Strip any stray text nodes directly inside <dx-number> to guarantee zero text duplication
                Array.from(this.childNodes).forEach(node => {
                    if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
                        node.remove();
                    }
                });
                // 1. Update Prefix TextNode
                let pfxSpan = this._pfxSpan || (this._pfxSpan = this.querySelector('.ui-pfx:not(.ui-pfx-pad)'));
                if (pfxStr) {
                    if (!pfxSpan) {
                        pfxSpan = document.createElement('span');
                        pfxSpan.className = 'ui-pfx';
                        pfxSpan.textContent = pfxStr;
                        this.insertBefore(pfxSpan, numSpan);
                        this._pfxSpan = pfxSpan;
                    } else if (pfxSpan.textContent !== pfxStr) {
                        if (pfxSpan.firstChild && pfxSpan.firstChild.nodeType === 3) {
                            pfxSpan.firstChild.nodeValue = pfxStr;
                        } else {
                            pfxSpan.textContent = pfxStr;
                        }
                    }
                } else if (pfxSpan) {
                    pfxSpan.remove();
                    this._pfxSpan = null;
                }

                // 2. Update Num TextNode (with pad support)
                if (padPrefix) {
                    let padEl = numSpan.querySelector('.ui-pad');
                    if (!padEl) {
                        numSpan.innerHTML = `<span class="ui-pad">${padPrefix}</span>${numText}`;
                    } else {
                        if (padEl.textContent !== padPrefix) padEl.textContent = padPrefix;
                        const nextNode = padEl.nextSibling;
                        if (nextNode && nextNode.nodeType === 3) {
                            if (nextNode.nodeValue !== numText) nextNode.nodeValue = numText;
                        } else {
                            numSpan.innerHTML = `<span class="ui-pad">${padPrefix}</span>${numText}`;
                        }
                    }
                } else {
                    const padEl = numSpan.querySelector('.ui-pad');
                    if (padEl) padEl.remove();
                    if (numSpan.firstChild && numSpan.firstChild.nodeType === 3 && !numSpan.firstChild.nextSibling) {
                        if (numSpan.firstChild.nodeValue !== numText) {
                            numSpan.firstChild.nodeValue = numText;
                        }
                    } else if (numSpan.textContent !== numText) {
                        numSpan.textContent = numText;
                    }
                }

                // 3. Update Suffix TextNode
                let sfxSpan = this._sfxSpan || (this._sfxSpan = this.querySelector('.ui-sfx'));
                if (sfxStr) {
                    if (!sfxSpan) {
                        sfxSpan = document.createElement('span');
                        sfxSpan.className = 'ui-sfx';
                        sfxSpan.textContent = sfxStr;
                        this.appendChild(sfxSpan);
                        this._sfxSpan = sfxSpan;
                    } else if (sfxSpan.textContent !== sfxStr) {
                        if (sfxSpan.firstChild && sfxSpan.firstChild.nodeType === 3) {
                            sfxSpan.firstChild.nodeValue = sfxStr;
                        } else {
                            sfxSpan.textContent = sfxStr;
                        }
                    }
                } else if (sfxSpan) {
                    sfxSpan.remove();
                    this._sfxSpan = null;
                }

                if (!this.getAttribute('aria-label')) this.setAccessibility(targetVal);
                this._cacheTextNodes();
                return;
            }

            // Fallback: Initial full HTML construction
            const digitPadHtml = padPrefix ? span('ui-pad', padPrefix) : '';
            const pfxHtml = pfxStr ? span('ui-pfx', pfxStr) : '';
            const sfxHtml = sfxStr ? span('ui-sfx', sfxStr) : '';
            const numHtml = span('ui-num', `${digitPadHtml}${numText}`);
            const newHtml = `${pfxPadHtml}${pfxHtml}${numHtml}${sfxHtml}`;

            if (this.innerHTML !== newHtml) {
                this.innerHTML = newHtml;
                this._numSpan = this.querySelector('.ui-num');
                this._pfxSpan = this.querySelector('.ui-pfx');
                this._sfxSpan = this.querySelector('.ui-sfx');
            }
            if (!this.getAttribute('aria-label')) this.setAccessibility(targetVal);
            this._cacheTextNodes();
        } finally {
            this._isRendering = false;
        }
    }

    replay() {
        if (this._twDelayId) clearTimeout(this._twDelayId);
        if (this._timeoutId) clearTimeout(this._timeoutId);
        this._animationStarted = false;
        this.classList.remove('ui-number-running');
        this.removeAttribute('data-static');
        const startVal = parseFloat(this.getAttribute('start')) || 0;
        this._value = startVal;
        this.render();
        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : this.getNumericValue();
        const d = parseFloat(this.style.getPropertyValue('--d')) || 0;
        setTimeout(() => this.val(targetVal, 800), Math.max(50, d));
        return true;
    }
}

if (rootWin) {
    rootWin.DxNumber = rootWin.UiNumber = rootWin.uiNumber = DxNumber;
}
defCustomElement('dx-number', DxNumber);
defCustomElement('ui-number', DxNumber);
