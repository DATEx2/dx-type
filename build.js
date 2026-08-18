// build.js — Build script for @datex2/dx-type using esbuild
import * as esbuild from 'esbuild';
import { rmSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');
const distCssDir = join(distDir, 'css');
const isWatch = process.argv.includes('--watch');

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
}

async function cleanDist() {
    rmSync(distDir, { recursive: true, force: true });
    mkdirSync(distCssDir, { recursive: true });
}

const jsConfigs = [
    // 1. Root ESM bundle (unminified & minified)
    {
        entryPoints: { 'index': 'src/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'esm',
        target: 'es2022',
        sourcemap: true,
    },
    {
        entryPoints: { 'index.min': 'src/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'esm',
        target: 'es2022',
        minify: true,
        treeShaking: true,
        mangleProps: /^_[a-zA-Z]/,
        reserveProps: /^__/,
        sourcemap: true,
    },
    // 2. Client ESM bundle (unminified & minified)
    {
        entryPoints: { 'client': 'src/client/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'esm',
        target: 'es2022',
        sourcemap: true,
    },
    {
        entryPoints: { 'client.min': 'src/client/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'esm',
        target: 'es2022',
        minify: true,
        treeShaking: true,
        mangleProps: /^_[a-zA-Z]/,
        reserveProps: /^__/,
        sourcemap: true,
    },
    // 3. Server ESM bundle (unminified & minified)
    {
        entryPoints: { 'server': 'src/server/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'node18',
        sourcemap: true,
    },
    {
        entryPoints: { 'server.min': 'src/server/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'node18',
        minify: true,
        treeShaking: true,
        sourcemap: true,
    },
    // 4. Standalone IIFE Browser Bundle (for direct <script> tag usage)
    {
        entryPoints: { 'dx-type.iife': 'src/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'iife',
        globalName: 'DxType',
        target: 'es2022',
        sourcemap: true,
    },
    {
        entryPoints: { 'dx-type.iife.min': 'src/index.js' },
        outdir: 'dist',
        bundle: true,
        format: 'iife',
        globalName: 'DxType',
        target: 'es2022',
        minify: true,
        treeShaking: true,
        mangleProps: /^_[a-zA-Z]/,
        reserveProps: /^__/,
        sourcemap: true,
    },
];

const cssConfigs = [
    // CSS unminified copy/process
    {
        entryPoints: { 'dx-type': 'src/css/dx-type.css' },
        outdir: 'dist/css',
        bundle: true,
        sourcemap: true,
    },
    // CSS minified
    {
        entryPoints: { 'dx-type.min': 'src/css/dx-type.css' },
        outdir: 'dist/css',
        bundle: true,
        minify: true,
        sourcemap: true,
    },
];

async function buildAll() {
    const startTime = performance.now();
    console.log('⚡ Building @datex2/dx-type...');

    await cleanDist();

    const allConfigs = [...jsConfigs, ...cssConfigs];

    if (isWatch) {
        console.log('👀 Watch mode enabled...');
        const contexts = await Promise.all(allConfigs.map(cfg => esbuild.context(cfg)));
        await Promise.all(contexts.map(ctx => ctx.watch()));
        console.log('✅ Watching for changes...');
        return;
    }

    await Promise.all(allConfigs.map(cfg => esbuild.build(cfg)));

    // Copy TypeScript declaration files to dist/
    copyFileSync(join(__dirname, 'src/index.d.ts'), join(distDir, 'index.d.ts'));
    copyFileSync(join(__dirname, 'src/client/index.d.ts'), join(distDir, 'client.d.ts'));
    copyFileSync(join(__dirname, 'src/server/index.d.ts'), join(distDir, 'server.d.ts'));

    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`\n✨ Build completed in ${elapsed}ms\n`);
    console.log('📦 Output files:');

    const files = [
        'dist/index.js',
        'dist/index.min.js',
        'dist/client.js',
        'dist/client.min.js',
        'dist/server.js',
        'dist/server.min.js',
        'dist/dx-type.iife.js',
        'dist/dx-type.iife.min.js',
        'dist/css/dx-type.css',
        'dist/css/dx-type.min.css',
    ];

    for (const file of files) {
        try {
            const stat = statSync(join(__dirname, file));
            console.log(`  - ${file.padEnd(26)} ${formatBytes(stat.size)}`);
        } catch {
            console.warn(`  ! ${file} (missing)`);
        }
    }
    console.log('');
}

buildAll().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
