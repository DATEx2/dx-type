// tests/run-tests.js — Test runner for @datex2/dx-type
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const files = (await readdir(__dirname)).filter(f => f.startsWith('test-') && f.endsWith('.js'));

let passed = 0;
let failed = 0;
let errors = [];

for (const file of files) {
    try {
        const mod = await import(pathToFileURL(join(__dirname, file)).href);
        if (typeof mod.default === 'function') {
            await mod.default();
        }
        passed++;
        console.log(`  ✔ ${file}`);
    } catch (err) {
        failed++;
        errors.push({ file, err });
        console.error(`  ✘ ${file}: ${err.message}`);
    }
}

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    for (const { file, err } of errors) {
        console.error(`\n--- ${file} ---`);
        console.error(err.stack || err.message);
    }
    process.exit(1);
}
