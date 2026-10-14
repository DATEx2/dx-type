// src/client/base/dx-scheduler.js
var rootWin = typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : null;
var DX_ANIM = Object.freeze({
  // Final-state classes (normalized to dx-* prefix)
  TYPED: "dx-typed",
  TYPING: "dx-typing",
  REVEALED: "dx-revealed",
  REVEALING: "dx-revealing",
  TYPE_GUARD: "type-guard",
  REVEAL_GUARD: "reveal-guard",
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
var activeIoElements = /* @__PURE__ */ new Map();
var ioCallbacks = /* @__PURE__ */ new WeakMap();
var ioLookaheadInstance = null;
var ioLookaheadCallbacks = /* @__PURE__ */ new WeakMap();
var _sdaTopGap = "0%";
var _sdaBottomGap = "-110px";
var isScrollGated = false;
var pendingIoQueue = /* @__PURE__ */ new Set();
var pendingLookaheadQueue = /* @__PURE__ */ new Set();
var isCheckoutOrCart = typeof location !== "undefined" && /(?:^|\/)(?:checkout|cart)(?:\/|$)/i.test(location.pathname || "");
var isProductPage = !isCheckoutOrCart && typeof location !== "undefined" && /^\/(?:[a-z]{2}\/)?products?\//i.test(location.pathname || "");
if (isProductPage && rootWin && !rootWin.__dxScrollRestored && !rootWin.__sdaReadyPerformanceTime && typeof rootWin.IntersectionObserver === "function") {
  isScrollGated = true;
}
function isScrollRestored() {
  return !isScrollGated;
}
function flushScrollGate() {
  if (!isScrollGated && pendingIoQueue.size === 0 && pendingLookaheadQueue.size === 0) return;
  isScrollGated = false;
  if (rootWin) rootWin.__dxScrollRestored = true;
  if (pendingLookaheadQueue.size > 0) {
    const lookaheadObs = getLookaheadIO();
    for (const el2 of pendingLookaheadQueue) {
      if (el2 && el2.isConnected) {
        if (lookaheadObs) {
          lookaheadObs.observe(el2);
        } else {
          const cb = ioLookaheadCallbacks.get(el2);
          if (cb) {
            ioLookaheadCallbacks.delete(el2);
            cb(el2);
          }
        }
      }
    }
    pendingLookaheadQueue.clear();
  }
  if (pendingIoQueue.size > 0) {
    const obs = getIO();
    for (const el2 of pendingIoQueue) {
      if (el2 && el2.isConnected) {
        if (obs) {
          obs.observe(el2);
        } else {
          const cb = activeIoElements.get(el2) || ioCallbacks.get(el2);
          activeIoElements.delete(el2);
          ioCallbacks.delete(el2);
          if (cb) {
            try {
              cb(el2);
            } catch (err) {
              console.error("[dx-type] IO callback error:", err);
            }
          }
        }
      }
    }
    pendingIoQueue.clear();
  }
}
function gateIOUntil(promise) {
  if (!promise || typeof promise.then !== "function") return;
  isScrollGated = true;
  promise.then(() => {
    flushScrollGate();
  }).catch((err) => {
    console.error("[dx-type] gateIOUntil promise rejected:", err);
    flushScrollGate();
  });
}
if (rootWin && typeof rootWin.addEventListener === "function") {
  const onReady = () => {
    flushScrollGate();
  };
  rootWin.addEventListener("sda-ready", onReady, { once: true });
  rootWin.addEventListener("type-ready", onReady, { once: true });
}
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
    const obs = getIO();
    if (obs && activeIoElements.size > 0) {
      for (const [el2] of activeIoElements.entries()) {
        if (el2 && el2.isConnected) obs.observe(el2);
      }
    }
  }
}
function getSdaGaps() {
  const winTop = rootWin?.sdaTopGap ?? rootWin?.__dxTypeConfig?.sdaTopGap;
  const winBottom = rootWin?.sdaBottomGap ?? rootWin?.__dxTypeConfig?.sdaBottomGap;
  let defaultBottom = _sdaBottomGap;
  if (typeof rootWin !== "undefined" && rootWin?.innerHeight && rootWin.innerHeight < 500) {
    defaultBottom = "-40px";
  }
  return {
    sdaTopGap: winTop !== void 0 ? winTop : _sdaTopGap,
    sdaBottomGap: winBottom !== void 0 ? winBottom : defaultBottom
  };
}
if (rootWin && typeof rootWin.matchMedia === "function") {
  try {
    const mq = rootWin.matchMedia("(orientation: landscape) and (height < 500px)");
    const onLandscapeChange = () => {
      if (ioInstance) {
        ioInstance.disconnect();
        ioInstance = null;
        const obs = getIO();
        if (obs && activeIoElements.size > 0) {
          for (const [el2] of activeIoElements.entries()) {
            if (el2 && el2.isConnected) obs.observe(el2);
          }
        }
      }
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onLandscapeChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onLandscapeChange);
    }
  } catch (_) {
  }
}
function ioLookaheadHandler(entries) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.isIntersecting) {
      const el2 = entry.target;
      if (ioLookaheadInstance) ioLookaheadInstance.unobserve(el2);
      const cb = ioLookaheadCallbacks.get(el2);
      if (cb) {
        ioLookaheadCallbacks.delete(el2);
        cb(el2);
      }
    }
  }
}
function getLookaheadIO() {
  if (ioLookaheadInstance) return ioLookaheadInstance;
  const IO = rootWin?.IntersectionObserver;
  if (typeof IO === "function") {
    ioLookaheadInstance = new IO(ioLookaheadHandler, {
      root: null,
      rootMargin: "0px 0px 500px 0px",
      threshold: 0
    });
  }
  return ioLookaheadInstance;
}
function observeLookaheadIO(el2, callback) {
  if (!el2) return;
  ioLookaheadCallbacks.set(el2, callback);
  if (isScrollGated) {
    pendingLookaheadQueue.add(el2);
    return;
  }
  const obs = getLookaheadIO();
  if (obs) {
    obs.observe(el2);
  } else {
    callback(el2);
  }
}
function unobserveLookaheadIO(el2) {
  if (!el2) return;
  pendingLookaheadQueue.delete(el2);
  ioLookaheadCallbacks.delete(el2);
  if (ioLookaheadInstance) ioLookaheadInstance.unobserve(el2);
}
function ioHandler(entries) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.isIntersecting) {
      const el2 = entry.target;
      const cb = activeIoElements.get(el2) || ioCallbacks.get(el2);
      if (cb) {
        try {
          const res = cb(el2);
          if (res !== false) {
            unobserveIO(el2);
          }
        } catch (err) {
          console.error("[dx-type] IO callback error:", err);
          unobserveIO(el2);
        }
      } else {
        unobserveIO(el2);
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
  activeIoElements.set(el2, callback);
  ioCallbacks.set(el2, callback);
  if (isScrollGated) {
    pendingIoQueue.add(el2);
    return;
  }
  const obs = getIO();
  if (obs) {
    obs.observe(el2);
  } else {
    activeIoElements.delete(el2);
    ioCallbacks.delete(el2);
    try {
      callback(el2);
    } catch (err) {
      console.error("[dx-type] IO callback error:", err);
    }
  }
}
function unobserveIO(el2) {
  if (!el2) return;
  pendingIoQueue.delete(el2);
  activeIoElements.delete(el2);
  ioCallbacks.delete(el2);
  if (ioInstance) ioInstance.unobserve(el2);
}
var idleQueue = [];
var isIdleScheduled = false;
var scheduleIdle = typeof window !== "undefined" && window.requestIdleCallback ? ((cb) => window.requestIdleCallback(cb, { timeout: 1e3 })) : ((cb) => setTimeout(() => cb({ timeRemaining: () => 15, didTimeout: false }), 50));
function processNextIdle() {
  if (idleQueue.length === 0) {
    isIdleScheduled = false;
    return;
  }
  const item = idleQueue.shift();
  if (item && item.el) {
    try {
      item.callback(item.el);
    } catch (e) {
      console.error("[dx-type] Idle unpack failed:", e);
    }
  }
  if (idleQueue.length > 0) {
    scheduleIdle(processNextIdle);
  } else {
    isIdleScheduled = false;
  }
}
function queueIdleUnpack(el2, callback) {
  if (!el2) return;
  for (let i = 0; i < idleQueue.length; i++) {
    if (idleQueue[i].el === el2) {
      idleQueue[i].callback = callback;
      return;
    }
  }
  idleQueue.push({ el: el2, callback });
  if (!isIdleScheduled) {
    isIdleScheduled = true;
    scheduleIdle(processNextIdle);
  }
}
function removeFromIdleQueue(el2) {
  if (!el2) return;
  for (let i = idleQueue.length - 1; i >= 0; i--) {
    if (idleQueue[i].el === el2) {
      idleQueue.splice(i, 1);
    }
  }
}
var idleCleanupQueue = [];
var isCleanupIdleScheduled = false;
function processNextIdleCleanup(deadline) {
  if (idleCleanupQueue.length === 0) {
    isCleanupIdleScheduled = false;
    return;
  }
  while (idleCleanupQueue.length > 0 && (!deadline || deadline.timeRemaining() > 2 || deadline.didTimeout)) {
    const item = idleCleanupQueue.shift();
    if (item && item.el) {
      try {
        item.callback(item.el);
      } catch (e) {
        console.error("[dx-type] Idle cleanup failed:", e);
      }
    }
  }
  if (idleCleanupQueue.length > 0) {
    scheduleIdle(processNextIdleCleanup);
  } else {
    isCleanupIdleScheduled = false;
  }
}
function queueIdleCleanup(el2, callback) {
  if (!el2) return;
  for (let i = 0; i < idleCleanupQueue.length; i++) {
    if (idleCleanupQueue[i].el === el2) return;
  }
  idleCleanupQueue.push({ el: el2, callback });
  if (!isCleanupIdleScheduled) {
    isCleanupIdleScheduled = true;
    scheduleIdle(processNextIdleCleanup);
  }
}
function flushIdleCleanup(el2) {
  if (!el2) return;
  for (let i = idleCleanupQueue.length - 1; i >= 0; i--) {
    if (idleCleanupQueue[i].el === el2) {
      const item = idleCleanupQueue.splice(i, 1)[0];
      try {
        item.callback(item.el);
      } catch (e) {
      }
    }
  }
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
      getActiveAnimationsCount: () => activeAnimations.size,
      gateIOUntil,
      flushScrollGate,
      isScrollRestored,
      isScrollGated: () => isScrollGated
    }
  });
}

