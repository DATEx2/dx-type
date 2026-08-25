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
    DxCounter: () => DxCounter,
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
  var _sdaBottomGap = "50px";
  function formatMarginValue(v) {
    if (!v || v === "0" || v === "0%" || v === "0px" || v === 0) return "0px";
    if (typeof v === "number") return `${v}px`;
    if (typeof v === "string") return v.trim();
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
    const doc = typeEl.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    const directTpl = typeEl.querySelector(":scope > template");
    if (directTpl) directTpl.remove();
    const tLayer = typeEl.querySelector(":scope > t, t");
    if (tLayer) {
      tLayer.remove();
    }
    const stMeters = typeEl.querySelectorAll ? typeEl.querySelectorAll("s-t dx-odometer, s-t ui-odometer, s-t dx-number, s-t ui-number") : [];
    for (let i = 0; i < stMeters.length; i++) {
      const m = stMeters[i];
      if (typeof m.makeStatic === "function") m.makeStatic();
      if (typeof m.getStaticHTML === "function" && !m.textContent.trim()) {
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
      const allEmbedsDone = embeds.length === 0 || embeds.every((e) => e._animDone || e.isStatic || e.classList.contains("data-static"));
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
      return this.classList ? this.classList.contains("data-static") : false;
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
      this.classList.add("data-static");
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
      const inST = typeof this.closest === "function" && !!this.closest("s-t");
      if (inST) {
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
        return;
      }
      const isSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".ui-num"));
      if (isSsr) {
        this.init();
        return;
      }
      if (this.childNodes.length && typeof this.querySelector === "function" && !this.querySelector(".ui-num")) {
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
      const isStatic = this.classList.contains("data-static") || this.isStatic || !!this.closest("s-t");
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) && this._targetValue !== 0 ? this._targetValue : parseFloat(this.getAttribute("percent")) || this.getNumericValue() || 0;
      this._targetValue = targetVal;
      const hasSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".ui-num"));
      if (isStatic || !this.hasAttribute("start")) {
        this._value = targetVal;
        this._animationStarted = true;
      } else {
        this._value = parseFloat(this.getAttribute("start")) || 0;
      }
      if (!hasSsr) {
        this.render();
      } else {
        this._numSpan = this.querySelector(".ui-num");
        this._pfxSpan = this.querySelector(".ui-pfx:not(.ui-pfx-pad)");
        this._sfxSpan = this.querySelector(".ui-sfx");
        this._cacheTextNodes();
      }
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
        if (this._numTextNode) this._numTextNode.nodeValue = "";
        if (this._padTextNode) this._padTextNode.nodeValue = "";
        return;
      }
      if (!this._numTextNode) {
        this.render();
        return;
      }
      const p = parseNumParts(this.formatValue(this._value));
      const numText = `${p.digits}${p.radix}${p.decimals}`;
      if (this._numTextNode.nodeValue !== numText) {
        this._numTextNode.nodeValue = numText;
      }
      if (this._padTextNode) {
        const effectiveTarget = targetVal !== void 0 && !isNaN(targetVal) ? targetVal : this.getNumericValue();
        let padPrefix = "";
        if (effectiveTarget !== void 0 && !isNaN(effectiveTarget) && this._value !== effectiveTarget) {
          const tp = parseNumParts(this.formatValue(effectiveTarget));
          if (tp.digits.length > p.digits.length) {
            padPrefix = tp.digits.slice(0, tp.digits.length - p.digits.length).replace(/\d/g, "0");
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
      if (!numSpan) {
        this._numTextNode = null;
        this._padTextNode = null;
        return;
      }
      const padEl = numSpan.querySelector(".ui-pad");
      if (padEl) {
        this._padTextNode = padEl.firstChild;
        if (!this._padTextNode || this._padTextNode.nodeType !== 3) {
          this._padTextNode = document.createTextNode("");
          padEl.appendChild(this._padTextNode);
        }
        this._numTextNode = padEl.nextSibling;
        if (!this._numTextNode || this._numTextNode.nodeType !== 3) {
          this._numTextNode = document.createTextNode("");
          numSpan.appendChild(this._numTextNode);
        }
      } else {
        this._padTextNode = null;
        this._numTextNode = numSpan.firstChild;
        if (!this._numTextNode || this._numTextNode.nodeType !== 3) {
          this._numTextNode = document.createTextNode("");
          numSpan.appendChild(this._numTextNode);
        }
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
            this._numTextNode = null;
            this._padTextNode = null;
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
          this._cacheTextNodes();
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
        this._cacheTextNodes();
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
  var TYPE_PARENT_SEL2 = "dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda";
  var DxOdometer = class extends DxMeter {
    constructor() {
      super();
      this._animDone = false;
      this._digitCount = 0;
      this._digitsDone = 0;
    }
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      if (this.closest("s-t")) {
        this.classList.add("data-static");
        return;
      }
      if (this.classList.contains("data-static")) return;
      this.addEventListener("animationend", this._onAnimEnd);
      this.addEventListener("animationstart", (e) => {
        if (e?.stopPropagation) e.stopPropagation();
      }, { passive: true });
      const twEmbed = this.classList.contains("tw-embed");
      if (!twEmbed) {
        queueMicrotask(() => {
          if (!this.isConnected || this._animDone || this.classList.contains("data-static")) return;
          this._digitCount = this.querySelectorAll("d[data-seq]").length;
          if (this._digitCount === 0) {
            this.classList.add("data-static");
            return;
          }
          const parentType = this.closest(TYPE_PARENT_SEL2);
          if (!parentType) {
            observeIO(this, (el2) => {
              el2.classList.add(DX_ANIM.TYPING);
            });
          }
        });
      }
    }
    _onAnimEnd = (e) => {
      if (this._animDone) return;
      const target = e.target;
      if (!target || target.tagName !== "D") return;
      e.stopPropagation();
      if (!this._digitCount) {
        this._digitCount = this.querySelectorAll("d[data-seq]").length;
      }
      this._digitsDone++;
      if (this._digitsDone >= this._digitCount) {
        this._animDone = true;
        if (!this.classList.contains("tw-embed")) {
          this.makeStatic();
        }
        if (this.classList.contains("tw-embed") && typeof rootWin2?.__twEnd === "function") {
          rootWin2.__twEnd(this);
        }
      }
    };
    getStaticHTML() {
      const valAttr = this.getAttribute("percent") || this.getAttribute("value") || this.textContent;
      const numericValue = parseFloat(valAttr);
      if (isNaN(numericValue)) return this.textContent.trim();
      return this.formatValue(numericValue);
    }
    disconnectedCallback() {
      this.removeEventListener("animationend", this._onAnimEnd);
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

  // src/client/components/dx-counter.js
  var TYPE_PARENT_SEL3 = "dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda";
  var REVEAL_PARENT_SEL2 = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal";
  if (typeof window !== "undefined" && window.CSS && typeof window.CSS.registerProperty === "function") {
    [
      "--b",
      "--m",
      "--k",
      "--u",
      "--dec",
      "--start-b",
      "--target-b",
      "--start-m",
      "--target-m",
      "--start-k",
      "--target-k",
      "--start-u",
      "--target-u",
      "--start-dec",
      "--target-dec"
    ].forEach((name) => {
      try {
        window.CSS.registerProperty({
          name,
          syntax: "<integer>",
          inherits: true,
          initialValue: "0"
        });
      } catch (e) {
      }
    });
  }
  var DxCounter = class extends DxMeter {
    static get observedAttributes() {
      return ["prefix", "suffix", "comma", "type", "percent", "value", "duration"];
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal || !this._initialized || this._isRendering) return;
      if (name === "percent" || name === "value" || name === "duration") return;
      const wrap = this.querySelector(".dx-num-wrap");
      if (!wrap) return;
      if (name === "prefix") {
        const pfx = wrap.querySelector(".dx-pfx");
        if (pfx) pfx.textContent = newVal || "";
      } else if (name === "suffix") {
        const sfx = wrap.querySelector(".dx-sfx");
        if (sfx) sfx.textContent = newVal || "";
      } else if (name === "comma") {
        const radix = wrap.querySelector(".dx-radix");
        if (radix) radix.textContent = newVal || ",";
      }
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
      const inST = typeof this.closest === "function" ? !!this.closest("s-t") : false;
      if (inST) {
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
        return;
      }
      const isSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".dx-num-wrap"));
      if (isSsr) {
        this.init();
        return;
      }
      setTimeout(() => {
        if (this.isConnected && !this._initialized) {
          this.init();
        }
      }, 0);
    }
    getStaticHTML() {
      const valAttr = this.getAttribute("percent") || this.getAttribute("value") || this.textContent;
      const numericValue = parseFloat(valAttr);
      if (isNaN(numericValue)) return this.textContent.trim();
      return this.formatValue(numericValue);
    }
    isReadyToAnimate() {
      const parentC = typeof this.closest === "function" ? this.closest("c") : null;
      const parentReveal = typeof this.closest === "function" ? this.closest(REVEAL_PARENT_SEL2) : null;
      if (!parentC && !parentReveal) {
        this._inViewport = true;
        this._parentReady = true;
        return true;
      }
      if (this._inViewport && !this._parentReady) {
        if (parentReveal) {
          if (parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains("revealed") || parentReveal.classList.contains("revealing") || parentReveal.hasAttribute && parentReveal.hasAttribute("data-static"))) {
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
    _decompose(val) {
      const num = Math.abs(parseFloat(val) || 0);
      const intPart = Math.floor(num);
      const decPart = Math.round((num - intPart) * 100);
      return {
        b: Math.floor(intPart / 1e9),
        m: Math.floor(intPart % 1e9 / 1e6),
        k: Math.floor(intPart % 1e6 / 1e3),
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
      const setProp = (p, v) => {
        const sVal = String(v);
        if (this.style.getPropertyValue(p) !== sVal) {
          this.style.setProperty(p, sVal);
        }
      };
      setProp("--start-b", sParts.b);
      setProp("--target-b", tParts.b);
      setProp("--start-m", sParts.m);
      setProp("--target-m", tParts.m);
      setProp("--start-k", sParts.k);
      setProp("--target-k", tParts.k);
      setProp("--start-u", sParts.u);
      setProp("--target-u", tParts.u);
      setProp("--start-dec", sParts.dec);
      setProp("--target-dec", tParts.dec);
      setProp("--b", tParts.b);
      setProp("--m", tParts.m);
      setProp("--k", tParts.k);
      setProp("--u", tParts.u);
      setProp("--dec", tParts.dec);
      setProp("--t", `${dur}ms`);
      setProp("--delay-k", `${delayK}ms`);
      setProp("--delay-m", `${delayM}ms`);
      setProp("--delay-b", `${delayB}ms`);
      if (delayKHide > 0) setProp("--delay-k-hide", `${delayKHide}ms`);
      if (delayMHide > 0) setProp("--delay-m-hide", `${delayMHide}ms`);
      const wrap = this.querySelector(".dx-num");
      if (wrap) {
        const elB = wrap.querySelector(".dx-b");
        const elSepB = wrap.querySelector(".dx-sep-b");
        const elM = wrap.querySelector(".dx-m");
        const elSepM = wrap.querySelector(".dx-sep-m");
        const elK = wrap.querySelector(".dx-k");
        const elSepK = wrap.querySelector(".dx-sep-k");
        const elRadix = wrap.querySelector(".dx-radix");
        const elDec = wrap.querySelector(".dx-dec");
        const hasB = target >= 1e9 || start >= 1e9;
        const hasM = target >= 1e6 || start >= 1e6;
        const hasK = target >= 1e3 || start >= 1e3;
        const cfg = this.getFormatConfig();
        const hasDec = cfg.comma !== "" && cfg.type !== "int" && (tParts.dec > 0 || sParts.dec > 0 || cfg.type.includes("number"));
        const setDisp = (el2, v) => {
          if (el2 && el2.style.display !== v) el2.style.display = v;
        };
        setDisp(elB, hasB ? "inline" : "none");
        setDisp(elSepB, hasB ? "inline" : "none");
        setDisp(elM, hasM ? "inline" : "none");
        setDisp(elSepM, hasM ? "inline" : "none");
        setDisp(elK, hasK ? "inline" : "none");
        setDisp(elSepK, hasK ? "inline" : "none");
        setDisp(elRadix, hasDec ? "inline" : "none");
        setDisp(elDec, hasDec ? "inline" : "none");
      }
    }
    render() {
      this._isRendering = true;
      const cfg = this.getFormatConfig();
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
      const formattedFull = this.formatValue(targetVal);
      let wrap = this.querySelector(".dx-num-wrap");
      let st = this.querySelector("s-t");
      if (!wrap) {
        this.innerHTML = `<s-t>${formattedFull}</s-t><span class="dx-num-wrap"><span class="dx-pfx">${cfg.prefix || ""}</span><span class="dx-num"><span class="dx-b" style="display: none;"></span><span class="dx-sep-b" style="display: none;"> </span><span class="dx-m" style="display: none;"></span><span class="dx-sep-m" style="display: none;"> </span><span class="dx-k" style="display: none;"></span><span class="dx-sep-k" style="display: none;"> </span><span class="dx-u"></span><span class="dx-radix">${cfg.comma || ","}</span><span class="dx-dec"></span></span><span class="dx-sfx">${cfg.suffix || ""}</span></span>`;
      } else {
        if (st && st.textContent !== formattedFull) {
          st.textContent = formattedFull;
        }
      }
      this._cacheDOMElements();
      const startVal = this._value !== void 0 ? this._value : targetVal;
      this._updateCounterVars(startVal);
      this._isRendering = false;
    }
    _cacheDOMElements() {
      const num = this.querySelector(".dx-num");
      if (num) {
        this._elB = num.querySelector(".dx-b");
        this._elSepB = num.querySelector(".dx-sep-b");
        this._elM = num.querySelector(".dx-m");
        this._elSepM = num.querySelector(".dx-sep-m");
        this._elK = num.querySelector(".dx-k");
        this._elSepK = num.querySelector(".dx-sep-k");
        this._elRadix = num.querySelector(".dx-radix");
        this._elDec = num.querySelector(".dx-dec");
      }
      this._cachedCfg = this.getFormatConfig();
    }
    _onAnimEnd(e) {
      if (e && e.target && !e.target.classList.contains("dx-num")) return;
      this._value = this._targetValue;
      this._updateCounterVars(this._value);
      this.classList.remove("dx-counter-running");
      this.makeStatic();
      const st = this.querySelector("s-t");
      if (st) {
        st.textContent = this.formatValue(this._value);
      }
      const num = this.querySelector(".dx-num");
      if (num) {
        num.removeEventListener("animationend", this._onAnimEndBound);
      }
    }
    _updateCounterVars(currentVal) {
      if (!this._elDec && !this._elRadix) {
        this._cacheDOMElements();
      }
      const c = this._decompose(currentVal);
      if (c.b !== this._lastB) {
        this.style.setProperty("--b", String(c.b));
        this._lastB = c.b;
      }
      if (c.m !== this._lastM) {
        this.style.setProperty("--m", String(c.m));
        this._lastM = c.m;
      }
      if (c.k !== this._lastK) {
        this.style.setProperty("--k", String(c.k));
        this._lastK = c.k;
      }
      if (c.u !== this._lastU) {
        this.style.setProperty("--u", String(c.u));
        this._lastU = c.u;
      }
      if (c.dec !== this._lastDec) {
        this.style.setProperty("--dec", String(c.dec));
        this._lastDec = c.dec;
      }
      const hasB = currentVal >= 1e9;
      const hasM = currentVal >= 1e6;
      const hasK = currentVal >= 1e3;
      const cfg = this._cachedCfg || this.getFormatConfig();
      const hasDec = cfg.comma !== "" && cfg.type !== "int" && (c.dec > 0 || cfg.type.includes("number"));
      if (hasB !== this._lastHasB) {
        if (this._elB) this._elB.style.display = hasB ? "inline" : "none";
        if (this._elSepB) this._elSepB.style.display = hasB ? "inline" : "none";
        this._lastHasB = hasB;
      }
      if (hasM !== this._lastHasM) {
        if (this._elM) this._elM.style.display = hasM ? "inline" : "none";
        if (this._elSepM) this._elSepM.style.display = hasM ? "inline" : "none";
        this._lastHasM = hasM;
      }
      if (hasK !== this._lastHasK) {
        if (this._elK) this._elK.style.display = hasK ? "inline" : "none";
        if (this._elSepK) this._elSepK.style.display = hasK ? "inline" : "none";
        this._lastHasK = hasK;
      }
      if (hasDec !== this._lastHasDec) {
        if (this._elRadix) this._elRadix.style.display = hasDec ? "inline" : "none";
        if (this._elDec) this._elDec.style.display = hasDec ? "inline" : "none";
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
        const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
        this._animationStarted = true;
        if (this._value !== targetVal) {
          const isActionBar = this.classList && this.classList.contains("ui-add-to-cart-total");
          const dur = this.hasAttribute("duration") ? parseFloat(this.getAttribute("duration")) : isActionBar ? 1e3 : this.getDuration();
          const d = parseFloat(this.getAttribute("delay")) || parseFloat(this.style.getPropertyValue("--d")) || parseFloat(this.closest('[style*="--d"]')?.style.getPropertyValue("--d")) || (isActionBar ? 400 : 0);
          this.style.setProperty("--t", `${dur}ms`);
          if (d > 0) {
            this.style.setProperty("--d", `${d}ms`);
          }
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
      const inST = typeof this.closest === "function" ? !!this.closest("s-t") : false;
      const isStatic = inST || this.hasAttribute("data-static") || this.classList && this.classList.contains("data-static") && !this.classList.contains("ui-add-to-cart-total");
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) && this._targetValue !== 0 ? this._targetValue : parseFloat(this.getAttribute("percent")) || this.getNumericValue() || 0;
      const hasSsrMarkup = typeof this.querySelector === "function" && Boolean(this.querySelector(".dx-num-wrap"));
      if (isStatic || !this.hasAttribute("start") && hasSsrMarkup) {
        this._value = targetVal;
        this._animationStarted = true;
      } else {
        this._value = this.hasAttribute("start") ? parseFloat(this.getAttribute("start")) || 0 : 0;
      }
      if (!hasSsrMarkup) {
        this.render();
      } else {
        this._cacheDOMElements();
      }
      this.setAccessibility(targetVal);
      const parentC = typeof this.closest === "function" ? this.closest("c") : null;
      const parentReveal = typeof this.closest === "function" ? this.closest(REVEAL_PARENT_SEL2) : null;
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
        const parentType = this.closest(TYPE_PARENT_SEL3);
        if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains("typed") || parentType.hasAttribute("data-static"))) {
          this._parentReady = true;
        } else {
          parentC.addEventListener("animationstart", (e) => {
            if (e.target === parentC) {
              this._parentReady = true;
              this._checkAndTrigger();
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
    }
    val(newValue, duration) {
      if (!this._initialized) this.init();
      if (newValue === void 0) return this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this._value;
      const parsedValue = parseFloat(newValue) || 0;
      this._targetValue = parsedValue;
      if (this._initialized && this._value === parsedValue && !this._pendingVal) {
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
      this._value = parsedValue;
      this.setAttribute("percent", parsedValue);
      this.setAccessibility(parsedValue);
      const st = this.querySelector("s-t");
      if (st) st.textContent = this.formatValue(parsedValue);
      this.style.setProperty("--t", `${animDuration}ms`);
      this.style.setProperty("--d", "0ms");
      this._updateCounterVars(parsedValue);
      return this;
    }
  };
  defCustomElement("dx-counter", DxCounter);
  if (rootWin2) {
    Object.assign(rootWin2, { DxCounter });
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=dx-type.iife.js.map
