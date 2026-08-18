// tests/test-dist.js — Verify dist/ artifacts and runtime imports
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default async function testDist() {
    const requiredFiles = [
        'dist/index.js',
        'dist/index.js.map',
        'dist/index.min.js',
        'dist/index.min.js.map',
        'dist/client.js',
        'dist/client.js.map',
        'dist/client.min.js',
        'dist/client.min.js.map',
        'dist/server.js',
        'dist/server.js.map',
        'dist/server.min.js',
        'dist/server.min.js.map',
        'dist/dx-type.iife.js',
        'dist/dx-type.iife.js.map',
        'dist/dx-type.iife.min.js',
        'dist/dx-type.iife.min.js.map',
        'dist/index.d.ts',
        'dist/client.d.ts',
        'dist/server.d.ts',
        'dist/css/dx-type.css',
        'dist/css/dx-type.min.css',
    ];

    // 1. Verify all expected build artifacts exist
    for (const relPath of requiredFiles) {
        const fullPath = join(root, relPath);
        assert(existsSync(fullPath), `dist artifact ${relPath} should exist`);
    }

    // 2. Verify server build exports and functionality
    const serverModule = await import(pathToFileURL(join(root, 'dist/server.js')).href);
    assert(typeof serverModule.tokenize === 'function', 'dist/server.js should export tokenize function');
    assert(typeof serverModule.VERSION === 'string', 'dist/server.js should export VERSION string');

    const tokenized = serverModule.tokenize('Hello world');
    assert(tokenized.includes('<t><w><c>H</c>'), 'tokenize in dist/server.js should render tokenized HTML');

    // 3. Verify client build contains key classes
    const clientDist = readFileSync(join(root, 'dist/client.js'), 'utf8');
    const expectedSymbols = [
        'DxBase', 'DxTyping', 'DxRevealing', 'DxMeter',
        'DxType', 'DxTypeSda', 'DxReveal', 'DxRevealSda', 'DxTypeReady',
        'DxNumber', 'DxOdometer', 'DX_ANIM', 'tokenize'
    ];
    // Notice tokenize is not in client index, but the rest are
    for (const sym of expectedSymbols.filter(s => s !== 'tokenize')) {
        assert(clientDist.includes(sym), `dist/client.js should contain symbol "${sym}"`);
    }

    // 4. Verify IIFE standalone bundle registers custom elements
    const iifeDist = readFileSync(join(root, 'dist/dx-type.iife.js'), 'utf8');
    assert(iifeDist.includes('customElements.define'), 'dist/dx-type.iife.js should define custom elements');

    // 5. Verify CSS minified bundle
    const minCss = readFileSync(join(root, 'dist/css/dx-type.min.css'), 'utf8');
    assert(minCss.includes('display:inline-block') || minCss.includes('display:inline-flex'), 'dist/css/dx-type.min.css should include inline layout rules');
    assert(minCss.includes('tabular-nums'), 'dist/css/dx-type.min.css should include tabular-nums');
}
