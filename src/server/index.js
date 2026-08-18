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
    let html = '<t>';
    let charIndex = 0;

    for (const segment of words) {
        if (/^\s+$/.test(segment)) {
            // Whitespace — emit as raw space
            html += segment;
            continue;
        }
        // Word
        html += '<w>';
        for (const char of segment) {
            html += `<c style="--I:${charIndex}">${char}</c>`;
            charIndex++;
        }
        html += '</w>';
    }
    html += '</t>';
    return html;
}
