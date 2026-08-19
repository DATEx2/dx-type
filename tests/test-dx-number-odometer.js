// tests/test-dx-number-odometer.js — Test dx-number & dx-odometer components
import { DxNumber, DxOdometer, DxMeter, uiNum } from '../src/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testDxNumberOdometer() {
    // 1. DxOdometer read-only contract
    const odo = new DxOdometer();
    let threwOnVal = false;
    try {
        odo.val(800);
    } catch (e) {
        threwOnVal = true;
    }
    assert(threwOnVal, 'odo.val(800) must throw Error because dx-odometer is strictly read-only');

    let threwOnUpdate = false;
    try {
        odo.update();
    } catch (e) {
        threwOnUpdate = true;
    }
    assert(threwOnUpdate, 'odo.update() must throw Error');

    // 2. uiNum format tests
    const formattedPrice = uiNum.format(159.99, 'number-2dec', ',', '', ' €');
    assert(formattedPrice === '159,99 €', 'Formatted price should be 159,99 €');

    const formattedPower = uiNum.format(600, 'int', ',', '', ' W');
    assert(formattedPower === '600 W', 'Formatted power should be 600 W');

    const formattedThousands = uiNum.format(4000, 'int', ',', '', ' Cycles');
    assert(formattedThousands === '4 000 Cycles', 'Formatted thousands should have space');
}
