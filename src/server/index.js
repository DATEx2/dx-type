// src/server/index.js — Server-side (SSR) utilities for @datex2/dx-type.
// Placeholder — will contain tokenizer and SSR compiler in a future iteration.

export const VERSION = '0.1.0';

/**
 * Tokenize text into <w>, <c>, <t> structure for SSR typewriter rendering.
 * @param {string} text — Raw text content
 * @returns {string} — HTML string with <t><w><c>...</c></w></t> structure
 */
export function tokenize(text) {
    if (!text) return '';
    const words = text.split(/(\s+)/);
    const nonSpaceWords = words.filter(w => !/^\s+$/.test(w) && w.length > 0);
    const totalChars = nonSpaceWords.reduce((sum, w) => sum + w.length, 0);

    let html = '<t>';
    let charIndex = 0;

    for (const segment of words) {
        if (/^\s+$/.test(segment)) {
            // Whitespace — emit as raw space
            html += segment;
            continue;
        }
        // Word with start offset --w
        const wStyle = charIndex > 0 ? ` style="--w:${charIndex}"` : '';
        html += `<w${wStyle}>`;
        for (const char of segment) {
            const isLast = (charIndex === totalChars - 1);
            const cls = isLast ? ' class="last-char"' : '';
            html += `<c${cls}>${char}</c>`;
            charIndex++;
        }
        html += '</w>';
    }
    html += '</t>';
    return html;
}
