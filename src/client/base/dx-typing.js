// dx-typing.js — DATEx2 Base Class & Lifecycle for Typewriter Components.
//
// exports: DxTyping, unpackTemplate, onTypewriterEnd, cleanupTypedDOM, ensureElementsUpToTarget, bootstrapTypewriterObserver
// used_by: src/client/components/dx-type.js, src/client/components/dx-type-sda.js

import { DxBase, rootWin } from './dx-base.js';
import { observeIO, unobserveIO, queueIdleUnpack, removeFromIdleQueue, getIO, DX_ANIM } from './dx-scheduler.js';
import { generateRibbonHtml, expandOdometerDrums } from './dx-meter.js';

// ─── HEX_LUT — Zero-parseInt hex nibble lookup ─────────────────────────────
export const HEX_LUT = new Uint8Array(128);
for (let i = 0; i < 10; i++) HEX_LUT[48 + i] = i;       // '0'-'9'
for (let i = 0; i < 6; i++)  HEX_LUT[65 + i] = 10 + i;  // 'A'-'F'
for (let i = 0; i < 6; i++)  HEX_LUT[97 + i] = 10 + i;  // 'a'-'f'

export function getTypewriterObserver(win) {
    return getIO(win);
}

// ─── Build <dx-t> layer from <dx-s> using w="..." bytecode + childNodes tree walk ─
export function buildTypingLayer(ts, delay, offset, speed) {
    let tHtml = '';
    let charIdx = 0;

    function walk(el) {
        const wAttr = el.getAttribute('w');
        if (!wAttr) return;
        let wi = 0;

        for (const child of el.childNodes) {
            if (child.nodeType === 3) { // TextNode
                const chars = [...child.data];
                let ci = 0;
                while (ci < chars.length) {
                    if (chars[ci] === ' ' || chars[ci] === '\n' || chars[ci] === '\t') {
                        tHtml += chars[ci];
                        ci++;
                        continue;
                    }

                    // Read modifiers from w
                    let hyphen = false;
                    if (wi < wAttr.length && wAttr[wi] === '-') { hyphen = true; wi++; }

                    let extended = false;
                    if (wi < wAttr.length && wAttr[wi] === '+') { extended = true; wi++; }

                    // Read word length
                    let len;
                    if (extended) {
                        len = (HEX_LUT[wAttr.charCodeAt(wi)] << 4) | HEX_LUT[wAttr.charCodeAt(wi + 1)];
                        wi += 2;
                    } else {
                        len = HEX_LUT[wAttr.charCodeAt(wi)];
                        wi++;
                    }

                    // Emit word
                    const wClass = hyphen ? ' class="word"' : '';
                    tHtml += `<dx-w${wClass}>`;
                    for (let c = 0; c < len && ci < chars.length; c++, ci++) {
                        const ch = chars[ci];
                        const d = Math.round(delay + (offset + charIdx++) * speed);
                        const cls = (ch === '\u00B7' || ch === '\u2022') ? ' class="bullet-dot"' : '';
                        tHtml += `<dx-c${cls} style="animation-delay:${d}ms">${ch}</dx-c>`;
                    }
                    tHtml += '</dx-w>';
                }
            } else if (child.nodeType === 1) { // Element
                if (wi < wAttr.length) {
                    const tok = wAttr[wi++];
                    if (tok === '*') {
                        // Meter — clone
                        const d = Math.round(delay + (offset + charIdx++) * speed);
                        tHtml += `<dx-w><dx-c class="c-ui-num" style="animation-delay:${d}ms">${child.outerHTML}</dx-c></dx-w>`;
                    } else if (tok === ' ') {
                        // Generic element — recurse, preserving tag + attributes
                        const tag = child.tagName.toLowerCase();
                        let attrs = '';
                        for (let a = 0; a < child.attributes.length; a++) {
                            const at = child.attributes[a];
                            if (at.name !== 'w') attrs += ` ${at.name}="${at.value}"`;
                        }
                        tHtml += `<${tag}${attrs}>`;
                        walk(child);
                        tHtml += `</${tag}>`;
                    }
                }
            }
        }
    }

    walk(ts);
    return { tHtml, totalChars: charIdx };
}

