// src/server/index.js — Server-side (SSR) utilities for @datex2/dx-type.

export const VERSION = '0.1.0';

/**
 * Format a number according to format parameters.
 */
export function formatNumber(val, type = 'int', comma = ',', prefix = '', suffix = '') {
    const num = parseFloat(val) || 0;
    let formatted = '';

    if (type === 'int' || type.startsWith('int-') || type === 'number' || type.startsWith('number-')) {
        const isFloat = type === 'float';
        if (isFloat) {
            formatted = num.toFixed(1).replace('.', comma);
        } else {
            const intVal = Math.round(num);
            const str = intVal.toString();
            // Thousands separator
            formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }
    } else {
        formatted = num.toString().replace('.', comma);
    }

    const pfx = prefix ? `${prefix}${prefix.endsWith(' ') ? '' : ' '}` : '';
    const sfx = suffix ? `${suffix.startsWith(' ') ? '' : ' '}${suffix}` : '';
    return `${pfx}${formatted}${sfx}`;
}

/**
 * Generate 3D ribbon markup for <dx-odometer>.
 */
export function generateRibbonHtml(numericValue, type = 'int', comma = ',', prefix = '', suffix = '') {
    const formatted = formatNumber(numericValue, type, comma, prefix, suffix);
    const numberPartMatch = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formatted);
    const prefixText = (numberPartMatch?.[1] || '').trim();
    const mainDigits = numberPartMatch?.[2] || '';
    const radixMark = numberPartMatch?.[3] || '';
    const decimalDigits = numberPartMatch?.[4] || '';
    const suffixText = (numberPartMatch?.[5] || '').trim();

    const formattedNumberStr = mainDigits + radixMark + decimalDigits;
    let odoInsideHtml = '';

    for (let i = 0; i < formattedNumberStr.length; i++) {
        const char = formattedNumberStr[i];
        if (char >= '0' && char <= '9') {
            const digitVal = parseInt(char, 10);
            let ribbonValuesHtml = '';
            let totalItems = 0;
            let finalIndex = 0;

            if (digitVal === 0 && formattedNumberStr.length > 1) {
                for (let j = 0; j <= 10; j++) {
                    const val = j % 10;
                    const lastClass = (j === 10) ? ' odometer-last-value' : '';
                    const firstClass = (j === 0) ? ' odometer-first-value' : '';
                    ribbonValuesHtml += `<span class="odometer-value${firstClass}${lastClass}">${val}</span>`;
                }
                totalItems = 11;
                finalIndex = 10;
            } else {
                for (let j = 0; j <= digitVal; j++) {
                    const lastClass = (j === digitVal) ? ' odometer-last-value' : '';
                    const firstClass = (j === 0) ? ' odometer-first-value' : '';
                    ribbonValuesHtml += `<span class="odometer-value${firstClass}${lastClass}">${j}</span>`;
                }
                totalItems = digitVal + 1;
                finalIndex = digitVal;
            }

            const finalPosPercent = -((finalIndex / totalItems) * 100).toFixed(4);
            const ribbonStyle = `style="--initial-pos: 0%; --final-pos: ${finalPosPercent}%; --digit-i: ${i};"`;

            odoInsideHtml += `<span class="odometer-digit">` +
                `<span class="odometer-digit-spacer">${char}</span>` +
                `<span class="odometer-digit-inner">` +
                    `<span class="odometer-ribbon">` +
                        `<span class="odometer-ribbon-inner" data-final-pos="${finalPosPercent}%" ${ribbonStyle}>` +
                            `${ribbonValuesHtml}` +
                        `</span>` +
                    `</span>` +
                `</span>` +
            `</span>`;
        } else {
            odoInsideHtml += `<span class="odometer-formatting-mark">${char}</span>`;
        }
    }

    const pfxHtml = prefixText ? `<span class="ui-pfx">${prefixText} </span>` : '';
    const sfxHtml = suffixText ? `<span class="ui-sfx"> ${suffixText}</span>` : '';

    return `${pfxHtml}<span class="ui-odo"><span class="odometer odometer-theme-datex2"><span class="odometer-inside">${odoInsideHtml}</span></span></span>${sfxHtml}`;
}

/**
 * Generate <dx-number> SSR markup.
 */
