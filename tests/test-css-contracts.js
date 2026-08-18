// tests/test-css-contracts.js — Verify CSS architectural contracts
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testCssContracts() {
    const css = readFileSync(join(root, 'src/css/dx-type.css'), 'utf8');

    // 1. display: contents on all wrapper elements
    const contentsElements = ['dx-type', 'dx-type-sda', 'dx-reveal', 'dx-reveal-sda', 'dx-type-ready'];
    for (const el of contentsElements) {
        assert(css.includes(el), `CSS should reference ${el}`);
    }
    assert(css.includes('display: contents'), 'Wrapper elements should use display: contents');

    // 2. dx-number and dx-odometer should be inline-block (they render visible content)
    assert(css.includes('dx-number'), 'CSS should reference dx-number');
    assert(css.includes('dx-odometer'), 'CSS should reference dx-odometer');
    assert(css.includes('inline-block'), 'Number/odometer should be inline-block');

    // 3. Final state cleanup: animation: none on TYPED/REVEALED
    assert(css.includes('.TYPED'), 'CSS should handle TYPED final state');
    assert(css.includes('.REVEALED'), 'CSS should handle REVEALED final state');
    assert(css.includes('animation: none'), 'Final states should clear animation');
    assert(css.includes('will-change: auto'), 'Final states should clear will-change');

    // 4. Search text (<s-t>) should be hidden during animation
    assert(css.includes('s-t'), 'CSS should style search text element');
    assert(css.includes('clip: rect'), 'Hidden s-t should use clip rect');

    // 5. No legacy class-only selectors (CSS should target dx-* tags, not .type-sda)
    // The CSS file should NOT use .type-sda or .reveal-sda as standalone selectors
    const lines = css.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '') continue;
        // Selector lines that start with a dot and contain old class names are forbidden
        if (/^\.type-sda[^a-z]/.test(trimmed)) {
            throw new Error(`CSS should NOT use standalone .type-sda selector: "${trimmed}"`);
        }
        if (/^\.reveal-sda[^a-z]/.test(trimmed)) {
            throw new Error(`CSS should NOT use standalone .reveal-sda selector: "${trimmed}"`);
        }
    }

    // 6. Odometer static state
    assert(css.includes('data-static'), 'CSS should handle odometer static state');

    // 7. Tabular nums for running numbers
    assert(css.includes('tabular-nums'), 'Running numbers should use tabular-nums');
}
