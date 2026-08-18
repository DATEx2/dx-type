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
    assert(result.includes('<w>'), 'Should contain <w> word wrapper for first word');
    assert(result.includes('<w style="--w:5">'), 'Second word should have --w:5');
    assert(result.includes('<c>H</c>'), 'Should contain clean <c> character elements');
    assert(result.includes('<c>o</c>'), 'Should contain clean <c> character elements');

    // 2. Single word
    const single = tokenize('DATEx2');
    assert(single === '<t><w><c>D</c><c>A</c><c>T</c><c>E</c><c>x</c><c class="last-char">2</c></w></t>', 'Single word tokenization mismatch');

    // 3. Empty input
    assert(tokenize('') === '', 'Empty input should return empty string');
    assert(tokenize(null) === '', 'Null input should return empty string');

    // 4. Preserves whitespace between words
    const spaced = tokenize('a  b');
    assert(spaced.includes('  '), 'Double space should be preserved');
    assert(spaced.includes('<w style="--w:1"><c class="last-char">b</c></w>'), 'Second word should have --w:1 and last-char');

    // 5. Word offset is sequential across words
    const multi = tokenize('ab cd');
    assert(multi === '<t><w><c>a</c><c>b</c></w> <w style="--w:2"><c>c</c><c class="last-char">d</c></w></t>', 'Sequential words tokenization mismatch');
}
