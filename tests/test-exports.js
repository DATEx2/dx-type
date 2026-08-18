// tests/test-exports.js — Verify all exports are accessible
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testExports() {
    // 1. Verify client/index.js exports the expected symbols
    const clientIndex = readFileSync(join(root, 'src/client/index.js'), 'utf8');
    const expectedExports = [
        'DxBase', 'DX_ANIM', 'getIO', 'observeIO', 'registerRAF', 'unregisterRAF',
        'DxTyping', 'unpackTemplate', 'observeTypewriter', 'mountTypewriter',
        'ensureElementsUpToTarget', 'onTypewriterEnd', 'cleanupTypedDOM', 'bootstrapTypewriterObserver',
        'DxRevealing', 'finishReveal', 'startReveal',
        'DxMeter', 'uiNum',
        'DxType', 'DxTypeSda', 'DxReveal', 'DxRevealSda', 'DxTypeReady',
        'DxNumber', 'DxOdometer'
    ];
    for (const sym of expectedExports) {
        assert(clientIndex.includes(sym), `client/index.js should export "${sym}"`);
    }

    // 2. Verify component files exist and define the correct custom element
    const components = [
        { file: 'dx-type.js', tag: 'dx-type', cls: 'DxType' },
        { file: 'dx-type-sda.js', tag: 'dx-type-sda', cls: 'DxTypeSda' },
        { file: 'dx-reveal.js', tag: 'dx-reveal', cls: 'DxReveal' },
        { file: 'dx-reveal-sda.js', tag: 'dx-reveal-sda', cls: 'DxRevealSda' },
        { file: 'dx-type-ready.js', tag: 'dx-type-ready', cls: 'DxTypeReady' },
        { file: 'dx-number.js', tag: 'dx-number', cls: 'DxNumber' },
        { file: 'dx-odometer.js', tag: 'dx-odometer', cls: 'DxOdometer' },
    ];
    for (const { file, tag, cls } of components) {
        const src = readFileSync(join(root, 'src/client/components', file), 'utf8');
        assert(src.includes(`'${tag}'`), `${file} should register custom element '${tag}'`);
        assert(src.includes(`export class ${cls}`), `${file} should export class ${cls}`);
    }

    // 3. Verify base classes exist
    const bases = ['dx-base.js', 'dx-typing.js', 'dx-revealing.js', 'dx-meter.js', 'dx-scheduler.js'];
    for (const file of bases) {
        const src = readFileSync(join(root, 'src/client/base', file), 'utf8');
        assert(src.length > 50, `${file} should not be empty`);
    }

    // 4. Verify CSS exists and targets dx-* tags
    const css = readFileSync(join(root, 'src/css/dx-type.css'), 'utf8');
    assert(css.includes('dx-type-sda'), 'CSS should target dx-type-sda');
    assert(css.includes('dx-reveal-sda'), 'CSS should target dx-reveal-sda');
    assert(css.includes('display: contents'), 'CSS should set display: contents');
    assert(css.includes('.TYPED'), 'CSS should handle .TYPED state');
    assert(css.includes('.REVEALED'), 'CSS should handle .REVEALED state');

    // 5. Verify package.json
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert(pkg.name === '@datex2/dx-type', 'package name should be @datex2/dx-type');
    assert(pkg.type === 'module', 'package should be ESM');
    assert(!pkg.dependencies || !pkg.dependencies.jquery, 'package should NOT depend on jQuery');

    // 6. Verify NO jQuery references in library source
    for (const { file } of components) {
        const src = readFileSync(join(root, 'src/client/components', file), 'utf8');
        assert(!src.includes('jQuery'), `${file} should NOT reference jQuery`);
        assert(!src.includes('$.fn'), `${file} should NOT reference $.fn`);
    }

    // 7. Verify DX_ANIM constants
    const scheduler = readFileSync(join(root, 'src/client/base/dx-scheduler.js'), 'utf8');
    const requiredConsts = ['TYPED', 'TYPING', 'REVEALED', 'REVEALING', 'TYPE_GUARD', 'REVEAL_GUARD'];
    for (const c of requiredConsts) {
        assert(scheduler.includes(c), `dx-scheduler.js should define DX_ANIM.${c}`);
    }

    // 8. Verify dx-odometer is read-only
    const odoSrc = readFileSync(join(root, 'src/client/components/dx-odometer.js'), 'utf8');
    assert(odoSrc.includes('read-only'), 'dx-odometer should be read-only');
    assert(odoSrc.includes('makeStatic'), 'dx-odometer should call makeStatic on completion');

    // 9. Verify zero inline handlers in components
    for (const { file } of components) {
        const src = readFileSync(join(root, 'src/client/components', file), 'utf8');
        assert(!src.includes('onanimationstart='), `${file} should NOT have inline onanimationstart`);
        assert(!src.includes('onanimationend='), `${file} should NOT have inline onanimationend`);
    }

    // 10. Verify backward compat aliases
    const typingSrc = readFileSync(join(root, 'src/client/base/dx-typing.js'), 'utf8');
    assert(typingSrc.includes('UiTyping'), 'dx-typing.js should export UiTyping backward compat alias');
    const revealingSrc = readFileSync(join(root, 'src/client/base/dx-revealing.js'), 'utf8');
    assert(revealingSrc.includes('UiRevealing'), 'dx-revealing.js should export UiRevealing backward compat alias');
}
