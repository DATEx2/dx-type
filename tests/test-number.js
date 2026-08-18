// tests/test-number.js — Unit test for dx-number numeric counter and formatting
import { parseNumParts } from '../src/client/base/dx-meter.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testNumber() {
    // 1. parseNumParts tests
    const p1 = parseNumParts('2 450 €');
    assert(p1.digits.includes('2') && p1.digits.includes('450'), 'Should parse formatted digits');
    assert(p1.sfx.trim() === '€', 'Should parse suffix €');

    const p2 = parseNumParts('+12.50 %');
    assert(p2.pfx === '+', 'Should parse prefix +');
    assert(p2.digits === '12', 'Should parse whole digits 12');
    assert(p2.radix === '.', 'Should parse radix .');
    assert(p2.decimals === '50', 'Should parse decimals 50');
    assert(p2.sfx === '%', 'Should parse suffix %');

    const p3 = parseNumParts('0');
    assert(p3.digits === '0', 'Should parse zero');
    assert(p3.pfx === '', 'Zero should have no prefix');

    const p4 = parseNumParts('99 999 €');
    assert(p4.digits === '99 999', 'Should parse spaced thousand digits 99 999');
    assert(p4.sfx === '€', 'Should parse suffix €');
}
