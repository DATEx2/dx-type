// dx-number.js — DATEx2 <dx-number> Web Component (Lightweight animated numeric counter).
//
// Uses centralized rAF batch ticker from dx-scheduler.
// Supports Action Bar visibility gate and typewriter-embed mode.
// Pure ES2026 — zero external dependencies.
//
// exports: DxNumber
// used_by: src/client/index.js

import { DxMeter } from '../base/dx-meter.js';
import { rootWin } from '../base/dx-base.js';
import { registerRAF, unregisterRAF, DX_ANIM } from '../base/dx-scheduler.js';

// ─── Action Bar Visibility Gate (Singleton Observer) ─────────────────────────
const actionBarSubscribers = new Set();
let actionBarObserver = null;

function checkActionBarShown(abParent) {
    const docEl = rootWin?.document?.documentElement;
    const docBody = rootWin?.document?.body;
    return !!(
        docEl?.classList.contains('show-action-bar') ||
        docBody?.classList.contains('show-action-bar') ||
        docEl?.classList.contains('showing-action-bar') ||
        docBody?.classList.contains('showing-action-bar') ||
        abParent?.classList.contains('show-action-bar') ||
        abParent?.classList.contains('showing-action-bar')
    );
}

function notifyActionBarSubscribers() {
    if (actionBarSubscribers.size === 0) return;
    const subs = Array.from(actionBarSubscribers);
    actionBarSubscribers.clear();
    if (actionBarObserver) {
        actionBarObserver.disconnect();
        actionBarObserver = null;
    }
    for (let i = 0; i < subs.length; i++) {
        if (typeof subs[i]._triggerActionBarAnimation === 'function') {
            subs[i]._triggerActionBarAnimation();
        }
    }
}

function subscribeToActionBar(el, abParent) {
    if (checkActionBarShown(abParent)) {
        if (typeof el._triggerActionBarAnimation === 'function') {
            el._triggerActionBarAnimation();
        }
        return;
    }
    actionBarSubscribers.add(el);
    if (!actionBarObserver && typeof MutationObserver !== 'undefined') {
        actionBarObserver = new MutationObserver(() => {
            if (checkActionBarShown(abParent)) {
                notifyActionBarSubscribers();
            }
        });
        const docEl = rootWin?.document?.documentElement;
        const docBody = rootWin?.document?.body;
        if (docEl) actionBarObserver.observe(docEl, { attributes: true, attributeFilter: ['class'] });
        if (docBody) actionBarObserver.observe(docBody, { attributes: true, attributeFilter: ['class'] });
        if (abParent) actionBarObserver.observe(abParent, { attributes: true, attributeFilter: ['class'] });
    }
}

function unsubscribeFromActionBar(el) {
    actionBarSubscribers.delete(el);
    if (actionBarSubscribers.size === 0 && actionBarObserver) {
        actionBarObserver.disconnect();
        actionBarObserver = null;
    }
}

// ─── Parent selectors (dx-* tags + legacy class/tag selectors) ───────────────
const SDA_PARENT_SEL = 'dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda, .TYPE-, .REVEAL-, ui-type-sda, ui-reveal-sda';
const TYPE_PARENT_SEL = 'dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda';
const REVEAL_PARENT_SEL = 'dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal, .form-control--checkbox-button';

export class DxNumber extends DxMeter {
    constructor() {
        super();
        this._animationStarted = false;
        this._timeoutId = null;
        this._numSpan = null;
    }

    connectedCallback() {
        if (this.isStatic) return;
        if (this._initialized) return;

        const schedule = (typeof queueMicrotask === 'function') ? queueMicrotask : (cb => setTimeout(cb, 0));
        schedule(() => {
            if (this.isConnected && !this._initialized) {
                this.init();
            }
        });
    }

    init() {
        this._initialized = true;
        this._animationStarted = false;
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }

        this._value = this.getNumericValue();
        const isAnimateOnLoad = !this.classList.contains('tw-embed');