// ─── Prepare template content strictly inside DocumentFragment (<template>.content) ─────
export function prepareTemplateContent(el) {
    if (!el) return false;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return false;

    // ─── New path: w="..." bytecode on <dx-s> (SDA compact mode, no <template>) ───
    const ts = el.querySelector(':scope > dx-s[w]');
    if (ts && !el.querySelector(':scope > dx-t')) {
        const style = el.getAttribute('style') || '';
        const dMatch = style.match(/--d:([\d.]+)/);
        const bMatch = style.match(/--b:([\d.]+)/);
        const uMatch = style.match(/--u:([\d.]+)/);
        const delay = dMatch ? parseFloat(dMatch[1]) : 0;
        const offset = bMatch ? parseFloat(bMatch[1]) : 0;
        const speed = uMatch ? parseFloat(uMatch[1]) : 40;
        const charDur = Math.round(speed * 3.5);

        const { tHtml, totalChars } = buildTypingLayer(ts, delay, offset, speed);
        if (tHtml) {
            const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
            if (doc) {
                const tLayer = doc.createElement('dx-t');
                tLayer.setAttribute('aria-hidden', 'true');
                tLayer.setAttribute('style', `animation-duration:${charDur}ms`);
                tLayer.innerHTML = tHtml;

                // Mark data-last on final <dx-c>
                const allTC = tLayer.querySelectorAll('dx-c');
                if (allTC.length > 0) {
                    const lastTC = allTC[allTC.length - 1];
                    lastTC.setAttribute('data-last', 'true');
                    lastTC.classList.add('last-char');
                }

                // Populate drums for embedded meters
                const odometers = tLayer.querySelectorAll('dx-odometer, ui-odometer');
                for (let i = 0; i < odometers.length; i++) {
                    const odo = odometers[i];
                    odo.classList.remove('data-static');
                    if (!odo.querySelector('b')) {
                        const val = odo.getAttribute('percent') || odo.getAttribute('value') || odo.textContent.trim();
                        const numVal = parseFloat(val) || 0;
                        const type = odo.getAttribute('type') || 'int';
                        const comma = odo.getAttribute('comma') || ',';
                        const prefix = odo.getAttribute('prefix') || '';
                        const suffix = odo.getAttribute('suffix') || '';
                        const start = odo.getAttribute('start') || null;
                        odo.innerHTML = generateRibbonHtml(numVal, type, comma, prefix, suffix, start);
                    }
                    expandOdometerDrums(odo);
                }

                el.appendChild(tLayer);
            }
        }
        return true;
    }

    // ─── Legacy path: <template> with pre-built <dx-t> content ───
    const tpl = el.querySelector(':scope > template');
    if (!tpl || !tpl.content) return false;
    if (tpl._prepared) return true;

    let tLayer = tpl.content.querySelector(':is(dx-t, t-t, t)');
    if (!tLayer) {
        const stLegacy = el.querySelector(':scope > :is(dx-s, t-s, s-t)');
        if (stLegacy) {
            const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
            if (doc) {
                tLayer = doc.createElement('dx-t');
                tLayer.setAttribute('aria-hidden', 'true');
                const style = el.getAttribute('style') || '';
                const uMatch = style.match(/--u:([\d.]+)/);
                const speed = uMatch ? parseFloat(uMatch[1]) : 40;
                const charDur = Math.round(speed * 3.5);
                tLayer.setAttribute('style', `animation-duration:${charDur}ms`);
                tLayer.innerHTML = stLegacy.innerHTML;
                tpl.content.appendChild(tLayer);
            }
        }
    }

    if (tLayer) {
        const nodes = tLayer.childNodes;
        if (nodes.length > 0) {
            const style = el.getAttribute('style') || '';
            const dMatch = style.match(/--d:([\d.]+)/);
            const bMatch = style.match(/--b:([\d.]+)/);
            const uMatch = style.match(/--u:([\d.]+)/);
            const delay = dMatch ? parseFloat(dMatch[1]) : 0;
            const offset = bMatch ? parseFloat(bMatch[1]) : 0;
            const speed = uMatch ? parseFloat(uMatch[1]) : 40;

            let charIdx = 0;
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                if (node.nodeType === 3) {
                    charIdx += (node.textContent || '').length;
                } else if (node.nodeType === 1) {
                    const tw = node;
                    if (tw.hasAttribute('data-ready')) {
                        charIdx += tw.querySelectorAll(':is(dx-c, t-c, i)').length;
                        continue;
                    }
                    const cUiNum = tw.querySelector(':is(dx-c, t-c, i).c-ui-num');
                    if (cUiNum) {
                        const odo = cUiNum.querySelector('dx-odometer, ui-odometer');
                        const exactDelay = Math.round(delay + (offset + charIdx) * speed);
                        charIdx += 1;
                        cUiNum.style.animationDelay = `${exactDelay}ms`;
                        if (odo) odo.style.setProperty('--d', exactDelay);
                    } else if (!tw.querySelector(':is(dx-c, t-c, i)')) {
                        const text = tw.textContent || '';
                        if (text) {
                            const chars = [...text];
                            let inner = '';
                            for (let j = 0; j < chars.length; j++) {
                                const ch = chars[j];
                                const exactDelay = Math.round(delay + (offset + charIdx++) * speed);
                                const cClass = (ch === '\u00B7' || ch === '\u2022') ? ' class="bullet-dot"' : '';
                                inner += `<dx-c${cClass} style="animation-delay:${exactDelay}ms">${ch}</dx-c>`;
                            }
                            tw.innerHTML = inner;
                        }
                    } else {
                        charIdx += tw.querySelectorAll(':is(dx-c, t-c, i)').length;
                    }
                    tw.setAttribute('data-ready', 'true');
                }
            }
        }

        // Populate drums for embedded meters in tLayer
        const odometers = tLayer.querySelectorAll('dx-odometer, ui-odometer');
        for (let i = 0; i < odometers.length; i++) {
            const odo = odometers[i];
            odo.classList.remove('data-static');
            if (!odo.querySelector('b')) {
                const val = odo.getAttribute('percent') || odo.getAttribute('value') || odo.textContent.trim();
                const numVal = parseFloat(val) || 0;
                const type = odo.getAttribute('type') || 'int';
                const comma = odo.getAttribute('comma') || ',';
                const prefix = odo.getAttribute('prefix') || '';
                const suffix = odo.getAttribute('suffix') || '';
                const start = odo.getAttribute('start') || null;
                odo.innerHTML = generateRibbonHtml(numVal, type, comma, prefix, suffix, start);
            }
            expandOdometerDrums(odo);
        }

        // Guarantee data-last on final character
        const allTC = tLayer.querySelectorAll(':is(dx-c, t-c, i)');
        if (allTC.length > 0) {
            const lastTC = allTC[allTC.length - 1];
            lastTC.setAttribute('data-last', 'true');
            lastTC.classList.add('last-char');
        }
    }
    tpl._prepared = true;
    return true;
}

