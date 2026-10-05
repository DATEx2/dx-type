// tests/test-reduced-motion.js — Verify prefers-reduced-motion IO gating & instant completion
import { isReducedMotionActive } from '../src/index.js';
import { DxOdometer } from '../src/client/components/dx-odometer.js';
import { DxTypeSda } from '../src/client/components/dx-type-sda.js';
import { DxType } from '../src/client/components/dx-type.js';
import { DxRevealSda } from '../src/client/components/dx-reveal-sda.js';
import { gateIOUntil, isScrollRestored, flushScrollGate, observeIO } from '../src/client/base/dx-scheduler.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default async function testReducedMotion() {
    const origWindow = globalThis.window;

    try {
        // ─── 1. Test isReducedMotionActive helper ──────────────────────────────
        globalThis.window = {
            matchMedia: (query) => ({
                matches: query.includes('prefers-reduced-motion: reduce')
            })
        };
        assert(isReducedMotionActive() === true, 'isReducedMotionActive should return true when prefers-reduced-motion matches');

        globalThis.window = {
            matchMedia: (query) => ({
                matches: false
            })
        };
        assert(isReducedMotionActive() === false, 'isReducedMotionActive should return false when prefers-reduced-motion does not match');

        // ─── 2. Test DxOdometer direct cleanup on prefers-reduced-motion ────────
        globalThis.window = {
            matchMedia: (query) => ({
                matches: query.includes('prefers-reduced-motion: reduce')
            })
        };

        const odo = new DxOdometer();
        const classes = new Set();
        let text = '';
        let bRemoved = false;
        let sfxRemoved = false;

        const mockB = { remove() { bRemoved = true; } };
        const mockSfx = { remove() { sfxRemoved = true; } };
        const mockDxS = { textContent: '600 W' };

        odo.classList = {
            add: (c) => classes.add(c),
            contains: (c) => classes.has(c),
            remove: (c) => classes.delete(c)
        };
        odo.getAttribute = (name) => name === 'data-o' ? ' 123456' : null;
        odo.closest = () => null;
        odo.querySelector = (sel) => {
            if (sel === 'b') return mockB;
            if (sel === '.ui-sfx') return mockSfx;
            if (sel === '.ui-pfx') return null;
            if (sel.includes('dx-s')) return mockDxS;
            return null;
        };
        Object.defineProperty(odo, 'textContent', {
            get() { return text; },
            set(val) { text = val; }
        });

        odo.connectedCallback();

        assert(odo.classList.contains('data-static'), 'DxOdometer must have data-static class added');
        assert(odo._animDone === true, 'DxOdometer._animDone must be true immediately');
        assert(bRemoved === true, 'DxOdometer must remove <b> ribbon on reduced motion');
        assert(sfxRemoved === true, 'DxOdometer must remove .ui-sfx on reduced motion');
        assert(text === '600 W', 'DxOdometer textContent must be flattened to static value (600 W)');

        // ─── 3. Test Scroll Gating: Zero FOUC before scroll is restored ─────────
        let resolveGate;
        const gatePromise = new Promise(r => { resolveGate = r; });
        gateIOUntil(gatePromise);
        assert(isScrollRestored() === false, 'isScrollRestored must be false while scroll gate is active');

        const typeSda = new DxTypeSda();
        const typeClasses = new Set();
        let tplRemoved = false;
        const mockTpl = { remove() { tplRemoved = true; } };

        typeSda.classList = {
            add: (c) => typeClasses.add(c),
            contains: (c) => typeClasses.has(c),
            remove: (c) => typeClasses.delete(c)
        };
        typeSda.closest = () => null;
        typeSda.querySelector = (sel) => {
            if (sel === ':scope > template') return mockTpl;
            return null;
        };
        typeSda.querySelectorAll = () => [];
        typeSda.getAttribute = () => null;
        typeSda.removeAttribute = () => {};
        typeSda.ownerDocument = { contains: () => true };
        typeSda.isConnected = true;

        typeSda.connectedCallback();

        // While scroll gate is active, typeSda must NOT be typed yet (preventing FOUC at scrollY = 0)
        assert(!typeSda.classList.contains('dx-typed'), 'DxTypeSda must NOT become dx-typed before scroll is restored');

        // ─── 4. After scroll is restored: Instant "tot deodată" typed at IO ─────
        resolveGate();
        await gatePromise;
        flushScrollGate();
        assert(isScrollRestored() === true, 'isScrollRestored must be true after scroll is restored');

        // Now trigger IO callback
        assert(typeSda.classList.contains('dx-typed'), 'DxTypeSda must become dx-typed instantly at IO');
        assert(tplRemoved === true, 'DxTypeSda must clean template at IO');

        // ─── 5. Test DxRevealSda instant revealed at IO ────────────────────────
        const revSda = new DxRevealSda();
        const revClasses = new Set();
        revSda.classList = {
            add: (c) => revClasses.add(c),
            contains: (c) => revClasses.has(c),
            remove: (c) => revClasses.delete(c)
        };
        revSda.getAttribute = () => null;
        revSda.querySelectorAll = () => [];
        revSda.isConnected = true;

        revSda.connectedCallback();
        assert(revSda.classList.contains('dx-revealed'), 'DxRevealSda must have dx-revealed class added at IO');

    } finally {
        flushScrollGate();
        globalThis.window = origWindow;
    }
}
