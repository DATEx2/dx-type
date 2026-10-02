// tests/test-w-bytecode.js — Verify w="..." bytecode encoding & decoding
import { tokenize, ssrDxType } from '../src/server/index.js';
import { buildTypingLayer } from '../src/client/base/dx-typing.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testWBytecode() {
    // 1. Simple text: "DATE is Smart" → w="4 2 5" or "425" (spaces only for whitespace tokens)
    const r1 = tokenize('DATE is Smart', { duration: 500, delay: 0 });
    assert(r1.wAttr, 'tokenize should return wAttr');
    assert(/^[0-9A-F+\-* ]+$/i.test(r1.wAttr), `wAttr should contain only valid tokens: "${r1.wAttr}"`);
    // "DATE"=4, "is"=2, "Smart"=5
    assert(r1.wAttr.includes('4'), 'wAttr should encode word "DATE" as 4');
    assert(r1.wAttr.includes('2'), 'wAttr should encode word "is" as 2');
    assert(r1.wAttr.includes('5'), 'wAttr should encode word "Smart" as 5');

    // 2. Single word
    const r2 = tokenize('Hello', { duration: 500, delay: 0 });
    assert(r2.wAttr === '5', `Single word "Hello" should encode as "5", got "${r2.wAttr}"`);

    // 3. Hyphenated word: "Triple-Voltage" → "-77" ("Triple-" with hyphen = -7, "Voltage" = 7)
    const r3 = tokenize('Triple-Voltage', { duration: 500, delay: 0 });
    assert(r3.wAttr.includes('-'), `Hyphenated word should have "-" prefix, got "${r3.wAttr}"`);
    assert(r3.wAttr === '-77', `Hyphenated "Triple-Voltage" should split into -7 and 7, got "${r3.wAttr}"`);

    // 3b. 14-char single word: "Characteristic" = 14 chars → "E" (hex)
    const r3b = tokenize('Characteristic', { duration: 500, delay: 0 });
    assert(r3b.wAttr === 'E', `14-char word should encode as E (hex), got "${r3b.wAttr}"`);

    // 4. Extended: word > 15 chars → "+XX"
    const r4 = tokenize('Supercalifragilistic', { duration: 500, delay: 0 });
    // 20 chars → "+14" (hex 20 = 0x14)
    assert(r4.wAttr.includes('+'), `20-char word should use extended mode "+", got "${r4.wAttr}"`);

    // 5. Surrogate pairs: "𝐧𝐮𝐦𝐚𝐢" = 5 code points (10 code units)
    const r5 = tokenize('𝐧𝐮𝐦𝐚𝐢', { duration: 500, delay: 0 });
    assert(r5.wAttr === '5', `Surrogate pair word "𝐧𝐮𝐦𝐚𝐢" (5 code points) should encode as "5", got "${r5.wAttr}"`);

    // 6. CJK characters: each is typically its own word or clustered
    // "安娜" = 2 code points
    const r6 = tokenize('安娜', { duration: 500, delay: 0 });
    assert(r6.wAttr, `CJK should generate wAttr, got "${r6.wAttr}"`);

    // 7. Empty input
    const r7 = tokenize('', { duration: 500, delay: 0 });
    assert(!r7.wAttr || r7.wAttr === '', 'Empty input should have empty wAttr');

    // 8. SSR SDA output should have w attribute on <dx-s>
    const sda = ssrDxType('Hello World', { isSda: true, delay: 0, duration: 500 });
    assert(sda.includes('<template>'), 'SDA output should contain <template>');
    assert(sda.includes('<dx-t'), 'SDA output should contain <dx-t>');

    // 9. SSR Hero output should have <dx-t> with full structure
    const hero = ssrDxType('Hello World', { isSda: false, delay: 0, duration: 500 });
    assert(hero.includes('<dx-t '), `Hero output should contain <dx-t>: ${hero.substring(0, 100)}`);
    assert(hero.includes('<dx-w>'), 'Hero output should contain <dx-w> word wrappers');
    assert(hero.includes('<dx-c'), 'Hero output should contain <dx-c> character elements');

    // 10. wAttr tokens: only valid characters
    const complex = tokenize('DATEx2 Triple-Voltage Smart', { duration: 500, delay: 0 });
    assert(/^[0-9A-F+\-* ]+$/i.test(complex.wAttr), `Complex wAttr should be valid: "${complex.wAttr}"`);

    // 11. French text with Non-Breaking Spaces (\u00A0) around guillemets « »
    const frText = 'Le Mode \u00AB\u00A0Gu\u00E9risseur\u00A0\u00BB';
    const frTokenized = tokenize(frText, { duration: 500, delay: 0 });
    assert(frTokenized.wAttr, 'French text should produce wAttr');

    const mockTs = {
        getAttribute(name) {
            if (name === 'w') return frTokenized.wAttr;
            return null;
        },
        childNodes: [
            {
                nodeType: 3,
                data: frText
            }
        ]
    };

    const { tHtml, totalChars } = buildTypingLayer(mockTs, 0, 0, 40);
    assert(tHtml.length > 0, 'buildTypingLayer should produce HTML for French text');
    assert(tHtml.replace(/<[^>]+>/g, '') === frText, 'buildTypingLayer stripped HTML should equal frText');
    assert(totalChars > 0, 'buildTypingLayer should count total characters');
}
