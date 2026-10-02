// tests/test-scroll-gate-io.js — Verify Scroll-Restoration IO Gating
import {
    observeIO,
    unobserveIO,
    observeLookaheadIO,
    unobserveLookaheadIO,
    gateIOUntil,
    flushScrollGate,
    isScrollRestored,
    getIO,
    getLookaheadIO
} from '../src/client/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default async function testScrollGateIO() {
    // Mock minimal DOM element
    const mockEl = { isConnected: true, nodeType: 1 };
    const mockEl2 = { isConnected: true, nodeType: 1 };

    let ioTriggered = false;
    let lookaheadTriggered = false;

    // Create a delayed promise to gate IO
    let resolveScroll;
    const scrollPromise = new Promise(r => { resolveScroll = r; });

    gateIOUntil(scrollPromise);
    assert(isScrollRestored() === false, 'isScrollRestored should be false while gated');

    // Register elements while gated
    observeIO(mockEl, () => { ioTriggered = true; });
    observeLookaheadIO(mockEl2, () => { lookaheadTriggered = true; });

    // In a headless Node env without global IO, observeIO would normally invoke cb immediately.
    // But while gated, cb MUST NOT be invoked!
    assert(ioTriggered === false, 'observeIO callback must not trigger while gated');
    assert(lookaheadTriggered === false, 'observeLookaheadIO callback must not trigger while gated');

    // Unobserve mockEl2 to test removal from pending queue
    unobserveLookaheadIO(mockEl2);

    // Resolve scroll restoration
    resolveScroll();
    await scrollPromise;
    // Allow microtasks / then callbacks to execute
    await new Promise(r => setTimeout(r, 10));

    assert(isScrollRestored() === true, 'isScrollRestored should be true after promise resolution');
    assert(lookaheadTriggered === false, 'unobserved mockEl2 should not have triggered');
}