// src/client/base/dx-base.js
var rootWin2 = typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : null;
var BaseHTMLElement = rootWin2?.HTMLElement || class {
};
function isReducedMotionActive() {
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  if (typeof document !== "undefined" && document.documentElement) {
    if (document.documentElement.style.getPropertyValue("--A") === "0") {
      return true;
    }
  }
  return false;
}
var DxBase = class extends BaseHTMLElement {
  constructor() {
    super();
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
      const st = this.querySelector(":scope > :is(dx-s, t-s, s-t)");
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
    if (isNegative && !prefix) {
      finalPrefix = "\u2013 ";
    } else if (numVal > 0 && prefix && prefix.includes("+")) {
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
function formatNumber(val, type = "int", comma = ",", prefix = "", suffix = "") {
  const num = parseFloat(val) || 0;
  let formatted = "";
  if (type.includes("number-1dec") || type === "float" || type.startsWith("float")) {
    formatted = num.toFixed(1).replace(".", comma);
  } else if (type.includes("number-2dec") || type === "number") {
    formatted = num.toFixed(2).replace(".", comma);
  } else if (type === "int" || type.startsWith("int-") || type.startsWith("number-")) {
    const intVal = Math.round(num);
    const str = intVal.toString();
    formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  } else {
    formatted = num.toString().replace(".", comma);
  }
  const pfx = prefix ? `${prefix}${prefix.endsWith(" ") ? "" : " "}` : "";
  const noLeadingSpace = /^[%°"”″’'VvAaWw€$£]|\//.test(suffix);
  const sfx = suffix ? `${suffix.startsWith(" ") || noLeadingSpace ? "" : " "}${suffix}` : "";
  return `${pfx}${formatted}${sfx}`;
}
function generateRibbonHtml(numericValue, type = "int", comma = ",", prefix = "", suffix = "", startValue = null) {
  const formatted = formatNumber(numericValue, type, comma, prefix, suffix);
  const numberPartMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formatted);
  const prefixText = (numberPartMatch?.[1] || "").trim();
  const mainDigits = numberPartMatch?.[2] || "";
  const radixMark = numberPartMatch?.[3] || "";
  const decimalDigits = numberPartMatch?.[4] || "";
  const suffixText = (numberPartMatch?.[5] || "").trim();
  const formattedNumberStr = mainDigits + radixMark + decimalDigits;
  const isYear = type === "year";
  let formattedStartStr = null;
  if (startValue !== null && startValue !== void 0 && startValue !== "") {
    const startNumeric = parseFloat(startValue);
    if (!isNaN(startNumeric)) {
      const startFormatted = formatNumber(startNumeric, type, comma, prefix, suffix);
      const startMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(startFormatted);
      formattedStartStr = (startMatch?.[2] || "") + (startMatch?.[3] || "") + (startMatch?.[4] || "");
    }
  }
  const allDigits = [];
  for (let i = 0; i < formattedNumberStr.length; i++) {
    const c = formattedNumberStr[i];
    if (c >= "0" && c <= "9") allDigits.push(c);
  }
  const targetDigitsStr = allDigits.join("");
  const totalDigits = targetDigitsStr.length;
  let startDigitsStr = null;
  if (formattedStartStr) {
    const startDigits = [];
    for (let i = 0; i < formattedStartStr.length; i++) {
      const c = formattedStartStr[i];
      if (c >= "0" && c <= "9") startDigits.push(c);
    }
    startDigitsStr = startDigits.join("");
  }
  const isYearWithStart = isYear && startDigitsStr && startDigitsStr.length === targetDigitsStr.length;
  let intDigitsCount = 0;
  for (let i = 0; i < mainDigits.length; i++) {
    if (mainDigits[i] >= "0" && mainDigits[i] <= "9") intDigitsCount++;
  }
  const maxLeadingZeroIdx = Math.max(-1, intDigitsCount - 2);
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
  const lastLeadingZeroIdx = Math.min(firstSignificant - 1, maxLeadingZeroIdx);
  let digitIndex = 0;
  let digitsHtml = "";
  for (let i = 0; i < formattedNumberStr.length; i++) {
    const char = formattedNumberStr[i];
    if (char >= "0" && char <= "9") {
      const curDigitIdx = digitIndex++;
      const digitR = totalDigits - 1 - curDigitIdx;
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
        const isSingleDigit = totalDigits === 1;
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
        drumValues[0] = " ";
      }
      const totalItems = drumValues.length;
      const finalIndex = totalItems - 1;
      const finalPosPercent = totalItems > 1 ? -(finalIndex / totalItems * 100).toFixed(4) : 0;
      const seqStr = drumValues.map((v) => v === " " ? " " : v).join("");
      digitsHtml += `<dx-d data-seq="${seqStr}" style="--p:${finalPosPercent}%">${char}</dx-d>`;
    } else {
      digitsHtml += `<span class="ui-radix">${char}</span>`;
    }
  }
  const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefix.endsWith(" ") ? "" : " "}</span>` : "";
  const hasExplicitSpace = suffix.startsWith(" ");
  const noSfxSpace = /^[%°"”″’'VvAaWw€$£]|\//.test(suffixText);
  const suffixSpace = hasExplicitSpace || !noSfxSpace ? suffixText ? " " : "" : "";
  const sfxHtml = suffixText ? `<span class="ui-sfx">${suffixSpace}${suffixText}</span>` : "";
  return `${pfxHtml}<b>${digitsHtml}</b>${sfxHtml}`;
}
function generateDataO(numericValue, type = "int", comma = ",", prefix = "", suffix = "", startValue = null) {
  const html = generateRibbonHtml(numericValue, type, comma, prefix, suffix, startValue);
  const seqs = [];
  const re = /data-seq="([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    seqs.push(m[1]);
  }
  return seqs.join(",");
}
function expandOdometerDrums(root) {
  if (!root) return;
  const digits = root.querySelectorAll ? root.querySelectorAll("dx-d[data-seq]") : [];
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    const seq = d.getAttribute("data-seq");
    if (seq && !seq.includes("\n") && seq.length > 1) {
      d.setAttribute("data-seq", [...seq].join("\n"));
    }
    if (seq && d.style && typeof d.style.getPropertyValue === "function" && !d.style.getPropertyValue("--p")) {
      const totalItems = seq.includes("\n") ? seq.split("\n").length : seq.length;
      const finalPosPercent = totalItems > 1 ? -((totalItems - 1) / totalItems * 100).toFixed(4) : 0;
      d.style.setProperty("--p", `${finalPosPercent}%`);
    }
  }
}
if (rootWin2) {
  Object.assign(rootWin2, { DxMeter, UiMeter: DxMeter, uiNum, generateRibbonHtml, generateDataO, expandOdometerDrums });
}

// src/client/base/dx-typing.js
var DX_CHAR_DURATION = 225;
var HEX_LUT = new Uint8Array(128);
for (let i = 0; i < 10; i++) HEX_LUT[48 + i] = i;
for (let i = 0; i < 6; i++) HEX_LUT[65 + i] = 10 + i;
for (let i = 0; i < 6; i++) HEX_LUT[97 + i] = 10 + i;
function getTypewriterObserver(win) {
  return getIO(win);
}
function buildTypingLayer(ts, delay, offset, speed) {
  let tHtml = "";
  let charIdx = 0;
  function walk(el2) {
    const wAttr = el2.getAttribute("w");
    if (!wAttr) return;
    let wi = 0;
    for (const child of el2.childNodes) {
      if (child.nodeType === 3) {
        const chars = [...child.data];
        let ci = 0;
        while (ci < chars.length) {
          const ch = chars[ci];
          if (ch <= " " || ch === "\xA0" || ch === "\uFEFF" || /\s/.test(ch)) {
            tHtml += ch;
            ci++;
            continue;
          }
          let hyphen = false;
          if (wi < wAttr.length && wAttr[wi] === "-") {
            hyphen = true;
            wi++;
          }
          let extended = false;
          if (wi < wAttr.length && wAttr[wi] === "+") {
            extended = true;
            wi++;
          }
          let len;
          if (extended) {
            len = HEX_LUT[wAttr.charCodeAt(wi)] << 4 | HEX_LUT[wAttr.charCodeAt(wi + 1)];
            wi += 2;
          } else if (wi < wAttr.length) {
            len = HEX_LUT[wAttr.charCodeAt(wi)];
            wi++;
          }
          if (!len || len <= 0) {
            const sc = chars[ci++];
            const d = Math.round(delay + (offset + charIdx++) * speed);
            const cls = sc === "\xB7" || sc === "\u2022" ? ' class="bullet-dot"' : "";
            tHtml += `<dx-w><dx-c${cls} style="animation-delay:${d}ms">${sc}</dx-c></dx-w>`;
            continue;
          }
          const wClass = hyphen ? ' class="word"' : "";
          tHtml += `<dx-w${wClass}>`;
          const curWordStr = chars.slice(ci, ci + len).join("");
          const isDateWord = /^DATE(?:x2)?(?:-|$)/i.test(curWordStr);
          for (let c = 0; c < len && ci < chars.length; c++, ci++) {
            let curCh = chars[ci];
            if (isDateWord && c === 0 && curCh === "D") {
              curCh = "\u{1D5D7}";
            }
            const d = Math.round(delay + (offset + charIdx++) * speed);
            const cls = curCh === "\xB7" || curCh === "\u2022" ? ' class="bullet-dot"' : "";
            tHtml += `<dx-c${cls} style="animation-delay:${d}ms">${curCh}</dx-c>`;
          }
          tHtml += "</dx-w>";
        }
      } else if (child.nodeType === 1) {
        const tok = wi < wAttr.length ? wAttr[wi++] : " ";
        if (tok === "*") {
          const d = Math.round(delay + (offset + charIdx++) * speed);
          const cleanHtml = child.outerHTML.replace(/\bdata-static\b/g, "").replace(/\s{2,}/g, " ");
          tHtml += `<dx-w><dx-c class="c-ui-num" style="animation-delay:${d}ms">${cleanHtml}</dx-c></dx-w>`;
        } else {
          const tag = child.tagName.toLowerCase();
          const isVoid = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag);
          const exactDelay = Math.round(delay + (offset + charIdx) * speed);
          let attrs = "";
          let hasStyle = false;
          for (let a = 0; a < child.attributes.length; a++) {
            const at = child.attributes[a];
            if (at.name === "w") continue;
            if (!isVoid && at.name === "style") {
              hasStyle = true;
              const trimmed = at.value.trim();
              const sep = trimmed && !trimmed.endsWith(";") ? ";" : "";
              attrs += ` style="${trimmed}${sep}--dx-delay:${exactDelay}ms;"`;
            } else {
              attrs += ` ${at.name}="${at.value}"`;
            }
          }
          if (!isVoid && !hasStyle) {
            attrs += ` style="--dx-delay:${exactDelay}ms;"`;
          }
          if (isVoid) {
            tHtml += `<${tag}${attrs}>`;
          } else {
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
function prepareTemplateContent(el2) {
  if (!el2) return false;
  if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return false;
  const tpl = el2.querySelector(":scope > template");
  if (!tpl) {
    const ts = el2.querySelector(":scope > dx-s[w]");
    if (ts && !el2.querySelector(":scope > dx-t")) {
      const style = el2.getAttribute("style") || "";
      const dMatch = style.match(/--d:([\d.]+)/);
      const bMatch = style.match(/--b:([\d.]+)/);
      const uMatch = style.match(/--u:([\d.]+)/);
      const delay = dMatch ? parseFloat(dMatch[1]) : 0;
      const offset = bMatch ? parseFloat(bMatch[1]) : 0;
      const speed = uMatch ? parseFloat(uMatch[1]) : 40;
      const charDur = DX_CHAR_DURATION;
      const { tHtml, totalChars } = buildTypingLayer(ts, delay, offset, speed);
      if (tHtml) {
        const doc = el2.ownerDocument || (typeof document !== "undefined" ? document : null);
        if (doc) {
          const tLayer2 = doc.createElement("dx-t");
          tLayer2.setAttribute("aria-hidden", "true");
          tLayer2.innerHTML = tHtml;
          const allTC = tLayer2.querySelectorAll("dx-c");
          if (allTC.length > 0) {
            const lastTC = allTC[allTC.length - 1];
            lastTC.setAttribute("data-last", "true");
            lastTC.classList.add("last-char");
          }
          const odometers = tLayer2.querySelectorAll("dx-odometer, ui-odometer");
          for (let i = 0; i < odometers.length; i++) {
            const odo = odometers[i];
            odo.classList.remove("data-static");
            if (!odo.querySelector("b")) {
              const val = odo.getAttribute("percent") || odo.getAttribute("value") || odo.textContent.trim();
              const numVal = parseFloat(val) || 0;
              const type = odo.getAttribute("type") || "int";
              const comma = odo.getAttribute("comma") || ",";
              const prefix = odo.getAttribute("prefix") || "";
              const suffix = odo.getAttribute("suffix") || "";
              const start = odo.getAttribute("start") || null;
              odo.innerHTML = generateRibbonHtml(numVal, type, comma, prefix, suffix, start);
            }
            expandOdometerDrums(odo);
          }
          el2.appendChild(tLayer2);
          return true;
        }
      }
    }
  }
  if (!tpl || !tpl.content) return false;
  if (tpl._prepared) return true;
  let tLayer = tpl.content.querySelector(":is(dx-t, t-t, t)");
  if (!tLayer) {
    const stLegacy = el2.querySelector(":scope > :is(dx-s, t-s, s-t)");
    if (stLegacy) {
      const doc = el2.ownerDocument || (typeof document !== "undefined" ? document : null);
      if (doc) {
        tLayer = doc.createElement("dx-t");
        tLayer.setAttribute("aria-hidden", "true");
        tLayer.innerHTML = stLegacy.innerHTML;
        tpl.content.appendChild(tLayer);
      }
    }
  }
  if (tLayer) {
    const hasExistingC = tLayer.querySelector(":is(dx-c, t-c)");
    if (!hasExistingC) {
      const nodes = tLayer.childNodes;
      if (nodes.length > 0) {
        const style = el2.getAttribute("style") || "";
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
            charIdx += (node.textContent || "").length;
          } else if (node.nodeType === 1) {
            const tw = node;
            if (tw.hasAttribute("data-ready")) {
              charIdx += tw.querySelectorAll(":is(dx-c, t-c, i)").length;
              continue;
            }
            const cUiNum = tw.querySelector(":is(dx-c, t-c, i).c-ui-num");
            if (cUiNum) {
              const odo = cUiNum.querySelector("dx-odometer, ui-odometer");
              const exactDelay = Math.round(delay + (offset + charIdx) * speed);
              charIdx += 1;
              cUiNum.style.animationDelay = `${exactDelay}ms`;
              if (odo) odo.style.setProperty("--d", exactDelay);
            } else if (!tw.querySelector(":is(dx-c, t-c, i)")) {
              const text = tw.textContent || "";
              if (text) {
                const chars = [...text];
                let inner = "";
                for (let j = 0; j < chars.length; j++) {
                  const ch = chars[j];
                  const exactDelay = Math.round(delay + (offset + charIdx++) * speed);
                  const cClass = ch === "\xB7" || ch === "\u2022" ? ' class="bullet-dot"' : "";
                  inner += `<dx-c${cClass} style="animation-delay:${exactDelay}ms">${ch}</dx-c>`;
                }
                tw.innerHTML = inner;
              }
            } else {
              charIdx += tw.querySelectorAll(":is(dx-c, t-c, i)").length;
            }
            tw.setAttribute("data-ready", "true");
          }
        }
      }
    }
    const odometers = tLayer.querySelectorAll("dx-odometer, ui-odometer");
    for (let i = 0; i < odometers.length; i++) {
      const odo = odometers[i];
      odo.classList.remove("data-static");
      if (!odo.querySelector("b")) {
        const val = odo.getAttribute("percent") || odo.getAttribute("value") || odo.textContent.trim();
        const numVal = parseFloat(val) || 0;
        const type = odo.getAttribute("type") || "int";
        const comma = odo.getAttribute("comma") || ",";
        const prefix = odo.getAttribute("prefix") || "";
        const suffix = odo.getAttribute("suffix") || "";
        const start = odo.getAttribute("start") || null;
        odo.innerHTML = generateRibbonHtml(numVal, type, comma, prefix, suffix, start);
      }
      expandOdometerDrums(odo);
    }
    const allTC = tLayer.querySelectorAll(":is(dx-c, t-c, i)");
    if (allTC.length > 0) {
      const lastTC = allTC[allTC.length - 1];
      lastTC.setAttribute("data-last", "true");
      lastTC.classList.add("last-char");
    }
  }
  tpl._prepared = true;
  return true;
}
function unpackTemplate(el2) {
  if (!el2) return false;
  if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return false;
  if (isReducedMotionActive()) {
    el2.classList.add(DX_ANIM.TYPED);
    cleanupTypedDOM(el2);
    return false;
  }
  const tpl = el2.querySelector(":scope > template");
  if (tpl && tpl.content) {
    prepareTemplateContent(el2);
    if (!el2.getAttribute("role")) el2.setAttribute("role", "text");
    const ts = el2.querySelector(":scope > :is(dx-s, t-s, s-t)");
    if (ts) {
      if (!el2.getAttribute("aria-label")) {
        const raw = (ts.textContent || "").replace(/\s+/g, " ").trim();
        if (raw) el2.setAttribute("aria-label", raw);
      }
    }
    tpl.replaceWith(tpl.content);
    const tt = el2.querySelector(":scope > :is(dx-t, t-t, t)");
    if (tt) {
      tt.setAttribute("aria-hidden", "true");
      if (!tt._boundStopProp) {
        tt._boundStopProp = true;
        tt.addEventListener("animationend", (ev) => {
          ev.stopPropagation();
        });
      }
      const lastChar = tt.querySelector('[data-last="true"], .last-char');
      if (lastChar && !lastChar._hasTwEnd) {
        lastChar._hasTwEnd = true;
        lastChar.addEventListener("animationend", (ev) => {
          onTypewriterEnd(lastChar, ev);
        }, { once: true });
      }
    }
    return true;
  }
  const tsWithW = el2.querySelector(":scope > :is(dx-s, t-s, s-t)[w]");
  if (tsWithW && !el2.querySelector(":scope > :is(dx-t, t-t, t)")) {
    prepareTemplateContent(el2);
    if (!el2.getAttribute("role")) el2.setAttribute("role", "text");
    const ts = el2.querySelector(":scope > :is(dx-s, t-s, s-t)");
    if (ts) {
      if (!el2.getAttribute("aria-label")) {
        const raw = (ts.textContent || "").replace(/\s+/g, " ").trim();
        if (raw) el2.setAttribute("aria-label", raw);
      }
    }
    const tt = el2.querySelector(":scope > :is(dx-t, t-t, t)");
    if (tt) {
      tt.setAttribute("aria-hidden", "true");
      if (!tt._boundStopProp) {
        tt._boundStopProp = true;
        tt.addEventListener("animationend", (ev) => {
          ev.stopPropagation();
        });
      }
      const lastChar = tt.querySelector('[data-last="true"], .last-char');
      if (lastChar && !lastChar._hasTwEnd) {
        lastChar._hasTwEnd = true;
        lastChar.addEventListener("animationend", (ev) => {
          onTypewriterEnd(lastChar, ev);
        }, { once: true });
      }
    }
    return true;
  }
  const directTt = el2.querySelector(":scope > :is(dx-t, t-t, t)");
  if (directTt) {
    if (!el2.getAttribute("role")) el2.setAttribute("role", "text");
    const ts = el2.querySelector(":scope > :is(dx-s, t-s, s-t)");
    if (ts && !el2.getAttribute("aria-label")) {
      const raw = (ts.textContent || "").replace(/\s+/g, " ").trim();
      if (raw) el2.setAttribute("aria-label", raw);
    }
    directTt.setAttribute("aria-hidden", "true");
    if (!directTt._boundStopProp) {
      directTt._boundStopProp = true;
      directTt.addEventListener("animationend", (ev) => {
        ev.stopPropagation();
      });
    }
    const lastChar = directTt.querySelector('[data-last="true"], .last-char');
    if (lastChar && !lastChar._hasTwEnd) {
      lastChar._hasTwEnd = true;
      lastChar.addEventListener("animationend", (ev) => {
        onTypewriterEnd(lastChar, ev);
      }, { once: true });
    }
    return true;
  }
  return false;
}
function isElementHidden(el2) {
  if (!el2) return true;
  if (!el2.closest("summary") && el2.closest("details:not([open])")) return true;
  const drawer = el2.closest('.spec-drawer, [role="dialog"].spec-drawer');
  if (drawer && !drawer.open && !drawer.classList.contains("open") && !drawer.classList.contains("spec-drawer-open")) return true;
  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(width < 768px), (width < 1025px) and (orientation: portrait)").matches;
  const hiddenParent = el2.closest(isMobile ? ".hidden, [hidden], .wait-stuck:not(.is-stuck), .favorite-product__button--saved" : ".hidden, [hidden], .favorite-product__button--saved");
  if (hiddenParent && !hiddenParent.closest(".favorite-product--saved, .is-stuck")) return true;
  return false;
}
var SECTION_HEADER_SEL = ".section-header, .po-header, .wholesale-header, .features-header, .cg-header, .fe-header, .as-header, .vs-header, .fq-header, .ga-header, .eco-header, .cs-header, .cs-header-wrapper, .ip-header, .ip-header-wrapper, .spec-drawer-header";
function syncSectionHeaderTyping(el2) {
  if (!el2) return;
  const secHeader = el2.closest?.(SECTION_HEADER_SEL);
  if (secHeader && !secHeader.classList.contains(DX_ANIM.TYPING) && !secHeader.classList.contains(DX_ANIM.TYPED)) {
    let dur = el2.style?.getPropertyValue?.("--t");
    let del = el2.style?.getPropertyValue?.("--d");
    let u = el2.style?.getPropertyValue?.("--u");
    if (!dur) {
      const m = el2.getAttribute?.("style")?.match(/--t:\s*([\d.]+)/);
      if (m) dur = m[1];
    }
    if (!del) {
      const m = el2.getAttribute?.("style")?.match(/--d:\s*([\d.]+)/);
      if (m) del = m[1];
    }
    if (!u) {
      const m = el2.getAttribute?.("style")?.match(/--u:\s*([\d.]+)/);
      if (m) u = m[1];
    }
    const baseDur = dur ? parseFloat(dur) : 680;
    const delayMs = del ? parseFloat(del) : 0;
    const speed = u ? parseFloat(u) : 40;
    const charDur = DX_CHAR_DURATION;
    const totalDur = Math.round(baseDur + charDur);
    secHeader.style.setProperty("--header-line-dur", `${totalDur}ms`);
    if (delayMs > 0) {
      secHeader.style.setProperty("--header-line-del", `${Math.round(delayMs)}ms`);
    }
    secHeader.classList.add(DX_ANIM.TYPING);
  }
}
function observeTypewriter(el2) {
  if (!el2) return;
  if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return;
  observeLookaheadIO(el2, (targetEl) => {
    if (isElementHidden(targetEl)) return;
    queueIdleUnpack(targetEl, (t) => {
      unpackTemplate(t);
    });
  });
  observeIO(el2, (targetEl) => {
    if (isElementHidden(targetEl)) return false;
    removeFromIdleQueue(targetEl);
    unobserveLookaheadIO(targetEl);
    unpackTemplate(targetEl);
    targetEl.classList.add(DX_ANIM.TYPING);
    syncSectionHeaderTyping(targetEl);
  });
  if (el2.querySelector(":scope > template")) {
    queueIdleUnpack(el2, (targetEl) => {
      prepareTemplateContent(targetEl);
    });
  }
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
  typeEl._tLayer = null;
  if (typeEl._safetyTimer) {
    clearTimeout(typeEl._safetyTimer);
    typeEl._safetyTimer = null;
  }
  const doc = typeEl.ownerDocument || (typeof document !== "undefined" ? document : null);
  if (!doc) return;
  const directTpl = typeEl.querySelector(":scope > template");
  if (directTpl) directTpl.remove();
  const tLayer = typeEl.querySelector(":scope > :is(dx-t, t-t), :is(dx-t, t-t)");
  if (tLayer) {
    const sLayer = typeEl.querySelector(":scope > :is(dx-s, t-s)");
    if (sLayer) {
      const tOdos = tLayer.querySelectorAll ? tLayer.querySelectorAll("dx-odometer, ui-odometer") : [];
      const sOdos = sLayer.querySelectorAll ? sLayer.querySelectorAll("dx-odometer, ui-odometer") : [];
      const len = Math.min(tOdos.length, sOdos.length);
      const META_ATTRS = ["percent", "value", "type", "suffix", "prefix", "comma", "aria-label", "start", "data-o"];
      for (let i = 0; i < len; i++) {
        const tOdo = tOdos[i];
        const sOdo = sOdos[i];
        for (let j = 0; j < META_ATTRS.length; j++) {
          const attr = META_ATTRS[j];
          if (tOdo.hasAttribute(attr) && !sOdo.hasAttribute(attr)) {
            sOdo.setAttribute(attr, tOdo.getAttribute(attr));
          }
        }
        if (!sOdo.hasAttribute("data-o")) {
          const dEls = tOdo.querySelectorAll ? tOdo.querySelectorAll("dx-d[data-seq]") : [];
          if (dEls.length > 0) {
            const seqs = Array.from(dEls).map((d) => (d.getAttribute("data-seq") || "").replace(/\r?\n/g, ""));
            sOdo.setAttribute("data-o", seqs.join(","));
          }
        }
      }
    }
    tLayer.remove();
  }
  const stMeters = typeEl.querySelectorAll ? typeEl.querySelectorAll(":is(dx-s, t-s) :is(dx-odometer, ui-odometer, dx-number, ui-number, dx-counter, ui-counter)") : [];
  for (let i = 0; i < stMeters.length; i++) {
    const m = stMeters[i];
    if (typeof m.makeStatic === "function") m.makeStatic();
    else {
      m.classList?.add("data-static");
      m.setAttribute?.("data-static", "true");
    }
    const isOdo = m.tagName === "DX-ODOMETER" || m.tagName === "UI-ODOMETER";
    if (isOdo) {
      const innerDxS = m.querySelector ? m.querySelector(":scope > :is(dx-s, t-s, s-t)") : null;
      if (innerDxS) {
        m.textContent = innerDxS.textContent || "";
      } else if (m.querySelector && (m.querySelector("b") || m.querySelector(".ui-sfx"))) {
        const drumB = m.querySelector("b");
        if (drumB) drumB.remove();
        const sfx = m.querySelector(".ui-sfx");
        if (sfx) sfx.remove();
        const pfx = m.querySelector(".ui-pfx");
        if (pfx) pfx.remove();
      }
      if (typeof m.getStaticHTML === "function" && !m.textContent.trim()) {
        m.innerHTML = m.getStaticHTML();
      }
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
    if (parent.classList.contains(DX_ANIM.TYPED)) {
      return false;
    }
    if (parent.querySelector(":scope > template")) return false;
    const isEmbed = cEl.tagName === "DX-ODOMETER" || cEl.tagName === "UI-ODOMETER" || cEl.tagName === "DX-NUMBER" || cEl.tagName === "UI-NUMBER" || cEl.tagName === "DX-COUNTER" || cEl.tagName === "UI-COUNTER";
    let lastC = parent._lastC;
    if (!lastC) {
      lastC = parent.querySelector(':is(dx-t, t-t) [data-last="true"], :is(dx-t, t-t) .last-char, [data-last="true"], .last-char');
      if (!lastC) {
        const allC = parent.querySelectorAll(":is(dx-t, t-t) :is(dx-c, t-c):not(.c-ui-num), :is(dx-c, t-c):not(.c-ui-num)");
        lastC = allC.length ? allC[allC.length - 1] : null;
      }
      if (typeof document === "undefined" || document.readyState !== "loading") {
        parent._lastC = lastC;
      }
    }
    const isLastChar = !isEmbed && (cEl === lastC || cEl.getAttribute?.("data-last") === "true" || cEl.classList?.contains("last-char") || lastC && (cEl.contains(lastC) || lastC.contains(cEl)));
    if (!isLastChar && !isEmbed) return false;
    if (isLastChar) {
      parent._charDone = true;
    }
    if (isEmbed) {
      cEl._animDone = true;
    }
    const tLayer = parent.querySelector(":scope > dx-t, dx-t") || parent;
    const embeds = Array.from(tLayer.querySelectorAll("dx-odometer, ui-odometer, dx-number, ui-number, dx-counter, ui-counter"));
    const allEmbedsDone = embeds.length === 0 || embeds.every((e) => e._animDone || e.isStatic || e.classList.contains("data-static"));
    const hasRegularChars = !!tLayer.querySelector(":is(dx-c, t-c):not(.c-ui-num)");
    const charDone = !hasRegularChars || !lastC || !!parent._charDone;
    if (charDone && allEmbedsDone) {
      if (!parent.classList.contains(DX_ANIM.TYPED)) {
        if (typeof parent.markTyped === "function") {
          parent.markTyped();
        } else {
          DxTyping.prototype.markTyped.call(parent);
        }
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
    const secHeader = this.closest?.(SECTION_HEADER_SEL);
    if (secHeader) {
      const pending = Array.from(secHeader.querySelectorAll(":is(dx-type, dx-type-sda, .type-sda)")).some((c) => c !== this && !c.classList.contains(DX_ANIM.TYPED));
      if (!pending) {
        secHeader.classList.remove(DX_ANIM.TYPING);
        secHeader.classList.add(DX_ANIM.TYPED);
      }
    }
    if (typeof rootWin2?.__datex2TriggerPendingUiNumbers === "function") {
      rootWin2.__datex2TriggerPendingUiNumbers(this);
    }
    queueIdleCleanup(this, (target) => {
      cleanupTypedDOM(target);
    });
  }
};
var checkAndObserve = (el2) => {
  if (!el2?.querySelector) return;
  if (el2.classList.contains(DX_ANIM.TYPED)) {
    cleanupTypedDOM(el2);
    const secHeader = el2.closest?.(SECTION_HEADER_SEL);
    if (secHeader) secHeader.classList.add(DX_ANIM.TYPED);
    return;
  }
  if (el2._isSdaConnected) return;
  const closedDetails = !el2.closest("summary") && el2.closest("details:not([open])");
  if (closedDetails) return;
  if (el2.querySelector(":scope > template") || el2.querySelector(":scope > :is(dx-s, t-s)[w]")) {
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
  document.addEventListener("toggle", (e) => {
    const details = e.target;
    if (details && details.tagName === "DETAILS" && details.open) {
      details.querySelectorAll("dx-type:not(dx-type-sda)").forEach((typeEl) => {
        if (!typeEl.classList.contains(DX_ANIM.TYPED)) {
          unpackTemplate(typeEl);
          typeEl.classList.add(DX_ANIM.TYPING);
        }
      });
      details.querySelectorAll("dx-counter, dx-number").forEach((child) => {
        if (child.closest("dx-type-sda")) return;
        if (typeof child._checkAndTrigger === "function") {
          child._inViewport = true;
          child._parentReady = true;
          child._checkAndTrigger();
        }
      });
    }
  }, true);
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
    bootstrapTypewriterObserver,
    syncSectionHeaderTyping,
    SECTION_HEADER_SEL
  });
}

// src/client/base/dx-revealing.js
var REVEAL_CONTAINER_SEL = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
var lastStaggerTime = 0;
var STAGGER_INITIAL_STEP_MS = 80;
var STAGGER_MIN_STEP_MS = 40;
var STAGGER_STEP_DECREMENT = 5;
var MAX_STAGGER_QUEUE_MS = 1200;
var currentStaggerStep = STAGGER_INITIAL_STEP_MS;
function getNextStaggerDelay(el2) {
  if (!el2 || !el2.classList || !el2.classList.contains("staggered")) {
    return null;
  }
  const stepAttr = typeof el2.getAttribute === "function" ? el2.getAttribute("data-stagger-step") || el2.getAttribute("data-step") : null;
  const customStep = stepAttr ? parseInt(stepAttr, 10) : null;
  const initialStep = customStep && !isNaN(customStep) ? customStep : rootWin2 && typeof rootWin2.__dxStaggerStep === "number" ? rootWin2.__dxStaggerStep : STAGGER_INITIAL_STEP_MS;
  const minStep = rootWin2 && typeof rootWin2.__dxStaggerMinStep === "number" ? rootWin2.__dxStaggerMinStep : STAGGER_MIN_STEP_MS;
  const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  let scheduledTime;
  if (lastStaggerTime <= now) {
    scheduledTime = now;
    currentStaggerStep = initialStep;
    lastStaggerTime = now + currentStaggerStep;
  } else {
    scheduledTime = lastStaggerTime;
    currentStaggerStep = Math.max(minStep, currentStaggerStep - STAGGER_STEP_DECREMENT);
    lastStaggerTime += currentStaggerStep;
  }
  if (lastStaggerTime - now > MAX_STAGGER_QUEUE_MS) {
    lastStaggerTime = now + MAX_STAGGER_QUEUE_MS;
  }
  const baseDelayStr = el2.getAttribute("delay") ?? el2.getAttribute("d");
  const baseDelay = baseDelayStr !== null ? parseInt(baseDelayStr, 10) || 0 : 0;
  return Math.max(0, Math.round(scheduledTime - now)) + baseDelay;
}
function resetStaggerTimeline() {
  lastStaggerTime = 0;
  currentStaggerStep = STAGGER_INITIAL_STEP_MS;
}
function finishReveal(el2, e) {
  if (!el2) return;
  if (e && e.target && e.target !== el2) return;
  if (e && e.animationName && e.animationName !== "dx-reveal-sda" && e.animationName !== "reveal-sda" && e.animationName !== "reveal-in" && e.animationName !== "reveal-fade-in" && e.animationName !== "dx-checkout-diffuse" && e.animationName !== "dx-reveal-diffuse" && e.animationName !== DX_ANIM.KF_REVEAL_IN && e.animationName !== DX_ANIM.KF_REVEAL_SDA && e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
  if (typeof e?.stopPropagation === "function") e.stopPropagation();
  el2._animStarted = true;
  if (typeof el2._triggerChildren === "function") {
    el2._triggerChildren();
  }
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
  el2._animStarted = true;
  el2.classList.add(DX_ANIM.REVEALING);
  if (typeof rootWin2?.__datex2TriggerPendingUiNumbers === "function") {
    rootWin2.__datex2TriggerPendingUiNumbers(el2);
  }
}
var DxRevealing = class extends DxBase {
  static get observedAttributes() {
    return ["delay", "d", "duration", "t", "paused"];
  }
  constructor() {
    super();
    this._inViewport = false;
    this._isRevealingStarted = false;
    this._animStarted = false;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === "paused") {
      if (newVal === null) {
        this.resume();
      }
      return;
    }
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
  get isPaused() {
    return !!(this.classList?.contains("dx-paused") || (typeof this.hasAttribute === "function" ? this.hasAttribute("paused") : this.getAttribute?.("paused") != null));
  }
  pause() {
    this.classList?.add("dx-paused");
  }
  resume() {
    this.classList?.remove("dx-paused");
    if (typeof this.removeAttribute === "function") {
      this.removeAttribute("paused");
    }
    if (this._inViewport && !this._isRevealingStarted && !this.isRevealed) {
      this._checkAndTrigger();
    }
  }
  getParentReveal() {
    return this.parentElement?.closest(REVEAL_CONTAINER_SEL) || null;
  }
  _checkAndTrigger() {
    if (this._isRevealingStarted || this.isRevealed) return;
    if (!this._inViewport) return;
    if (this.isPaused) return;
    const parentReveal = this.getParentReveal();
    if (parentReveal && !parentReveal.classList.contains(DX_ANIM.REVEALED) && !parentReveal.isRevealed) {
      return;
    }
    this._startRevealing();
  }
  _startRevealing() {
    if (this._isRevealingStarted || this.isRevealed) return;
    this._isRevealingStarted = true;
    if (this.classList && this.classList.contains("staggered")) {
      const staggerDelay = getNextStaggerDelay(this);
      if (staggerDelay !== null && staggerDelay !== void 0) {
        this.style.setProperty("--d", String(staggerDelay));
      }
    }
    const delayStr = this.style.getPropertyValue("--d") || this.getAttribute("delay") || this.getAttribute("d") || "0";
    const delayMs = Math.max(0, parseFloat(delayStr) || 0);
    if (delayMs === 0 || typeof AnimationEvent === "undefined") {
      this._animStarted = true;
    }
    this.classList.add(DX_ANIM.REVEALING);
    if (typeof this._triggerChildren === "function") {
      if (delayMs > 0 && typeof AnimationEvent !== "undefined") {
        const onStart = (e) => {
          if (e && e.target && e.target !== this) return;
          if (e && e.animationName && e.animationName !== "dx-reveal-sda" && e.animationName !== "reveal-sda" && e.animationName !== "reveal-in" && e.animationName !== "reveal-fade-in" && e.animationName !== DX_ANIM.KF_REVEAL_IN && e.animationName !== DX_ANIM.KF_REVEAL_SDA && e.animationName !== DX_ANIM.KF_REVEAL_FADE) return;
          this.removeEventListener("animationstart", onStart);
          this._animStarted = true;
          this._triggerChildren();
        };
        this.addEventListener("animationstart", onStart);
      } else {
        this._triggerChildren();
      }
    }
  }
  _triggerNestedReveals() {
    const nestedReveals = this.querySelectorAll(REVEAL_CONTAINER_SEL);
    for (let i = 0; i < nestedReveals.length; i++) {
      const nested = nestedReveals[i];
      if (nested.parentElement?.closest(REVEAL_CONTAINER_SEL) === this) {
        if (typeof nested._checkAndTrigger === "function") {
          nested._checkAndTrigger();
        } else if (nested._inViewport) {
          nested.classList.add(DX_ANIM.REVEALING);
        }
      }
    }
  }
  markRevealed() {
    if (this._childTriggerTimer) {
      clearTimeout(this._childTriggerTimer);
      this._childTriggerTimer = null;
    }
    this.classList.remove("reveal-sda", "reveal", DX_ANIM.REVEALING);
    this.classList.add(DX_ANIM.REVEALED);
    if (typeof rootWin2?.__datex2TriggerPendingUiNumbers === "function") {
      rootWin2.__datex2TriggerPendingUiNumbers(this);
    }
    if (typeof this._triggerChildren === "function") {
      this._triggerChildren();
    }
    this._triggerNestedReveals();
  }
  disconnectedCallback() {
    if (this._childTriggerTimer) {
      clearTimeout(this._childTriggerTimer);
      this._childTriggerTimer = null;
    }
  }
};
if (rootWin2) {
  Object.assign(rootWin2, {
    DxRevealing,
    UiRevealing: DxRevealing,
    finishReveal,
    startReveal,
    REVEAL_CONTAINER_SEL,
    getNextStaggerDelay,
    resetStaggerTimeline
  });
}

// src/client/components/dx-type.js
var REVEAL_PARENT_SEL = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
var DxType = class extends DxTyping {
  connectedCallback() {
    if (this.isTyped) {
      cleanupTypedDOM(this);
      const secHeader = this.closest?.(SECTION_HEADER_SEL);
      if (secHeader) secHeader.classList.add(DX_ANIM.TYPED);
      return;
    }
    this._syncTimingAttributes();
    if (this.querySelector(":scope > template") || this.querySelector(":scope > dx-s[w]")) {
      observeLookaheadIO(this, (el2) => {
        removeFromIdleQueue(el2);
        unpackTemplate(el2);
      });
      queueIdleUnpack(this, (el2) => {
        prepareTemplateContent(el2);
      });
    }
    observeIO(this, (el2) => {
      if (el2.isTyped || el2.classList.contains(DX_ANIM.TYPED)) return;
      if (isElementHidden(el2)) return;
      el2._inViewport = true;
      const triggerTyping = () => {
        if (el2.isTyped || el2.classList.contains(DX_ANIM.TYPED)) return;
        removeFromIdleQueue(el2);
        unobserveLookaheadIO(el2);
        if (isReducedMotionActive()) {
          el2.classList.add(DX_ANIM.TYPED);
          cleanupTypedDOM(el2);
          syncSectionHeaderTyping(el2);
          return;
        }
        unpackTemplate(el2);
        el2.classList.add(DX_ANIM.TYPING);
        syncSectionHeaderTyping(el2);
      };
      const isHeader = !!el2.closest?.(SECTION_HEADER_SEL);
      const parentRev = el2.closest?.(REVEAL_PARENT_SEL);
      const parentHasPendingDelay = parentRev && !parentRev.isRevealed && !parentRev.classList.contains(DX_ANIM.REVEALED) && !parentRev._animStarted && (!parentRev.classList.contains(DX_ANIM.REVEALING) || typeof AnimationEvent !== "undefined" && parseFloat(parentRev.style?.getPropertyValue("--d") || parentRev.getAttribute?.("delay") || parentRev.getAttribute?.("d") || 0) > 0);
      if (!isHeader && parentRev && parentHasPendingDelay) {
        const onParentStart = (e) => {
          if (e && e.target && e.target !== parentRev) return;
          parentRev.removeEventListener("animationstart", onParentStart);
          triggerTyping();
        };
        parentRev.addEventListener("animationstart", onParentStart, { once: true });
        return;
      }
      triggerTyping();
    });
  }
  disconnectedCallback() {
    unobserveIO(this);
    unobserveLookaheadIO(this);
    removeFromIdleQueue(this);
  }
};
defCustomElement("dx-type", DxType);
defCustomElement("ui-type", DxType);

// src/client/components/dx-type-sda.js
var REVEAL_PARENT_SEL2 = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
var DxTypeSda = class extends DxTyping {
  connectedCallback() {
    this._isSdaConnected = true;
    if (this.isTyped) {
      cleanupTypedDOM(this);
      const secHeader = this.closest?.(SECTION_HEADER_SEL);
      if (secHeader) secHeader.classList.add(DX_ANIM.TYPED);
      return;
    }
    this._syncTimingAttributes();
    if (this.querySelector(":scope > template") || this.querySelector(":scope > dx-s[w]")) {
      observeLookaheadIO(this, (el2) => {
        removeFromIdleQueue(el2);
        unpackTemplate(el2);
      });
      queueIdleUnpack(this, (el2) => {
        prepareTemplateContent(el2);
      });
    }
    observeIO(this, (el2) => {
      if (el2.isTyped || el2.classList.contains(DX_ANIM.TYPED)) return;
      if (isElementHidden(el2)) return false;
      el2._inViewport = true;
      const triggerTyping = () => {
        if (el2.isTyped || el2.classList.contains(DX_ANIM.TYPED)) return;
        removeFromIdleQueue(el2);
        unobserveLookaheadIO(el2);
        if (isReducedMotionActive()) {
          el2.classList.add(DX_ANIM.TYPED);
          cleanupTypedDOM(el2);
          syncSectionHeaderTyping(el2);
          return;
        }
        unpackTemplate(el2);
        el2.classList.add(DX_ANIM.TYPING);
        syncSectionHeaderTyping(el2);
      };
      const isHeader = !!el2.closest?.(SECTION_HEADER_SEL);
      const parentRev = el2.closest?.(REVEAL_PARENT_SEL2);
      const parentHasPendingDelay = parentRev && !parentRev.isRevealed && !parentRev.classList.contains(DX_ANIM.REVEALED) && !parentRev._animStarted && (!parentRev.classList.contains(DX_ANIM.REVEALING) || typeof AnimationEvent !== "undefined" && parseFloat(parentRev.style?.getPropertyValue("--d") || parentRev.getAttribute?.("delay") || parentRev.getAttribute?.("d") || 0) > 0);
      if (!isHeader && parentRev && parentHasPendingDelay) {
        const onParentStart = (e) => {
          if (e && e.target && e.target !== parentRev) return;
          parentRev.removeEventListener("animationstart", onParentStart);
          triggerTyping();
        };
        parentRev.addEventListener("animationstart", onParentStart, { once: true });
        return;
      }
      triggerTyping();
    });
  }
  disconnectedCallback() {
    unobserveIO(this);
    unobserveLookaheadIO(this);
    removeFromIdleQueue(this);
  }
};
defCustomElement("dx-type-sda", DxTypeSda);
defCustomElement("ui-type-sda", DxTypeSda);

// src/client/components/dx-reveal-sda.js
var DxRevealSda = class extends DxRevealing {
  connectedCallback() {
    if (this.isRevealed) return;
    let childrenTriggered = false;
    this._triggerChildren = () => {
      if (childrenTriggered) return;
      childrenTriggered = true;
      this.querySelectorAll("dx-counter, dx-number, dx-type").forEach((child) => {
        const closedDetails = !child.closest("summary") && child.closest("details:not([open])");
        if (closedDetails && this.contains(closedDetails)) return;
        const hiddenParent = child.closest(".hidden, [hidden], .favorite-product__button--saved");
        if (hiddenParent && this.contains(hiddenParent) && !hiddenParent.closest(".favorite-product--saved")) return;
        if (child.closest(REVEAL_CONTAINER_SEL) !== this) return;
        if (typeof child._checkAndTrigger === "function") {
          child._inViewport = true;
          child._parentReady = true;
          child._checkAndTrigger();
        }
        const tag = (child.tagName || "").toUpperCase();
        if (tag === "DX-TYPE") {
          if (!child.classList.contains(DX_ANIM.TYPED)) {
            unpackTemplate(child);
            child.classList.add(DX_ANIM.TYPING);
          }
        }
      });
    };
    this._syncTimingAttributes();
    observeIO(this, () => {
      removeFromIdleQueue(this);
      unpackTemplate(this);
      this._inViewport = true;
      if (isReducedMotionActive()) {
        this.markRevealed();
        this._triggerChildren();
        return;
      }
      this._checkAndTrigger();
    });
    queueIdleUnpack(this, (el2) => {
      prepareTemplateContent(el2);
    });
  }
  _startRevealing() {
    if (this._isRevealingStarted || this.isRevealed) return;
    this.addEventListener("animationend", this._onAnimEnd);
    this.addEventListener("animationcancel", this._onAnimEnd);
    super._startRevealing();
  }
  _onAnimEnd = (e) => {
    if (e.target !== this) return;
    finishReveal(this, e);
    this.removeEventListener("animationend", this._onAnimEnd);
    this.removeEventListener("animationcancel", this._onAnimEnd);
  };
  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.removeEventListener("animationend", this._onAnimEnd);
    this.removeEventListener("animationcancel", this._onAnimEnd);
  }
};
defCustomElement("dx-reveal-sda", DxRevealSda);
defCustomElement("ui-reveal-sda", DxRevealSda);

// src/client/components/dx-reveal.js
var DxReveal = class extends DxRevealSda {
};
defCustomElement("dx-reveal", DxReveal);
defCustomElement("ui-reveal", DxReveal);

// src/client/components/dx-type-ready.js
var DxTypeReady = class extends DxBase {
  connectedCallback() {
    if (!this._pristineHTML && typeof document !== "undefined" && document.body?.classList?.contains("dx-type-record")) {
      this._pristineHTML = this.innerHTML;
    }
    if (this.id === "gallery") return;
    if (!this.classList.contains("dx-type-ready")) {
      const fontsReady = typeof document !== "undefined" && document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]) : Promise.resolve();
      fontsReady.then(() => {
        requestAnimationFrame(() => {
          if (!this.classList.contains("dx-type-ready")) {
            this.classList.add("dx-type-ready");
          }
        });
      });
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
var TYPE_PARENT_SEL = "dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda";
var REVEAL_PARENT_SEL3 = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
var DxNumber = class extends DxMeter {
  static get observedAttributes() {
    return ["prefix", "suffix", "comma", "type", "percent", "value", "duration", "start"];
  }
  get value() {
    return this._value;
  }
  set value(val) {
    this.val(val);
  }
  constructor() {
    super();
    this._animationStarted = false;
    this._animDone = false;
    this._inViewport = false;
    this._parentReady = false;
    this._pendingVal = null;
    this._timeoutId = null;
    this._isRendering = false;
    this._animReqId = null;
    this._animStartTime = null;
    this._animStartValue = 0;
    this._animDuration = 0;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._initialized || this._isRendering) return;
    if (name === "percent" || name === "value") {
      const p = parseFloat(newVal);
      if (!isNaN(p) && p !== this._value && this._initialized) {
        this.val(p);
      }
      return;
    }
    if (name === "duration") return;
    this.render();
  }
  connectedCallback() {
    if (this._initialized) return;
    const inST = typeof this.closest === "function" ? !!this.closest("dx-s") : false;
    if (inST) {
      this._animDone = true;
      if (!this.classList.contains("data-static")) {
        this.makeStatic();
      }
      if (!this.hasChildNodes()) {
        this.innerHTML = this.getStaticHTML();
      }
      return;
    }
    const isSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".ui-num, .dx-num-wrap"));
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
    if (typeof this.closest !== "function") {
      return true;
    }
    const parentChar = this.closest("dx-c");
    const parentReveal = this.closest(REVEAL_PARENT_SEL3);
    const parentActionBar = this.closest(".action-bar, .action-bar-wrapper");
    if (parentActionBar) {
      const isAbShowing = !!this.closest(".show-action-bar, .showing-action-bar") || typeof document !== "undefined" && document.body && (document.body.classList.contains("show-action-bar") || document.body.classList.contains("showing-action-bar"));
      if (!isAbShowing) {
        return false;
      }
      this._inViewport = true;
      const isAbShown = !!this.closest(".show-action-bar") || typeof document !== "undefined" && document.body && document.body.classList.contains("show-action-bar");
      if (isAbShown) {
        this._parentReady = true;
      }
      return Boolean(this._parentReady);
    }
    if (!parentChar && !parentReveal) {
      this._parentReady = true;
      return Boolean(this._inViewport);
    }
    if (this._inViewport && !this._parentReady) {
      if (parentReveal) {
        const isRevealed = parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains("revealed") || parentReveal.hasAttribute && parentReveal.hasAttribute("data-static"));
        const isRevealing = parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains("revealing"));
        const delayMs = typeof AnimationEvent !== "undefined" ? parseFloat(parentReveal.style?.getPropertyValue("--d") || parentReveal.getAttribute?.("delay") || parentReveal.getAttribute?.("d") || 0) || 0 : 0;
        const animStarted = !!parentReveal._animStarted;
        if (isRevealed || isRevealing && (animStarted || delayMs === 0)) {
          this._parentReady = true;
        }
      }
    }
    return Boolean(this._inViewport && this._parentReady);
  }
  getDuration() {
    if (isReducedMotionActive()) return 0;
    if (this.hasAttribute && this.hasAttribute("duration")) {
      const parsed = parseFloat(this.getAttribute("duration"));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const t = parseFloat(this.style?.getPropertyValue?.("--t") || "") || parseFloat(typeof this.closest === "function" ? this.closest('[style*="--t"]')?.style?.getPropertyValue?.("--t") : 0) || 0;
    return t > 0 ? t : 600;
  }
  _checkAndTrigger(skipDelay = false) {
    const ready = this.isReadyToAnimate();
    if (!ready) return;
    const parentActionBar = typeof this.closest === "function" ? this.closest(".action-bar, .action-bar-wrapper") : null;
    const d = parseFloat(this.style?.getPropertyValue?.("--d") || "") || parseFloat(typeof this.closest === "function" ? this.closest('[style*="--d"]')?.style?.getPropertyValue?.("--d") : 0) || 0;
    const delay = skipDelay || parentActionBar ? 0 : d > 0 ? d : typeof this.closest === "function" && this.closest(REVEAL_PARENT_SEL3) ? 100 : 0;
    if (this._pendingVal) {
      const { targetValue, duration } = this._pendingVal;
      this._pendingVal = null;
      this._animationStarted = true;
      if (delay > 0) {
        setTimeout(() => this.val(targetValue, duration), delay);
      } else {
        this.val(targetValue, duration);
      }
      return;
    }
    if (!this._animationStarted) {
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
      if (this._value !== targetVal) {
        this._animationStarted = true;
        const dur = this.getDuration();
        if (delay > 0) {
          setTimeout(() => this.val(targetVal, dur), delay);
        } else {
          this.val(targetVal, dur);
        }
      } else {
        this._animationStarted = true;
        this._animDone = true;
        const twEmbed = this.classList.contains("tw-embed") || !!(typeof this.closest === "function" && this.closest(TYPE_PARENT_SEL));
        if (twEmbed) {
          onTypewriterEnd(this);
        }
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
    const inST = typeof this.closest === "function" ? !!this.closest("dx-s") : false;
    const isReduced = isReducedMotionActive();
    const isStatic = this.classList && this.classList.contains("data-static") || this.isStatic || inST;
    const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) && this._targetValue !== 0 ? this._targetValue : parseFloat(this.getAttribute("percent")) || this.getNumericValue() || 0;
    this._targetValue = targetVal;
    const hasSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".ui-num, .dx-num-wrap"));
    const parentChar = typeof this.closest === "function" ? this.closest("dx-c") : null;
    const parentReveal = typeof this.closest === "function" ? this.closest(REVEAL_PARENT_SEL3) : null;
    const parentActionBar = typeof this.closest === "function" ? this.closest(".action-bar, .action-bar-wrapper") : null;
    const hasParent = Boolean(parentChar || parentReveal || parentActionBar);
    if (isStatic || isReduced) {
      this._value = targetVal;
      this._animationStarted = true;
      this._animDone = true;
    } else if (this.hasAttribute && this.hasAttribute("start") && this.getAttribute("start") !== "") {
      this._value = parseFloat(this.getAttribute("start")) || 0;
    } else if (hasParent) {
      this._value = 0;
    } else {
      this._value = targetVal;
    }
    if (!hasSsr) {
      this.render();
    } else {
      this._numSpan = this.querySelector(".ui-num");
      this._pfxSpan = this.querySelector(".ui-pfx:not(.ui-pfx-pad)");
      this._sfxSpan = this.querySelector(".ui-sfx");
      this._cacheTextNodes();
      if (isReduced) {
        this._updateFrameDisplay(targetVal);
      }
    }
    this._inViewport = false;
    if (isStatic || isReduced) {
      this._inViewport = true;
      this._parentReady = true;
      this.makeStatic();
      return;
    }
    if (!hasParent) {
      this._parentReady = true;
    }
    if (parentActionBar) {
      this._inViewport = true;
      const isAbShown = parentActionBar.classList && parentActionBar.classList.contains("show-action-bar") || typeof document !== "undefined" && document.body && document.body.classList.contains("show-action-bar");
      if (isAbShown) {
        this._parentReady = true;
        this._checkAndTrigger(true);
      } else {
        const onAbTrigger = (e) => {
          if (!e || !e.animationName || e.animationName === "dxc-trigger" || e.animationName === "actionbar-slide-up") {
            this._parentReady = true;
            this._checkAndTrigger(true);
          }
        };
        this.addEventListener("animationstart", onAbTrigger, { once: true });
        parentActionBar.addEventListener("animationstart", onAbTrigger, { once: true });
        parentActionBar.addEventListener("animationend", onAbTrigger, { once: true });
        parentActionBar.addEventListener("transitionend", onAbTrigger, { once: true });
      }
    } else {
      observeIO(this, () => {
        this._inViewport = true;
        this._checkAndTrigger();
      });
    }
    if (parentChar) {
      const parentType = typeof this.closest === "function" ? this.closest(TYPE_PARENT_SEL) : null;
      if (parentType && (parentType.classList.contains(DX_ANIM.TYPED) || parentType.classList.contains("typed") || parentType.hasAttribute("data-static"))) {
        this._parentReady = true;
      } else {
        parentChar.addEventListener("animationstart", (e) => {
          if (e.target === parentChar) {
            const u = parentChar.style && parseFloat(parentChar.style.getPropertyValue("--u")) || 40;
            this._twDelayId = setTimeout(() => {
              this._parentReady = true;
              this._checkAndTrigger();
            }, u * 0.35);
          }
        }, { once: true });
      }
    } else if (parentReveal) {
      const isRevealed = parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains("revealed") || parentReveal.hasAttribute && parentReveal.hasAttribute("data-static"));
      const isRevealing = parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains("revealing"));
      const delayMs = typeof AnimationEvent !== "undefined" ? parseFloat(parentReveal.style?.getPropertyValue("--d") || parentReveal.getAttribute?.("delay") || parentReveal.getAttribute?.("d") || 0) || 0 : 0;
      const animStarted = !!parentReveal._animStarted;
      if (isRevealed || isRevealing && (animStarted || delayMs === 0)) {
        this._parentReady = true;
      } else {
        const onParentAnim = () => {
          this._parentReady = true;
          this._checkAndTrigger();
        };
        parentReveal.addEventListener("animationstart", onParentAnim, { once: true });
        parentReveal.addEventListener("transitionstart", onParentAnim, { once: true });
        parentReveal.addEventListener("animationend", onParentAnim, { once: true });
        const choiceParent = typeof this.closest === "function" ? this.closest(".form-control--checkbox-button, .details-product-option") : null;
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
    const isReduced = isReducedMotionActive();
    const defaultDur = this.getDuration();
    const animDuration = isReduced ? 0 : duration !== void 0 && duration !== null ? duration : defaultDur;
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
      this.makeStatic();
      this.render();
      this.setAccessibility(parsedValue);
      this._animDone = true;
      const twEmbed = this.classList.contains("tw-embed") || !!(typeof this.closest === "function" && this.closest(TYPE_PARENT_SEL));
      if (twEmbed) {
        onTypewriterEnd(this);
      }
    }
    return this;
  }
  animateTo(targetValue, duration) {
    if (typeof this.removeAttribute === "function") this.removeAttribute("data-static");
    if (this.classList && typeof this.classList.remove === "function") this.classList.remove("data-static");
    this._targetValue = targetValue;
    this._animStartValue = this._value !== void 0 && !isNaN(this._value) ? this._value : 0;
    this._animDuration = duration;
    this._animStartTime = null;
    this.classList.add("ui-number-running");
    this.render();
    registerRAF(this);
  }
  _stepAnimation(now) {
    if (this._animStartTime === null || this._animStartTime === void 0) {
      this._animStartTime = now;
    }
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
      this._animDone = true;
      const twEmbed = this.classList.contains("tw-embed") || !!(typeof this.closest === "function" && this.closest(TYPE_PARENT_SEL));
      if (twEmbed) {
        onTypewriterEnd(this);
      }
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
  makeStatic() {
  }
};
if (rootWin2) {
  rootWin2.DxNumber = rootWin2.UiNumber = rootWin2.uiNumber = DxNumber;
}
defCustomElement("dx-number", DxNumber);
defCustomElement("ui-number", DxNumber);

// src/client/components/dx-odometer.js
var TYPE_PARENT_SEL2 = "dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda";
var DxOdometer = class extends DxMeter {
  constructor() {
    super();
    this._animDone = false;
    this._digitCount = 0;
    this._digitsDone = 0;
  }
  expandDrums() {
    expandOdometerDrums(this);
  }
  unpackDataO(dataO) {
    if (!dataO) return;
    const drums = dataO.split(",");
    let digitsHtml = "";
    for (let i = 0; i < drums.length; i++) {
      const seq = drums[i];
      const lastChar = seq.slice(-1) || "0";
      const finalPos = seq.length > 1 ? -((seq.length - 1) / seq.length * 100).toFixed(4) : 0;
      const expandedSeq = [...seq].join("\n");
      digitsHtml += `<dx-d data-seq="${expandedSeq}" style="--p:${finalPos}%">${lastChar}</dx-d>`;
    }
    let b = this.querySelector("b");
    if (!b) {
      b = document.createElement("b");
      const sfx = this.querySelector(".ui-sfx");
      if (sfx) this.insertBefore(b, sfx);
      else this.appendChild(b);
    }
    b.innerHTML = digitsHtml;
  }
  connectedCallback() {
    const isReduced = isReducedMotionActive();
    if (this.closest("dx-s, t-s")) {
      this.classList.add("data-static");
      this._animDone = true;
      return;
    }
    if (this.classList.contains("data-static") || isReduced) {
      this.classList.add("data-static");
      this.makeStatic();
      this._animDone = true;
      const drumB = this.querySelector("b");
      if (drumB) drumB.remove();
      const pfx = this.querySelector(".ui-pfx");
      if (pfx) pfx.remove();
      const sfx = this.querySelector(".ui-sfx");
      if (sfx) sfx.remove();
      const innerDxS = this.querySelector(":scope > :is(dx-s, t-s)");
      if (innerDxS) {
        this.textContent = innerDxS.textContent || "";
      } else if (!this.textContent.trim() && typeof this.getStaticHTML === "function") {
        this.innerHTML = this.getStaticHTML();
      }
      const twEmbed2 = this.classList.contains("tw-embed") || !!this.closest(TYPE_PARENT_SEL2);
      if (twEmbed2) {
        onTypewriterEnd(this);
      }
      return;
    }
    const dataO = this.getAttribute("data-o");
    if (dataO && !this.querySelector("dx-d")) {
      this.unpackDataO(dataO);
    }
    expandOdometerDrums(this);
    if (this._initialized) return;
    this._initialized = true;
    this.addEventListener("animationend", this._onAnimEnd);
    this.addEventListener("animationstart", (e) => {
      if (e?.stopPropagation) e.stopPropagation();
    }, { passive: true });
    const twEmbed = this.classList.contains("tw-embed") || !!this.closest("dx-type, dx-type-sda, .type, .type-sda, ui-type, ui-type-sda");
    if (twEmbed) {
      const checkEmbedReady = () => {
        if (!this.isConnected || this._animDone) return;
        expandOdometerDrums(this);
        const dCount = this.querySelectorAll("dx-d[data-seq]").length;
        const spanCount = this.querySelectorAll(".odometer-ribbon-inner").length;
        if (dCount === 0 && spanCount === 0 && !this.closest("template")) {
          this._animDone = true;
          onTypewriterEnd(this);
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkEmbedReady, { once: true });
      } else {
        requestAnimationFrame(checkEmbedReady);
      }
    } else {
      const setupStandalone = () => {
        if (!this.isConnected || this._animDone || this.classList.contains("data-static")) return;
        expandOdometerDrums(this);
        const digits = this.querySelectorAll("dx-d[data-seq]");
        this._digitCount = digits.length;
        if (this._digitCount === 0) {
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", setupStandalone, { once: true });
            return;
          }
          this.classList.add("data-static");
          return;
        }
        const parentType = this.closest(TYPE_PARENT_SEL2);
        const inFooter = this.closest("footer, .ins-tile--footer, #tile-footer-MNure7");
        if (!parentType && !inFooter) {
          observeIO(this, (el2) => {
            el2.classList.add(DX_ANIM.TYPING);
          });
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupStandalone, { once: true });
      } else {
        requestAnimationFrame(setupStandalone);
      }
    }
  }
  _onAnimEnd = (e) => {
    if (this._animDone) return;
    const target = e.target;
    if (!target || target.tagName !== "DX-D" && !target.classList?.contains("odometer-ribbon-inner")) return;
    e.stopPropagation();
    if (!this._digitCount) {
      const dCount = this.querySelectorAll("dx-d[data-seq]").length;
      const spanCount = this.querySelectorAll(".odometer-ribbon-inner").length;
      this._digitCount = dCount || spanCount || 1;
    }
    this._digitsDone++;
    if (this._digitsDone >= this._digitCount) {
      this._animDone = true;
      const twEmbed = this.classList.contains("tw-embed") || !!this.closest("dx-type, dx-type-sda, .type, .type-sda, ui-type, ui-type-sda");
      if (!twEmbed) {
        this.makeStatic();
      } else {
        onTypewriterEnd(this);
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
var TYPE_PARENT_SEL3 = "dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda";
var SUPPORTS_HOUDINI = false;
if (SUPPORTS_HOUDINI) {
  const props = [
    "--dxc-b",
    "--dxc-m",
    "--dxc-k",
    "--dxc-u",
    "--dxc-dec",
    "--dxc-from-b",
    "--dxc-to-b",
    "--dxc-from-m",
    "--dxc-to-m",
    "--dxc-from-k",
    "--dxc-to-k",
    "--dxc-from-u",
    "--dxc-to-u",
    "--dxc-from-dec",
    "--dxc-to-dec"
  ];
  props.forEach((p) => {
    try {
      CSS.registerProperty({
        name: p,
        syntax: "<integer>",
        initialValue: 0,
        inherits: true
      });
    } catch (e) {
    }
  });
}
var _supportsHoudiniOverride = null;
var DxCounter = class _DxCounter extends DxNumber {
  static get observedAttributes() {
    return ["prefix", "suffix", "comma", "type", "percent", "value", "duration"];
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
    const isReduced = isReducedMotionActive();
    const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) && this._targetValue !== 0 ? this._targetValue : parseFloat(this.getAttribute("percent")) || this.getNumericValue() || 0;
    this._targetValue = targetVal;
    if (isReduced) {
      this._initialized = true;
      this._value = targetVal;
      this._animationStarted = true;
      this._animDone = true;
      const hasSsr2 = typeof this.querySelector === "function" && Boolean(this.querySelector(".dx-num-wrap"));
      if (!hasSsr2) {
        this.render();
      } else {
        this._updateCounterVars(targetVal, true);
      }
      this.makeStatic();
      const st = this.querySelector("dx-s");
      if (st) st.textContent = this.formatValue(targetVal);
      this.setAccessibility(targetVal);
      this._inViewport = true;
      this._parentReady = true;
      return;
    }
    const hasSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".dx-num-wrap"));
    if (!hasSsr) {
      this.render();
    } else if (this.hasAttribute && this.hasAttribute("start") && this.getAttribute("start") !== "") {
      const startVal = parseFloat(this.getAttribute("start")) || 0;
      this._updateCounterVars(startVal);
    }
    super.init();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._initialized || this._isRendering) return;
    if (name === "percent" || name === "value") {
      const p = parseFloat(newVal);
      if (!isNaN(p) && p !== this._value && this._initialized) {
        this.val(p);
      }
      return;
    }
    if (name === "duration") return;
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
    if (this._elB?.style) {
      this._elB.style.setProperty("--dxc-from-b", String(sParts.b));
      this._elB.style.setProperty("--dxc-to-b", String(tParts.b));
      this._elB.style.setProperty("--dxc-b", String(tParts.b));
      this._elB.style.setProperty("--dxc-duration", `${dur}ms`);
      this._elB.style.setProperty("--dxc-delay-b", `${delayB}ms`);
    }
    if (this._elM?.style) {
      this._elM.style.setProperty("--dxc-from-m", String(sParts.m));
      this._elM.style.setProperty("--dxc-to-m", String(tParts.m));
      this._elM.style.setProperty("--dxc-m", String(tParts.m));
      this._elM.style.setProperty("--dxc-duration", `${dur}ms`);
      this._elM.style.setProperty("--dxc-delay-m", `${delayM}ms`);
    }
    if (this._elK?.style) {
      this._elK.style.setProperty("--dxc-from-k", String(sParts.k));
      this._elK.style.setProperty("--dxc-to-k", String(tParts.k));
      this._elK.style.setProperty("--dxc-k", String(tParts.k));
      this._elK.style.setProperty("--dxc-duration", `${dur}ms`);
      this._elK.style.setProperty("--dxc-delay-k", `${delayK}ms`);
    }
    if (this._elU?.style) {
      this._elU.style.setProperty("--dxc-from-u", String(sParts.u));
      this._elU.style.setProperty("--dxc-to-u", String(tParts.u));
      this._elU.style.setProperty("--dxc-u", String(tParts.u));
      this._elU.style.setProperty("--dxc-duration", `${dur}ms`);
    }
    if (this._elDec?.style) {
      this._elDec.style.setProperty("--dxc-from-dec", String(sParts.dec));
      this._elDec.style.setProperty("--dxc-to-dec", String(tParts.dec));
      this._elDec.style.setProperty("--dxc-dec", String(tParts.dec));
      this._elDec.style.setProperty("--dxc-duration", `${dur}ms`);
    }
    const setProp = (p, v) => {
      const sVal = String(v);
      if (this.style.getPropertyValue(p) !== sVal) {
        this.style.setProperty(p, sVal);
      }
    };
    setProp("--dxc-from-b", sParts.b);
    setProp("--dxc-to-b", tParts.b);
    setProp("--dxc-from-m", sParts.m);
    setProp("--dxc-to-m", tParts.m);
    setProp("--dxc-from-k", sParts.k);
    setProp("--dxc-to-k", tParts.k);
    setProp("--dxc-from-u", sParts.u);
    setProp("--dxc-to-u", tParts.u);
    setProp("--dxc-from-dec", sParts.dec);
    setProp("--dxc-to-dec", tParts.dec);
    setProp("--dxc-b", tParts.b);
    setProp("--dxc-m", tParts.m);
    setProp("--dxc-k", tParts.k);
    setProp("--dxc-u", tParts.u);
    setProp("--dxc-dec", tParts.dec);
    setProp("--dxc-duration", `${dur}ms`);
    setProp("--dxc-delay-k", `${delayK}ms`);
    setProp("--dxc-delay-m", `${delayM}ms`);
    setProp("--dxc-delay-b", `${delayB}ms`);
    if (delayKHide > 0) setProp("--dxc-delay-k-hide", `${delayKHide}ms`);
    if (delayMHide > 0) setProp("--dxc-delay-m-hide", `${delayMHide}ms`);
    if (!this._elDec && !this._elU) {
      this._cacheDOMElements();
    }
    const hasB = target >= 1e9 || start >= 1e9;
    const hasM = target >= 1e6 || start >= 1e6;
    const hasK = target >= 1e3 || start >= 1e3;
    const cfg = this._cachedCfg || (typeof this.getFormatConfig === "function" ? this.getFormatConfig() : {});
    const hasDec = cfg.comma !== "" && cfg.type !== "int" && (tParts.dec > 0 || sParts.dec > 0 || cfg.type && cfg.type.includes("number"));
    const setDisp = (el2, v) => {
      if (el2 && el2.style.display !== v) el2.style.display = v;
    };
    setDisp(this._elB, hasB ? "inline" : "none");
    setDisp(this._elM, hasM ? "inline" : "none");
    setDisp(this._elK, hasK ? "inline" : "none");
    setDisp(this._elDec, hasDec ? "inline" : "none");
  }
  render() {
    this._isRendering = true;
    const cfg = this.getFormatConfig();
    const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this.getNumericValue();
    const formattedFull = this.formatValue(targetVal);
    let wrap = this.querySelector(".dx-num-wrap");
    let st = this.querySelector("dx-s");
    if (!wrap) {
      const hasB = targetVal >= 1e9;
      const hasM = targetVal >= 1e6;
      const hasK = targetVal >= 1e3;
      const tParts = this._decompose(targetVal);
      const hasDec = cfg.comma !== "" && cfg.type !== "int" && (tParts.dec > 0 || cfg.type && cfg.type.includes("number"));
      const pfxHtml = cfg.prefix ? `<span class="dx-pfx">${cfg.prefix}</span>` : "";
      const sfxHtml = cfg.suffix ? `<span class="dx-sfx">${cfg.suffix}</span>` : "";
      const bHtml = `<span class="dx-b"${hasB ? "" : ' style="display: none;"'}></span>`;
      const mHtml = `<span class="dx-m"${hasM ? "" : ' style="display: none;"'}></span>`;
      const kHtml = `<span class="dx-k"${hasK ? "" : ' style="display: none;"'}></span>`;
      const uHtml = `<span class="dx-u"></span>`;
      const decHtml = `<span class="dx-dec"${hasDec ? "" : ' style="display: none;"'}>${cfg.comma || ","}</span>`;
      this.innerHTML = `<dx-s>${formattedFull}</dx-s><span class="dx-num-wrap">${pfxHtml}${bHtml}${mHtml}${kHtml}${uHtml}${decHtml}${sfxHtml}</span>`;
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
    const wrap = typeof this.querySelector === "function" ? this.querySelector(".dx-num-wrap") : null;
    if (wrap) {
      this._elB = wrap.querySelector(".dx-b");
      this._elM = wrap.querySelector(".dx-m");
      this._elK = wrap.querySelector(".dx-k");
      this._elU = wrap.querySelector(".dx-u");
      this._elDec = wrap.querySelector(".dx-dec");
      this._elPfx = wrap.querySelector(".dx-pfx");
      this._elSfx = wrap.querySelector(".dx-sfx");
    }
    this._cachedCfg = typeof this.getFormatConfig === "function" ? this.getFormatConfig() : {};
  }
  _updateCounterVars(currentVal, isFinal = false) {
    if (!this._elDec && !this._elU) {
      this._cacheDOMElements();
    }
    const c = this._decompose(currentVal);
    const hasB = currentVal >= 1e9;
    const hasM = currentVal >= 1e6;
    const hasK = currentVal >= 1e3;
    const cfg = this._cachedCfg || (typeof this.getFormatConfig === "function" ? this.getFormatConfig() : {});
    const radix = cfg.comma !== "" ? cfg.comma || "," : ",";
    const hasDec = cfg.comma !== "" && cfg.type !== "int" && (c.dec > 0 || cfg.type && cfg.type.includes("number"));
    if (this._elB) {
      const bStr = hasB ? String(c.b) : "";
      if (this._elB.textContent !== bStr) this._elB.textContent = bStr;
    }
    if (this._elM) {
      const mStr = hasM ? hasB ? String(c.m).padStart(3, "0") : String(c.m) : "";
      if (this._elM.textContent !== mStr) this._elM.textContent = mStr;
    }
    if (this._elK) {
      const kStr = hasK ? hasM ? String(c.k).padStart(3, "0") : String(c.k) : "";
      if (this._elK.textContent !== kStr) this._elK.textContent = kStr;
    }
    if (this._elU) {
      const uStr = hasK ? String(c.u).padStart(3, "0") : String(c.u);
      if (this._elU.textContent !== uStr) this._elU.textContent = uStr;
    }
    if (this._elDec) {
      const is1Dec = cfg.type && (cfg.type.includes("number-1dec") || cfg.type.includes("float-1dec"));
      const decVal = is1Dec ? Math.round(c.dec / 10) : String(c.dec).padStart(2, "0");
      const decStr = hasDec ? `${radix}${decVal}` : "";
      if (this._elDec.textContent !== decStr) this._elDec.textContent = decStr;
    }
    if (hasB !== this._lastHasB) {
      if (this._elB) this._elB.style.display = hasB ? "inline" : "none";
      this._lastHasB = hasB;
    }
    if (hasM !== this._lastHasM) {
      if (this._elM) this._elM.style.display = hasM ? "inline" : "none";
      this._lastHasM = hasM;
    }
    if (hasK !== this._lastHasK) {
      if (this._elK) this._elK.style.display = hasK ? "inline" : "none";
      this._lastHasK = hasK;
    }
    if (hasDec !== this._lastHasDec) {
      if (this._elDec) this._elDec.style.display = hasDec ? "inline" : "none";
      this._lastHasDec = hasDec;
    }
    if (isFinal || _DxCounter.supportsHoudini) {
      if (this._elB?.style) this._elB.style.setProperty("--dxc-b", hasB ? String(c.b) : "0");
      if (this._elM?.style) this._elM.style.setProperty("--dxc-m", hasM ? String(c.m) : "0");
      if (this._elK?.style) this._elK.style.setProperty("--dxc-k", hasK ? String(c.k) : "0");
      if (this._elU?.style) this._elU.style.setProperty("--dxc-u", String(c.u));
      if (this._elDec?.style) this._elDec.style.setProperty("--dxc-dec", String(c.dec));
    }
    if (this.style && typeof this.style.setProperty === "function") {
      if (c.b !== this._lastB) {
        this.style.setProperty("--dxc-b", String(c.b));
        this._lastB = c.b;
      }
      if (c.m !== this._lastM) {
        this.style.setProperty("--dxc-m", String(c.m));
        this._lastM = c.m;
      }
      if (c.k !== this._lastK) {
        this.style.setProperty("--dxc-k", String(c.k));
        this._lastK = c.k;
      }
      if (c.u !== this._lastU) {
        this.style.setProperty("--dxc-u", String(c.u));
        this._lastU = c.u;
      }
      if (c.dec !== this._lastDec) {
        this.style.setProperty("--dxc-dec", String(c.dec));
        this._lastDec = c.dec;
      }
    }
  }
  _stepAnimation(now) {
    if (this._animStartTime === null || this._animStartTime === void 0) {
      this._animStartTime = now;
    }
    const elapsed = Math.max(0, now - this._animStartTime);
    const duration = this._animDuration;
    const targetValue = this._targetValue;
    const startValue = this._animStartValue;
    if (elapsed >= duration) {
      this._value = targetValue;
      this.setAttribute("percent", this._value);
      this.makeStatic();
      this.classList.remove("ui-number-running");
      this._updateCounterVars(targetValue, true);
      this.setAccessibility(targetValue);
      unregisterRAF(this);
      this._animDone = true;
      const twEmbed = this.classList.contains("tw-embed") || !!(typeof this.closest === "function" && this.closest(TYPE_PARENT_SEL3));
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
    if (typeof this.removeAttribute === "function") this.removeAttribute("data-static");
    this._targetValue = targetValue;
    this._animStartValue = this._value !== void 0 && !isNaN(this._value) ? this._value : 0;
    this._animDuration = duration;
    this._animStartTime = null;
    this._lastTickTime = null;
    this._lastHasB = null;
    this._lastHasM = null;
    this._lastHasK = null;
    this._lastHasDec = null;
    this.classList.add("ui-number-running");
    this._updateCounterVars(this._animStartValue, false);
    registerRAF(this);
  }
  _onAnimEnd(e) {
    if (e && e.target && !e.target.classList.contains("dx-num")) return;
    this._value = this._targetValue;
    this._updateCounterVars(this._value, true);
    this.classList.remove("dx-counter-running");
    this.makeStatic();
    const st = this.querySelector("dx-s");
    if (st) {
      st.textContent = this.formatValue(this._value);
    }
    const num = this.querySelector(".dx-num");
    if (num) {
      num.removeEventListener("animationend", this._onAnimEndBound);
      num.removeEventListener("transitionend", this._onAnimEndBound);
    }
    this._animDone = true;
    const twEmbed = this.classList.contains("tw-embed") || !!(typeof this.closest === "function" && this.closest(TYPE_PARENT_SEL3));
    if (twEmbed) {
      onTypewriterEnd(this);
    }
  }
  val(newValue, duration) {
    if (!this._initialized) this.init();
    if (newValue === void 0) return this._targetValue !== void 0 && !isNaN(this._targetValue) ? this._targetValue : this._value;
    const parsedValue = parseFloat(newValue) || 0;
    this._targetValue = parsedValue;
    const startVal = this._value !== void 0 && !isNaN(this._value) ? this._value : 0;
    if (this._initialized && startVal === parsedValue && !this._pendingVal) {
      this.setAccessibility(parsedValue);
      return this;
    }
    const isReduced = isReducedMotionActive();
    const durVal = this.getDuration();
    const animDuration = isReduced ? 0 : duration !== void 0 && duration !== null ? duration : durVal !== void 0 && !isNaN(durVal) ? durVal : 600;
    const ready = this.isReadyToAnimate();
    if (!ready && animDuration > 0) {
      this._pendingVal = { targetValue: parsedValue, duration: animDuration };
      this.setAttribute("percent", parsedValue);
      this.setAccessibility(parsedValue);
      return this;
    }
    this._animationStarted = true;
    this._pendingVal = null;
    this.setAttribute("percent", parsedValue);
    this.setAccessibility(parsedValue);
    const st = this.querySelector("dx-s");
    if (st) st.textContent = this.formatValue(parsedValue);
    if (isReduced || animDuration === 0) {
      unregisterRAF(this);
      this.classList.remove("ui-number-running");
      this._value = parsedValue;
      this._updateCounterVars(parsedValue, true);
      this.makeStatic();
      this.setAccessibility(parsedValue);
      this._animDone = true;
      const twEmbed = this.classList.contains("tw-embed") || !!(typeof this.closest === "function" && this.closest(TYPE_PARENT_SEL3));
      if (twEmbed) {
        onTypewriterEnd(this);
      }
      return this;
    }
    if (_DxCounter.supportsHoudini) {
      unregisterRAF(this);
      this._setupTiming(startVal, parsedValue, animDuration);
      return this;
    }
    this._value = startVal;
    if (animDuration > 0 && startVal !== parsedValue) {
      this.animateTo(parsedValue, animDuration);
    } else {
      unregisterRAF(this);
      this.classList.remove("ui-number-running");
      this._value = parsedValue;
      this._updateCounterVars(parsedValue, true);
      this.makeStatic();
      this.setAccessibility(parsedValue);
    }
    return this;
  }
};
defCustomElement("dx-counter", DxCounter);
if (rootWin2) {
  Object.assign(rootWin2, { DxCounter });
}

// src/client/components/dx-check.js
var DxCheck = class extends DxBase {
  connectedCallback() {
    if (!this.getAttribute("aria-hidden")) {
      this.setAttribute("aria-hidden", "true");
    }
  }
};
defCustomElement("dx-check", DxCheck);

// src/server/index.js
function formatNumber2(val, type = "int", comma = ",", prefix = "", suffix = "") {
  const num = parseFloat(val) || 0;
  let formatted = "";
  if (type.includes("number-1dec") || type === "float" || type.startsWith("float")) {
    formatted = num.toFixed(1).replace(".", comma);
  } else if (type.includes("number-2dec") || type === "number") {
    formatted = num.toFixed(2).replace(".", comma);
  } else if (type === "int" || type.startsWith("int-") || type.startsWith("number-")) {
    const intVal = Math.round(num);
    const str = intVal.toString();
    formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  } else {
    formatted = num.toString().replace(".", comma);
  }
  const pfx = prefix ? `${prefix}${prefix.endsWith(" ") ? "" : " "}` : "";
  const noLeadingSpace = /^[%°"”″’'VvAaWw€$£]|\//.test(suffix);
  const sfx = suffix ? `${suffix.startsWith(" ") || noLeadingSpace ? "" : " "}${suffix}` : "";
  return `${pfx}${formatted}${sfx}`;
}
function generateRibbonHtml2(numericValue, type = "int", comma = ",", prefix = "", suffix = "", startValue = null) {
  const formatted = formatNumber2(numericValue, type, comma, prefix, suffix);
  const numberPartMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formatted);
  const prefixText = (numberPartMatch?.[1] || "").trim();
  const mainDigits = numberPartMatch?.[2] || "";
  const radixMark = numberPartMatch?.[3] || "";
  const decimalDigits = numberPartMatch?.[4] || "";
  const suffixText = (numberPartMatch?.[5] || "").trim();
  const formattedNumberStr = mainDigits + radixMark + decimalDigits;
  let formattedStartStr = null;
  if (startValue !== null && startValue !== void 0 && startValue !== "") {
    const startNumeric = parseFloat(startValue);
    if (!isNaN(startNumeric)) {
      const startFormatted = formatNumber2(startNumeric, type, comma, prefix, suffix);
      const startMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(startFormatted);
      formattedStartStr = (startMatch?.[2] || "") + (startMatch?.[3] || "") + (startMatch?.[4] || "");
    }
  }
  const isYear = type === "year";
  const allDigitPositions = [];
  for (let i = 0; i < formattedNumberStr.length; i++) {
    if (formattedNumberStr[i] >= "0" && formattedNumberStr[i] <= "9") allDigitPositions.push(i);
  }
  const totalDigits = allDigitPositions.length;
  let digitsHtml = "";
  let digitIndex = 0;
  for (let i = 0; i < formattedNumberStr.length; i++) {
    const char = formattedNumberStr[i];
    if (char >= "0" && char <= "9") {
      const curDigitIdx = digitIndex++;
      const digitR = totalDigits - 1 - curDigitIdx;
      const digitVal = parseInt(char, 10);
      let startDigitVal = 0;
      if (formattedStartStr) {
        const paddedStart = formattedStartStr.padStart(formattedNumberStr.length, "0");
        startDigitVal = parseInt(paddedStart[i], 10);
        if (isNaN(startDigitVal)) startDigitVal = 0;
      }
      let drumValues = [];
      if (isYear && formattedStartStr) {
        if (startDigitVal === digitVal) {
          drumValues.push(digitVal);
        } else {
          let cur = startDigitVal;
          drumValues.push(cur);
          while (cur !== digitVal && drumValues.length <= 20) {
            cur = (cur + 1) % 10;
            drumValues.push(cur);
          }
        }
      } else {
        const isSingleDigit = totalDigits === 1;
        const cycles = isSingleDigit ? 0 : digitR === 0 ? 2 : digitR === 1 ? 1 : 0;
        const totalSteps = cycles * 10 + (digitVal - startDigitVal + 10) % 10;
        const effectiveSteps = totalSteps === 0 && cycles === 0 ? 0 : totalSteps;
        let cur = startDigitVal;
        drumValues.push(cur);
        for (let s = 0; s < effectiveSteps; s++) {
          cur = (cur + 1) % 10;
          drumValues.push(cur);
        }
        if (drumValues.length >= 10) {
          const removeCount = Math.floor(drumValues.length / 5);
          if (removeCount > 0) {
            const keepStart = 3;
            const keepEnd = 4;
            const midCount = drumValues.length - keepStart - keepEnd;
            if (midCount > removeCount) {
              const step = midCount / (removeCount + 1);
              const dropIndices = /* @__PURE__ */ new Set();
              for (let r = 1; r <= removeCount; r++) {
                dropIndices.add(keepStart + Math.round(r * step) - 1);
              }
              drumValues = drumValues.filter((_, idx) => !dropIndices.has(idx));
            }
          }
        }
        let intDigitsCount = 0;
        for (let j = 0; j < mainDigits.length; j++) {
          if (mainDigits[j] >= "0" && mainDigits[j] <= "9") intDigitsCount++;
        }
        const maxLeadingZeroIdx = Math.max(-1, intDigitsCount - 2);
        const isLeadingZero = !isYear && curDigitIdx <= maxLeadingZeroIdx && drumValues[0] === 0;
        if (isLeadingZero) {
          let allZero = true;
          for (let z = 0; z <= curDigitIdx; z++) {
            const sd = formattedStartStr ? parseInt(formattedStartStr.padStart(formattedNumberStr.length, "0")[allDigitPositions[z]], 10) : 0;
            if (sd !== 0) {
              allZero = false;
              break;
            }
          }
          if (allZero) drumValues[0] = " ";
        }
      }
      const totalItems = drumValues.length;
      const finalIndex = totalItems - 1;
      const finalPosPercent = totalItems > 1 ? -(finalIndex / totalItems * 100).toFixed(4) : 0;
      const seqStr = drumValues.map((v) => v === " " ? " " : v).join("");
      digitsHtml += `<dx-d data-seq="${seqStr}" style="--p:${finalPosPercent}%">${char}</dx-d>`;
    } else {
      digitsHtml += `<span class="ui-radix">${char}</span>`;
    }
  }
  const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefix.endsWith(" ") ? "" : " "}</span>` : "";
  const hasExplicitSpace = suffix.startsWith(" ");
  const noSfxSpace = /^[%°"”″’'VvAaWw€$£]|\//.test(suffixText);
  const sfxSpace = hasExplicitSpace || !noSfxSpace ? suffixText ? " " : "" : "";
  const sfxHtml = suffixText ? `<span class="ui-sfx">${sfxSpace}${suffixText}</span>` : "";
  return `${pfxHtml}<b>${digitsHtml}</b>${sfxHtml}`;
}
function ssrDxOdometer(numericValue, options = {}) {
  const {
    type = "int",
    comma = ",",
    prefix = "",
    suffix = "",
    className = "",
    twContext = false
  } = options;
  const safePrefix = prefix.trim();
  const safeSuffix = suffix.trim();
  const safeAttrPrefix = safePrefix.replace(/"/g, "&quot;");
  const safeAttrSuffix = safeSuffix.replace(/"/g, "&quot;");
  const prefixAttr = safePrefix ? ` prefix="${safeAttrPrefix}"` : "";
  const suffixAttr = safeSuffix ? ` suffix="${safeAttrSuffix}"` : "";
  const commaAttr = comma ? ` comma="${comma}"` : "";
  const typeAttr = ` type="${type}"`;
  const classStr = twContext ? `tw-embed ${className}`.trim() : className;
  const classAttr = classStr ? ` class="${classStr}"` : "";
  let cleanPercent = String(numericValue);
  if (type.includes("number-1dec")) {
    const parsed = parseFloat(numericValue);
    if (!isNaN(parsed)) cleanPercent = parsed.toFixed(1);
  } else if (type.includes("number-2dec")) {
    const parsed = parseFloat(numericValue);
    if (!isNaN(parsed)) cleanPercent = parsed.toFixed(2);
  }
  const formattedText = formatNumber2(numericValue, type, comma, safePrefix, safeSuffix);
  const ariaLabel = formattedText.replace(/·/g, "").replace(/\s+/g, " ").trim().replace(/"/g, "&quot;");
  const ribbonHtml = generateRibbonHtml2(numericValue, type, comma, safePrefix, safeSuffix, options.start);
  return `<dx-odometer${classAttr}${typeAttr} percent="${cleanPercent}"${prefixAttr}${suffixAttr}${commaAttr} aria-label="${ariaLabel}" aria-hidden="true"><dx-s>${formattedText}</dx-s>${ribbonHtml}</dx-odometer>`;
}
function splitChars(str) {
  return [...str];
}
function encodeW(entries) {
  let w = "";
  for (const e of entries) {
    if (e.meter) {
      w += "*";
      continue;
    }
    if (e.element) {
      w += " ";
      continue;
    }
    if (e.hyphen) w += "-";
    if (e.len > 15) {
      w += "+" + e.len.toString(16).toUpperCase().padStart(2, "0");
    } else {
      w += e.len.toString(16).toUpperCase();
    }
  }
  return w;
}
function tokenize(html, options = {}) {
  if (!html) return { html: "", cleanText: "", totalUnits: 0, speed: 40, duration: 0, delay: 0, style: "" };
  const duration = Number(options.duration ?? options.t ?? options.time ?? 580);
  const delay = Number(options.delay ?? options.d ?? 0);
  const offset = Number(options.offset ?? options.b ?? 0);
  const cleanText = html.replace(/<(?:ui|dx)-odometer[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/(?:ui|dx)-odometer>/gi, "$1").replace(/<(?:ui|dx)-odometer[^>]*>[\s\S]*?<dx-s>([\s\S]*?)<\/dx-s>[\s\S]*?<\/(?:ui|dx)-odometer>/gi, "$1").replace(/<(?:ui|dx)-odometer[^>]*>([\s\S]*?)<\/(?:ui|dx)-odometer>/gi, "$1").replace(/<(?:ui|dx)-number[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/(?:ui|dx)-number>/gi, "$1").replace(/<(?:ui|dx)-number[^>]*>([\s\S]*?)<\/(?:ui|dx)-number>/gi, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').trim().replace(/\s+/g, " ");
  const tokens = [];
  const tokenRegex = /(<[^>]+>)|(&(?:[a-z0-9]+|#[0-9]+|#x[0-9a-f]+);)|([^<&]+|&)/gi;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(html)) !== null) {
    if (tokenMatch[1]) tokens.push({ type: "tag", value: tokenMatch[1] });
    else if (tokenMatch[2]) tokens.push({ type: "entity", value: tokenMatch[2] });
    else if (tokenMatch[3]) tokens.push({ type: "text", value: tokenMatch[3] });
  }
  let preUnits = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "tag") {
      if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(token.value)) {
        let compTag = token.value;
        let depth = 1;
        while (i + 1 < tokens.length && depth > 0) {
          i++;
          compTag += tokens[i].value;
          if (tokens[i].type === "tag") {
            if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(tokens[i].value)) depth++;
            else if (/^<\/(?:dx|ui)-(?:number|odometer)>/i.test(tokens[i].value)) depth--;
          }
        }
        preUnits += 1;
      }
    } else if (token.type === "entity") {
      preUnits += 1;
    } else {
      const parts = token.value.split(/(\s+)/);
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (/^\s+$/.test(part)) {
          preUnits += 1;
        } else if (part.length > 0) {
          let punct = "";
          if (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            const nextText = tokens[i + 1].value;
            const punctMatch = nextText.match(/^[.,;:!?\\"'"']+/);
            if (punctMatch) {
              punct = punctMatch[0];
            }
          }
          const wordChars = splitChars(part);
          const punctChars = splitChars(punct);
          preUnits += wordChars.length + punctChars.length;
        }
      }
    }
  }
  const totalUnits = Math.max(1, preUnits);
  const speed = duration / totalUnits;
  const style = `--b:${offset};--a:${totalUnits};--d:${delay};--t:${duration};--u:${speed.toFixed(3)}`;
  function makeCharTag(ch, idx, extraClass = "") {
    const exactDelay = Math.round(delay + (offset + idx) * speed);
    const styleAttr = ` style="animation-delay:${exactDelay}ms"`;
    const cClass = ch === "\xB7" || ch === "\u2022" ? ` class="bullet-dot${extraClass ? " " + extraClass : ""}"` : extraClass ? ` class="${extraClass}"` : "";
    return `<dx-c${cClass}${styleAttr}>${ch}</dx-c>`;
  }
  let result = "";
  let compactParts = [];
  let wStack = [{ entries: [], tagIdx: -1 }];
  function currentWEntries() {
    return wStack[wStack.length - 1].entries;
  }
  let charIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "tag") {
      if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(token.value)) {
        let compHTML = token.value;
        let depth = 1;
        while (i + 1 < tokens.length && depth > 0) {
          i++;
          compHTML += tokens[i].value;
          if (tokens[i].type === "tag") {
            if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(tokens[i].value)) depth++;
            else if (/^<\/(?:dx|ui)-(?:number|odometer)>/i.test(tokens[i].value)) depth--;
          }
        }
        const exactDelay = Math.round(delay + (offset + charIdx) * speed);
        charIdx += 1;
        compHTML = compHTML.replace(/<((?:dx|ui)-(?:number|odometer)\b)([^>]*)>/i, (m, compTagName, attrs) => {
          let newAttrs = attrs;
          if (!/\btw-embed\b/.test(newAttrs)) {
            if (/class="([^"]*)"/i.test(newAttrs)) {
              newAttrs = newAttrs.replace(/class="([^"]*)"/i, 'class="$1 tw-embed"');
            } else if (/class='([^']*)'/i.test(newAttrs)) {
              newAttrs = newAttrs.replace(/class='([^']*)'/i, "class='$1 tw-embed'");
            } else {
              newAttrs = ` class="tw-embed"${newAttrs}`;
            }
          }
          if (!/\bdata-static\b/.test(newAttrs)) {
            if (/style="([^"]*)"/i.test(newAttrs)) {
              newAttrs = newAttrs.replace(/style="([^"]*)"/i, (sm, sContent) => {
                let cleanS = sContent.replace(/--d:\s*\d+(?:ms)?\s*;?/g, "").trim();
                if (cleanS && !cleanS.endsWith(";")) cleanS += ";";
                return `style="${cleanS} --d: ${exactDelay};"`;
              });
            } else if (/style='([^']*)'/i.test(newAttrs)) {
              newAttrs = newAttrs.replace(/style='([^']*)'/i, (sm, sContent) => {
                let cleanS = sContent.replace(/--d:\s*\d+(?:ms)?\s*;?/g, "").trim();
                if (cleanS && !cleanS.endsWith(";")) cleanS += ";";
                return `style='${cleanS} --d: ${exactDelay};'`;
              });
            } else {
              newAttrs = `${newAttrs} style="--d: ${exactDelay};"`;
            }
          }
          return `<${compTagName}${newAttrs}>`;
        });
        const compTag = `<dx-c class="c-ui-num" style="animation-delay:${exactDelay}ms">${compHTML}</dx-c>`;
        result += `<dx-w>${compTag}</dx-w>`;
        currentWEntries().push({ meter: true });
        compactParts.push(compHTML);
      } else {
        if (/^<\//.test(token.value)) {
          result += token.value;
          if (wStack.length > 1) {
            const level = wStack.pop();
            const wVal = encodeW(level.entries);
            if (wVal && level.tagIdx >= 0) {
              const openTag = compactParts[level.tagIdx];
              compactParts[level.tagIdx] = openTag.replace(/>$/, ` w="${wVal}">`);
            }
          }
          compactParts.push(token.value);
        } else {
          const isVoid = /^<(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(token.value) || /\/>$/.test(token.value);
          if (isVoid) {
            result += token.value;
            compactParts.push(token.value);
            currentWEntries().push({ element: true });
          } else {
            const exactDelay = Math.round(delay + (offset + charIdx) * speed);
            let styledTag = token.value;
            if (/\bstyle=["']([^"']*)["']/i.test(styledTag)) {
              styledTag = styledTag.replace(/\bstyle=(["'])([^"']*)\1/i, (m, quote, val) => {
                const trimmed = val.trim();
                const sep = trimmed && !trimmed.endsWith(";") ? ";" : "";
                return `style=${quote}${trimmed}${sep}--dx-delay:${exactDelay}ms;${quote}`;
              });
            } else {
              styledTag = styledTag.replace(/>$/, ` style="--dx-delay:${exactDelay}ms;">`);
            }
            result += styledTag;
            const tagIdx = compactParts.length;
            compactParts.push(token.value);
            currentWEntries().push({ element: true });
            wStack.push({ entries: [], tagIdx });
          }
        }
      }
    } else if (token.type === "entity") {
      const entTag = makeCharTag(token.value, charIdx++);
      result += `<dx-w>${entTag}</dx-w>`;
      currentWEntries().push({ len: 1 });
      compactParts.push(token.value);
    } else {
      const parts = token.value.split(/(\s+)/);
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (/^\s+$/.test(part)) {
          result += part;
          compactParts.push(part);
          charIdx += 1;
        } else if (part.length > 0) {
          let punct = "";
          if (i + 1 < tokens.length && tokens[i + 1].type === "text") {
            const nextText = tokens[i + 1].value;
            const punctMatch = nextText.match(/^[.,;:!?\\"'"']+/);
            if (punctMatch) {
              punct = punctMatch[0];
              tokens[i + 1].value = nextText.substring(punct.length);
            }
          }
          const subWords = part.includes("-") && part.length > 1 && !/^-+$/.test(part) ? part.match(/[^-]+-?/g) || [part] : [part];
          for (let sIdx = 0; sIdx < subWords.length; sIdx++) {
            const subWord = subWords[sIdx];
            const isLastSubWord = sIdx === subWords.length - 1;
            const subPunct = isLastSubWord ? punct : "";
            const wordChars = splitChars(subWord);
            const punctChars = splitChars(subPunct);
            const isDateWord = /^DATE(?:x2)?(?:-|$)/i.test(subWord);
            if (isDateWord && wordChars.length > 0 && wordChars[0] === "D") {
              wordChars[0] = "\u{1D5D7}";
            }
            const cTags = wordChars.map((ch) => makeCharTag(ch, charIdx++)).join("");
            const pTags = punctChars.map((ch) => makeCharTag(ch, charIdx++)).join("");
            const wClass = subWord.includes("-") || subPunct.includes("-") ? ' class="word"' : "";
            result += `<dx-w${wClass}>${cTags}${pTags}</dx-w>`;
            const totalLen = [...subWord + subPunct].length;
            const isHyphen = subWord.includes("-") || subPunct.includes("-");
            currentWEntries().push({ len: totalLen, hyphen: isHyphen });
            const isBullet = subWord === "\xB7" || subWord === "\u2022";
            const compactOut = isBullet ? `<c class="bullet-dot">${subWord}</c>` : subWord + subPunct;
            compactParts.push(compactOut);
          }
        }
      }
    }
  }
  const allMatches = [...result.matchAll(/<dx-c\b([^>]*)>/gi)];
  let targetMatch = null;
  for (let m = allMatches.length - 1; m >= 0; m--) {
    if (!/\bc-ui-num\b/.test(allMatches[m][1])) {
      targetMatch = allMatches[m];
      break;
    }
  }
  if (!targetMatch && allMatches.length > 0) {
    targetMatch = allMatches[allMatches.length - 1];
  }
  if (targetMatch) {
    const idx = targetMatch.index + targetMatch[0].length - 1;
    result = result.slice(0, idx) + ' data-last="true" onanimationend="return onTypewriterEnd(this, event)"' + result.slice(idx);
  }
  const rootW = encodeW(wStack[0].entries);
  const compactHtml = compactParts.join("");
  return {
    html: result,
    compactHtml,
    wAttr: rootW,
    cleanText,
    totalUnits,
    speed,
    duration,
    delay,
    offset,
    style
  };
}
function ssrDxType(content, options = {}) {
  const tagName = options.tagName || (options.isSda ? "dx-type-sda" : "dx-type");
  const isSda = tagName === "dx-type-sda" || !!options.isSda;
  const res = tokenize(content, options);
  const safeAria = (options.ariaLabel || res.cleanText || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ariaAttr = safeAria ? ` aria-label="${safeAria}"` : "";
  const classAttr = options.className ? ` class="${options.className}"` : "";
  const stContent = typeof content === "string" ? content.replace(/<(?:dx|ui)-odometer\b([^>]*)>([\s\S]*?)<\/(?:dx|ui)-odometer>/gi, (match, attrs, inner) => {
    const cleanAttrs = attrs.replace(/\bdata-static(?:="[^"]*")?/gi, "").trim();
    const existingDxS = inner ? inner.match(/<dx-s>([\s\S]*?)<\/dx-s>/i) : null;
    let cleanText;
    if (existingDxS) {
      cleanText = existingDxS[1];
    } else {
      const valMatch = attrs.match(/\bpercent=["']([^"']+)["']/i) || attrs.match(/\bvalue=["']([^"']+)["']/i);
      const sfxMatch = attrs.match(/\bsuffix=["']([^"']+)["']/i);
      const pfxMatch = attrs.match(/\bprefix=["']([^"']+)["']/i);
      const val = valMatch ? valMatch[1] : "";
      const pfx = pfxMatch ? pfxMatch[1] : "";
      const sfx = sfxMatch ? sfxMatch[1] : "";
      cleanText = `${pfx}${val}${sfx}`.trim();
    }
    if (!cleanText) {
      cleanText = inner.replace(/<[^>]+>/g, "").trim();
    }
    const classMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
    let clsList = classMatch ? classMatch[1].trim().split(/\s+/) : ["auto-n"];
    if (!clsList.includes("data-static")) clsList.push("data-static");
    const cleanClasses = clsList.filter(Boolean).join(" ");
    return `<dx-odometer class="${cleanClasses}">${cleanText}</dx-odometer>`;
  }) : content;
  const stTokens = tokenize(stContent, options);
  const sdaStContent = stTokens.compactHtml || stContent;
  const wAttr = stTokens.wAttr ? ` w="${stTokens.wAttr}"` : "";
  if (isSda) {
    return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}><dx-s${wAttr}>${sdaStContent}</dx-s><template><dx-t aria-hidden="true">${res.html}</dx-t></template></${tagName}>`;
  }
  return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}><dx-s${wAttr}>${sdaStContent}</dx-s><dx-t aria-hidden="true">${res.html}</dx-t></${tagName}>`;
}
function ssrDxReveal(content, options = {}) {
  const tagName = options.tagName || (options.isSda ? "dx-reveal-sda" : "dx-reveal");
  const duration = Number(options.duration ?? options.t ?? options.time ?? (options.isSda ? 500 : 600));
  const delay = Number(options.delay ?? options.d ?? 0);
  const classList = [];
  if (options.className) classList.push(options.className);
  if (options.staggered && !classList.some((c) => c.split(/\s+/).includes("staggered"))) {
    classList.push("staggered");
  }
  const classAttr = classList.length ? ` class="${classList.join(" ").trim()}"` : "";
  const styleAttr = ` style="--d:${delay};--t:${duration}"`;
  return `<${tagName}${classAttr}${styleAttr}>${content}</${tagName}>`;
}
export {
  DX_ANIM,
  DX_CHAR_DURATION,
  DxBase,
  DxCheck,
  DxCounter,
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
  HEX_LUT,
  SECTION_HEADER_SEL,
  bootstrapTypewriterObserver,
  buildTypingLayer,
  cleanupTypedDOM,
  ensureElementsUpToTarget,
  expandOdometerDrums,
  finishReveal,
  flushIdleCleanup,
  flushScrollGate,
  formatNumber,
  gateIOUntil,
  generateDataO,
  generateRibbonHtml,
  getIO,
  getLookaheadIO,
  getNextStaggerDelay,
  getSdaGaps,
  getTypewriterObserver,
  isReducedMotionActive,
  isScrollRestored,
  mountTypewriter,
  observeIO,
  observeLookaheadIO,
  observeTypewriter,
  onAllAnimationsEnd,
  onTypewriterEnd,
  prepareTemplateContent,
  queueIdleCleanup,
  queueIdleUnpack,
  registerRAF,
  removeFromIdleQueue,
  resetStaggerTimeline,
  rootWin2 as rootWin,
  setSdaGaps,
  ssrDxOdometer,
  ssrDxReveal,
  ssrDxType,
  startReveal,
  syncSectionHeaderTyping,
  tokenize,
  uiNum,
  unobserveIO,
  unobserveLookaheadIO,
  unpackTemplate,
  unregisterRAF
};
//# sourceMappingURL=client.js.map
