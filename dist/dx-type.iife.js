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
    formatNumber: () => formatNumber,
    generateRibbonHtml: () => generateRibbonHtml,
    getIO: () => getIO,
    getSdaGaps: () => getSdaGaps,
    getTypewriterObserver: () => getTypewriterObserver,
    mountTypewriter: () => mountTypewriter,
    observeIO: () => observeIO,
    observeTypewriter: () => observeTypewriter,
    onAllAnimationsEnd: () => onAllAnimationsEnd,
    onTypewriterEnd: () => onTypewriterEnd,
    prepareTemplateContent: () => prepareTemplateContent,
    queueIdleUnpack: () => queueIdleUnpack,
    registerRAF: () => registerRAF,
    removeFromIdleQueue: () => removeFromIdleQueue,
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
  var ioCallbacks = /* @__PURE__ */ new WeakMap();
  var _sdaTopGap = "0%";
  var _sdaBottomGap = "-110px";
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
  var idleQueue = [];
  var isIdleScheduled = false;
  var scheduleIdle = typeof window !== "undefined" && window.requestIdleCallback ? window.requestIdleCallback.bind(window) : ((cb) => setTimeout(() => cb({ timeRemaining: () => 15, didTimeout: false }), 50));
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
      if (idleQueue[i].el === el2) return;
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
    if (type === "int" || type.startsWith("int-") || type === "number" || type.startsWith("number-")) {
      const isFloat = type === "float";
      if (isFloat) {
        formatted = num.toFixed(1).replace(".", comma);
      } else {
        const intVal = Math.round(num);
        const str = intVal.toString();
        formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      }
    } else {
      formatted = num.toString().replace(".", comma);
    }
    const pfx = prefix || "";
    const sfx = suffix || "";
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
        const finalPosPercent = totalItems > 1 ? -(finalIndex * 100) : 0;
        const seqStr = drumValues.map((v) => v === " " ? " " : v).join("&#10;");
        digitsHtml += `<d data-seq="${seqStr}" style="--p:${finalPosPercent}%;--r:${digitR}">${char}</d>`;
      } else {
        digitsHtml += `<span class="ui-radix">${char}</span>`;
      }
    }
    const prefixHasSpace = (numberPartMatch?.[1] || "").endsWith(" ");
    const prefixSpace = prefixHasSpace ? " " : "";
    const suffixHasSpace = (numberPartMatch?.[5] || "").startsWith(" ");
    const suffixSpace = suffixHasSpace ? " " : "";
    const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefixSpace}</span>` : "";
    const sfxHtml = suffixText ? `<span class="ui-sfx">${suffixSpace}${suffixText}</span>` : "";
    return `${pfxHtml}<b>${digitsHtml}</b>${sfxHtml}`;
  }
  if (rootWin2) {
    Object.assign(rootWin2, { DxMeter, UiMeter: DxMeter, uiNum, generateRibbonHtml });
  }

  // src/client/base/dx-typing.js
  function getTypewriterObserver(win) {
    return getIO(win);
  }
  function prepareTemplateContent(el2) {
    if (!el2) return false;
    if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return false;
    const tpl = el2.querySelector(":scope > template");
    if (!tpl || !tpl.content) return false;
    if (tpl._prepared) return true;
    let tLayer = tpl.content.querySelector("t");
    if (!tLayer) {
      const st = el2.querySelector(":scope > s-t");
      if (st) {
        const doc = el2.ownerDocument || (typeof document !== "undefined" ? document : null);
        if (doc) {
          tLayer = doc.createElement("t");
          tLayer.setAttribute("aria-hidden", "true");
          const style = el2.getAttribute("style") || "";
          const uMatch = style.match(/--u:([\d.]+)/);
          const speed = uMatch ? parseFloat(uMatch[1]) : 40;
          const charDur = Math.round(speed * 3.5);
          tLayer.setAttribute("style", `animation-duration:${charDur}ms`);
          tLayer.innerHTML = st.innerHTML;
          tpl.content.appendChild(tLayer);
        }
      }
    }
    if (tLayer) {
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
            const w = node;
            if (w.hasAttribute("data-ready")) {
              charIdx += w.querySelectorAll("i").length;
              continue;
            }
            const cUiNum = w.querySelector("i.c-ui-num");
            if (cUiNum) {
              const odo = cUiNum.querySelector("dx-odometer, ui-odometer");
              const exactDelay = Math.round(delay + (offset + charIdx) * speed);
              charIdx += 1;
              cUiNum.style.animationDelay = `${exactDelay}ms`;
              if (odo) {
                odo.style.setProperty("--d", exactDelay);
              }
            } else if (!w.querySelector("i")) {
              const text = w.textContent || "";
              if (text) {
                const chars = text.match(/&[a-z0-9]+;|./gu) || [];
                let inner = "";
                for (let j = 0; j < chars.length; j++) {
                  const ch = chars[j];
                  const exactDelay = Math.round(delay + (offset + charIdx++) * speed);
                  const cClass = ch === "\xB7" || ch === "\u2022" ? ' class="bullet-dot"' : "";
                  inner += `<i${cClass} style="animation-delay:${exactDelay}ms">${ch}</i>`;
                }
                w.innerHTML = inner;
              }
            } else {
              charIdx += w.querySelectorAll("i").length;
            }
            w.setAttribute("data-ready", "true");
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
      }
      const allI = tLayer.querySelectorAll("i");
      if (allI.length > 0) {
        const lastI = allI[allI.length - 1];
        lastI.setAttribute("data-last", "true");
        lastI.classList.add("last-char");
      }
    }
    return true;
  }
  function unpackTemplate(el2) {
    if (!el2) return false;
    if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return false;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el2.classList.add(DX_ANIM.TYPED);
      return false;
    }
    const tpl = el2.querySelector(":scope > template");
    if (tpl && tpl.content) {
      prepareTemplateContent(el2);
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
      return true;
    }
    return false;
  }
  function isElementHidden(el2) {
    if (!el2) return true;
    if (!el2.closest("summary") && el2.closest("details:not([open])")) return true;
    const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 719.5px), (max-width: 1024px) and (orientation: portrait)").matches;
    const hiddenParent = el2.closest(isMobile ? ".hidden, [hidden], .wait-stuck:not(.is-stuck), .favorite-product__button--saved" : ".hidden, [hidden], .favorite-product__button--saved");
    if (hiddenParent && !hiddenParent.closest(".favorite-product--saved, .is-stuck")) return true;
    return false;
  }
  function observeTypewriter(el2) {
    if (!el2) return;
    if (el2.classList && el2.classList.contains(DX_ANIM.TYPED)) return;
    observeIO(el2, (targetEl) => {
      if (isElementHidden(targetEl)) return;
      removeFromIdleQueue(targetEl);
      unpackTemplate(targetEl);
      targetEl.classList.add(DX_ANIM.TYPING);
    });
    queueIdleUnpack(el2, (targetEl) => {
      prepareTemplateContent(targetEl);
    });
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
      let lastC = parent._lastC;
      if (!lastC) {
        lastC = parent.querySelector('t [data-last="true"], t .last-char, [data-last="true"], .last-char');
        if (!lastC) {
          const allC = parent.querySelectorAll("t i:not(.c-ui-num), i:not(.c-ui-num)");
          lastC = allC.length ? allC[allC.length - 1] : null;
        }
        if (typeof document === "undefined" || document.readyState !== "loading") {
          parent._lastC = lastC;
        }
      }
      const isLastChar = !isEmbed && !cEl.classList?.contains("c-ui-num") && (cEl === lastC || cEl.getAttribute?.("data-last") === "true" || cEl.classList?.contains("last-char") || lastC && (cEl.contains(lastC) || lastC.contains(cEl)));
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
      const charDone = !lastC || !!parent._charDone;
      if (charDone && allEmbedsDone) {
        if (parent._embedTimeout) {
          clearTimeout(parent._embedTimeout);
          parent._embedTimeout = null;
        }
        const doCleanup = () => {
          if (!parent.classList.contains(DX_ANIM.TYPED)) {
            if (typeof parent.markTyped === "function") {
              parent.markTyped();
            } else {
              DxTyping.prototype.markTyped.call(parent);
            }
          }
        };
        if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
          try {
            const handle = window.requestIdleCallback(doCleanup, { timeout: 300 });
            if (handle === void 0) doCleanup();
          } catch (e) {
            doCleanup();
          }
        } else {
          doCleanup();
        }
      } else if (charDone) {
        if (!parent._embedTimeout) {
          parent._embedTimeout = setTimeout(() => {
            parent._embedTimeout = null;
            const doCleanup = () => {
              if (!parent.classList.contains(DX_ANIM.TYPED)) {
                if (typeof parent.markTyped === "function") {
                  parent.markTyped();
                } else {
                  DxTyping.prototype.markTyped.call(parent);
                }
              }
            };
            if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
              try {
                const handle = window.requestIdleCallback(doCleanup, { timeout: 300 });
                if (handle === void 0) doCleanup();
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
      const res = unpackTemplate(this);
      if (res) this.classList.add(DX_ANIM.TYPING);
      return res;
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
    if (!el2?.querySelector || el2.classList.contains(DX_ANIM.TYPED)) return;
    const closedDetails = !el2.closest("summary") && el2.closest("details:not([open])");
    if (closedDetails) return;
    if (el2.querySelector(":scope > template")) {
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
        details.querySelectorAll("dx-type-sda, dx-type").forEach((typeEl) => {
          if (!typeEl.classList.contains(DX_ANIM.TYPED)) {
            unpackTemplate(typeEl);
            typeEl.classList.add(DX_ANIM.TYPING);
          }
        });
        details.querySelectorAll("dx-counter, dx-number").forEach((child) => {
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
        if (target.classList?.contains("c-ui-num")) return;
        if (target.classList?.contains("last-char") || target.hasAttribute?.("last-char") || target.getAttribute?.("data-last") === "true") {
          onTypewriterEnd(target, e);
        } else {
          if (!this._lastC) {
            this._lastC = this.querySelector('t [data-last="true"], t .last-char, [data-last="true"], .last-char');
            if (!this._lastC) {
              const allC = this.querySelectorAll("i:not(.c-ui-num)");
              this._lastC = allC.length ? allC[allC.length - 1] : null;
            }
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
        if (isElementHidden(el2)) return;
        removeFromIdleQueue(el2);
        unpackTemplate(el2);
        el2.classList.add(DX_ANIM.TYPING);
      });
      queueIdleUnpack(this, (el2) => {
        prepareTemplateContent(el2);
      });
    }
    _onAnimEnd = (e) => {
      if (e.animationName === DX_ANIM.KF_TYPE_IN) {
        const target = e.target;
        if (target.classList?.contains("c-ui-num")) return;
        if (target.classList?.contains("last-char") || target.hasAttribute?.("last-char") || target.getAttribute?.("data-last") === "true") {
          onTypewriterEnd(target, e);
        } else {
          if (!this._lastC) {
            this._lastC = this.querySelector('t [data-last="true"], t .last-char, [data-last="true"], .last-char');
            if (!this._lastC) {
              const allC = this.querySelectorAll("i:not(.c-ui-num)");
              this._lastC = allC.length ? allC[allC.length - 1] : null;
            }
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
  var REVEAL_CONTAINER_SEL = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
  var DxReveal = class extends DxRevealing {
    connectedCallback() {
      if (this.isRevealed) return;
      this._syncTimingAttributes();
      const typeReady = this.closest("dx-type-ready, .dx-type-ready");
      if (!typeReady) {
        observeIO(this, (el2) => {
          unpackTemplate(el2);
          el2.classList.add(DX_ANIM.REVEALING);
          el2.querySelectorAll("dx-counter, dx-number").forEach((child) => {
            if (typeof child._checkAndTrigger === "function") {
              if (child.closest(REVEAL_CONTAINER_SEL) === el2) {
                child._inViewport = true;
                child._parentReady = true;
                child._checkAndTrigger();
              }
            }
          });
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
  var REVEAL_CONTAINER_SEL2 = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
  var DxRevealSda = class extends DxRevealing {
    connectedCallback() {
      if (this.isRevealed) return;
      this._syncTimingAttributes();
      this._triggerChildren = () => {
        this.querySelectorAll("dx-counter, dx-number, dx-type-sda, dx-type").forEach((child) => {
          const closedDetails = !child.closest("summary") && child.closest("details:not([open])");
          if (closedDetails && this.contains(closedDetails)) return;
          const hiddenParent = child.closest(".hidden, [hidden], .favorite-product__button--saved");
          if (hiddenParent && this.contains(hiddenParent) && !hiddenParent.closest(".favorite-product--saved")) return;
          if (typeof child._checkAndTrigger === "function") {
            if (child.closest(REVEAL_CONTAINER_SEL2) === this) {
              child._inViewport = true;
              child._parentReady = true;
              child._checkAndTrigger();
            }
          }
          const tag = (child.tagName || "").toUpperCase();
          if (tag === "DX-TYPE-SDA" || tag === "DX-TYPE") {
            if (!child.classList.contains(DX_ANIM.TYPED)) {
              unpackTemplate(child);
              child.classList.add(DX_ANIM.TYPING);
            }
          }
        });
      };
      observeIO(this, (el2) => {
        removeFromIdleQueue(el2);
        unpackTemplate(el2);
        el2.classList.add(DX_ANIM.REVEALING);
        this._triggerChildren();
      });
      queueIdleUnpack(this, (el2) => {
        prepareTemplateContent(el2);
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
      if (!this.classList.contains("dx-type-ready")) {
        requestAnimationFrame(() => {
          this.classList.add("dx-type-ready");
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
  var REVEAL_PARENT_SEL = "dx-reveal-sda, dx-reveal, .reveal-sda, .reveal, ui-reveal-sda, ui-reveal";
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
      const inST = typeof this.closest === "function" ? !!this.closest("s-t") : false;
      if (inST) {
        this.makeStatic();
        this.innerHTML = this.getStaticHTML();
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
      const parentChar = this.closest("i");
      const parentReveal = this.closest(REVEAL_PARENT_SEL);
      const parentActionBar = this.closest(".action-bar, .action-bar-wrapper");
      if (parentActionBar) {
        const isAbShowing = !!this.closest(".show-action-bar, .showing-action-bar") || typeof document !== "undefined" && document.body && (document.body.classList.contains("show-action-bar") || document.body.classList.contains("showing-action-bar"));
        if (!isAbShowing) {
          return false;
        }
        this._inViewport = true;
        this._parentReady = true;
        return true;
      }
      if (!parentChar && !parentReveal) {
        this._parentReady = true;
        return Boolean(this._inViewport);
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
      if (this.hasAttribute && this.hasAttribute("duration")) {
        const parsed = parseFloat(this.getAttribute("duration"));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const t = parseFloat(this.style?.getPropertyValue?.("--t") || "") || parseFloat(typeof this.closest === "function" ? this.closest('[style*="--t"]')?.style?.getPropertyValue?.("--t") : 0) || 0;
      return t > 0 ? t : 600;
    }
    _checkAndTrigger() {
      const ready = this.isReadyToAnimate();
      if (!ready) return;
      const d = parseFloat(this.style?.getPropertyValue?.("--d") || "") || parseFloat(typeof this.closest === "function" ? this.closest('[style*="--d"]')?.style?.getPropertyValue?.("--d") : 0) || 0;
      const delay = d > 0 ? d : typeof this.closest === "function" && this.closest(REVEAL_PARENT_SEL) ? 100 : 0;
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
      const isStatic = this.classList && this.classList.contains("data-static") || this.isStatic || inST;
      const targetVal = this._targetValue !== void 0 && !isNaN(this._targetValue) && this._targetValue !== 0 ? this._targetValue : parseFloat(this.getAttribute("percent")) || this.getNumericValue() || 0;
      this._targetValue = targetVal;
      const hasSsr = typeof this.querySelector === "function" && Boolean(this.querySelector(".ui-num, .dx-num-wrap"));
      const parentChar = typeof this.closest === "function" ? this.closest("i") : null;
      const parentReveal = typeof this.closest === "function" ? this.closest(REVEAL_PARENT_SEL) : null;
      const parentActionBar = typeof this.closest === "function" ? this.closest(".action-bar, .action-bar-wrapper") : null;
      const hasParent = Boolean(parentChar || parentReveal || parentActionBar);
      if (isStatic) {
        this._value = targetVal;
        this._animationStarted = true;
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
      }
      this._inViewport = false;
      if (isStatic) {
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
        if (parentReveal.classList && (parentReveal.classList.contains(DX_ANIM.REVEALED) || parentReveal.classList.contains(DX_ANIM.REVEALING) || parentReveal.classList.contains("revealed") || parentReveal.classList.contains("revealing") || parentReveal.hasAttribute && parentReveal.hasAttribute("data-static"))) {
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
      if (typeof this.removeAttribute === "function") this.removeAttribute("data-static");
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
  var TYPE_PARENT_SEL2 = "dx-type-sda, dx-type, .type-sda, .type, ui-type, ui-type-sda";
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
      const twEmbed = this.classList.contains("tw-embed") || !!this.closest("dx-type, dx-type-sda, .type, .type-sda, ui-type, ui-type-sda");
      if (twEmbed) {
        const checkEmbedReady = () => {
          if (!this.isConnected || this._animDone) return;
          const dCount = this.querySelectorAll("d[data-seq]").length;
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
        const delay = parseFloat(this.style.getPropertyValue("--d")) || 0;
        setTimeout(() => {
          if (!this._animDone && this.isConnected) {
            this._animDone = true;
            onTypewriterEnd(this);
          }
        }, delay + 1200);
      } else {
        const setupStandalone = () => {
          if (!this.isConnected || this._animDone || this.classList.contains("data-static")) return;
          const digits = this.querySelectorAll("d[data-seq]");
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
              setTimeout(() => {
                if (!this._animDone && this.isConnected) {
                  this._animDone = true;
                  this.makeStatic();
                }
              }, 2500);
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
      if (!target || target.tagName !== "D" && !target.classList?.contains("odometer-ribbon-inner")) return;
      e.stopPropagation();
      if (!this._digitCount) {
        const dCount = this.querySelectorAll("d[data-seq]").length;
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
      let st = this.querySelector("s-t");
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
        this.innerHTML = `<s-t>${formattedFull}</s-t><span class="dx-num-wrap">${pfxHtml}${bHtml}${mHtml}${kHtml}${uHtml}${decHtml}${sfxHtml}</span>`;
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
    _updateCounterVars(currentVal) {
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
        if (this._elB.style) this._elB.style.setProperty("--dxc-b", bStr || "0");
      }
      if (this._elM) {
        const mStr = hasM ? hasB ? String(c.m).padStart(3, "0") : String(c.m) : "";
        if (this._elM.textContent !== mStr) this._elM.textContent = mStr;
        if (this._elM.style) this._elM.style.setProperty("--dxc-m", mStr || "0");
      }
      if (this._elK) {
        const kStr = hasK ? hasM ? String(c.k).padStart(3, "0") : String(c.k) : "";
        if (this._elK.textContent !== kStr) this._elK.textContent = kStr;
        if (this._elK.style) this._elK.style.setProperty("--dxc-k", kStr || "0");
      }
      if (this._elU) {
        const uStr = hasK ? String(c.u).padStart(3, "0") : String(c.u);
        if (this._elU.textContent !== uStr) this._elU.textContent = uStr;
        if (this._elU.style) this._elU.style.setProperty("--dxc-u", uStr || "0");
      }
      if (this._elDec) {
        const decStr = hasDec ? `${radix}${String(c.dec).padStart(2, "0")}` : "";
        if (this._elDec.textContent !== decStr) this._elDec.textContent = decStr;
        if (this._elDec.style) this._elDec.style.setProperty("--dxc-dec", String(c.dec));
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
      const setDisp = (el2, v) => {
        if (el2 && el2.style.display !== v) el2.style.display = v;
      };
      setDisp(this._elB, hasB ? "inline" : "none");
      setDisp(this._elM, hasM ? "inline" : "none");
      setDisp(this._elK, hasK ? "inline" : "none");
      setDisp(this._elDec, hasDec ? "inline" : "none");
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
        this._updateCounterVars(targetValue);
        this.setAccessibility(targetValue);
        unregisterRAF(this);
      } else {
        const progress = elapsed / duration;
        const easeProgress = progress * (2 - progress);
        this._value = startValue + (targetValue - startValue) * easeProgress;
        this._updateCounterVars(this._value);
      }
    }
    animateTo(targetValue, duration) {
      if (typeof this.removeAttribute === "function") this.removeAttribute("data-static");
      this._targetValue = targetValue;
      this._animStartValue = this._value !== void 0 && !isNaN(this._value) ? this._value : 0;
      this._animDuration = duration;
      this._animStartTime = null;
      this._lastTickTime = null;
      this.classList.add("ui-number-running");
      this._updateCounterVars(this._animStartValue);
      registerRAF(this);
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
        num.removeEventListener("transitionend", this._onAnimEndBound);
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
      const animDuration = duration !== void 0 && duration !== null ? duration : this.getDuration() || 600;
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
      const st = this.querySelector("s-t");
      if (st) st.textContent = this.formatValue(parsedValue);
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
        this._updateCounterVars(parsedValue);
        this.setAccessibility(parsedValue);
      }
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