export function ssrDxNumber(numericValue, formattedText, cls = '', type = 'number') {
    if (!numericValue && numericValue !== 0) return '';
    const m = /(.*?-?)(\d(?:[\d\s]*\d)?)([,.]?)(\d*)(.*)/.exec(formattedText || String(numericValue));
    const number = parseInt((m?.[2] || '0').replace(/\s/g, ''), 10);
    const decimal = parseInt((m?.[3] && m?.[4] ? m[4] : '0').padEnd(2, '0').substring(0, 2), 10);
    const comma = m?.[3] || '';
    const rawSuffix = m?.[5] || '';
    const suffix = rawSuffix === ' €' ? ' €' : rawSuffix.trim();
    const percent = number + decimal / 100;

    let computedType = type || 'number';
    if (!comma && (computedType === 'number' || computedType === 'int')) {
        computedType = 'int';
    }
    if (computedType === 'number' || computedType === 'int' || computedType.startsWith('number-') || computedType.startsWith('int-')) {
        const baseType = computedType.split('-')[0];
        computedType = baseType + (number >= 1e6 ? '-millions' : number >= 1e3 ? '-thousands' : '');
    }
    const prefixText = (m?.[1] || '').trim();
    const cleanText = number + (comma ? comma + (m?.[4] || '00') : '');
    const classAttr = cls ? ` class="${cls}"` : '';

    return `<dx-number${classAttr} type="${computedType}" percent="${percent}" prefix="${prefixText || ''}" suffix="${suffix || ''}" comma="${comma}">${cleanText}</dx-number>`;
}

/**
 * Generate <dx-odometer> SSR markup.
 */
