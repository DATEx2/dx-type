// src/server/index.js
var VERSION = "0.1.0";
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
  const pfx = prefix ? `${prefix}${prefix.endsWith(" ") ? "" : " "}` : "";
  const sfx = suffix ? `${suffix.startsWith(" ") ? "" : " "}${suffix}` : "";
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
  let formattedStartStr = null;
  if (startValue !== null && startValue !== void 0 && startValue !== "") {
    const startNumeric = parseFloat(startValue);
    if (!isNaN(startNumeric)) {
      const startFormatted = formatNumber(startNumeric, type, comma, prefix, suffix);
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
        const isLeadingZero = !isYear && curDigitIdx < totalDigits - 1 && drumValues[0] === 0;
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
      const seqStr = drumValues.map((v) => v === " " ? " " : v).join("&#10;");
      digitsHtml += `<d data-seq="${seqStr}" style="--p:${finalPosPercent}%;--r:${digitR}">${char}</d>`;
    } else {
      digitsHtml += `<span class="ui-radix">${char}</span>`;
    }
  }
  const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefix.endsWith(" ") ? "" : " "}</span>` : "";
  const sfxHtml = suffixText ? `<span class="ui-sfx">${suffix.startsWith(" ") ? "" : " "}${suffixText}</span>` : "";
  return `${pfxHtml}<b>${digitsHtml}</b>${sfxHtml}`;
}
function ssrDxNumber(numericValue, formattedText, cls = "", type = "number") {
  return ssrDxCounter(numericValue, formattedText, cls, type);
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
  const cleanNumber = String(numericValue);
  const formattedText = formatNumber(numericValue, type, comma, safePrefix, safeSuffix);
  const ariaLabel = formattedText.replace(/·/g, "").replace(/\s+/g, " ").trim().replace(/"/g, "&quot;");
  const ribbonHtml = generateRibbonHtml(numericValue, type, comma, safePrefix, safeSuffix, options.start);
  return `<dx-odometer${classAttr}${typeAttr} percent="${numericValue}"${prefixAttr}${suffixAttr}${commaAttr} aria-label="${ariaLabel}" aria-hidden="true"><s-t>${formattedText}</s-t>${ribbonHtml}</dx-odometer>`;
}
function splitChars(str) {
  return str.match(/&[a-z0-9]+;|./gu) || [];
}
function tokenize(html, options = {}) {
  if (!html) return { html: "", cleanText: "", totalUnits: 0, speed: 40, duration: 0, delay: 0, style: "" };
  const duration = Number(options.duration ?? options.t ?? options.time ?? 580);
  const delay = Number(options.delay ?? options.d ?? 0);
  const offset = Number(options.offset ?? options.b ?? 0);
  const cleanText = html.replace(/<(?:ui|dx)-odometer[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/(?:ui|dx)-odometer>/gi, "$1").replace(/<(?:ui|dx)-number[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/(?:ui|dx)-number>/gi, "$1").replace(/<(?:ui|dx)-number[^>]*>([\s\S]*?)<\/(?:ui|dx)-number>/gi, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').trim().replace(/\s+/g, " ");
  const tokens = [];
  const tokenRegex = /(<[^>]+>)|(&[a-z0-9]+;)|([^<&]+)/gi;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(html)) !== null) {
    if (tokenMatch[1]) tokens.push({ type: "tag", value: tokenMatch[1] });
    else if (tokenMatch[2]) tokens.push({ type: "entity", value: tokenMatch[2] });
    else if (tokenMatch[3]) tokens.push({ type: "text", value: tokenMatch[3] });
  }
  let result = "";
  let charIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "tag") {
      if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(token.value)) {
        const wordStart = charIdx;
        charIdx += 1;
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
        result += `<w style="--w:${wordStart};--N:1"><c class="c-ui-num">${compHTML}</c></w>`;
      } else {
        result += token.value;
      }
    } else if (token.type === "entity") {
      result += `<w style="--w:${charIdx};--N:1"><c>${token.value}</c></w>`;
      charIdx++;
    } else {
      const parts = token.value.split(/(\s+)/);
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (/^\s+$/.test(part)) {
          result += part;
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
          const wordStart = charIdx;
          const wordChars = splitChars(part);
          const punctChars = splitChars(punct);
          const n = wordChars.length + punctChars.length;
          const cTags = wordChars.map((ch) => {
            charIdx++;
            const cClass = ch === "\xB7" ? ' class="bullet-dot"' : "";
            return `<c${cClass}>${ch}</c>`;
          }).join("");
          const pTags = punctChars.map((ch) => {
            charIdx++;
            const pClass = ch === "\xB7" ? ' class="bullet-dot"' : "";
            return `<c${pClass}>${ch}</c>`;
          }).join("");
          const wClass = part.includes("-") || punct.includes("-") ? ' class="word"' : "";
          result += `<w${wClass} style="--w:${wordStart};--N:${n}">${cTags}${pTags}</w>`;
        }
      }
    }
  }
  const lastC = result.lastIndexOf("<c");
  if (lastC !== -1) {
    result = result.slice(0, lastC + 2) + ' data-last="true" onanimationend="return onTypewriterEnd(this, event)"' + result.slice(lastC + 2);
  }
  const totalUnits = Math.max(1, charIdx);
  const speed = duration / totalUnits;
  const style = `--b:${offset};--a:${totalUnits};--d:${delay};--t:${duration};--u:${speed.toFixed(3)}`;
  return {
    html: result,
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
  const stContent = typeof content === "string" ? content.replace(/<(?:dx|ui)-odometer\b([^>]*)>[\s\S]*?<\/(?:dx|ui)-odometer>/gi, (match, attrs) => {
    const cleanAttrs = attrs.replace(/\bdata-static(?:="[^"]*")?/gi, "").trim();
    const valMatch = attrs.match(/\bpercent=["']([^"']+)["']/i) || attrs.match(/\bvalue=["']([^"']+)["']/i);
    const sfxMatch = attrs.match(/\bsuffix=["']([^"']+)["']/i);
    const pfxMatch = attrs.match(/\bprefix=["']([^"']+)["']/i);
    const val = valMatch ? valMatch[1] : "";
    const pfx = pfxMatch ? pfxMatch[1] : "";
    const sfx = sfxMatch ? sfxMatch[1] : "";
    const cleanText = `${pfx}${val}${sfx}`.trim();
    let mergedAttrs = cleanAttrs;
    if (/\bclass=["']([^"']*)["']/i.test(mergedAttrs)) {
      mergedAttrs = mergedAttrs.replace(/\bclass=["']([^"']*)["']/i, (m, cls) => `class="${cls.trim()} data-static"`);
    } else {
      mergedAttrs = `${mergedAttrs} class="data-static"`.trim();
    }
    return `<dx-odometer ${mergedAttrs}><s-t>${cleanText}</s-t></dx-odometer>`;
  }) : content;
  if (isSda) {
    return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}><s-t>${stContent}</s-t><template><t aria-hidden="true">${res.html}</t></template></${tagName}>`;
  }
  return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}><s-t>${stContent}</s-t><t aria-hidden="true">${res.html}</t></${tagName}>`;
}
function ssrDxReveal(content, options = {}) {
  const tagName = options.tagName || (options.isSda ? "dx-reveal-sda" : "dx-reveal");
  const duration = Number(options.duration ?? options.t ?? options.time ?? (options.isSda ? 500 : 600));
  const delay = Number(options.delay ?? options.d ?? 0);
  const classAttr = options.className ? ` class="${options.className}"` : "";
  const styleAttr = ` style="--d:${delay};--t:${duration}"`;
  return `<${tagName}${classAttr}${styleAttr}>${content}</${tagName}>`;
}
function ssrDxCounter(numericValue, formattedText, cls, type = "number") {
  if (!numericValue || !formattedText) return "";
  const raw = (formattedText || "").trim();
  const m = /^([^0-9]*?)(\d[\d\s.,]*\d|\d)(.*)$/.exec(raw);
  if (!m) return formattedText;
  const pfx = m[1];
  const numPart = m[2];
  let sfx = m[3] || "";
  if (sfx && !sfx.startsWith(" ") && !sfx.startsWith("\xA0") && !sfx.startsWith("$") && !sfx.startsWith("%")) {
    sfx = " " + sfx;
  }
  let radix = "";
  let decimals = "";
  let intPart = numPart;
  const decMatch = /([.,])(\d{1,3})$/.exec(numPart);
  if (decMatch) {
    radix = decMatch[1];
    decimals = decMatch[2];
    intPart = numPart.slice(0, -decMatch[0].length);
  }
  const cleanInt = intPart.replace(/[\s.,]/g, "");
  const cleanDec = decimals;
  const numericStr = (pfx.includes("-") || pfx.includes("\u2013") ? "-" : "") + cleanInt + (cleanDec ? "." + cleanDec : "");
  const percent = parseFloat(numericStr) || parseFloat(numericValue) || 0;
  type = type || "number";
  if (!radix && (type === "number" || type === "int")) {
    type = "int";
  }
  const cleanNumber = parseInt(cleanInt, 10) || 0;
  if (type === "number" || type === "int" || type.startsWith("number-") || type.startsWith("int-")) {
    const baseType = type.split("-")[0];
    type = baseType + (cleanNumber >= 1e6 ? "-millions" : cleanNumber >= 1e3 ? "-thousands" : "");
  }
  const ariaLabel = formattedText.replace(/·/g, "").replace(/\s+/g, " ").trim().replace(/"/g, "&quot;");
  const classAttr = cls ? ' class="' + cls + '"' : "";
  return "<dx-counter" + classAttr + ' type="' + type + '" percent="' + percent + '" prefix="' + pfx + '" suffix="' + sfx + '" comma="' + radix + '" style="--percent: ' + percent + ';" aria-label="' + ariaLabel + '" aria-hidden="true"><s-t>' + formattedText + "</s-t></dx-counter>";
}
export {
  VERSION,
  formatNumber,
  generateRibbonHtml,
  ssrDxCounter,
  ssrDxNumber,
  ssrDxOdometer,
  ssrDxReveal,
  ssrDxType,
  tokenize
};
//# sourceMappingURL=server.js.map
