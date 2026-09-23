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
    const mockStyles = {};
    const mockDigit = {
        _seq: ' 123456',
        getAttribute(name) { return name === 'data-seq' ? this._seq : null; },
        setAttribute(name, val) { if (name === 'data-seq') this._seq = val; },
        style: {
            getPropertyValue(name) { return mockStyles[name]; },
            setProperty(name, val) { mockStyles[name] = val; }
        }
    };
    const mockRoot = {
        querySelectorAll(sel) {
            if (sel === 'dx-d[data-seq]') return [mockDigit];
            return [];
        }
    };
    expandOdometerDrums(mockRoot);
    assert(mockDigit._seq === ' \n1\n2\n3\n4\n5\n6', `expandOdometerDrums should expand " 123456" to \\n-separated (got "${mockDigit._seq}")`);
    assert(mockStyles['--p'] === '-85.7143%', `expandOdometerDrums must compute fractional --p percentage (got "${mockStyles['--p']}")`);

    // 4. generateRibbonHtml clean style test (no --r, has fractional --p)
    const ribbonHtml = generateRibbonHtml(600, 'int', ',', '', 'W');
    assert(!ribbonHtml.includes('--r:'), 'generateRibbonHtml should NOT contain --r (delegated to CSS :nth-last-of-type)');
    assert(ribbonHtml.includes('--p:-85.7143%'), 'generateRibbonHtml must contain fractional --p:-85.7143% for digit 6 of 7');
    assert(!ribbonHtml.includes('--p:-600%'), 'generateRibbonHtml must NEVER contain multiplier --p:-600%');
    assert(!ribbonHtml.includes('--p:-800%'), 'generateRibbonHtml must NEVER contain multiplier --p:-800%');

    // 5. generateDataO helper test
    const dataO = generateDataO(600, 'int', ',', '', 'W');
    assert(typeof dataO === 'string' && dataO.includes(','), 'generateDataO returns comma-separated string');
    const drums = dataO.split(',');
    assert(drums.length === 3, `generateDataO has 3 drums for 600W (got ${drums.length})`);
    assert(drums[0].endsWith('6'), 'Drum 0 ends with 6');
    assert(drums[1].endsWith('0'), 'Drum 1 ends with 0');
    assert(drums[2].endsWith('0'), 'Drum 2 ends with 0');

    // 6. Leading zero blanking for decimals (never blank units digit or decimals)
    const volt546Html = generateRibbonHtml(54.6, 'number-1dec', '.', '', 'V');
    const seqMatches546 = [...volt546Html.matchAll(/data-seq="([^"]*)"/g)].map(m => m[1]);
    assert(seqMatches546.length === 3, `54.6V should have 3 digit drums (got ${seqMatches546.length})`);
    assert(seqMatches546[0].startsWith(' '), '54.6V tens digit (5) drum should start with space (leading blank)');
    assert(!seqMatches546[1].startsWith(' '), '54.6V units digit (4) drum must NOT start with space (must be 0)');
    assert(seqMatches546[1].startsWith('0'), '54.6V units digit (4) drum must start with 0');
    assert(!seqMatches546[2].startsWith(' '), '54.6V decimal digit (6) drum must NOT start with space');
    assert(seqMatches546[2].startsWith('0'), '54.6V decimal digit (6) drum must start with 0');

    const volt420Html = generateRibbonHtml(4.20, 'number-2dec', '.', '', 'V');
    const seqMatches420 = [...volt420Html.matchAll(/data-seq="([^"]*)"/g)].map(m => m[1]);
    assert(seqMatches420.length === 3, `4.20V should have 3 digit drums (got ${seqMatches420.length})`);
    assert(!seqMatches420[0].startsWith(' '), '4.20V units digit (4) drum must NOT start with space (must be 0)');
    assert(seqMatches420[0].startsWith('0'), '4.20V units digit (4) drum must start with 0');
    assert(!seqMatches420[1].startsWith(' '), '4.20V decimal digit (2) drum must NOT start with space');
    assert(!seqMatches420[2].startsWith(' '), '4.20V decimal digit (0) drum must NOT start with space');
}

