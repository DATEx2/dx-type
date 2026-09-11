// tests/test-dx-number-odometer.js — Test dx-number & dx-odometer components
import { DxNumber, DxOdometer, DxMeter, uiNum, expandOdometerDrums, generateRibbonHtml, generateDataO } from '../src/index.js';

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

    // 3. expandOdometerDrums test
    const mockDigit = {
        _seq: ' 123456',
        getAttribute(name) { return name === 'data-seq' ? this._seq : null; },
        setAttribute(name, val) { if (name === 'data-seq') this._seq = val; }
    };
    const mockRoot = {
        querySelectorAll(sel) {
            if (sel === 'dx-d[data-seq]') return [mockDigit];
            return [];
        }
    };
    expandOdometerDrums(mockRoot);
    assert(mockDigit._seq === ' \n1\n2\n3\n4\n5\n6', `expandOdometerDrums should expand " 123456" to \\n-separated (got "${mockDigit._seq}")`);

    // 4. generateRibbonHtml clean style test (no --r, has --p)
    const ribbonHtml = generateRibbonHtml(600, 'int', ',', '', 'W');
    assert(!ribbonHtml.includes('--r:'), 'generateRibbonHtml should NOT contain --r (delegated to CSS :nth-last-of-type)');
    assert(ribbonHtml.includes('--p:'), 'generateRibbonHtml should contain --p translation percentage');

    // 5. generateDataO helper test
    const dataO = generateDataO(600, 'int', ',', '', 'W');
    assert(typeof dataO === 'string' && dataO.includes(','), 'generateDataO returns comma-separated string');
    const drums = dataO.split(',');
    assert(drums.length === 3, `generateDataO has 3 drums for 600W (got ${drums.length})`);
    assert(drums[0].endsWith('6'), 'Drum 0 ends with 6');
    assert(drums[1].endsWith('0'), 'Drum 1 ends with 0');
    assert(drums[2].endsWith('0'), 'Drum 2 ends with 0');
}
