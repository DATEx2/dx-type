// tests/test-dx-number-typewriter-cleanup.js — Verify DxNumber typewriter embed lifecycle and cleanup
import { onTypewriterEnd, DX_ANIM } from '../src/client/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testDxNumberTypewriterCleanup() {
    // 1. Simulare container parent dx-type-sda
    let markedTyped = false;
    const parentEl = {
        tagName: 'DX-TYPE-SDA',
        classList: {
            _classes: new Set([DX_ANIM.TYPING]),
            contains(cls) { return this._classes.has(cls); },
            add(cls) { this._classes.add(cls); },
            remove(cls) { this._classes.delete(cls); }
        },
        querySelector(sel) {
            if (sel === ':scope > template') return null;
            if (sel.includes('data-last="true"') || sel.includes('.last-char')) return lastCharEl;
            if (sel.includes('dx-t')) return tLayerEl;
            return null;
        },
        querySelectorAll(sel) {
            return [];
        },
        markTyped() {
            markedTyped = true;
            this.classList.remove(DX_ANIM.TYPING);
            this.classList.add(DX_ANIM.TYPED);
        }
    };

    // 2. Child nodes: regular char and embedded dx-number
    const lastCharEl = {
        tagName: 'DX-C',
        getAttribute(attr) { return attr === 'data-last' ? 'true' : null; },
        classList: { contains(cls) { return cls === 'last-char'; } },
        closest(sel) { return parentEl; }
    };

    const numEmbedEl = {
        tagName: 'DX-NUMBER',
        _animDone: false,
        isStatic: false,
        classList: { contains(cls) { return cls === 'tw-embed'; } },
        closest(sel) { return parentEl; }
    };

    const tLayerEl = {
        querySelector(sel) {
            if (sel.includes(':not(.c-ui-num)')) return lastCharEl;
            return null;
        },
        querySelectorAll(sel) {
            if (sel.includes('dx-number')) return [numEmbedEl];
            return [];
        }
    };

    // Pasul A: Ultimul caracter text termină primul
    onTypewriterEnd(lastCharEl);
    assert(markedTyped === false, 'Parent must NOT mark typed while dx-number is still animating');

    // Pasul B: dx-number își termină animația și apelează onTypewriterEnd
    numEmbedEl._animDone = true;
    onTypewriterEnd(numEmbedEl);
    assert(markedTyped === true, 'Parent MUST mark typed when both last character and embedded dx-number complete');
}