// ─── Standalone unpackTemplate (mounts template.content into live DOM) ─────
export function unpackTemplate(el) {
    if (!el) return false;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return false;

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.classList.add(DX_ANIM.TYPED);
        return false;
    }

    // New path: w="..." bytecode (no template, t-t created by prepareTemplateContent)
    const tsWithW = el.querySelector(':scope > :is(dx-s, t-s, s-t)[w]');
    if (tsWithW && !el.querySelector(':scope > :is(dx-t, t-t, t)')) {
        prepareTemplateContent(el);
        if (!el.getAttribute('role')) el.setAttribute('role', 'text');
        const ts = el.querySelector(':scope > :is(dx-s, t-s, s-t)');
        if (ts && !el.getAttribute('aria-label')) {
            const raw = (ts.textContent || '').replace(/\s+/g, ' ').trim();
            if (raw) el.setAttribute('aria-label', raw);
        }
        const tt = el.querySelector(':scope > :is(dx-t, t-t, t)');
        if (tt) tt.setAttribute('aria-hidden', 'true');
        return true;
    }

    // Legacy path: template
    const tpl = el.querySelector(':scope > template');
    if (tpl && tpl.content) {
        prepareTemplateContent(el);
        if (!el.getAttribute('role')) el.setAttribute('role', 'text');
        const ts = el.querySelector(':scope > :is(dx-s, t-s, s-t)');
        if (ts) {
            if (!el.getAttribute('aria-label')) {
                const raw = (ts.textContent || '').replace(/\s+/g, ' ').trim();
                if (raw) el.setAttribute('aria-label', raw);
            }
        }
        tpl.replaceWith(tpl.content);
        const tt = el.querySelector(':scope > :is(dx-t, t-t, t)');
        if (tt) tt.setAttribute('aria-hidden', 'true');
        return true;
    }
    return false;
}

