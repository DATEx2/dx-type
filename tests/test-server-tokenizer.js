// tests/test-server-tokenizer.js — Verify SSR tokenizer & SSR generators
import { tokenize, ssrDxNumber, ssrDxOdometer, generateRibbonHtml } from '../src/server/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testServerTokenizer() {
    // 1. Basic word tokenization
    const result = tokenize('Hello World');
    assert(result.html.startsWith('<t>'), 'Should start with <t>');
    assert(result.html.endsWith('</t>'), 'Should end with </t>');
    assert(result.html.includes('<w style="--w:0;--N:5">'), 'First word should have --w:0;--N:5');
    assert(result.html.includes('<w style="--w:5;--N:5">'), 'Second word should have --w:5;--N:5');
    assert(result.html.includes('<c>H</c>'), 'Should contain <c>H</c>');
    assert(result.totalUnits === 10, 'Total units should be 10');

    // 2. Tokenize with embedded <dx-number>
    const mixed = tokenize('Battery <dx-number percent="48">48</dx-number>V power');
    assert(mixed.html.includes('<c class="c-ui-num"><dx-number percent="48">48</dx-number></c>'), 'Should wrap <dx-number> in virtual typewriter slot');

    // 3. ssrDxNumber test
    const numHtml = ssrDxNumber(159.99, '159,99 €', 'ui-price', 'number');
    assert(numHtml.includes('<dx-number class="ui-price"'), 'Should output <dx-number>');
    assert(numHtml.includes('percent="159.99"'), 'Should have percent 159.99');
    assert(numHtml.includes('suffix=" €"'), 'Should have suffix');

    // 4. ssrDxOdometer test
    const odoHtml = ssrDxOdometer(600, { suffix: 'W', className: 'fe-odo' });
    assert(odoHtml.includes('<dx-odometer class="fe-odo"'), 'Should output <dx-odometer>');
    assert(odoHtml.includes('percent="600"'), 'Should have percent 600');
    assert(odoHtml.includes('odometer-ribbon-inner'), 'Should contain mechanical ribbon inner');
    assert(odoHtml.includes('data-final-pos='), 'Should have data-final-pos');

    // 5. Empty input
    assert(tokenize('').html === '', 'Empty input should return empty string');
}
