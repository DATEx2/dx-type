// tests/test-server-tokenizer.js — Verify SSR tokenizer & SSR generators
import { tokenize, ssrDxType, ssrDxReveal, ssrDxNumber, ssrDxOdometer, generateRibbonHtml } from '../src/server/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testServerTokenizer() {
    // 1. Basic word tokenization with timing
    const result = tokenize('Hello World', { duration: 500, delay: 100 });
    assert(result.html.includes('<dx-w>'), 'Should contain <dx-w> tags');
    assert(result.html.includes('<dx-c') && result.html.includes('>H</dx-c>'), 'Should contain <dx-c>H</dx-c>');
    assert(typeof result.wAttr === 'string' && /^[0-9a-fA-F]+$/.test(result.wAttr), 'Should return wAttr containing valid hex characters');
    assert(result.totalUnits > 0, 'Total units should be positive');
    assert(result.style.includes('--d:100;--t:500'), 'Style should contain exact delay and duration');

    // 2. ssrDxType test (Direct & SDA)
    const heroTw = ssrDxType('DATE BCx3', { delay: 0, duration: 580 });
    assert(heroTw.startsWith('<dx-type style="--b:0;--a:9;--d:0;--t:580;--u:'), 'Should generate <dx-type> with computed --u');
    assert(heroTw.includes('aria-label="DATE BCx3"'), 'Should generate clean aria-label');
    assert(heroTw.includes('data-last="true"'), 'Should mark last char for completion callback');
    assert(heroTw.includes('<dx-s'), 'SSR hero mode should use <dx-s>');
    assert(heroTw.includes('<dx-t'), 'SSR hero mode should use <dx-t>');

    const sdaTw = ssrDxType('Smart Chargers', { isSda: true, delay: 50, duration: 400 });
    assert(sdaTw.startsWith('<dx-type-sda'), 'Should generate <dx-type-sda>');
    assert(sdaTw.includes('Smart') && sdaTw.includes('Chargers') && sdaTw.includes('<dx-s'), 'Should generate search-text tag');
    assert(!sdaTw.includes('<template>'), 'SDA should NOT pack in <template> anymore');

    // 3. Tokenize with embedded <dx-number>
    const mixed = tokenize('Battery <dx-number percent="48">48</dx-number>V power');
    assert(mixed.html.includes('<dx-c class="c-ui-num"'), 'Should wrap <dx-number> in virtual typewriter slot');

    // 4. ssrDxNumber test
    const numHtml = ssrDxNumber(159.99, '159,99 €', 'ui-price', 'number');
    assert(numHtml.includes('<dx-counter class="ui-price"'), 'Should output <dx-counter>');
    assert(numHtml.includes('percent="159.99"'), 'Should have percent 159.99');
    assert(numHtml.includes('suffix=" €"'), 'Should have suffix');

    // 5. ssrDxOdometer test
    const odoHtml = ssrDxOdometer(600, { suffix: 'W', className: 'fe-odo' });
    assert(odoHtml.includes('<dx-odometer class="fe-odo"'), 'Should output <dx-odometer>');
    assert(odoHtml.includes('<dx-d data-seq='), 'Should contain mechanical ribbon inner');
    assert(!odoHtml.includes('&#10;'), 'data-seq should be clean stripout without &#10;');
    assert(odoHtml.includes('--p:'), 'Should have data-final-pos');

    // 6. ssrDxReveal test
    const revealHtml = ssrDxReveal('|', { delay: 600, duration: 50, className: 'hero-specs-separator' });
    assert(revealHtml.startsWith('<dx-reveal class="hero-specs-separator" style="--d:600;--t:50">|'), 'Should generate clean <dx-reveal> with delay and duration style');
    assert(!revealHtml.includes('onanimationstart='), 'Should NOT include verbose inline handlers');

    // 7. Empty input
    assert(tokenize('').html === '', 'Empty input should return empty string');
}
