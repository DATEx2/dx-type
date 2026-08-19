// tests/test-dx-components-hierarchy.js — Verify hierarchy & inheritance of @datex2/dx-type custom elements
import {
    DxBase,
    DxTyping,
    DxRevealing,
    DxMeter,
    DxType,
    DxTypeSda,
    DxReveal,
    DxRevealSda,
    DxTypeReady,
    DxNumber,
    DxOdometer
} from '../src/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testDxComponentsHierarchy() {
    // 1. Prototype inheritance
    assert(DxType.prototype instanceof DxTyping, 'DxType must inherit from DxTyping');
    assert(DxTypeSda.prototype instanceof DxTyping, 'DxTypeSda must inherit from DxTyping');
    assert(DxReveal.prototype instanceof DxRevealing, 'DxReveal must inherit from DxRevealing');
    assert(DxRevealSda.prototype instanceof DxRevealing, 'DxRevealSda must inherit from DxRevealing');
    assert(DxNumber.prototype instanceof DxMeter, 'DxNumber must inherit from DxMeter');
    assert(DxOdometer.prototype instanceof DxMeter, 'DxOdometer must inherit from DxMeter');
    assert(DxTyping.prototype instanceof DxBase, 'DxTyping must inherit from DxBase');
    assert(DxRevealing.prototype instanceof DxBase, 'DxRevealing must inherit from DxBase');
    assert(DxMeter.prototype instanceof DxBase, 'DxMeter must inherit from DxBase');

    // 2. Base method existence
    assert(typeof DxTyping.prototype.markTyped === 'function', 'markTyped must exist on DxTyping');
    assert(typeof DxRevealing.prototype.markRevealed === 'function', 'markRevealed must exist on DxRevealing');
    assert(typeof DxMeter.prototype.getNumericValue === 'function', 'getNumericValue must exist on DxMeter');
    assert(typeof DxMeter.prototype.formatValue === 'function', 'formatValue must exist on DxMeter');
    assert(typeof DxMeter.prototype.makeStatic === 'function', 'makeStatic must exist on DxMeter');
}
