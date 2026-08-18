// dx-base.js — DATEx2 Base HTMLElement for all dx-* Web Components.
//
// exports: DxBase, rootWin
// used_by: src/client/components/*.js

export const rootWin = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null);
const BaseHTMLElement = rootWin?.HTMLElement || class {};

/**
 * Base class for all dx-* components.
 * Uses `display: contents` implicitly (set via CSS) so wrapping in dx-* tags
 * never affects parent Grid/Flexbox layouts.
 */
export class DxBase extends BaseHTMLElement {
    /**
     * Unpack a direct <template> child, replacing all children with template content.
     * Returns true if a template was unpacked, false otherwise.
     */
    unpackTemplate() {
        const tpl = this.querySelector(':scope > template');
        if (tpl && tpl.content) {
            this.replaceChildren(tpl.content);
            return true;
        }
        return false;
    }
}
