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
    assert(sdaTw.includes('<template>'), 'SDA should pack in <template>');

    // 2b. ssrDxType with embedded <dx-odometer>
    const odoTw = ssrDxType('<dx-odometer class="auto-n tw-embed" percent="90" suffix="%"><dx-s>90%</dx-s><b><dx-d data-seq="09">9</dx-d></b><span class="ui-sfx">%</span></dx-odometer> Longevity Mode', { isSda: true, delay: 0, duration: 320 });
    assert(odoTw.includes('<dx-odometer class="auto-n tw-embed data-static">90%</dx-odometer>'), 'Static layer must contain debloated <dx-odometer class="auto-n tw-embed data-static">90%</dx-odometer>');
    const staticLayerMatch = odoTw.match(/<dx-s[^>]*>([\s\S]*?)<\/dx-s>/);
    assert(staticLayerMatch && !staticLayerMatch[1].includes('<dx-s>'), 'Static layer must NOT nest <dx-s> inside <dx-odometer>');
    assert(staticLayerMatch && !staticLayerMatch[1].includes('<b>'), 'Static layer must NOT have <b> drums inside <dx-odometer>');
    assert(odoTw.includes('aria-label="90% Longevity Mode"'), 'Aria label must be clean without duplicated characters');

    // 2c. ssrDxType with embedded <dx-odometer> followed by hyphen
    const hyphenOdoTw = ssrDxType('<dx-odometer class="auto-n tw-embed" percent="220" suffix="VAC">220VAC</dx-odometer>-UK', { isSda: true });
    assert(hyphenOdoTw.includes('aria-label="220VAC-UK"'), 'Aria label must preserve hyphen: 220VAC-UK');
    assert(hyphenOdoTw.includes('220VAC</dx-odometer>-UK'), 'Static text layer must preserve hyphen');
    assert(hyphenOdoTw.includes('>-<') && hyphenOdoTw.includes('>U<') && hyphenOdoTw.includes('>K<'), 'Animated layer must tokenize hyphen character');

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

    // 8. Brand parity: DATE, DATEx2, DATEx2WD all get brand D and glyphs (same mold / din acelasi aluat)
    const tDate = tokenize('DATE');
    const tDateX2 = tokenize('DATEx2');
    const tDateX2WD = tokenize('DATEx2WD');
    assert(tDate.html.includes('>\u{1D5D7}</dx-c><dx-c style="animation-delay:145ms">\u{E004}</dx-c><dx-c style="animation-delay:290ms">\u{E005}</dx-c><dx-c style="animation-delay:435ms" data-last="true" onanimationend="return onTypewriterEnd(this, event)">\u{E006}</dx-c>'), 'DATE must use brand glyphs');
    assert(tDateX2.html.includes('>\u{1D5D7}</dx-c>') && tDateX2.html.includes('>\u{E004}</dx-c>') && tDateX2.html.includes('>x</dx-c><dx-c style="animation-delay:483ms" data-last="true" onanimationend="return onTypewriterEnd(this, event)">2</dx-c>'), 'DATEx2 must use brand glyphs');
    assert(tDateX2WD.html.includes('>\u{1D5D7}</dx-c>') && tDateX2WD.html.includes('>\u{E004}</dx-c>') && tDateX2WD.html.includes('>x</dx-c><dx-c style="animation-delay:363ms">2</dx-c><dx-c style="animation-delay:435ms">W</dx-c><dx-c style="animation-delay:508ms" data-last="true" onanimationend="return onTypewriterEnd(this, event)">D</dx-c>'), 'DATEx2WD must use brand glyphs identically to DATE');

    // 9. Math Unicode Bold characters normalization to brand glyphs
    const tMath = tokenize('(𝐃𝐀𝐓𝐄𝐱𝟐, 𝐃𝐀𝐓𝐄𝐱𝟐𝐖𝐃)');
    assert(tMath.cleanText.includes('(DATEx2, DATEx2WD)'), 'Math Unicode characters must normalize in cleanText');
    assert(tMath.html.includes('>\u{1D5D7}</dx-c>'), 'Math Unicode DATE must be substituted by brand glyphs');
}