export function isElementHidden(el) {
    if (!el) return true;
    if (!el.closest('summary') && el.closest('details:not([open])')) return true;
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 719.5px), (max-width: 1024px) and (orientation: portrait)').matches;
    const hiddenParent = el.closest(isMobile ? '.hidden, [hidden], .wait-stuck:not(.is-stuck), .favorite-product__button--saved' : '.hidden, [hidden], .favorite-product__button--saved');
    if (hiddenParent && !hiddenParent.closest('.favorite-product--saved, .is-stuck')) return true;
    return false;
}

// ─── Observe element for JIT template unpack via Singleton IO & Idle Queue ───
export function observeTypewriter(el) {
    if (!el) return;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return;
    observeIO(el, (targetEl) => {
        if (isElementHidden(targetEl)) return;
        removeFromIdleQueue(targetEl);
        unpackTemplate(targetEl);
        targetEl.classList.add(DX_ANIM.TYPING);
    });
    if (el.querySelector(':scope > template')) {
        queueIdleUnpack(el, (targetEl) => {
            prepareTemplateContent(targetEl);
        });
    }
}

// ─── Mount guard: only triggers on correct animation name ────────────────────
export function mountTypewriter(el, e) {
    if (e && e.animationName && e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
    if (!el) return;
    if (el.classList && el.classList.contains(DX_ANIM.TYPED)) return;
    observeTypewriter(el);
}

// ─── Ensure all elements up to and including a target are unpacked ────────────
export function ensureElementsUpToTarget(target) {
    if (!target) return;
    const doc = target.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    // Query both old class-based and new tag-based selectors for backward compat
    const elements = doc.querySelectorAll('dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda');

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;

        const isTargetOrBefore = (el === target) ||
            (target.contains && target.contains(el)) ||
            !!(target.compareDocumentPosition && (target.compareDocumentPosition(el) & 2));
        if (!isTargetOrBefore) continue;

        unpackTemplate(el);
    }
}

// ─── DOM Cleanup on Animation End (.TYPED transition) ────────────────────────
export function cleanupTypedDOM(typeEl) {
    if (!typeEl || typeEl._cleanedUp) return;
    typeEl._cleanedUp = true;
    typeEl._tLayer = null;

    const doc = typeEl.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    // 1. Remove raw template wrappers if any remain
    const directTpl = typeEl.querySelector(':scope > template');
    if (directTpl) directTpl.remove();

    // 2. Remove <dx-t> / <t-t> layer completely, leaving only <dx-s>
    const tLayer = typeEl.querySelector(':scope > :is(dx-t, t-t), :is(dx-t, t-t)');
    if (tLayer) {
        tLayer.remove();
    }

    // 3. Guarantee that all child meters inside static layer are marked static
    const stMeters = typeEl.querySelectorAll ? typeEl.querySelectorAll(':is(dx-s, t-s) :is(dx-odometer, ui-odometer, dx-number, ui-number)') : [];
    for (let i = 0; i < stMeters.length; i++) {
        const m = stMeters[i];
        if (typeof m.makeStatic === 'function') m.makeStatic();
        if (typeof m.getStaticHTML === 'function' && !m.textContent.trim()) {
            m.innerHTML = m.getStaticHTML();
        }
    }

    typeEl.removeAttribute('aria-label');
}

