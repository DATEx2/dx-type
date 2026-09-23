// tests/test-nested-reveal-gate.js — Verify nested <dx-reveal-sda> gating & cascaded activation
import {
    DxRevealing,
    DxRevealSda,
    DX_ANIM
} from '../src/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testNestedRevealGate() {
    // 1. Check method existence on DxRevealing
    assert(typeof DxRevealing.prototype.getParentReveal === 'function', 'getParentReveal must exist on DxRevealing');
    assert(typeof DxRevealing.prototype._checkAndTrigger === 'function', '_checkAndTrigger must exist on DxRevealing');
    assert(typeof DxRevealing.prototype._startRevealing === 'function', '_startRevealing must exist on DxRevealing');
    assert(typeof DxRevealing.prototype._triggerNestedReveals === 'function', '_triggerNestedReveals must exist on DxRevealing');

    // 2. Mock DOM tree: Parent <dx-reveal-sda> with Child <dx-reveal-sda>
    const parent = new DxRevealSda();
    const child = new DxRevealSda();

    // Setup classList polyfill mock for node test environment
    const setupEl = (el, tag) => {
        el.tagName = tag.toUpperCase();
        const classes = new Set();
        el.classList = {
            add: (...cls) => cls.forEach(c => classes.add(c)),
            remove: (...cls) => cls.forEach(c => classes.delete(c)),
            contains: (c) => classes.has(c),
            toggle: (c, v) => (v ?? !classes.has(c)) ? classes.add(c) : classes.delete(c)
        };
        el.style = {
            setProperty: () => {},
            removeProperty: () => {}
        };
        el.getAttribute = () => null;
        el.querySelectorAll = () => [];
        el.querySelector = () => null;
        el.addEventListener = () => {};
        el.removeEventListener = () => {};
    };

    setupEl(parent, 'dx-reveal-sda');
    setupEl(child, 'dx-reveal-sda');

    child.parentElement = parent;
    parent.contains = (node) => node === child;
    parent.querySelectorAll = (sel) => {
        if (sel.includes('dx-reveal')) return [child];
        return [];
    };
    child.closest = (sel) => {
        if (sel.includes('dx-reveal')) return child;
        return null;
    };
    parent.closest = (sel) => {
        if (sel.includes('dx-reveal')) return parent;
        return null;
    };
    child.parentElement.closest = (sel) => {
        if (sel.includes('dx-reveal')) return parent;
        return null;
    };

    // 3. Test getParentReveal()
    assert(child.getParentReveal() === parent, 'child.getParentReveal() must return parent');
    assert(parent.getParentReveal() === null, 'parent.getParentReveal() must return null');

    // 4. Test Gating: when child enters viewport but parent is NOT revealed
    child._inViewport = true;
    child._checkAndTrigger();
    assert(!child.classList.contains(DX_ANIM.REVEALING), 'child must NOT start revealing while parent is unrevealed');
    assert(!child._isRevealingStarted, 'child._isRevealingStarted must remain false');

    // 5. Test Parent Reveal Cascade: when parent marks revealed
    parent.markRevealed();
    assert(parent.classList.contains(DX_ANIM.REVEALED), 'parent must be marked revealed');
    assert(child.classList.contains(DX_ANIM.REVEALING), 'child must be triggered and start revealing once parent is revealed');
    assert(child._isRevealingStarted, 'child._isRevealingStarted must now be true');
}
