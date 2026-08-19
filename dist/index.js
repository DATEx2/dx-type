// src/client/base/dx-base.js
var rootWin = typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : null;
var BaseHTMLElement = rootWin?.HTMLElement || class {
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
      tpl.replaceWith(tpl.content);
      this.classList.add("type-active");
      return true;
    }
    return false;
  }
  replay() {
    if (this._pristineHTML) {
      this._cleanedUp = false;
      this._typed = 0;
      this.classList.remove("TYPED", "TYPING", "type-active", "REVEALED");
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
  if (rootWin?.customElements && typeof rootWin.HTMLElement !== "undefined") {
    if (!rootWin.customElements.get(tag)) {
      try {
        rootWin.customElements.define(tag, cls);
      } catch (e) {
        try {
          rootWin.customElements.define(tag, class extends cls {
          });
        } catch {
        }
      }
    }
  }
};

// src/client/base/dx-scheduler.js
var rootWin2 = typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : null;
var DX_ANIM = Object.freeze({
  // Final-state classes (uppercase = machine states, never in selectors as triggers)
  TYPED: "TYPED",
  TYPING: "TYPING",
  REVEALED: "REVEALED",
  REVEALING: "REVEALING",
  // SSR guard markers — prevent re-transpiling
  TYPE_GUARD: "TYPE-",
  REVEAL_GUARD: "REVEAL-",
  // Keyframe names emitted by CSS
  KF_TYPE_SDA: "type-sda",
  KF_REVEAL_SDA: "reveal-sda",
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
  const winTop = rootWin2?.sdaTopGap ?? rootWin2?.__dxTypeConfig?.sdaTopGap;
  const winBottom = rootWin2?.sdaBottomGap ?? rootWin2?.__dxTypeConfig?.sdaBottomGap;
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
  const IO = rootWin2?.IntersectionObserver;
  if (typeof IO === "function") {
    const gaps = getSdaGaps();
    const topMargin = formatMarginValue(gaps.sdaTopGap);
    const bottomMargin = formatMarginValue(gaps.sdaBottomGap);
    ioInstance = new IO(ioHandler, {
      rootMargin: `${topMargin} 0px ${bottomMargin} 0px`,
      threshold: 0
    });
  }
  return ioInstance;
}
function observeIO2(el2, callback) {
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
if (rootWin2) {
  Object.assign(rootWin2, {
    setSdaGaps,
    getSdaGaps
  });
}
var activeAnimations = /* @__PURE__ */ new Set();
var rafId = null;
var raf = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : ((cb) => setTimeout(() => cb(Date.now()), 16));
var caf = typeof cancelAnimationFrame !== "undefined" ? cancelAnimationFrame : typeof window !== "undefined" && window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : clearTimeout;
function tick(now) {
  if (activeAnimations.size === 0) {
    rafId = null;
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
  if (activeAnimations.size === 0 && rafId) {
    caf(rafId);
    rafId = null;
  }
}

// src/client/base/dx-typing.js
function unpackTemplate(el2) {
  if (!el2) return false;
  if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return false;
  const tpl = el2.querySelector(":scope > template");
  if (tpl && tpl.content) {
    if (!el2.getAttribute("role")) el2.setAttribute("role", "text");
    const st = el2.querySelector(":scope > s-t");
    if (st && !el2.getAttribute("aria-label")) {
      const raw = (st.textContent || "").replace(/\s+/g, " ").trim();
      if (raw) el2.setAttribute("aria-label", raw);
    }
    tpl.replaceWith(tpl.content);
    const t = el2.querySelector(":scope > t");
    if (t) t.setAttribute("aria-hidden", "true");
    el2.classList.add("type-active");
    return true;
  }
  return false;
}
function observeTypewriter2(el2) {
  if (!el2) return;
  if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return;
  observeIO2(el2, unpackTemplate);
}
function mountTypewriter(el2, e) {
  if (e && e.animationName && e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
  if (!el2) return;
  if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return;
  observeTypewriter2(el2);
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
  const deferFn = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout;
  deferFn(() => {
    const doc = typeEl.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    const directTpl = typeEl.querySelector(":scope > template");
    if (directTpl) directTpl.remove();
    const st = typeEl.querySelector(":scope > s-t");
    if (st) st.remove();
    const t = typeEl.querySelector(":scope > t");
    if (t) {
      const allC = Array.from(t.querySelectorAll("c"));
      for (const c of allC) {
        if (!c.querySelector("dx-odometer, ui-odometer, dx-number, ui-number, .tw-embed")) {
          c.replaceWith(doc.createTextNode(c.textContent || ""));
        } else {
          c.replaceWith(...Array.from(c.childNodes));
        }
      }
      const allW = Array.from(t.querySelectorAll("w"));
      for (const w of allW) {
        w.replaceWith(...Array.from(w.childNodes));
      }
      t.replaceWith(...Array.from(t.childNodes));
      if (typeof typeEl.normalize === "function") typeEl.normalize();
    }
    typeEl.removeAttribute("aria-label");
  });
}
function onTypewriterEnd(cEl, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
    if (event.animationName === DX_ANIM.KF_PLAY_TOGGLE) return false;
  }
  if (!cEl) return false;
  const parent = cEl.closest("dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda");
  if (parent) {
    if (parent.classList.contains(DX_ANIM.TYPED)) return false;
    const allC = parent.querySelectorAll("c");
    const lastC = allC.length ? allC[allC.length - 1] : null;
    const isLastChar = cEl === lastC || lastC && (cEl.contains(lastC) || lastC.contains(cEl));
    const isEmbed = cEl.classList.contains("tw-embed") || !!cEl.querySelector?.(".tw-embed");
    if (!isLastChar && !isEmbed) return false;
    parent._typed = (parent._typed || 0) + 1;
    if (parent._toType === void 0) {
      parent._toType = 1 + parent.querySelectorAll("ui-odometer.tw-embed, dx-odometer.tw-embed").length;
    }
    const toType = parent._toType;
    if (parent._typed >= toType) {
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
  get isTyped() {
    return this.classList.contains(DX_ANIM.TYPED);
  }
  unpackTemplate() {
    return unpackTemplate(this);
  }
  markTyped() {
    if (this.cls) {
      this.cls({ [DX_ANIM.TYPING]: 0, [DX_ANIM.TYPED]: 1 });
    } else {
      this.classList.remove(DX_ANIM.TYPING);
      this.classList.add(DX_ANIM.TYPED);
    }
    if (typeof rootWin?.__datex2TriggerPendingUiNumbers === "function") {
      rootWin.__datex2TriggerPendingUiNumbers(this);
    }
    cleanupTypedDOM(this);
  }
};
var checkAndObserve = (el2) => {
  if (el2?.querySelector && el2.querySelector(":scope > template") && !el2.classList.contains(DX_ANIM.TYPED)) {
    observeTypewriter2(el2);
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
  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    const MATCH_SELECTOR = "dx-type-sda, dx-reveal-sda, dx-type, .type-sda, ui-type-sda, .type, .TYPE";
    const mutObs = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const added = mutations[i].addedNodes;
        for (let j = 0; j < added.length; j++) {
          const node = added[j];
          if (node && node.nodeType === 1) {
            if (node.matches && node.matches(MATCH_SELECTOR)) {
              checkAndObserve(node);
            }
            if (node.querySelectorAll) {
              const nested = node.querySelectorAll(MATCH_SELECTOR);
              for (let k = 0; k < nested.length; k++) {
                checkAndObserve(nested[k]);
              }
            }
          }
        }
      }
    });
    mutObs.observe(document.documentElement, { childList: true, subtree: true });
  }
}
if (rootWin) {
  Object.assign(rootWin, {
    DxTyping,
    UiTyping: DxTyping,
    unpackTemplate,
    mountTypewriter,
    observeTypewriter: observeTypewriter2,
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
  if (e && e.animationName && e.animationName !== DX_ANIM.KF_REVEAL_IN && e.animationName !== DX_ANIM.KF_REVEAL_SDA && e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
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
  if (e && e.animationName && e.animationName !== DX_ANIM.KF_TYPE_SDA && e.animationName !== DX_ANIM.KF_SDA_SENSOR) return;
  if (typeof e?.stopPropagation === "function") e.stopPropagation();
  el2.classList.add(DX_ANIM.REVEALING);
  if (typeof rootWin?.__datex2TriggerPendingUiNumbers === "function") {
    rootWin.__datex2TriggerPendingUiNumbers(el2);
  }
}
var DxRevealing = class extends DxBase {
  get isRevealed() {
    return this.classList.contains(DX_ANIM.REVEALED);
  }
  markRevealed() {
    this.classList.remove("reveal-sda", "reveal", DX_ANIM.REVEALING);
    this.classList.add(DX_ANIM.REVEALED);
    if (typeof rootWin?.__datex2TriggerPendingUiNumbers === "function") {
      rootWin.__datex2TriggerPendingUiNumbers(this);
    }
  }
};
if (rootWin) {
  Object.assign(rootWin, {
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
    if (type.includes("number-1dec") || type.includes("1dec")) {
      decimals = 1;
    } else if (type.includes("number-2dec") || type.includes("currency")) {
      decimals = 2;
    } else if (type.includes("number")) {
      decimals = absValue % 1 !== 0 ? 2 : 0;
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
if (rootWin) {
  Object.assign(rootWin, { DxMeter, UiMeter: DxMeter, uiNum });
}

// src/client/components/dx-type.js
var DxType = class extends DxTyping {
  connectedCallback() {
    if (!this.classList.contains("type")) {
      this.classList.add("type");
    }
    if (!this.isTyped) {
      this.unpackTemplate();
      this.addEventListener("animationend", this._onAnimEnd);
    }
  }
  _onAnimEnd = (e) => {
    if (e.animationName === DX_ANIM.KF_TYPE_IN || e.animationName === DX_ANIM.KF_TYPE_SDA) {
      const target = e.target;
      if (target.classList?.contains("last-char") || target.hasAttribute?.("last-char")) {
        onTypewriterEnd(target, e);
      } else {
        const allC = this.querySelectorAll("c");
        if (allC.length && target === allC[allC.length - 1]) {
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
    this.addEventListener("animationend", this._onAnimEnd);
    observeIO2(this, (el2) => {
      unpackTemplate(el2);
      el2.classList.add("type-active");
    });
  }
  _onAnimStart = (e) => {
    if (e.target !== this) return;
    if (e.animationName !== DX_ANIM.KF_TYPE_SDA) return;
    e.stopPropagation();
    observeTypewriter(this);
  };
  _onAnimEnd = (e) => {
    if (e.animationName === DX_ANIM.KF_TYPE_SDA || e.animationName === DX_ANIM.KF_TYPE_IN) {
      const target = e.target;
      if (target.classList?.contains("last-char") || target.hasAttribute?.("last-char")) {
        onTypewriterEnd(target, e);
      } else {
        const allC = this.querySelectorAll("c");
        if (allC.length && target === allC[allC.length - 1]) {
          onTypewriterEnd(target, e);
        }
      }
    }
  };
  disconnectedCallback() {
    this.removeEventListener("animationstart", this._onAnimStart);
    this.removeEventListener("animationend", this._onAnimEnd);
  }
};
defCustomElement("dx-type-sda", DxTypeSda);
defCustomElement("ui-type-sda", DxTypeSda);

// src/client/components/dx-reveal.js
var DxReveal = class extends DxRevealing {
  connectedCallback() {
    if (this.isRevealed) return;
    if (!this.classList.contains("reveal")) {
      this.classList.add("reveal");
    }
    const typeReady = this.closest(".type-ready, dx-type-ready, ui-type-ready");
    if (!typeReady) {
      observeIO2(this, (el2) => {
        el2.classList.add("reveal-active");
        const tpl = el2.querySelector(":scope > template");
        if (tpl && tpl.content) tpl.replaceWith(tpl.content);
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
    observeIO2(this, (el2) => {
      el2.classList.add("reveal-active");
      const tpl = el2.querySelector(":scope > template");
      if (tpl && tpl.content) tpl.replaceWith(tpl.content);
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
    if (!this.classList.contains("type-ready")) {
      this.classList.add("type-ready");
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
var actionBarSubscribers = /* @__PURE__ */ new Set();
var actionBarObserver = null;
function checkActionBarShown(abParent) {
  const isAb = (el2) => el2 && (el2.classList.contains("show-action-bar") || el2.classList.contains("showing-action-bar"));
  const doc = rootWin?.document;
  return !!(isAb(doc?.documentElement) || isAb(doc?.body) || isAb(abParent));
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
    if (typeof subs[i]._triggerActionBarAnimation === "function") {
      subs[i]._triggerActionBarAnimation();
    }
  }
}
function subscribeToActionBar(el2, abParent) {
  if (checkActionBarShown(abParent)) {
    if (typeof el2._triggerActionBarAnimation === "function") {
      el2._triggerActionBarAnimation();
    }
    return;
  }
  actionBarSubscribers.add(el2);
  if (!actionBarObserver && typeof MutationObserver !== "undefined") {
    actionBarObserver = new MutationObserver(() => {
      if (checkActionBarShown(abParent)) {
        notifyActionBarSubscribers();
      }
    });
    const docEl = rootWin?.document?.documentElement;
    const docBody = rootWin?.document?.body;
    if (docEl) actionBarObserver.observe(docEl, { attributes: true, attributeFilter: ["class"] });
    if (docBody) actionBarObserver.observe(docBody, { attributes: true, attributeFilter: ["class"] });
    if (abParent) actionBarObserver.observe(abParent, { attributes: true, attributeFilter: ["class"] });
  }
}
function unsubscribeFromActionBar(el2) {
  actionBarSubscribers.delete(el2);
  if (actionBarSubscribers.size === 0 && actionBarObserver) {
    actionBarObserver.disconnect();
    actionBarObserver = null;
  }
}
var SDA_PARENT_SEL = "dx-type-sda, dx-reveal-sda, .type-sda, .reveal-sda, .TYPE-, .REVEAL-, ui-type-sda, ui-reveal-sda";
var TYPE_PARENT_SEL = "dx-type-sda, dx-type, .type-sda, .type, .TYPE-, ui-type, ui-type-sda";
var REVEAL_PARENT_SEL = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, .REVEAL-, ui-reveal-sda, ui-reveal, .form-control--checkbox-button";
var DxNumber = class extends DxMeter {
  constructor() {
    super();
    this._animationStarted = false;
    this._timeoutId = null;
    this._numSpan = null;
  }
  connectedCallback() {
    if (this.isStatic) return;
    if (this._initialized) return;
    const schedule = typeof queueMicrotask === "function" ? queueMicrotask : ((cb) => setTimeout(cb, 0));
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
    const isAnimateOnLoad = !this.classList.contains("tw-embed");
    if (isAnimateOnLoad) {
      const startVal = parseFloat(this.getAttribute("start")) || 0;
      const targetVal = this._value !== void 0 && !isNaN(this._value) && this._value !== 0 ? this._value : parseFloat(this.getAttribute("percent")) || 0;
      this._targetValue = targetVal;
      this._value = startVal;
      this._animationStarted = false;
      this.render();
      const trigger = () => {
        if (this._animationStarted) return;
        this._animationStarted = true;
        const d = parseFloat(this.style.getPropertyValue("--d")) || parseFloat(this.closest('[style*="--d"]')?.style.getPropertyValue("--d")) || 0;
        if (d > 0) {
          setTimeout(() => this.val(targetVal, 400), d);
        } else {
          this.val(targetVal, 400);
        }
      };
      const abParent = this.closest(".action-bar, .action-bar-wrapper");
      const sdaParent = this.closest(SDA_PARENT_SEL);
      const typeReadyParent = this.closest(".type-ready, dx-type-ready, ui-type-ready");
      if (abParent) {
        this._triggerActionBarAnimation = trigger;
        subscribeToActionBar(this, abParent);
      } else if (sdaParent) {
        sdaParent.addEventListener("animationstart", () => {
          if (!this._animationStarted) trigger();
        }, { once: true });
        if (sdaParent.classList.contains(DX_ANIM.REVEALED) || sdaParent.classList.contains(DX_ANIM.TYPED) || sdaParent.classList.contains("revealed") || sdaParent.classList.contains("typed")) {
          this._revealTriggered = true;
        }
        if (this._revealTriggered && !this._animationStarted) trigger();
      } else if (typeReadyParent) {
        trigger();
      } else {
        observeIO(this, () => trigger());
      }
    } else if (this.classList.contains("tw-embed")) {
      const startVal = parseFloat(this.getAttribute("start")) || 0;
      const targetVal = this._value;
      this._targetValue = targetVal;
      this._value = startVal;
      this._animationStarted = false;
      this.render();
      const parentType = this.closest(TYPE_PARENT_SEL);
      const parentC = this.closest("c");
      const parentReveal = this.closest(REVEAL_PARENT_SEL);
      const triggerCounting = () => {
        if (this._animationStarted) return;
        delete this._pendingValue;
        this._animationStarted = true;
        this.val(targetVal, 800);
      };
      if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains("typed"))) {
        triggerCounting();
        return;
      }
      if (parentReveal && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains("revealed"))) {
        triggerCounting();
        return;
      }
      if (parentC) {
        parentC.addEventListener("animationstart", (e) => {
          if (e.target === parentC && !this._animationStarted) {
            const u = parentC.style && parseFloat(parentC.style.getPropertyValue("--u")) || 40;
            this._twDelayId = setTimeout(triggerCounting, u * 0.35);
          }
        }, { once: true });
      }
      if (parentType && parentC) {
        parentType.addEventListener("animationstart", (e) => {
          if (e.target === parentC && !this._animationStarted) {
            const u = parentC.style && parseFloat(parentC.style.getPropertyValue("--u")) || 40;
            this._twDelayId = setTimeout(triggerCounting, u * 0.35);
          }
        }, { once: true });
      }
      if (parentReveal && !parentC) {
        parentReveal.addEventListener("animationstart", (e) => {
          if (!this._animationStarted) {
            const d = parentReveal.style && parseFloat(parentReveal.style.getPropertyValue("--d")) || 0;
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
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._twDelayId) {
      clearTimeout(this._twDelayId);
      this._twDelayId = null;
    }
    unsubscribeFromActionBar(this);
    unregisterRAF(this);
    this.classList.remove("ui-number-running");
  }
  val(newValue, duration) {
    if (!this._initialized) this.init();
    if (newValue === void 0) return this._value;
    const parsedValue = parseFloat(newValue) || 0;
    this._targetValue = parsedValue;
    if (this._initialized && this._value === parsedValue) {
      this.setAccessibility(parsedValue);
      return this;
    }
    this._animationStarted = true;
    const animDuration = duration !== void 0 && duration !== null ? duration : 800;
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
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      this._value = startValue + (targetValue - startValue) * easeProgress;
      this._updateFrameDisplay(targetValue);
    }
  }
  _updateFrameDisplay(targetVal) {
    const numSpan = this._numSpan || (this._numSpan = this.querySelector(".ui-num"));
    if (!numSpan) {
      this.render();
      return;
    }
    const p = parseNumParts(this.formatValue(this._value));
    let digitPadHtml = "";
    const effectiveTarget = targetVal !== void 0 && !isNaN(targetVal) ? targetVal : this.getNumericValue();
    if (effectiveTarget !== void 0 && !isNaN(effectiveTarget) && this._value !== effectiveTarget) {
      const tp = parseNumParts(this.formatValue(effectiveTarget));
      const targetDigits = tp.digits;
      const currentDigits = p.digits;
      if (targetDigits.length > currentDigits.length) {
        const padLen = targetDigits.length - currentDigits.length;
        const padPrefix = targetDigits.slice(0, padLen).replace(/\d/g, "0");
        digitPadHtml = span("ui-pad", padPrefix);
      }
    }
    const newInner = `${digitPadHtml}${p.digits}${p.radix}${p.decimals}`;
    if (numSpan.innerHTML !== newInner) numSpan.innerHTML = newInner;
  }
  render() {
    const p = parseNumParts(this.formatValue(this._value));
    const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
    let pfxPadHtml = "";
    let digitPadHtml = "";
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
        const padPrefix = targetDigits.slice(0, padLen).replace(/\d/g, "0");
        digitPadHtml = span("ui-pad", padPrefix);
      }
    }
    const pfxHtml = p.pfx ? span("ui-pfx", `${p.pfx}${p.pfxSpace}`) : pfxPadHtml;
    const sfxHtml = span("ui-sfx", p.sfx ? `${p.sfxSpace}${p.sfx}` : "");
    const numHtml = span("ui-num", `${digitPadHtml}${p.digits}${p.radix}${p.decimals}`);
    const newHtml = `${pfxHtml}${numHtml}${sfxHtml}`;
    if (this.innerHTML !== newHtml) {
      this.innerHTML = newHtml;
      this._numSpan = this.querySelector(".ui-num");
    }
    if (!this.getAttribute("aria-label")) this.setAccessibility(targetVal);
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
if (rootWin) {
  rootWin.DxNumber = rootWin.UiNumber = rootWin.uiNumber = DxNumber;
}
defCustomElement("dx-number", DxNumber);
defCustomElement("ui-number", DxNumber);

// src/client/components/dx-odometer.js
var DxOdometer = class extends DxMeter {
  constructor() {
    super();
    this._timeoutId = null;
    this._ribbonsDone = 0;
    this._ribbonCount = 0;
    this._animDone = false;
    const handleRibbonDone = (e) => {
      if (e.type === "animationend" && e.animationName !== DX_ANIM.KF_RUN_ODOMETER && e.animationName !== DX_ANIM.KF_ODO_ROLL) return;
      if (e.type === "transitionend" && e.propertyName !== "transform") return;
      e.stopPropagation();
      if (this._animDone) return;
      if (this._ribbonCount === 0) {
        this._ribbonCount = this.querySelectorAll(".odometer-ribbon-inner").length;
      }
      this._ribbonsDone++;
      if (this._ribbonsDone >= this._ribbonCount && this._ribbonCount > 0) {
        this._animDone = true;
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
        if (this.classList.contains("tw-embed") && typeof rootWin?.__twEnd === "function") {
          rootWin.__twEnd(this);
        }
      }
    };
    if (typeof this.addEventListener === "function") {
      this.addEventListener("animationstart", (e) => {
        if (e?.stopPropagation) e.stopPropagation();
      }, { passive: true });
      this.addEventListener("transitionstart", (e) => {
        if (e?.stopPropagation) e.stopPropagation();
      }, { passive: true });
      this.addEventListener("animationend", handleRibbonDone);
      this.addEventListener("transitionend", handleRibbonDone);
    }
  }
  connectedCallback() {
    if (this.isStatic) return;
    if (this._initialized) return;
    if (this.querySelector(".odometer-ribbon-inner")) {
      this._initialized = true;
      return;
    }
    const typeReadyParent = this.closest(".type-ready, dx-type-ready, ui-type-ready");
    const twEmbed = this.classList.contains("tw-embed");
    if (typeReadyParent || twEmbed) {
      this._timeoutId = setTimeout(() => {
        if (!this._initialized && !this.querySelector(".odometer-ribbon-inner")) this.init();
      }, 0);
    } else {
      observeIO2(this, () => {
        if (!this._initialized && !this.querySelector(".odometer-ribbon-inner")) this.init();
      });
    }
  }
  init() {
    this._initialized = true;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
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
    let odoInsideHtml = "";
    for (let i = 0; i < formattedNumberStr.length; i++) {
      const char = formattedNumberStr[i];
      if (char >= "0" && char <= "9") {
        const digitVal = parseInt(char, 10);
        let ribbonValuesHtml = "";
        let totalItems = 0;
        let finalIndex = 0;
        let startDigitVal = 0;
        if (formattedStartStr) {
          const paddedStart = formattedStartStr.padStart(formattedNumberStr.length, "0");
          startDigitVal = parseInt(paddedStart[i], 10);
          if (isNaN(startDigitVal)) startDigitVal = 0;
        }
        const isYear = type === "year";
        if (isYear && startAttr) {
          if (startDigitVal === digitVal) {
            ribbonValuesHtml = makeVal(digitVal, true, true);
            totalItems = 1;
            finalIndex = 0;
          } else {
            let currentVal = startDigitVal;
            let count = 0;
            while (true) {
              const isFirst = count === 0;
              const isLast = currentVal === digitVal && count > 0;
              ribbonValuesHtml += makeVal(currentVal, isFirst, isLast);
              count++;
              if (isLast || count > 20) break;
              currentVal = (currentVal + 1) % 10;
            }
            totalItems = count;
            finalIndex = count - 1;
          }
        } else {
          const digitFromRight = formattedNumberStr.length - 1 - i;
          const fullSpins = Math.min(3, Math.max(1, digitFromRight + 1));
          const diff = (digitVal - startDigitVal + 10) % 10;
          let totalSteps = fullSpins * 10 + diff;
          if (totalSteps === 0) totalSteps = 10;
          for (let step = 0; step <= totalSteps; step++) {
            const val = (startDigitVal + step) % 10;
            const isFirst = step === 0;
            const isLast = step === totalSteps;
            ribbonValuesHtml += makeVal(val, isFirst, isLast);
          }
          totalItems = totalSteps + 1;
          finalIndex = totalSteps;
        }
        const finalPosPercent = -(finalIndex / totalItems * 100).toFixed(4);
        const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${i};"`;
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
    this.innerHTML = `${pfxHtml}${odoHtml}${sfxHtml}`;
    const parentC = this.closest("c");
    if (parentC) {
      const cW = parentC.closest("w");
      if (cW) {
        const wVal = cW.style.getPropertyValue("--w");
        if (wVal) this.style.setProperty("--w", wVal);
      }
      const iVal = parentC.style.getPropertyValue("--I");
      if (iVal) this.style.setProperty("--I", iVal);
    }
    const parentType = this.closest(".TYPE, .type, .TYPE-, dx-type, dx-type-sda, ui-type, ui-type-sda");
    if (parentType) {
      const typeD = parentType.style.getPropertyValue("--d");
      if (typeD && typeD.trim() !== "") {
        this.style.setProperty("--d", typeD.trim());
      }
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
if (rootWin) {
  rootWin.DxOdometer = rootWin.uiOdometer = rootWin.UiOdometer = DxOdometer;
}
defCustomElement("dx-odometer", DxOdometer);
defCustomElement("ui-odometer", DxOdometer);
export {
  DX_ANIM,
  DxBase,
  DxMeter,
  DxNumber,
  DxOdometer,
  DxReveal,
  DxRevealSda,
  DxRevealing,
  DxType,
  DxTypeReady,
  DxTypeSda,
  DxTyping,
  bootstrapTypewriterObserver,
  cleanupTypedDOM,
  ensureElementsUpToTarget,
  finishReveal,
  getIO,
  getSdaGaps,
  mountTypewriter,
  observeIO2 as observeIO,
  observeTypewriter2 as observeTypewriter,
  onTypewriterEnd,
  registerRAF,
  rootWin,
  setSdaGaps,
  startReveal,
  uiNum,
  unobserveIO,
  unpackTemplate,
  unregisterRAF
};
//# sourceMappingURL=index.js.map
