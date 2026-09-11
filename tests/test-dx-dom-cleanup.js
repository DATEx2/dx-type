// tests/test-dx-dom-cleanup.js — Test cleanupTypedDOM logic
import { cleanupTypedDOM } from '../src/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default async function testDxDomCleanup() {
    assert(typeof cleanupTypedDOM === 'function', 'cleanupTypedDOM must be a function');

    let templateRemoved = false;
    let tRemoved = false;

    const mockTemplate = {
        remove() { templateRemoved = true; }
    };
    const mockT = {
        remove() { tRemoved = true; }
    };

    const mockEl = {
        ownerDocument: {
            createTextNode(txt) { return { textContent: txt }; }
        },
        classList: {
            contains(cls) { return cls === 'TYPED'; },
            remove() {},
            add() {}
        },
        querySelector(sel) {
            if (sel === ':scope > template') return mockTemplate;
            if (sel.includes('dx-t') || sel.includes('t')) return mockT;
            return null;
        },
        removeAttribute() {}
    };

    cleanupTypedDOM(mockEl);

    // Wait 1 macro-tick for deferred cleanup
    await new Promise(r => setTimeout(r, 10));

    assert(templateRemoved, 'cleanupTypedDOM must remove the template when present');
    assert(tRemoved, 'cleanupTypedDOM must remove t layer when present');
}
