// tests/test-pseudo-sync.js — Verify pseudo-element timing synchronization in @datex2/dx-type
import { tokenize, ssrDxType } from '../src/server/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default async function testPseudoSync() {
    // 1. Verify --dx-delay injection on <li> in <dx-t>
    const listHtml = '<ul><li>First item</li><li>Second item</li></ul>';
    const listResult = tokenize(listHtml, { delay: 100, duration: 600 });

    assert(listResult.html.includes('<li style="--dx-delay:100ms;">'), 'First <li> should have base delay style in <dx-t>');
    assert(/<li style="--dx-delay:\d+ms;">/.test(listResult.html), 'Second <li> should have computed --dx-delay in <dx-t>');

    // Check that second item has larger delay than first item
    const delays = [...listResult.html.matchAll(/<li[^>]*--dx-delay:(\d+)ms/g)].map(m => parseInt(m[1], 10));
    assert(delays.length === 2, 'Should find 2 --dx-delay occurrences for the 2 <li> items');
    assert(delays[1] > delays[0], `Second <li> delay (${delays[1]}ms) must be strictly greater than first <li> delay (${delays[0]}ms)`);

    // Verify <dx-s> remains clean without --dx-delay pollution
    assert(!listResult.compactHtml.includes('--dx-delay'), '<dx-s> compactHtml must NOT contain --dx-delay');
    assert(listResult.compactHtml.includes('First item</li>'), '<dx-s> should retain content in <li> tags');

    // 2. Verify --dx-delay on <a> links
    const linkHtml = '<p>Check <a href="/products/DATE-Dx2C">DATE Dx2C</a> adapter</p>';
    const linkResult = tokenize(linkHtml, { delay: 0, duration: 800 });
    assert(linkResult.html.includes('--dx-delay:'), '<a> link in <dx-t> must have --dx-delay injected');
    assert(!linkResult.compactHtml.includes('--dx-delay'), '<a> link in <dx-s> must not have --dx-delay');

    // 3. Full ssrDxType integration check
    const fullSsr = ssrDxType(listHtml, { isSda: true, delay: 0, duration: 500 });
    assert(fullSsr.includes('<dx-s'), 'Full SSR output must contain <dx-s>');
    assert(fullSsr.includes('<dx-t'), 'Full SSR output must contain <dx-t>');
    assert(fullSsr.includes('--dx-delay:'), 'Full SSR output must contain --dx-delay in <dx-t>');

    // 4. Verify CSS contracts in src/css/dx-type.css
    const css = readFileSync(join(root, 'src/css/dx-type.css'), 'utf8');

    // Check dx-s transparency guard covers pseudo-elements
    assert(css.includes('::before') && css.includes('::after'), 'dx-s guard must cover ::before and ::after');

    // Check dx-t initial state hides pseudo-elements
    assert(css.includes(':is(li, a, h1, h2, h3, h4, h5, h6, blockquote, p)::before'), 'CSS must declare ::before for list items and links in dx-t');

    // Check animation delay uses --dx-delay
    assert(css.includes('animation-delay: var(--dx-delay, 0ms) !important;'), 'CSS must apply animation-delay: var(--dx-delay, 0ms)');

    // 5. Verify prepareTemplateContent does NOT clobber SSR delays
    const elMock = {
        getAttribute(attr) {
            if (attr === 'style') return '--b:0;--a:319;--d:80;--t:620;--u:1.944';
            return null;
        },
        classList: { contains() { return false; } },
        querySelector(sel) {
            if (sel === ':scope > template') return tplMock;
            return null;
        }
    };

    const cUiNumMock = {
        style: { animationDelay: '269ms' },
        querySelector() { return null; },
        setAttribute() {},
        classList: { add() {} }
    };

    const tLayerMock = {
        querySelector(sel) {
            if (sel === ':is(dx-c, t-c)') return {}; // has pre-rendered characters
            return null;
        },
        querySelectorAll(sel) {
            if (sel.includes('dx-odometer')) return [];
            if (sel.includes('dx-c')) return [cUiNumMock];
            return [];
        },
        childNodes: [
            { nodeType: 1, textContent: 'Paragraph', hasAttribute() { return false; }, querySelector() { return null; }, querySelectorAll() { return []; }, setAttribute() {} },
            { nodeType: 1, textContent: 'List', hasAttribute() { return false; }, querySelector(s) { if (s.includes('c-ui-num')) return cUiNumMock; return null; }, setAttribute() {} }
        ]
    };

    const tplMock = {
        content: {
            querySelector(sel) {
                if (sel.includes('dx-t')) return tLayerMock;
                return null;
            }
        }
    };

    const { prepareTemplateContent } = await import('../src/client/base/dx-typing.js');
    prepareTemplateContent(elMock);
    assert(cUiNumMock.style.animationDelay === '269ms', `prepareTemplateContent must NOT clobber SSR animationDelay on c-ui-num (expected 269ms, got ${cUiNumMock.style.animationDelay})`);

    console.log('  ✔ test-pseudo-sync.js passed successfully');
}
