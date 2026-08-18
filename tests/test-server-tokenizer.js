// tests/test-server-tokenizer.js — Verify SSR tokenizer
import { tokenize } from '../src/server/index.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testServerTokenizer() {
    // 1. Basic word tokenization
    const result = tokenize('Hello World');
    assert(result.startsWith('<t>'), 'Should start with <t>');
    assert(result.endsWith('</t>'), 'Should end with </t>');
    assert(result.includes('<w>'), 'Should contain <w> word wrappers');
    assert(result.includes('<c'), 'Should contain <c> character elements');
    assert(result.includes('--I:0'), 'First char should have --I:0');
    assert(result.includes('--I:4'), 'Fifth char should have --I:4');

    // 2. Single word
    const single = tokenize('DATEx2');
    assert(single.includes('<w>'), 'Single word should have <w>');
    assert((single.match(/<c /g) || []).length === 6, 'DATEx2 should have 6 <c> elements');

    // 3. Empty input
    assert(tokenize('') === '', 'Empty input should return empty string');
    assert(tokenize(null) === '', 'Null input should return empty string');

    // 4. Preserves whitespace between words
    const spaced = tokenize('a  b');
    assert(spaced.includes('  '), 'Double space should be preserved');

    // 5. Character index is sequential across words
    const multi = tokenize('ab cd');
    assert(multi.includes('--I:0'), 'a should be index 0');
    assert(multi.includes('--I:1'), 'b should be index 1');
    assert(multi.includes('--I:2'), 'c should be index 2');
    assert(multi.includes('--I:3'), 'd should be index 3');
}
