// tests/test-dx-dom-cleanup.js — Test cleanupTypedDOM logic
import { cleanupTypedDOM } from '../src/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default async function testDxDomCleanup() {
    assert(typeof cleanupTypedDOM === 'function', 'cleanupTypedDOM must be a function');

    let templateRemoved = false;
    let stRemoved = false;

    const mockTemplate = {
        remove() { templateRemoved = true; }
    };
    const mockSt = {
        remove() { stRemoved = true; }
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
            if (sel === ':scope > s-t') return mockSt;
            if (sel === ':scope > t') return null;
            return null;
        },
        removeAttribute() {}
    };

    cleanupTypedDOM(mockEl);

    // Wait 1 macro-tick for deferred cleanup
    await new Promise(r => setTimeout(r, 10));

    assert(templateRemoved, 'cleanupTypedDOM must remove the template when present');
    assert(stRemoved, 'cleanupTypedDOM must remove s-t when present');
}