// ─── onTypewriterEnd — called when last <dx-c> finishes animating or odometer completes ───
export function onTypewriterEnd(cEl, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.animationName === DX_ANIM.KF_PLAY_TOGGLE) return false;
        if (event.animationName === DX_ANIM.KF_TYPE_SDA) return false;
    }
    if (!cEl) return false;

    // Find parent: support both dx-* tags and legacy class-based selectors
    const parent = cEl.closest('dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda');
    if (parent) {
        if (parent.classList.contains(DX_ANIM.TYPED)) {
            if (!parent._cleanedUp) cleanupTypedDOM(parent);
            return false;
        }
        if (parent.querySelector(':scope > template')) return false;

        const isEmbed = cEl.tagName === 'DX-ODOMETER' || cEl.tagName === 'UI-ODOMETER' ||
                        cEl.tagName === 'DX-NUMBER' || cEl.tagName === 'UI-NUMBER';

        let lastC = parent._lastC;
        if (!lastC) {
            lastC = parent.querySelector(':is(dx-t, t-t) [data-last="true"], :is(dx-t, t-t) .last-char, [data-last="true"], .last-char');
            if (!lastC) {
                const allC = parent.querySelectorAll(':is(dx-t, t-t) :is(dx-c, t-c):not(.c-ui-num), :is(dx-c, t-c):not(.c-ui-num)');
                lastC = allC.length ? allC[allC.length - 1] : null;
            }
            if (typeof document === 'undefined' || document.readyState !== 'loading') {
                parent._lastC = lastC;
            }
        }

        const isLastChar = !isEmbed && !cEl.classList?.contains('c-ui-num') && ((cEl === lastC) || (cEl.getAttribute?.('data-last') === 'true') || (cEl.classList?.contains('last-char')) || (lastC && (cEl.contains(lastC) || lastC.contains(cEl))));

        if (!isLastChar && !isEmbed) return false;

        if (isLastChar) {
            parent._charDone = true;
        }
        if (isEmbed) {
            cEl._animDone = true;
        }

        // Query all embedded meters in parent active <dx-t> layer
        const tLayer = parent.querySelector(':scope > dx-t, dx-t') || parent;
        const embeds = Array.from(tLayer.querySelectorAll('dx-odometer, ui-odometer, dx-number, ui-number'));
        const allEmbedsDone = embeds.length === 0 || embeds.every(e => e._animDone || e.isStatic || e.classList.contains('data-static'));
        const charDone = !lastC || !!parent._charDone;

        // ONLY mark parent as typed when BOTH last char is done AND all embedded meters have finished!
        if (charDone && allEmbedsDone) {
            if (parent._embedTimeout) {
                clearTimeout(parent._embedTimeout);
                parent._embedTimeout = null;
            }
            const doCleanup = () => {
                if (!parent.classList.contains(DX_ANIM.TYPED)) {
                    if (typeof parent.markTyped === 'function') {
                        parent.markTyped();
                    } else {
                        DxTyping.prototype.markTyped.call(parent);
                    }
                }
            };
            if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
                try {
                    const handle = window.requestIdleCallback(doCleanup, { timeout: 300 });
                    if (handle === undefined) doCleanup();
                } catch (e) {
                    doCleanup();
                }
            } else {
                doCleanup();
            }
        } else if (charDone) {
            // Safety: last char finished, give embedded meters up to 1200ms then resolve
            if (!parent._embedTimeout) {
                parent._embedTimeout = setTimeout(() => {
                    parent._embedTimeout = null;
                    const doCleanup = () => {
                        if (!parent.classList.contains(DX_ANIM.TYPED)) {
                            if (typeof parent.markTyped === 'function') {
                                parent.markTyped();
                            } else {
                                DxTyping.prototype.markTyped.call(parent);
                            }
                        }
                    };
                    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
                        try {
                            const handle = window.requestIdleCallback(doCleanup, { timeout: 300 });
                            if (handle === undefined) doCleanup();
                        } catch (e) {
                            doCleanup();
                        }
                    } else {
                        doCleanup();
                    }
                }, 1200);
            }
        }
    }
    return false;
}

