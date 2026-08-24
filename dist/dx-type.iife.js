var DxType = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var src_exports = {};
  __export(src_exports, {
    DX_ANIM: () => DX_ANIM,
    DxBase: () => DxBase,
    DxMeter: () => DxMeter,
    DxNumber: () => DxNumber,
    DxOdometer: () => DxOdometer,
    DxReveal: () => DxReveal,
    DxRevealSda: () => DxRevealSda,
    DxRevealing: () => DxRevealing,
    DxType: () => DxType,
    DxTypeReady: () => DxTypeReady,
    DxTypeSda: () => DxTypeSda,
    DxTyping: () => DxTyping,
    bootstrapTypewriterObserver: () => bootstrapTypewriterObserver,
    cleanupTypedDOM: () => cleanupTypedDOM,
    ensureElementsUpToTarget: () => ensureElementsUpToTarget,
    finishReveal: () => finishReveal,
    getIO: () => getIO,
    getSdaGaps: () => getSdaGaps,
    getTypewriterObserver: () => getTypewriterObserver,
    mountTypewriter: () => mountTypewriter,
    observeIO: () => observeIO,
    observeTypewriter: () => observeTypewriter,
    onAllAnimationsEnd: () => onAllAnimationsEnd,
    onTypewriterEnd: () => onTypewriterEnd,
    registerRAF: () => registerRAF,
    rootWin: () => rootWin2,
    setSdaGaps: () => setSdaGaps,
    startReveal: () => startReveal,
    uiNum: () => uiNum,
    unobserveIO: () => unobserveIO,
    unpackTemplate: () => unpackTemplate,
    unregisterRAF: () => unregisterRAF
  });

  // src/client/base/dx-scheduler.js
  var rootWin = typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : null;
  var DX_ANIM = Object.freeze({
    // Final-state classes (normalized to dx-* prefix)
    TYPED: "dx-typed",
    TYPING: "dx-typing",
    REVEALED: "dx-revealed",
    REVEALING: "dx-revealing",
    // SSR guard markers — prevent re-transpiling
    TYPE_GUARD: "TYPE-",
    REVEAL_GUARD: "REVEAL-",
    // Keyframe names emitted by CSS
    KF_TYPE_SDA: "dx-type-sda",
    KF_REVEAL_SDA: "dx-reveal-sda",
    KF_REVEAL_IN: "reveal-in",
    KF_REVEAL_FADE: "reveal-fade-in",
    KF_TYPE_IN: "type-in",
    KF_SDA_SENSOR: "sda-sensor",
    KF_PLAY_TOGGLE: "play-toggle",
    KF_ODO_ROLL: "odo-roll",
    KF_RUN_ODOMETER: "run-odometer",
    // Durations (ms)
    REVEAL_DURATION: 360,
    TYPE_DURATION: 40
  });
  var ioInstance = null;
  var ioCallbacks = /* @__PURE__ */ new WeakMap();
  var _sdaTopGap = "0%";
  var _sdaBottomGap = "0%";
  function formatMarginValue(v) {
    if (!v || v === "0" || v === "0%" || v === "0px" || v === 0) return "0px";
    if (typeof v === "number") return `-${v}px`;
    if (typeof v === "string") {
      const trimmed = v.trim();
      return trimmed.startsWith("-") ? trimmed : `-${trimmed}`;
    }
    return "0px";
  }
  function setSdaGaps(top = "0%", bottom = "0%") {
    _sdaTopGap = top;
    _sdaBottomGap = bottom;
    if (ioInstance) {
      ioInstance.disconnect();
      ioInstance = null;
    }
  }
  function getSdaGaps() {
    const winTop = rootWin?.sdaTopGap ?? rootWin?.__dxTypeConfig?.sdaTopGap;
    const winBottom = rootWin?.sdaBottomGap ?? rootWin?.__dxTypeConfig?.sdaBottomGap;
    return {
      sdaTopGap: winTop !== void 0 ? winTop : _sdaTopGap,
      sdaBottomGap: winBottom !== void 0 ? winBottom : _sdaBottomGap
    };
  }
  function ioHandler(entries) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isIntersecting) {
        const el2 = entry.target;
        if (ioInstance) ioInstance.unobserve(el2);
        const cb = ioCallbacks.get(el2);
        if (cb) {
          ioCallbacks.delete(el2);
          cb(el2);
        }
      }
    }
  }
  function getIO() {
    if (ioInstance) return ioInstance;
    const IO = rootWin?.IntersectionObserver;
    if (typeof IO === "function") {
      const gaps = getSdaGaps();
      const topMargin = formatMarginValue(gaps.sdaTopGap);
      const bottomMargin = formatMarginValue(gaps.sdaBottomGap);
      ioInstance = new IO(ioHandler, {
        root: null,
        // Visual Viewport (window)
        rootMargin: `${topMargin} 0px ${bottomMargin} 0px`,
        threshold: 0
      });
    }
    return ioInstance;
  }
  function observeIO(el2, callback) {
    if (!el2) return;
    const obs = getIO();
    if (obs) {
      ioCallbacks.set(el2, callback);
      obs.observe(el2);
    } else {
      callback(el2);
    }
  }
  function unobserveIO(el2) {
    if (!el2) return;
    ioCallbacks.delete(el2);
    if (ioInstance) ioInstance.unobserve(el2);
  }
  if (rootWin) {
    Object.assign(rootWin, {
      setSdaGaps,
      getSdaGaps
    });
  }
  var activeAnimations = /* @__PURE__ */ new Set();
  var animEndListeners = /* @__PURE__ */ new Set();
  var rafId = null;
  var raf = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : ((cb) => setTimeout(() => cb(Date.now()), 16));
  var caf = typeof cancelAnimationFrame !== "undefined" ? cancelAnimationFrame : typeof window !== "undefined" && window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : clearTimeout;
  function notifyAnimEnd() {
    if (animEndListeners.size > 0) {
      const listeners = Array.from(animEndListeners);
      animEndListeners.clear();
      for (let i = 0; i < listeners.length; i++) {
        listeners[i]();
      }
    }
  }
  function tick(now) {
    if (activeAnimations.size === 0) {
      rafId = null;
      notifyAnimEnd();
      return;
    }
    const list = Array.from(activeAnimations);
    for (let i = 0; i < list.length; i++) {
      list[i]._stepAnimation(now);
    }
    if (activeAnimations.size > 0) {
      rafId = raf(tick);
    } else {
      rafId = null;
      notifyAnimEnd();
    }
  }
  function registerRAF(el2) {
    activeAnimations.add(el2);
    if (!rafId) {
      rafId = raf(tick);
    }
  }
  function unregisterRAF(el2) {
    activeAnimations.delete(el2);
    if (activeAnimations.size === 0) {
      if (rafId) {
        caf(rafId);
        rafId = null;
      }
      notifyAnimEnd();
    }
  }
  function onAllAnimationsEnd(callback) {
    if (typeof callback !== "function") return;
    if (activeAnimations.size === 0) {
      callback();
      return;
    }
    animEndListeners.add(callback);
  }
  if (rootWin) {
    Object.assign(rootWin, {
      setSdaGaps,
      getSdaGaps,
      dxScheduler: {
        registerRAF,
        unregisterRAF,
        onAllAnimationsEnd,
        getActiveAnimationsCount: () => activeAnimations.size
      }
    });
  }

  // src/client/base/dx-base.js
  var rootWin2 = typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : null;
  var BaseHTMLElement = rootWin2?.HTMLElement || class {
  };
  var DxBase = class extends BaseHTMLElement {
    constructor() {
      super();
      if (typeof document !== "undefined" && document.body?.classList?.contains("dx-type-record")) {
        if (this.innerHTML) this._pristineHTML = this.innerHTML;
      }
    }
    /**
     * Unpack a direct <template> child, replacing all children with template content.
     * Returns true if a template was unpacked, false otherwise.
     */
    unpackTemplate() {
      if (!this._pristineHTML && typeof document !== "undefined" && document.body?.classList?.contains("dx-type-record")) {
        this._pristineHTML = this.innerHTML;
      }
      const tpl = this.querySelector(":scope > template");
      if (tpl && tpl.content) {
        const st = this.querySelector(":scope > s-t");
        if (st) st.remove();
        tpl.replaceWith(tpl.content);
        this.classList.add(DX_ANIM.TYPING);
        return true;
      }
      return false;
    }
    replay() {
      if (this._pristineHTML) {
        this._cleanedUp = false;
        this._typed = 0;
        this.classList.remove(DX_ANIM.TYPED, DX_ANIM.TYPING, DX_ANIM.REVEALED, DX_ANIM.REVEALING);
        this.innerHTML = this._pristineHTML;
        this.unpackTemplate();
        return true;
      }
      return false;
    }
  };
  var el = (tag, cls, content = "", extra = "") => content !== void 0 && content !== null && content !== "" ? `<${tag}${cls ? ` class="${cls}"` : ""}${extra ? ` ${extra}` : ""}>${content}</${tag}>` : "";
  var span = (cls, content, extra) => el("span", cls, content, extra);
  var defCustomElement = (tag, cls) => {
    if (rootWin2?.customElements && typeof rootWin2.HTMLElement !== "undefined") {
      if (!rootWin2.customElements.get(tag)) {
        try {
          rootWin2.customElements.define(tag, cls);
        } catch (e) {
          try {
            rootWin2.customElements.define(tag, class extends cls {
            });
          } catch {
          }
        }
      }
    }
  };

  // src/client/base/dx-typing.js
  function getTypewriterObserver(win) {
    return getIO(win);
  }
  function unpackTemplate(el2) {
    if (!el2) return false;
    if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return false;
    const tpl = el2.querySelector(":scope > template");
    if (tpl && tpl.content) {
      if (!el2.getAttribute("role")) el2.setAttribute("role", "text");
      const st = el2.querySelector(":scope > s-t");
      if (st) {
        if (!el2.getAttribute("aria-label")) {
          const raw = (st.textContent || "").replace(/\s+/g, " ").trim();
          if (raw) el2.setAttribute("aria-label", raw);
        }
      }
      tpl.replaceWith(tpl.content);
      const t = el2.querySelector(":scope > t");
      if (t) t.setAttribute("aria-hidden", "true");
      el2.classList.add(DX_ANIM.TYPING);
      if (!el2._safetyTimer && typeof setTimeout === "function") {
        const delay = parseFloat(el2.style?.getPropertyValue("--d")) || parseFloat(el2.getAttribute?.("delay") || el2.getAttribute?.("d")) || 0;
        const duration = parseFloat(el2.style?.getPropertyValue("--t")) || parseFloat(el2.getAttribute?.("duration") || el2.getAttribute?.("t")) || 580;
        const hasEmbeds = !!el2.querySelector("dx-odometer, ui-odometer, dx-number, ui-number, .tw-embed");
        const maxDuration = hasEmbeds ? Math.max(duration, 1600) : duration;
        const safetyDur = delay + maxDuration + 300;
        const startTs = Date.now();
        el2._safetyTimer = setTimeout(() => {
          el2._safetyTimer = null;
          if (Date.now() - startTs < safetyDur - 50) return;
          if (!el2.classList.contains(DX_ANIM.TYPED)) {
            if (typeof el2.markTyped === "function") {
              el2.markTyped();
            } else {
              DxTyping.prototype.markTyped.call(el2);
            }
          }
        }, safetyDur);
      }
      return true;
    }
    return false;
  }
  function observeTypewriter(el2) {
    if (!el2) return;
    if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return;
    observeIO(el2, unpackTemplate);
  }
  function mountTypewriter(el2, e) {
    if (e && e.animationName && e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
    if (!el2) return;
    if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return;
    observeTypewriter(el2);
  }
  function ensureElementsUpToTarget(target) {
    if (!target) return;
    const doc = target.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    const elements = doc.querySelectorAll("dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda");
    for (let i = 0; i < elements.length; i++) {
      const el2 = elements[i];
      if (!el2) continue;
      const isTargetOrBefore = el2 === target || target.contains && target.contains(el2) || !!(target.compareDocumentPosition && target.compareDocumentPosition(el2) & 2);
      if (!isTargetOrBefore) continue;
      unpackTemplate(el2);
    }
  }
  function cleanupTypedDOM(typeEl) {
    if (!typeEl || typeEl._cleanedUp) return;
    typeEl._cleanedUp = true;
    if (typeEl._safetyTimer) {
      clearTimeout(typeEl._safetyTimer);
      typeEl._safetyTimer = null;
    }
    const doc = typeEl.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    const directTpl = typeEl.querySelector(":scope > template");
    if (directTpl) directTpl.remove();
    const tLayer = typeEl.querySelector(":scope > t, t");
    if (tLayer) {
      tLayer.remove();
    }
    const stMeters = typeEl.querySelectorAll("s-t dx-odometer, s-t ui-odometer, s-t dx-number, s-t ui-number");
    for (let i = 0; i < stMeters.length; i++) {
      const m = stMeters[i];
      if (typeof m.makeStatic === "function") m.makeStatic();
      if (typeof m.getStaticHTML === "function") {
        m.innerHTML = m.getStaticHTML();
      }
    }
    typeEl.removeAttribute("aria-label");
  }
  function onTypewriterEnd(cEl, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
      if (event.animationName === DX_ANIM.KF_PLAY_TOGGLE) return false;
      if (event.animationName === DX_ANIM.KF_TYPE_SDA) return false;
    }
    if (!cEl) return false;
    const parent = cEl.closest("dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda");
    if (parent) {
      if (parent.classList.contains(DX_ANIM.TYPED)) return false;
      if (parent.querySelector(":scope > template")) return false;
      const isEmbed = cEl.tagName === "DX-ODOMETER" || cEl.tagName === "UI-ODOMETER" || cEl.tagName === "DX-NUMBER" || cEl.tagName === "UI-NUMBER";
      if (!parent._lastC) {
        const allC = parent.querySelectorAll("t c, c");
        parent._lastC = allC.length ? allC[allC.length - 1] : null;
      }
      const lastC = parent._lastC;
      const isLastChar = !isEmbed && (cEl === lastC || cEl.getAttribute?.("data-last") === "true" || cEl.classList?.contains("last-char") || lastC && (cEl.contains(lastC) || lastC.contains(cEl)));
      if (!isLastChar && !isEmbed) return false;
      if (isLastChar) {
        parent._charDone = true;
      }
      if (isEmbed) {
        cEl._animDone = true;
      }
      const tLayer = parent.querySelector(":scope > t, t") || parent;
      const embeds = Array.from(tLayer.querySelectorAll("dx-odometer, ui-odometer, dx-number, ui-number"));
      const allEmbedsDone = embeds.length === 0 || embeds.every((e) => e._animDone || e.isStatic || e.getAttribute("data-static") === "true");
      const charDone = !!parent._charDone;
      if (charDone && allEmbedsDone) {
        if (typeof parent.markTyped === "function") {
          parent.markTyped();
        } else {
          DxTyping.prototype.markTyped.call(parent);
        }
      }
    }
    return false;
  }
  var DxTyping = class extends DxBase {
    static get observedAttributes() {
      return ["delay", "d", "duration", "t"];
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      this._syncTimingAttributes();
    }
    _syncTimingAttributes() {
      const delay = this.getAttribute("delay") ?? this.getAttribute("d");
      if (delay !== null) {
        this.style.setProperty("--d", String(parseInt(delay, 10) || 0));
      }
      const duration = this.getAttribute("duration") ?? this.getAttribute("t");
      if (duration !== null) {
        this.style.setProperty("--t", String(parseInt(duration, 10) || 0));
      }
    }
    get isTyped() {
      return this.classList.contains(DX_ANIM.TYPED);
    }
    unpackTemplate() {
      return unpackTemplate(this);
    }
    markTyped() {
      if (this.querySelector(":scope > template")) return;
      if (this._safetyTimer) {
        clearTimeout(this._safetyTimer);
        this._safetyTimer = null;
      }
      if (this.cls) {
        this.cls({ [DX_ANIM.TYPING]: 0, [DX_ANIM.TYPED]: 1 });
      } else {
        this.classList.remove(DX_ANIM.TYPING);
        this.classList.add(DX_ANIM.TYPED);
      }
      if (typeof rootWin2?.__datex2TriggerPendingUiNumbers === "function") {
        rootWin2.__datex2TriggerPendingUiNumbers(this);
      }
      cleanupTypedDOM(this);
    }
  };
  var checkAndObserve = (el2) => {
    if (el2?.querySelector && el2.querySelector(":scope > template") && !el2.classList.contains(DX_ANIM.TYPED)) {
      observeTypewriter(el2);
    }
  };
  function bootstrapTypewriterObserver(root = typeof document !== "undefined" ? document : null) {
    if (!root) return;
    const elements = root.querySelectorAll("dx-type-sda, dx-reveal-sda, dx-type, .type-sda, ui-type-sda, .type, .TYPE");
    for (let i = 0; i < elements.length; i++) {
      checkAndObserve(elements[i]);
    }
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => bootstrapTypewriterObserver(), { once: true });
    } else {
      bootstrapTypewriterObserver();
    }
  }
  if (rootWin2) {
    Object.assign(rootWin2, {
      DxTyping,
      UiTyping: DxTyping,
      unpackTemplate,
      mountTypewriter,
      observeTypewriter,
      ensureElementsUpToTarget,
      onTypewriterEnd,
      __twEnd: onTypewriterEnd,
      __datex2CleanupTypedDOM: cleanupTypedDOM,
      bootstrapTypewriterObserver
    });
  }

  // src/client/base/dx-revealing.js
  function finishReveal(el2, e) {
    if (!el2) return;
    if (e && e.target && e.target !== el2) return;
    if (e && e.animationName && e.animationName !== "dx-reveal-sda" && e.animationName !== "reveal-sda" && e.animationName !== "reveal-in" && e.animationName !== "reveal-fade-in" && e.animationName !== DX_ANIM.KF_REVEAL_IN && e.animationName !== DX_ANIM.KF_REVEAL_SDA && e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
    if (typeof e?.stopPropagation === "function") e.stopPropagation();
    if (typeof el2.markRevealed === "function") {
      el2.markRevealed();
    } else {
      DxRevealing.prototype.markRevealed.call(el2);
    }
  }
  function startReveal(el2, e) {
    if (!el2 || el2.classList.contains(DX_ANIM.REVEALED) || el2.classList.contains(DX_ANIM.REVEALING)) return;
    if (e && e.target && e.target !== el2) return;
    if (e && e.animationName && e.animationName !== "dx-type-sda" && e.animationName !== "type-sda" && e.animationName !== DX_ANIM.KF_TYPE_SDA && e.animationName !== DX_ANIM.KF_SDA_SENSOR) return;
    if (typeof e?.stopPropagation === "function") e.stopPropagation();
    el2.classList.add(DX_ANIM.REVEALING);
    if (typeof rootWin2?.__datex2TriggerPendingUiNumbers === "function") {
      rootWin2.__datex2TriggerPendingUiNumbers(el2);
    }
  }
  var DxRevealing = class extends DxBase {
    static get observedAttributes() {
      return ["delay", "d", "duration", "t"];
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      this._syncTimingAttributes();
    }
    _syncTimingAttributes() {
      const delay = this.getAttribute("delay") ?? this.getAttribute("d");
      if (delay !== null) {
        this.style.setProperty("--d", String(parseInt(delay, 10) || 0));
      }
      const duration = this.getAttribute("duration") ?? this.getAttribute("t");
      if (duration !== null) {
        this.style.setProperty("--t", String(parseInt(duration, 10) || 0));
      }
    }
    get isRevealed() {
      return this.classList.contains(DX_ANIM.REVEALED);
    }
    markRevealed() {
      this.classList.remove("reveal-sda", "reveal", DX_ANIM.REVEALING);
      this.classList.add(DX_ANIM.REVEALED);
      if (typeof rootWin2?.__datex2TriggerPendingUiNumbers === "function") {
        rootWin2.__datex2TriggerPendingUiNumbers(this);
      }
    }
  };
  if (rootWin2) {
    Object.assign(rootWin2, {
      DxRevealing,
      UiRevealing: DxRevealing,
      finishReveal,
      startReveal
    });
  }

  // src/client/base/dx-meter.js
  var NUM_RE = /^([^0-9]*?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)$/;
  function parseNumParts(str) {
    const m = NUM_RE.exec(str || "");
    return {
      pfx: (m?.[1] || "").trim(),
      digits: m?.[2] || "",
      radix: m?.[3] || "",
      decimals: m?.[4] || "",
      sfx: (m?.[5] || "").trim(),
      pfxSpace: (m?.[1] || "").endsWith(" ") ? " " : "",
      sfxSpace: (m?.[5] || "").startsWith(" ") ? " " : ""
    };
  }
  var uiNum = class {
    static format(value, type = "number", comma = ",", prefix = "", suffix = " \u20AC") {
      const numVal = parseFloat(value);
      if (isNaN(numVal)) return "";
      const isNegative = numVal < 0;
      const absValue = Math.abs(numVal);
      let decimals = 0;
      if (type.includes("number-1dec") || type.includes("float")) {
        decimals = 1;
      } else if (type.includes("number")) {
        decimals = 2;
      } else if (type.includes("percent")) {
        decimals = absValue % 1 !== 0 ? 2 : 0;
      } else {
        decimals = 0;
      }
      let numStr = absValue.toFixed(decimals);
      if (comma === ",") {
        numStr = numStr.replace(".", ",");
      }
      const parts = comma ? numStr.split(comma) : [numStr];
      let integerPart = parts[0];
      const decimalPart = parts[1] || "";
      if (!type.includes("year")) {
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      }
      const formattedNum = decimalPart ? integerPart + comma + decimalPart : integerPart;
      let finalPrefix = prefix || "";
      if (isNegative) {
        finalPrefix = "\u2013 ";
      } else if (numVal > 0 && prefix.includes("+")) {
        finalPrefix = "+ ";
      }
      let finalSuffix = suffix !== void 0 && suffix !== null ? suffix : type === "percent" ? "%" : " \u20AC";
      if (type === "percent" && (suffix === void 0 || suffix === null || suffix === " \u20AC")) {
        finalSuffix = "%";
      }
      return `${finalPrefix}${formattedNum}${finalSuffix}`;
    }
  };
  var DxMeter = class extends DxBase {
    constructor() {
      super();
      this._initialized = false;
      this._value = 0;
      this._targetValue = 0;
    }
    get isStatic() {
      return this.hasAttribute("data-static");
    }
    getNumericValue() {
      const valAttr = this.getAttribute("percent") || this.getAttribute("value") || this.textContent;
      const parsed = parseFloat(valAttr);
      return isNaN(parsed) ? 0 : parsed;
    }
    getFormatConfig() {
      return {
        type: this.getAttribute("type") || "int",
        comma: this.getAttribute("comma") || ",",
        prefix: this.getAttribute("prefix") || "",
        suffix: this.getAttribute("suffix") || ""
      };
    }
    formatValue(val) {
      const cfg = this.getFormatConfig();
      return uiNum.format(val, cfg.type, cfg.comma, cfg.prefix, cfg.suffix);
    }
    setAccessibility(val) {
      if (this.getAttribute("aria-hidden") !== "true") {
        this.setAttribute("aria-hidden", "true");
      }
      const formatted = this.formatValue(val !== void 0 ? val : this._value);
      const ariaLabel = formatted.replace(/·/g, "").replace(/\s+/g, " ").trim().replace(/"/g, "&quot;");
      if (this.getAttribute("aria-label") !== ariaLabel) {
        this.setAttribute("aria-label", ariaLabel);
      }
    }
    makeStatic() {
      this.setAttribute("data-static", "true");
    }
  };
  if (rootWin2) {
    Object.assign(rootWin2, { DxMeter, UiMeter: DxMeter, uiNum });
  }

  // src/client/components/dx-type.js
  var DxType = class extends DxTyping {
    connectedCallback() {
      this._syncTimingAttributes();
      if (!this.isTyped) {
        if (this.querySelector(":scope > template")) {
          this.unpackTemplate();
        }
        this.addEventListener("animationend", this._onAnimEnd);
      }
    }
    _onAnimEnd = (e) => {
      if (e.animationName === DX_ANIM.KF_TYPE_IN || e.animationName === DX_ANIM.KF_TYPE_SDA) {
        const target = e.target;
        if (target.classList?.contains("last-char") || target.hasAttribute?.("last-char") || target.getAttribute?.("data-last") === "true") {
          onTypewriterEnd(target, e);
        } else {
          if (!this._lastC) {
            const allC = this.querySelectorAll("c");
            this._lastC = allC.length ? allC[allC.length - 1] : null;
          }
          if (target === this._lastC) {
            onTypewriterEnd(target, e);
          }
        }
      }
    };
    disconnectedCallback() {
      this.removeEventListener("animationend", this._onAnimEnd);
    }
  };
  defCustomElement("dx-type", DxType);
  defCustomElement("ui-type", DxType);

  // src/client/components/dx-type-sda.js
  var DxTypeSda = class extends DxTyping {
    connectedCallback() {
      if (this.isTyped) return;
      this._syncTimingAttributes();
      this.addEventListener("animationend", this._onAnimEnd);
      observeIO(this, (el2) => {
        unpackTemplate(el2);
        el2.classList.add(DX_ANIM.TYPING);
      });
    }
    _onAnimEnd = (e) => {
      if (e.animationName === DX_ANIM.KF_TYPE_IN) {
        const target = e.target;
        if (target.classList?.contains("last-char") || target.hasAttribute?.("last-char") || target.getAttribute?.("data-last") === "true") {
          onTypewriterEnd(target, e);
        } else {
          if (!this._lastC) {
            const allC = this.querySelectorAll("c");
            this._lastC = allC.length ? allC[allC.length - 1] : null;
          }
          if (this._lastC && target === this._lastC) {
            onTypewriterEnd(target, e);
          }
        }
      }
    };
    disconnectedCallback() {
      this.removeEventListener("animationend", this._onAnimEnd);
    }
  };
  defCustomElement("dx-type-sda", DxTypeSda);
  defCustomElement("ui-type-sda", DxTypeSda);

  // src/client/components/dx-reveal.js
  var DxReveal = class extends DxRevealing {
    connectedCallback() {
      if (this.isRevealed) return;
      this._syncTimingAttributes();
      const typeReady = this.closest("dx-type-ready, .dx-type-ready");
      if (!typeReady) {
        observeIO(this, (el2) => {
          unpackTemplate(el2);
          el2.classList.add(DX_ANIM.REVEALING);
        });
      }
      this.addEventListener("animationend", this._onAnimEnd);
    }
    _onAnimEnd = (e) => {
      if (e.target !== this) return;
      finishReveal(this, e);
      if (this.isRevealed) {
        this.removeEventListener("animationend", this._onAnimEnd);
      }
    };
    disconnectedCallback() {
      this.removeEventListener("animationend", this._onAnimEnd);
    }
  };
  defCustomElement("dx-reveal", DxReveal);
  defCustomElement("ui-reveal", DxReveal);

  // src/client/components/dx-reveal-sda.js
  var DxRevealSda = class extends DxRevealing {
    connectedCallback() {
      if (this.isRevealed) return;
      this._syncTimingAttributes();
      observeIO(this, (el2) => {
        unpackTemplate(el2);
        el2.classList.add(DX_ANIM.REVEALING);
      });
      this.addEventListener("animationend", this._onAnimEnd);
    }
    _onAnimEnd = (e) => {
      if (e.target !== this) return;
      finishReveal(this, e);
      if (this.isRevealed) {
        this.removeEventListener("animationend", this._onAnimEnd);
      }
    };
    disconnectedCallback() {
      this.removeEventListener("animationend", this._onAnimEnd);
    }
  };
  defCustomElement("dx-reveal-sda", DxRevealSda);
  defCustomElement("ui-reveal-sda", DxRevealSda);

  // src/client/components/dx-type-ready.js
  var DxTypeReady = class extends DxBase {
    connectedCallback() {
      if (!this.classList.contains("dx-type-ready")) {
        this.classList.add("dx-type-ready");
      }
      if (!this._pristineHTML && typeof document !== "undefined" && document.body?.classList?.contains("dx-type-record")) {
        this._pristineHTML = this.innerHTML;
      }
    }
    replay() {
      if (this._pristineHTML) {
        this.innerHTML = this._pristineHTML;
        const types = this.querySelectorAll("dx-type, dx-type-sda");
        for (const t of types) {
          if (typeof t.unpackTemplate === "function") t.unpackTemplate();
        }
        return true;
      }
      return false;
    }
  };
  defCustomElement("dx-type-ready", DxTypeReady);

  // src/client/components/dx-number.js
  var TYPE_PARENT_SEL = "dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda";
  var REVEAL_PARENT_SEL = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal";
  var DxNumber = class extends DxMeter {
    static get observedAttributes() {
      return ["prefix", "suffix", "comma", "type", "hide-zero", "empty-zero"];
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
      const inST = !!this.closest("s-t");
      if (inST) {
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
        return;
      }
      if (this.childNodes.length && !this.querySelector(".ui-num")) {
        this.textContent = "";
      }
      const schedule = typeof queueMicrotask === "function" ? queueMicrotask : ((cb) => setTimeout(cb, 0));
      schedule(() => {
        if (this.isConnected && !this._initialized) {
          this.init();
        }
      });
    }
    getStaticHTML() {
      const valAttr = this.getAttribute("percent") || this.getAttribute("value") || this.textContent;
      const numericValue = parseFloat(valAttr);
      if (isNaN(numericValue)) return this.textContent.trim();
      if ((this.hasAttribute("hide-zero") || this.hasAttribute("empty-zero")) && numericValue === 0) {
        return "";
      }
      return this.formatValue(numericValue);
    }
    isReadyToAnimate() {
      if (this._inViewport && !this._parentReady) {
        const parentC = this.closest("c");
        const parentReveal = this.closest(REVEAL_PARENT_SEL);
        if (!parentC && !parentReveal) {
          this._parentReady = true;
        } else if (parentReveal) {
          if (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains("revealed") || parentReveal.classList.contains("revealing") || parentReveal.hasAttribute("data-static")) {
            this._parentReady = true;
          }
        }
      }
      return Boolean(this._inViewport && this._parentReady);
    }
    getDuration() {
      if (this.hasAttribute("duration")) {
        const parsed = parseFloat(this.getAttribute("duration"));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const t = parseFloat(this.style.getPropertyValue("--t")) || parseFloat(this.closest('[style*="--t"]')?.style.getPropertyValue("--t")) || 0;
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
        const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
        if (this._value !== targetVal) {
          this._animationStarted = true;
          const dur = this.getDuration();
          const d = parseFloat(this.style.getPropertyValue("--d")) || parseFloat(this.closest('[style*="--d"]')?.style.getPropertyValue("--d")) || 0;
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
      const isStatic = this.hasAttribute("data-static") || this.isStatic || !!this.closest("s-t");
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) && this._targetValue !== 0 ? this._targetValue : parseFloat(this.getAttribute("percent")) || this.getNumericValue() || 0;
      this._targetValue = targetVal;
      if (isStatic) {
        this._value = targetVal;
        this._animationStarted = true;
      } else {
        this._value = this.hasAttribute("start") ? parseFloat(this.getAttribute("start")) || 0 : 0;
      }
      this.render();
      this._inViewport = false;
      observeIO(this, () => {
        this._inViewport = true;
        this._checkAndTrigger();
      });
      const parentC = this.closest("c");
      const parentReveal = this.closest(REVEAL_PARENT_SEL);
      if (parentC) {
        const parentType = this.closest(TYPE_PARENT_SEL);
        if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains("typed") || parentType.hasAttribute("data-static"))) {
          this._parentReady = true;
        } else {
          parentC.addEventListener("animationstart", (e) => {
            if (e.target === parentC) {
              const u = parentC.style && parseFloat(parentC.style.getPropertyValue("--u")) || 40;
              this._twDelayId = setTimeout(() => {
                this._parentReady = true;
                this._checkAndTrigger();
              }, u * 0.35);
            }
          }, { once: true });
        }
      } else if (parentReveal) {
        if (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains("revealed") || parentReveal.classList.contains("revealing") || parentReveal.hasAttribute("data-static")) {
          this._parentReady = true;
        } else {
          const onParentAnim = () => {
            this._parentReady = true;
            this._checkAndTrigger();
          };
          parentReveal.addEventListener("animationstart", onParentAnim, { once: true });
          parentReveal.addEventListener("transitionstart", onParentAnim, { once: true });
          parentReveal.addEventListener("animationend", onParentAnim, { once: true });
          const choiceParent = this.closest(".form-control--checkbox-button, .details-product-option");
          if (choiceParent && choiceParent !== parentReveal) {
            choiceParent.addEventListener("animationstart", onParentAnim, { once: true });
            choiceParent.addEventListener("transitionstart", onParentAnim, { once: true });
          }
        }
      } else {
        this._parentReady = true;
      }
      this._checkAndTrigger();
    }
    disconnectedCallback() {
      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
      if (this._twDelayId) {
        clearTimeout(this._twDelayId);
        this._twDelayId = null;
      }
      unregisterRAF(this);
      this.classList.remove("ui-number-running");
    }
    val(newValue, duration) {
      if (!this._initialized) this.init();
      if (newValue === void 0) return this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this._value;
      const parsedValue = parseFloat(newValue) || 0;
      this._targetValue = parsedValue;
      if (this._initialized && this._value === parsedValue && !this._pendingVal) {
        this.render();
        this.setAccessibility(parsedValue);
        return this;
      }
      const animDuration = duration !== void 0 && duration !== null ? duration : this.getDuration();
      const ready = this.isReadyToAnimate();
      if (!ready && animDuration > 0) {
        this._pendingVal = { targetValue: parsedValue, duration: animDuration };
        this.setAttribute("percent", parsedValue);
        this.setAccessibility(parsedValue);
        return this;
      }
      this._animationStarted = true;
      this._pendingVal = null;
      if (animDuration > 0 && this._value !== parsedValue) {
        this.setAttribute("percent", parsedValue);
        this.setAccessibility(parsedValue);
        this.animateTo(parsedValue, animDuration);
      } else {
        unregisterRAF(this);
        this.classList.remove("ui-number-running");
        this._value = parsedValue;
        this.setAttribute("percent", this._value);
        this.render();
        this.setAccessibility(parsedValue);
      }
      return this;
    }
    animateTo(targetValue, duration) {
      this.removeAttribute("data-static");
      this._targetValue = targetValue;
      this._animStartValue = this._value;
      this._animDuration = duration;
      this._animStartTime = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      this.classList.add("ui-number-running");
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
        this.setAttribute("percent", this._value);
        this.makeStatic();
        this.classList.remove("ui-number-running");
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
      if ((this.hasAttribute("hide-zero") || this.hasAttribute("empty-zero")) && (this._value === 0 || Math.abs(this._value) < 1e-4)) {
        if (this.innerHTML !== "") {
          this.innerHTML = "";
          this._numSpan = null;
        }
        return;
      }
      const numSpan = this._numSpan || (this._numSpan = this.querySelector(".ui-num"));
      if (!numSpan) {
        this.render();
        return;
      }
      const p = parseNumParts(this.formatValue(this._value));
      const effectiveTarget = targetVal !== void 0 && !isNaN(targetVal) ? targetVal : this.getNumericValue();
      let padPrefix = "";
      if (effectiveTarget !== void 0 && !isNaN(effectiveTarget) && this._value !== effectiveTarget) {
        const tp = parseNumParts(this.formatValue(effectiveTarget));
        const targetDigits = tp.digits;
        const currentDigits = p.digits;
        if (targetDigits.length > currentDigits.length) {
          const padLen = targetDigits.length - currentDigits.length;
          padPrefix = targetDigits.slice(0, padLen).replace(/\d/g, "0");
        }
      }
      const numText = `${p.digits}${p.radix}${p.decimals}`;
      if (padPrefix) {
        let padEl = numSpan.querySelector(".ui-pad");
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
        const padEl = numSpan.querySelector(".ui-pad");
        if (padEl) padEl.remove();
        if (numSpan.textContent !== numText) numSpan.textContent = numText;
      }
    }
    render() {
      if (this._isRendering) return;
      this._isRendering = true;
      try {
        if ((this.hasAttribute("hide-zero") || this.hasAttribute("empty-zero")) && (this._value === 0 || Math.abs(this._value) < 1e-4)) {
          if (this.innerHTML !== "") {
            this.innerHTML = "";
            this._numSpan = null;
            this._pfxSpan = null;
            this._sfxSpan = null;
          }
          if (!this.getAttribute("aria-label")) this.setAccessibility(0);
          return;
        }
        const p = parseNumParts(this.formatValue(this._value));
        const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
        let pfxPadHtml = "";
        let padPrefix = "";
        if (!this.isStatic && targetVal !== void 0 && !isNaN(targetVal) && this._value !== targetVal) {
          const tp = parseNumParts(this.formatValue(targetVal));
          if (this._value === 0 && targetVal > 0 && tp.pfx.includes("+") && !p.pfx.includes("+")) {
            pfxPadHtml = span("ui-pfx ui-pfx-pad", `${tp.pfx}${tp.pfxSpace}`);
          } else if (!p.pfx && tp.pfx) {
            pfxPadHtml = span("ui-pfx ui-pfx-pad", `${tp.pfx}${tp.pfxSpace}`);
          }
          const targetDigits = tp.digits;
          const currentDigits = p.digits;
          if (targetDigits.length > currentDigits.length) {
            const padLen = targetDigits.length - currentDigits.length;
            padPrefix = targetDigits.slice(0, padLen).replace(/\d/g, "0");
          }
        }
        const pfxStr = p.pfx ? `${p.pfx}${p.pfxSpace}` : "";
        const sfxStr = p.sfx ? `${p.sfxSpace}${p.sfx}` : "";
        const numText = `${p.digits}${p.radix}${p.decimals}`;
        let numSpan = this._numSpan || (this._numSpan = this.querySelector(".ui-num"));
        if (numSpan && this.contains(numSpan)) {
          Array.from(this.childNodes).forEach((node) => {
            if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
              node.remove();
            }
          });
          let pfxSpan = this._pfxSpan || (this._pfxSpan = this.querySelector(".ui-pfx:not(.ui-pfx-pad)"));
          if (pfxStr) {
            if (!pfxSpan) {
              pfxSpan = document.createElement("span");
              pfxSpan.className = "ui-pfx";
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
          if (padPrefix) {
            let padEl = numSpan.querySelector(".ui-pad");
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
            const padEl = numSpan.querySelector(".ui-pad");
            if (padEl) padEl.remove();
            if (numSpan.firstChild && numSpan.firstChild.nodeType === 3 && !numSpan.firstChild.nextSibling) {
              if (numSpan.firstChild.nodeValue !== numText) {
                numSpan.firstChild.nodeValue = numText;
              }
            } else if (numSpan.textContent !== numText) {
              numSpan.textContent = numText;
            }
          }
          let sfxSpan = this._sfxSpan || (this._sfxSpan = this.querySelector(".ui-sfx"));
          if (sfxStr) {
            if (!sfxSpan) {
              sfxSpan = document.createElement("span");
              sfxSpan.className = "ui-sfx";
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
          if (!this.getAttribute("aria-label")) this.setAccessibility(targetVal);
          return;
        }
        const digitPadHtml = padPrefix ? span("ui-pad", padPrefix) : "";
        const pfxHtml = pfxStr ? span("ui-pfx", pfxStr) : "";
        const sfxHtml = sfxStr ? span("ui-sfx", sfxStr) : "";
        const numHtml = span("ui-num", `${digitPadHtml}${numText}`);
        const newHtml = `${pfxPadHtml}${pfxHtml}${numHtml}${sfxHtml}`;
        if (this.innerHTML !== newHtml) {
          this.innerHTML = newHtml;
          this._numSpan = this.querySelector(".ui-num");
          this._pfxSpan = this.querySelector(".ui-pfx");
          this._sfxSpan = this.querySelector(".ui-sfx");
        }
        if (!this.getAttribute("aria-label")) this.setAccessibility(targetVal);
      } finally {
        this._isRendering = false;
      }
    }
    replay() {
      if (this._twDelayId) clearTimeout(this._twDelayId);
      if (this._timeoutId) clearTimeout(this._timeoutId);
      this._animationStarted = false;
      this.classList.remove("ui-number-running");
      this.removeAttribute("data-static");
      const startVal = parseFloat(this.getAttribute("start")) || 0;
      this._value = startVal;
      this.render();
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
      const d = parseFloat(this.style.getPropertyValue("--d")) || 0;
      setTimeout(() => this.val(targetVal, 800), Math.max(50, d));
      return true;
    }
  };
  if (rootWin2) {
    rootWin2.DxNumber = rootWin2.UiNumber = rootWin2.uiNumber = DxNumber;
  }
  defCustomElement("dx-number", DxNumber);
  defCustomElement("ui-number", DxNumber);

  // src/client/components/dx-odometer.js
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
    const dropIndices = /* @__PURE__ */ new Set();
    for (let r = 1; r <= removeCount; r++) {
      const dropIdx = keepStart + Math.round(r * step) - 1;
      dropIndices.add(dropIdx);
    }
    return drumValues.filter((_, idx) => !dropIndices.has(idx));
  }
  var odometerStyleSheet = null;
  function getOdometerStyleSheet() {
    if (!odometerStyleSheet && typeof CSSStyleSheet !== "undefined") {
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
  var DxOdometer = class extends DxMeter {
    constructor() {
      super();
      this._timeoutId = null;
      this._ribbonsDone = 0;
      this._ribbonCount = 0;
      this._animDone = false;
      this._inViewport = false;
      this._parentReady = false;
      const handleRibbonDone = (e) => {
        if (!e.target || !e.target.classList || !e.target.classList.contains("odometer-ribbon-inner")) return;
        if (e.animationName !== DX_ANIM.KF_RUN_ODOMETER && e.animationName !== DX_ANIM.KF_ODO_ROLL && e.animationName !== "run-odometer" && e.animationName !== "odo-roll") return;
        e.stopPropagation();
        if (this._animDone) return;
        const shadow = this.shadowRoot || this;
        const allRibbons = shadow.querySelectorAll(".odometer-ribbon-inner");
        this._ribbonCount = allRibbons.length;
        if (!this._completedRibbons) this._completedRibbons = /* @__PURE__ */ new Set();
        this._completedRibbons.add(e.target);
        if (this._completedRibbons.size >= this._ribbonCount && this._ribbonCount > 0) {
          this._animDone = true;
          this.makeStatic();
          if (this.classList.contains("tw-embed") && typeof rootWin2?.__twEnd === "function") {
            rootWin2.__twEnd(this);
          }
        }
      };
      if (typeof this.addEventListener === "function") {
        this.addEventListener("animationstart", (e) => {
          if (e?.stopPropagation) e.stopPropagation();
        }, { passive: true });
        this.addEventListener("animationend", handleRibbonDone);
      }
      this._handleRibbonDone = handleRibbonDone;
    }
    connectedCallback() {
      if (this.isStatic) return;
      if (this._initialized) return;
      const inST = !!this.closest("s-t");
      if (inST) {
        this._initialized = true;
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
        return;
      }
      const shadow = this.shadowRoot;
      const hasExistingDom = shadow && shadow.querySelector(".odometer-ribbon-inner") || this.querySelector(".odometer-ribbon-inner");
      if (hasExistingDom) {
        this._initialized = true;
        this._ribbonCount = (shadow || this).querySelectorAll(".odometer-ribbon-inner").length;
        const twEmbed2 = this.classList.contains("tw-embed");
        if (!twEmbed2) {
          observeIO(this, (el2) => {
            el2.classList.add(DX_ANIM.TYPING);
          });
        }
        return;
      }
      const typeReadyParent = this.closest(".type-ready, dx-type-ready");
      const twEmbed = this.classList.contains("tw-embed");
      const parentC = this.closest("c");
      if (typeReadyParent || twEmbed || parentC) {
        this._timeoutId = setTimeout(() => {
          if (!this._initialized) {
            this.init();
            this.classList.add(DX_ANIM.TYPING);
          }
        }, 0);
      } else {
        observeIO(this, (el2) => {
          if (!this._initialized) {
            this.init();
          }
          el2.classList.add(DX_ANIM.TYPING);
        });
      }
    }
    init() {
      this._initialized = true;
      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
      if (this.closest("s-t") || this.isStatic) {
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
        return;
      }
      const valAttr = this.getAttribute("percent") || this.getAttribute("value") || this.textContent;
      const type = this.getAttribute("type") || "int";
      const numericValue = parseFloat(valAttr);
      if (isNaN(numericValue)) return;
      const np = parseNumParts(this.formatValue(numericValue));
      const formattedNumberStr = np.digits + np.radix + np.decimals;
      const startAttr = this.getAttribute("start");
      let formattedStartStr = null;
      if (startAttr) {
        const startNumeric = parseFloat(startAttr);
        if (!isNaN(startNumeric)) {
          const sp = parseNumParts(this.formatValue(startNumeric));
          formattedStartStr = sp.digits + sp.radix + sp.decimals;
        }
      }
      const makeVal = (v, isF, isL) => span(`odometer-value${isF ? " odometer-first-value" : ""}${isL ? " odometer-last-value" : ""}`, v);
      const allDigits = [];
      for (let i = 0; i < formattedNumberStr.length; i++) {
        const c = formattedNumberStr[i];
        if (c >= "0" && c <= "9") allDigits.push(c);
      }
      const targetDigitsStr = allDigits.join("");
      let startDigitsStr = null;
      if (formattedStartStr) {
        const startDigits = [];
        for (let i = 0; i < formattedStartStr.length; i++) {
          const c = formattedStartStr[i];
          if (c >= "0" && c <= "9") startDigits.push(c);
        }
        startDigitsStr = startDigits.join("");
      }
      const isYear = type === "year";
      const isYearWithStart = isYear && startDigitsStr && startDigitsStr.length === targetDigitsStr.length;
      const startDigitsForLeading = [];
      for (let i = 0; i < targetDigitsStr.length; i++) {
        startDigitsForLeading.push(
          startDigitsStr && startDigitsStr[i] !== void 0 ? parseInt(startDigitsStr[i], 10) : 0
        );
      }
      let firstSignificant = startDigitsForLeading.length;
      for (let i = 0; i < startDigitsForLeading.length; i++) {
        if (startDigitsForLeading[i] !== 0) {
          firstSignificant = i;
          break;
        }
      }
      if (firstSignificant >= startDigitsForLeading.length) {
        firstSignificant = startDigitsForLeading.length - 1;
      }
      const lastLeadingZeroIdx = firstSignificant - 1;
      let digitIndex = 0;
      let odoInsideHtml = "";
      for (let i = 0; i < formattedNumberStr.length; i++) {
        const char = formattedNumberStr[i];
        if (char >= "0" && char <= "9") {
          const curDigitIdx = digitIndex++;
          const digitR = targetDigitsStr.length - 1 - curDigitIdx;
          const targetD = parseInt(targetDigitsStr[curDigitIdx], 10);
          const startD = startDigitsStr && startDigitsStr[curDigitIdx] !== void 0 ? parseInt(startDigitsStr[curDigitIdx], 10) : 0;
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
            const isSingleDigit = targetDigitsStr.length === 1;
            const cycles = isSingleDigit ? 0 : digitR === 0 ? 2 : digitR === 1 ? 1 : 0;
            const totalSteps = cycles * 10 + (targetD - startD + 10) % 10;
            const effectiveSteps = totalSteps === 0 && cycles === 0 ? 0 : totalSteps;
            let cur = startD;
            drumValues.push(cur);
            for (let s = 0; s < effectiveSteps; s++) {
              cur = (cur + 1) % 10;
              drumValues.push(cur);
            }
            drumValues = pruneMiddleFrames(drumValues);
          }
          const isLeadingZero = !isYear && curDigitIdx <= lastLeadingZeroIdx;
          if (isLeadingZero && drumValues.length > 0 && drumValues[0] === 0) {
            drumValues[0] = "&nbsp;";
          }
          const totalItems = drumValues.length;
          const finalIndex = totalItems - 1;
          let ribbonValuesHtml = "";
          for (let f = 0; f < totalItems; f++) {
            const val = drumValues[f];
            const isFirst = f === 0;
            const isLast = f === totalItems - 1;
            ribbonValuesHtml += makeVal(val, isFirst, isLast);
          }
          const finalPosPercent = totalItems > 1 ? -(finalIndex / totalItems * 100).toFixed(4) : 0;
          const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${curDigitIdx}; --digit-r: ${digitR};"`;
          odoInsideHtml += span(
            "odometer-digit",
            span("odometer-digit-spacer", char) + span(
              "odometer-digit-inner",
              span(
                "odometer-ribbon",
                span("odometer-ribbon-inner", ribbonValuesHtml, `data-final-pos="${finalPosPercent}%" ${ribbonStyle}`)
              )
            )
          );
        } else {
          odoInsideHtml += span("odometer-formatting-mark", char === " " ? "&nbsp;" : char);
        }
      }
      const pfxHtml = span("ui-pfx", np.pfx ? `${np.pfx}${np.pfxSpace}` : "");
      const sfxHtml = span("ui-sfx", np.sfx ? `${np.sfxSpace}${np.sfx}` : "");
      const odoHtml = span("ui-odo", span("odometer odometer-theme-datex2", span("odometer-inside", odoInsideHtml)));
      const parentC = this.closest("c");
      if (parentC) {
        const cW = parentC.closest("w");
        if (cW) {
          const wVal = cW.style.getPropertyValue("--w");
          if (wVal && wVal.trim() !== "") this.style.setProperty("--w", wVal.trim());
        }
        const iVal = parentC.style.getPropertyValue("--i");
        if (iVal && iVal.trim() !== "") this.style.setProperty("--i", iVal.trim());
      }
      const parentType = this.closest(".TYPE, .type, .TYPE-, dx-type, dx-type-sda, ui-type, ui-type-sda");
      if (parentType) {
        const typeD = parentType.style.getPropertyValue("--d");
        if (typeD && typeD.trim() !== "") {
          this.style.setProperty("--d", typeD.trim());
        }
      }
      let shadow = this.shadowRoot;
      if (!shadow) {
        try {
          shadow = this.attachShadow({ mode: "open" });
        } catch (e) {
          shadow = null;
        }
      }
      if (shadow) {
        shadow.addEventListener("animationend", this._handleRibbonDone);
        shadow.addEventListener("transitionend", this._handleRibbonDone);
        const sheet = getOdometerStyleSheet();
        if (sheet && shadow.adoptedStyleSheets) {
          shadow.adoptedStyleSheets = [sheet];
        } else if (!shadow.querySelector("style")) {
          const styleEl = document.createElement("style");
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
      if (shadow && !this.classList.contains("tw-embed")) {
        this.innerHTML = `<s-t>${this.getStaticHTML()}</s-t>`;
      }
    }
    getStaticHTML() {
      const valAttr = this.getAttribute("percent") || this.getAttribute("value") || this.textContent;
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
      if (newValue === void 0) {
        return parseFloat(this.getAttribute("percent") || this.getAttribute("value") || this.textContent) || 0;
      }
      const parsed = parseFloat(newValue) || 0;
      const current = parseFloat(this.getAttribute("percent") || this.getAttribute("value") || this.textContent) || 0;
      if (parsed === current) return this;
      this.update();
    }
    /** Read-only — throws unconditionally. */
    update() {
      throw new Error("dx-odometer is read-only");
    }
  };
  if (rootWin2) {
    rootWin2.DxOdometer = rootWin2.uiOdometer = rootWin2.UiOdometer = DxOdometer;
  }
  defCustomElement("dx-odometer", DxOdometer);
  defCustomElement("ui-odometer", DxOdometer);
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=dx-type.iife.js.map
