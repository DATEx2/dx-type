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
    constructor() {
        super();
        if (typeof document !== 'undefined' && document.body?.classList?.contains('dx-type-record')) {
            if (this.innerHTML) this._pristineHTML = this.innerHTML;
        }
    }

    /**
     * Unpack a direct <template> child, replacing all children with template content.
     * Returns true if a template was unpacked, false otherwise.
     */
    unpackTemplate() {
        if (!this._pristineHTML && typeof document !== 'undefined' && document.body?.classList?.contains('dx-type-record')) {
            this._pristineHTML = this.innerHTML;
        }
        const tpl = this.querySelector(':scope > template');
        if (tpl && tpl.content) {
            tpl.replaceWith(tpl.content);
            this.classList.add('type-active');
            return true;
        }
        return false;
    }

    replay() {
        if (this._pristineHTML) {
            this._cleanedUp = false;
            this._typed = 0;
            this.classList.remove('TYPED', 'TYPING', 'type-active', 'REVEALED');
            this.innerHTML = this._pristineHTML;
            this.unpackTemplate();
            return true;
        }
        return false;
    }
}

// ─── Micro HTML Builders (eliminates repetitive template literals & closing tags) ───
export const el = (tag, cls, content = '', extra = '') =>
    content !== undefined && content !== null && content !== ''
        ? `<${tag}${cls ? ` class="${cls}"` : ''}${extra ? ` ${extra}` : ''}>${content}</${tag}>`
        : '';

export const span = (cls, content, extra) => el('span', cls, content, extra);

// ─── Custom Element Definition Helper ─────────────────────────────────────────
export const defCustomElement = (tag, cls) => {
    if (rootWin?.customElements && typeof rootWin.HTMLElement !== 'undefined') {
        if (!rootWin.customElements.get(tag)) {
            try {
                rootWin.customElements.define(tag, cls);
            } catch (e) {
                // If constructor is already registered under a primary tag, subclass it for the alias tag
                try {
                    rootWin.customElements.define(tag, class extends cls {});
                } catch {}
            }
        }
    }
};

