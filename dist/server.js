// src/server/index.js
var VERSION = "0.1.0";
var DX_CHAR_DURATION = 225;
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
    const hasAttachedAffix = Boolean(prefix && !prefix.endsWith(" ") || suffix && !suffix.startsWith(" "));
    formatted = hasAttachedAffix || type.includes("compact") || type.includes("year") ? str : str.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
          if (allZero) {
            if (drumValues.length === 1) {
              drumValues = [" ", 0];
            } else {
              drumValues[0] = " ";
            }
          }
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
  const prefixHasSpace = (numberPartMatch?.[1] || "").endsWith(" ") || Boolean(prefix && prefix.endsWith(" "));
  const prefixSpace = prefixHasSpace ? " " : "";
  const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText}${prefixSpace}</span>` : "";
  const hasExplicitSpace = (suffixText ? numberPartMatch?.[5] || "" : "").startsWith(" ") || Boolean(suffix && suffix.startsWith(" "));
  const sfxSpace = hasExplicitSpace ? suffixText ? " " : "" : "";
  const sfxHtml = suffixText ? `<span class="ui-sfx">${sfxSpace}${suffixText}</span>` : "";
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
  let cleanPercent = String(numericValue);
  if (type.includes("number-1dec")) {
    const parsed = parseFloat(numericValue);
    if (!isNaN(parsed)) cleanPercent = parsed.toFixed(1);
  } else if (type.includes("number-2dec")) {
    const parsed = parseFloat(numericValue);
    if (!isNaN(parsed)) cleanPercent = parsed.toFixed(2);
  }
  const formattedText = formatNumber(numericValue, type, comma, safePrefix, safeSuffix);
  const ariaLabel = formattedText.replace(/·/g, "").replace(/\s+/g, " ").trim().replace(/"/g, "&quot;");
  const ribbonHtml = generateRibbonHtml(numericValue, type, comma, safePrefix, safeSuffix, options.start);
  return `<dx-odometer${classAttr}${typeAttr} percent="${cleanPercent}"${prefixAttr}${suffixAttr}${commaAttr} aria-label="${ariaLabel}" aria-hidden="true"><dx-s>${formattedText}</dx-s>${ribbonHtml}</dx-odometer>`;
}
var RTL_CURSIVE_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function splitChars(str) {
  return [...str];
}
function groupCursiveRuns(chars) {
  const units = [];
  let idx = 0;
  while (idx < chars.length) {
    const ch = chars[idx];
    if (RTL_CURSIVE_CHAR_RE.test(ch)) {
      let run = ch;
      let len = 1;
      idx++;
      while (idx < chars.length && RTL_CURSIVE_CHAR_RE.test(chars[idx])) {
        run += chars[idx];
        len++;
        idx++;
      }
      units.push({ text: run, len });
    } else {
      units.push({ text: ch, len: 1 });
      idx++;
    }
  }
  return units;
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
  if (/[\u{1D400}-\u{1D7FF}]/u.test(html)) {
    html = html.replace(/[\u{1D400}-\u{1D7FF}]+/gu, (m) => m.normalize("NFKD"));
  }
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
          const subWords = part.includes("-") && part.length > 1 && !/^-+$/.test(part) ? part.match(/-*[^-]+-?|-+/g) || [part] : [part];
          for (let sIdx = 0; sIdx < subWords.length; sIdx++) {
            const subWord = subWords[sIdx];
            const isLastSubWord = sIdx === subWords.length - 1;
            const subPunct = isLastSubWord ? punct : "";
            const wordChars = splitChars(subWord);
            const punctChars = splitChars(subPunct);
            const isDateWord = /^DATE/i.test(subWord);
            if (isDateWord && wordChars.length >= 4 && wordChars[0] === "D" && wordChars[1] === "A" && wordChars[2] === "T" && wordChars[3] === "E") {
              wordChars[0] = "\u{1D5D7}";
              wordChars[1] = "\uE004";
              wordChars[2] = "\uE005";
              wordChars[3] = "\uE006";
              if (wordChars.length > 4 && wordChars[4] === "X" && /\d/.test(wordChars[5])) {
                wordChars[4] = "x";
              }
            } else if (isDateWord && wordChars.length > 0 && wordChars[0] === "D") {
              wordChars[0] = "\u{1D5D7}";
            }
            const cTags = groupCursiveRuns(wordChars).map((u) => {
              const tag = makeCharTag(u.text, charIdx);
              charIdx += u.len;
              return tag;
            }).join("");
            const pTags = groupCursiveRuns(punctChars).map((u) => {
              const tag = makeCharTag(u.text, charIdx);
              charIdx += u.len;
              return tag;
            }).join("");
            const wClass = subWord.includes("-") || subPunct.includes("-") ? ' class="word"' : "";
            result += `<dx-w${wClass}>${cTags}${pTags}</dx-w>`;
            const totalLen = [...subWord + subPunct].length;
            const isHyphen = subWord.includes("-") || subPunct.includes("-");
            currentWEntries().push({ len: totalLen, hyphen: isHyphen });
            const isBullet = subWord === "\xB7" || subWord === "\u2022";
            const compactOut = isBullet ? `<dx-c class="bullet-dot">${subWord}</dx-c>` : subWord + subPunct;
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
  const stTokens = stContent === content ? res : tokenize(stContent, options);
  const sdaStContent = stTokens.compactHtml || stContent;
  const wAttr = stTokens.wAttr ? ` w="${stTokens.wAttr}"` : "";
  const extraAttrs = options.attrs ? ` ${options.attrs.trim()}` : "";
  if (isSda) {
    if (options.compact && wAttr) {
      return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}${extraAttrs}><dx-s${wAttr}>${sdaStContent}</dx-s></${tagName}>`;
    }
    return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}${extraAttrs}><dx-s${wAttr}>${sdaStContent}</dx-s><template><dx-t aria-hidden="true">${res.html}</dx-t></template></${tagName}>`;
  }
  return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}${extraAttrs}><dx-s${wAttr}>${sdaStContent}</dx-s><dx-t aria-hidden="true">${res.html}</dx-t></${tagName}>`;
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
  const minH = options.minHeight ? `;min-height:${typeof options.minHeight === "number" ? `${options.minHeight}px` : options.minHeight}` : "";
  const styleAttr = ` style="--d:${delay};--t:${duration}${minH}"`;
  let extraAttrs = options.attrs ? ` ${options.attrs.trim()}` : "";
  if (options.staggerStep) extraAttrs += ` data-stagger-step="${options.staggerStep}"`;
  if (options.staggerMax) extraAttrs += ` data-stagger-max="${options.staggerMax}"`;
  const innerHtml = options.defer || options.template ? `<template>${content}</template>` : content;
  return `<${tagName}${classAttr}${styleAttr}${extraAttrs}>${innerHtml}</${tagName}>`;
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
  return "<dx-counter" + classAttr + ' type="' + type + '" percent="' + percent + '" prefix="' + pfx + '" suffix="' + sfx + '" comma="' + radix + '" style="--percent: ' + percent + ';" aria-label="' + ariaLabel + '" aria-hidden="true"><dx-s>' + formattedText + "</dx-s></dx-counter>";
}
export {
  DX_CHAR_DURATION,
  VERSION,
  formatNumber,
  generateDataO,
  generateRibbonHtml,
  ssrDxCounter,
  ssrDxNumber,
  ssrDxOdometer,
  ssrDxReveal,
  ssrDxType,
  tokenize
};
//# sourceMappingURL=server.js.map