// ─── Base Class DxTyping ─────────────────────────────────────────────────────
export class DxTyping extends DxBase {
    static get observedAttributes() {
        return ['delay', 'd', 'duration', 't'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal) return;
        this._syncTimingAttributes();
    }

    _syncTimingAttributes() {
        const delay = this.getAttribute('delay') ?? this.getAttribute('d');
        if (delay !== null) {
            this.style.setProperty('--d', String(parseInt(delay, 10) || 0));
        }
        const duration = this.getAttribute('duration') ?? this.getAttribute('t');
        if (duration !== null) {
            this.style.setProperty('--t', String(parseInt(duration, 10) || 0));
        }
    }

    get isTyped() {
        return this.classList.contains(DX_ANIM.TYPED);
    }

    unpackTemplate() {
        const res = unpackTemplate(this);
        if (res) this.classList.add(DX_ANIM.TYPING);
        return res;
    }

    markTyped() {
        if (this.querySelector(':scope > template')) return; // NEVER mark typed if template is still in DOM!
        if (this.cls) {
            this.cls({ [DX_ANIM.TYPING]: 0, [DX_ANIM.TYPED]: 1 });
        } else {
            this.classList.remove(DX_ANIM.TYPING);
            this.classList.add(DX_ANIM.TYPED);
        }
        if (typeof rootWin?.__datex2TriggerPendingUiNumbers === 'function') {
            rootWin.__datex2TriggerPendingUiNumbers(this);
        }
        cleanupTypedDOM(this);
    }
}

const checkAndObserve = (el) => {
    if (!el?.querySelector || el.classList.contains(DX_ANIM.TYPED)) return;
    // If inside a closed <details> (and NOT in <summary>), do not observe for viewport intersection until opened!
    const closedDetails = !el.closest('summary') && el.closest('details:not([open])');
    if (closedDetails) return;

    if (el.querySelector(':scope > template')) {
        observeTypewriter(el);
    }
};

// ─── Auto-Bootstrap at DOM Ready ─────────────────────────────────────────────
export function bootstrapTypewriterObserver(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root) return;
    const elements = root.querySelectorAll('dx-type-sda, dx-reveal-sda, dx-type, .type-sda, ui-type-sda, .type, .TYPE');
    for (let i = 0; i < elements.length; i++) {
        checkAndObserve(elements[i]);
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bootstrapTypewriterObserver(), { once: true });
    } else {
        bootstrapTypewriterObserver();
    }

    // When a <details> accordion opens, unpack & trigger nested typewriters
    document.addEventListener('toggle', (e) => {
        const details = e.target;
        if (details && details.tagName === 'DETAILS' && details.open) {
            details.querySelectorAll('dx-type-sda, dx-type').forEach(typeEl => {
                if (!typeEl.classList.contains(DX_ANIM.TYPED)) {
                    unpackTemplate(typeEl);
                    typeEl.classList.add(DX_ANIM.TYPING);
                }
            });
            details.querySelectorAll('dx-counter, dx-number').forEach(child => {
                if (typeof child._checkAndTrigger === 'function') {
                    child._inViewport = true;
                    child._parentReady = true;
                    child._checkAndTrigger();
                }
            });
        }
    }, true);
}

// ─── Global Exports ──────────────────────────────────────────────────────────
if (rootWin) {
    Object.assign(rootWin, {
        DxTyping, UiTyping: DxTyping, unpackTemplate, mountTypewriter,
        observeTypewriter, ensureElementsUpToTarget, onTypewriterEnd,
        __twEnd: onTypewriterEnd, __datex2CleanupTypedDOM: cleanupTypedDOM,
        bootstrapTypewriterObserver
    });
}
