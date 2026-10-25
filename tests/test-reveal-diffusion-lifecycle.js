// tests/test-reveal-diffusion-lifecycle.js — Verify dx-diffuse-optics sub-animation gating and deterministic completion
import {
    DxRevealSda,
    DX_ANIM,
    finishReveal
} from '../src/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testRevealDiffusionLifecycle() {
    console.log('🧪 Running test-reveal-diffusion-lifecycle...');

    // 1. Mock element setup
    const el = new DxRevealSda();
    const classes = new Set(['diffuse', 'staggered', 'dx-revealing']);
    el.classList = {
        add: (...cls) => cls.forEach(c => classes.add(c)),
        remove: (...cls) => cls.forEach(c => classes.delete(c)),
        contains: (c) => classes.has(c)
    };
    el.style = {
        setProperty: () => {},
        getPropertyValue: () => null
    };
    el.querySelectorAll = () => [];
    el.querySelector = () => null;

    let removedAnimEnd = false;
    let removedAnimCancel = false;
    el.removeEventListener = (type, handler) => {
        if (type === 'animationend') removedAnimEnd = true;
        if (type === 'animationcancel') removedAnimCancel = true;
    };

    let childrenTriggered = false;
    el._triggerChildren = () => {
        childrenTriggered = true;
    };

    // 2. Intermediate sub-animation: dx-diffuse-optics completes (200ms)
    const opticsEvent = { target: el, animationName: 'dx-diffuse-optics', stopPropagation: () => {} };
    const finishedOptics = finishReveal(el, opticsEvent);
    assert(finishedOptics === false, 'finishReveal must return false for intermediate dx-diffuse-optics sub-animation');
    assert(el.classList.contains(DX_ANIM.REVEALING), 'Element must stay in dx-revealing state during dx-diffuse-optics completion');
    assert(!el.classList.contains(DX_ANIM.REVEALED), 'Element must NOT be marked dx-revealed on dx-diffuse-optics');
    assert(!childrenTriggered, 'Children must not be triggered prematurely if finishReveal returned false');

    // Simulate _onAnimEnd with optics event
    el._onAnimEnd(opticsEvent);
    assert(!removedAnimEnd, '_onAnimEnd must NOT remove event listeners when finishReveal returned false for intermediate optics');

    // 3. Terminal animation: dx-reveal-diffuse completes (650ms)
    const diffuseEvent = { target: el, animationName: 'dx-reveal-diffuse', stopPropagation: () => {} };
    el._onAnimEnd(diffuseEvent);

    assert(el.classList.contains(DX_ANIM.REVEALED), 'Element must be marked dx-revealed when dx-reveal-diffuse completes');
    assert(!el.classList.contains(DX_ANIM.REVEALING), 'Element must have dx-revealing removed when dx-reveal-diffuse completes');
    assert(childrenTriggered, 'Children must be triggered upon terminal reveal completion');
    assert(removedAnimEnd, '_onAnimEnd must remove animationend listener upon successful finishReveal');
    assert(removedAnimCancel, '_onAnimEnd must remove animationcancel listener upon successful finishReveal');

    console.log('  ✅ PASS: dx-diffuse-optics properly gated and dx-reveal-diffuse deterministically completes lifecycle');
}