        if (isAnimateOnLoad) {
            const startVal = parseFloat(this.getAttribute('start')) || 0;
            const targetVal = (this._value !== undefined && !isNaN(this._value) && this._value !== 0) ? this._value : (parseFloat(this.getAttribute('percent')) || 0);
            this._targetValue = targetVal;
            this._value = startVal;
            this._animationStarted = false;
            this.render();

            const trigger = () => {
                if (this._animationStarted) return;
                this._animationStarted = true;
                const d = parseFloat(this.closest('[style*="--d"]')?.style.getPropertyValue('--d')) || 0;
                if (d > 0) {
                    setTimeout(() => this.val(targetVal, 400), d);
                } else {
                    this.val(targetVal, 400);
                }
            };

            const abParent = this.closest('.action-bar, .action-bar-wrapper');
            const sdaParent = this.closest(SDA_PARENT_SEL);

            if (abParent) {
                this._triggerActionBarAnimation = trigger;
                subscribeToActionBar(this, abParent);
            } else if (sdaParent) {
                sdaParent.addEventListener('animationstart', () => {
                    if (!this._animationStarted) trigger();
                }, { once: true });

                if (sdaParent.classList.contains(DX_ANIM.REVEALED) || sdaParent.classList.contains(DX_ANIM.TYPED) ||
                    sdaParent.classList.contains('revealed') || sdaParent.classList.contains('typed')) {
                    this._revealTriggered = true;
                }
                if (this._revealTriggered && !this._animationStarted) trigger();
            } else {
                trigger();
            }
        } else if (this.classList.contains('tw-embed')) {
            const startVal = parseFloat(this.getAttribute('start')) || 0;
            const targetVal = this._value;
            this._targetValue = targetVal;
            this._value = startVal;
            this._animationStarted = false;
            this.render();

            const parentType = this.closest(TYPE_PARENT_SEL);
            const parentC = this.closest('c');
            const parentReveal = this.closest(REVEAL_PARENT_SEL);

            const triggerCounting = () => {
                if (this._animationStarted) return;
                delete this._pendingValue;
                this._animationStarted = true;
                this.val(targetVal, 800);
            };

            if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains('typed'))) {
                triggerCounting();
                return;
            }
            if (parentReveal && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains('revealed'))) {
                triggerCounting();
                return;
            }

            if (parentC) {
                parentC.addEventListener('animationstart', (e) => {
                    if (e.target === parentC && !this._animationStarted) {
                        const u = (parentC.style && parseFloat(parentC.style.getPropertyValue('--u'))) || 40;
                        this._twDelayId = setTimeout(triggerCounting, u * 0.35);
                    }
                }, { once: true });
            }
            if (parentType && parentC) {
                parentType.addEventListener('animationstart', (e) => {
                    if (e.target === parentC && !this._animationStarted) {
                        const u = (parentC.style && parseFloat(parentC.style.getPropertyValue('--u'))) || 40;
                        this._twDelayId = setTimeout(triggerCounting, u * 0.35);
                    }
                }, { once: true });
            }
            if (parentReveal && !parentC) {
                parentReveal.addEventListener('animationstart', (e) => {
                    if (!this._animationStarted) {
                        const d = (parentReveal.style && parseFloat(parentReveal.style.getPropertyValue('--d'))) || 0;
                        if (d > 0) {
                            this._twDelayId = setTimeout(triggerCounting, d);
                        } else {
                            triggerCounting();
                        }
                    }
                }, { once: true });
            }

            this._pendingValue = targetVal;
        } else {
            this._animationStarted = true;
            this.render();
        }
    }

    disconnectedCallback() {
        if (this._timeoutId) { clearTimeout(this._timeoutId); this._timeoutId = null; }
        if (this._twDelayId) { clearTimeout(this._twDelayId); this._twDelayId = null; }
        unsubscribeFromActionBar(this);
        unregisterRAF(this);
        this.classList.remove('ui-number-running');
    }

    val(newValue, duration) {
        if (!this._initialized) this.init();
        if (newValue === undefined) return this._value;

        const parsedValue = parseFloat(newValue) || 0;
        this._targetValue = parsedValue;
        if (this._initialized && this._value === parsedValue) {
            this.setAccessibility(parsedValue);
            return this;
        }
        this._animationStarted = true;
        const animDuration = (duration !== undefined && duration !== null) ? duration : 800;

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
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            this._value = startValue + (targetValue - startValue) * easeProgress;
            this._updateFrameDisplay(targetValue);
        }
    }

    _updateFrameDisplay(targetVal) {
        const numSpan = this._numSpan || (this._numSpan = this.querySelector('.ui-num'));
        if (!numSpan) { this.render(); return; }

        const formatted = this.formatValue(this._value);
        const m = /^([^0-9]*?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)$/.exec(formatted);
        const mainDigits = m?.[2] || '';
        const radixMark = m?.[3] || '';
        const decimalDigits = m?.[4] || '';

        let digitPadHtml = '';
        if (targetVal !== undefined && !isNaN(targetVal) && this._value !== targetVal) {
            const tf = this.formatValue(targetVal);
            const tm = /^([^0-9]*?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)$/.exec(tf);
            const missing = (tm?.[2] || '').replace(/\s/g, '').length - mainDigits.replace(/\s/g, '').length;
            if (missing > 0) digitPadHtml = `<span class="ui-pad">${'0'.repeat(missing)}</span>`;
        }

        const newInner = `${digitPadHtml}${mainDigits}${radixMark}${decimalDigits}`;
        if (numSpan.innerHTML !== newInner) numSpan.innerHTML = newInner;
    }

    render() {
        const formatted = this.formatValue(this._value);
        const m = /^([^0-9]*?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)$/.exec(formatted);
        const prefixText = (m?.[1] || '').trim();
        const mainDigits = m?.[2] || '';
        const radixMark = m?.[3] || '';
        const decimalDigits = m?.[4] || '';
        const suffixText = (m?.[5] || '').trim();
        const prefixSpace = (m?.[1] || '').endsWith(' ') ? ' ' : '';
        const suffixSpace = (m?.[5] || '').startsWith(' ') ? ' ' : '';

        const targetVal = (this._targetValue !== undefined && !isNaN(this._targetValue)) ? this._targetValue : (parseFloat(this.getAttribute('percent')) || 0);
        let pfxPadHtml = '';
        let digitPadHtml = '';

        if (!this.isStatic && targetVal !== undefined && !isNaN(targetVal) && this._value !== targetVal) {
            const tf = this.formatValue(targetVal);
            const tm = /^([^0-9]*?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)$/.exec(tf);
            const tp = (tm?.[1] || '').trim();
            const tps = (tm?.[1] || '').endsWith(' ') ? ' ' : '';

            if (this._value === 0 && targetVal > 0 && tp.includes('+') && !prefixText.includes('+')) {
                pfxPadHtml = `<span class="ui-pfx ui-pfx-pad">${tp}${tps}</span>`;
            } else if (!prefixText && tp.trim()) {
                pfxPadHtml = `<span class="ui-pfx ui-pfx-pad">${tp}${tps}</span>`;
            }
            const missing = (tm?.[2] || '').replace(/\s/g, '').length - mainDigits.replace(/\s/g, '').length;
            if (missing > 0) digitPadHtml = `<span class="ui-pad">${'0'.repeat(missing)}</span>`;
        }

        const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefixSpace}</span>` : pfxPadHtml;
        const sfxHtml = suffixText ? `<span class="ui-sfx">${suffixSpace}${suffixText}</span>` : '';
        const numHtml = `<span class="ui-num">${digitPadHtml}${mainDigits}${radixMark}${decimalDigits}</span>`;
        const newHtml = `${pfxHtml}${numHtml}${sfxHtml}`;

        if (this.innerHTML !== newHtml) {
            this.innerHTML = newHtml;
            this._numSpan = this.querySelector('.ui-num');
        }
        if (!this.getAttribute('aria-label')) this.setAccessibility(targetVal);
    }
}

if (rootWin) {
    rootWin.DxNumber = DxNumber;
    rootWin.UiNumber = DxNumber;  // backward compat alias
    rootWin.uiNumber = DxNumber;  // backward compat alias
    if (rootWin.customElements && !rootWin.customElements.get('dx-number')) {
        rootWin.customElements.define('dx-number', DxNumber);
    }
}