export function ssrDxOdometer(numericValue, options = {}) {
    const {
        type = 'int',
        comma = ',',
        prefix = '',
        suffix = '',
        className = '',
        twContext = false
    } = options;

    const safePrefix = prefix.trim();
    const safeSuffix = suffix.trim();
    const safeAttrPrefix = safePrefix.replace(/"/g, '&quot;');
    const safeAttrSuffix = safeSuffix.replace(/"/g, '&quot;');
    const prefixAttr = safePrefix ? ` prefix="${safeAttrPrefix}"` : '';
    const suffixAttr = safeSuffix ? ` suffix="${safeAttrSuffix}"` : '';
    const commaAttr = comma ? ` comma="${comma}"` : '';
    const typeAttr = ` type="${type}"`;
    const classStr = twContext ? `tw-embed ${className}`.trim() : className;
    const classAttr = classStr ? ` class="${classStr}"` : '';

    const innerHtml = generateRibbonHtml(numericValue, type, comma, safePrefix, safeSuffix);
    const cleanNumber = String(numericValue);
    const ariaLabel = `${safePrefix ? safePrefix + ' ' : ''}${cleanNumber}${safeSuffix ? ' ' + safeSuffix : ''}`.trim().replace(/"/g, '&quot;');

    return `<dx-odometer${classAttr}${typeAttr} percent="${numericValue}"${prefixAttr}${suffixAttr}${commaAttr} aria-label="${ariaLabel}" aria-hidden="true">${innerHtml}</dx-odometer>`;
}

function wrapHyphenatedWords(html) {
    if (!html || typeof html !== 'string') return '';
    return html.split(/(<[^>]+>)/g).map(part => {
        if (part.startsWith('<')) return part;
        return part.replace(/(?:^|\s)([\p{L}\p{N}]+-[\p{L}\p{N}-]+)(?=\s|$|[.,;:!?])/gu, (match, word) => {
            return match.replace(word, `<span class="word">${word}</span>`);
        });
    }).join('');
}

function splitChars(str) {
    return str.match(/&[a-z0-9]+;|./gu) || [];
}

/**
 * Tokenize HTML text into <w><c> structure for typewriter rendering.
 * @param {string} html — Raw or nested HTML content
 * @param {object} options — { duration, delay, offset }
 * @returns {object} { html, cleanText, totalUnits, speed, duration, delay, style }
 */
export function tokenize(html, options = {}) {
    if (!html) return { html: '', cleanText: '', totalUnits: 0, speed: 40, duration: 0, delay: 0, style: '' };

    const duration = Number(options.duration ?? options.t ?? options.time ?? 580);
    const delay = Number(options.delay ?? options.d ?? 0);
    const offset = Number(options.offset ?? options.b ?? 0);

    let processed = html.replace(/(<[^>]+>)|(\s*·\s*)/g, (match, tag) => {
        if (tag) return tag;
        return ' <span class="bullet-dot">·</span> ';
    });

    const cleanText = processed
        .replace(/<(?:ui|dx)-odometer[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/(?:ui|dx)-odometer>/gi, '$1')
        .replace(/<(?:ui|dx)-number[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/(?:ui|dx)-number>/gi, '$1')
        .replace(/<(?:ui|dx)-number[^>]*>([\s\S]*?)<\/(?:ui|dx)-number>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
        .trim().replace(/\s+/g, ' ');

    const tokens = [];
    const tokenRegex = /(<[^>]+>)|(&[a-z0-9]+;)|([^<&]+)/gi;
    let tokenMatch;
    while ((tokenMatch = tokenRegex.exec(processed)) !== null) {
        if (tokenMatch[1]) tokens.push({ type: 'tag', value: tokenMatch[1] });
        else if (tokenMatch[2]) tokens.push({ type: 'entity', value: tokenMatch[2] });
        else if (tokenMatch[3]) tokens.push({ type: 'text', value: tokenMatch[3] });
    }

    let result = '';
    let charIdx = 1;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'tag') {
            if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(token.value)) {
                const wordStart = charIdx;
                charIdx += 1;

                let compHTML = token.value;
                let depth = 1;
                while (i + 1 < tokens.length && depth > 0) {
                    i++;
                    compHTML += tokens[i].value;
                    if (tokens[i].type === 'tag') {
                        if (/^<(?:dx|ui)-(?:number|odometer)\b/i.test(tokens[i].value)) depth++;
                        else if (/^<\/(?:dx|ui)-(?:number|odometer)>/i.test(tokens[i].value)) depth--;
                    }
                }
                result += `<w style="--w:${wordStart - 1};--N:1"><c class="c-ui-num">${compHTML}</c></w>`;
            } else {
                result += token.value;
            }
        } else if (token.type === 'entity') {
            result += `<w style="--w:${charIdx - 1};--N:1"><c>${token.value}</c></w>`;
            charIdx++;
        } else {
            const parts = token.value.split(/(\s+)/);
            for (let j = 0; j < parts.length; j++) {
                const part = parts[j];
                if (/^\s+$/.test(part)) {
                    result += part;
                    charIdx += 1;
                } else if (part.length > 0) {
                    let punct = '';
                    if (i + 1 < tokens.length && tokens[i + 1].type === 'text') {
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

                    const cTags = wordChars.map(() => { charIdx++; return `<c>${wordChars[charIdx - wordStart - 1]}</c>`; }).join('');
                    const pTags = punctChars.map((ch) => { charIdx++; return `<c>${ch}</c>`; }).join('');

                    const wClass = (part.includes('-') || punct.includes('-')) ? ' class="word"' : '';
                    result += `<w${wClass} style="--w:${wordStart - 1};--N:${n}">${cTags}${pTags}</w>`;
                }
            }
        }
    }

    const lastC = result.lastIndexOf('<c');
    if (lastC !== -1) {
        result = result.slice(0, lastC + 2) + ' data-last="true" onanimationend="onTypewriterEnd(this)"' + result.slice(lastC + 2);
    }

    const totalUnits = charIdx + 2;
    const speed = duration / Math.max(1, totalUnits);
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

/**
 * Generate full SSR markup for <dx-type> or <dx-type-sda>.
 * @param {string} content — Raw HTML or plain text
 * @param {object} options — { duration, delay, offset, tagName, isSda, ariaLabel, className }
 * @returns {string} Fully formatted HTML string
 */
export function ssrDxType(content, options = {}) {
    const tagName = options.tagName || (options.isSda ? 'dx-type-sda' : 'dx-type');
    const isSda = tagName === 'dx-type-sda' || !!options.isSda;
    const res = tokenize(content, options);

    const safeAria = (options.ariaLabel || res.cleanText || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const ariaAttr = safeAria ? ` aria-label="${safeAria}"` : '';
    const classAttr = options.className ? ` class="${options.className}"` : '';
    const animStartAttr = isSda ? ' onanimationstart="mountTypewriter(this, event)"' : '';

    if (isSda) {
        return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}${animStartAttr}><s-t>${wrapHyphenatedWords(content)}</s-t><template><t aria-hidden="true">${res.html}</t></template></${tagName}>`;
    }
    return `<${tagName}${classAttr} style="${res.style}"${ariaAttr}><t aria-hidden="true">${res.html}</t></${tagName}>`;
}
