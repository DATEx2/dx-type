import puppeteer from 'puppeteer';
import GIFEncoder from 'gif-encoder-2';
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const demoUrl = 'file:///' + join(root, 'demo/index.html').replace(/\\/g, '/');

async function recordHero() {
    console.log('🚀 Launching Puppeteer for Hero Showcase Capture...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const vpWidth = 980;
    const vpHeight = 850;
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 1 });

    console.log('📄 Loading demo page:', demoUrl);
    await page.goto(demoUrl, { waitUntil: 'networkidle0' });

    // Measure exact #hero-demo bounding rect
    const heroBox = await page.evaluate(() => {
        const el = document.getElementById('hero-demo');
        const r = el.getBoundingClientRect();
        return {
            x: Math.max(0, Math.floor(r.x)),
            y: Math.max(0, Math.floor(r.y)),
            width: Math.min(948, Math.ceil(r.width)),
            height: Math.ceil(r.height)
        };
    });

    heroBox.width = heroBox.width % 2 === 0 ? heroBox.width : heroBox.width - 1;
    heroBox.height = heroBox.height % 2 === 0 ? heroBox.height : heroBox.height - 1;

    console.log('📐 Hero Bounding Box:', heroBox);

    // Trigger full replay from t=0
    await page.click('#btn-replay-all');

    const totalDurationMs = 3800;
    const frameIntervalMs = 90; // ~11 fps
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames for Hero Animated GIF...`);
    const rawFrames = [];

    for (let f = 0; f < totalFrames; f++) {
        const pngBuf = await page.screenshot({ type: 'png', clip: heroBox });
        const rawBuf = await sharp(pngBuf)
            .resize(heroBox.width, heroBox.height)
            .ensureAlpha()
            .raw()
            .toBuffer();
        rawFrames.push(rawBuf);
        await new Promise(r => setTimeout(r, frameIntervalMs));
    }

    // Save final crisp static preview
    await page.screenshot({ path: join(root, 'assets/hero-preview.png'), clip: heroBox });

    await browser.close();

    console.log('🔄 Encoding Animated GIF with gif-encoder-2 (NeuQuant)...');
    const encoder = new GIFEncoder(heroBox.width, heroBox.height, 'neuquant', true);
    encoder.setDelay(frameIntervalMs);
    encoder.setRepeat(0); // Loop forever
    encoder.setQuality(10);
    encoder.start();

    for (let i = 0; i < rawFrames.length; i++) {
        encoder.addFrame(rawFrames[i]);
    }

    encoder.finish();
    const gifBuffer = encoder.out.getData();
    writeFileSync(join(root, 'assets/demo-showcase.gif'), gifBuffer);
    console.log(`✨ Generated assets/demo-showcase.gif (${(gifBuffer.length / 1024).toFixed(1)} KB)!`);
}

async function recordSda() {
    console.log('🚀 Launching Puppeteer for SDA Showcase Capture...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const vpWidth = 980;
    const vpHeight = 900;
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 1 });

    await page.goto(demoUrl, { waitUntil: 'networkidle0' });

    // Scroll down to SDA section
    await page.evaluate(() => {
        const sda = document.getElementById('section-sda');
        if (sda) sda.scrollIntoView({ behavior: 'auto' });
    });

    const sdaBox = await page.evaluate(() => {
        const el = document.getElementById('section-sda');
        const r = el.getBoundingClientRect();
        return {
            x: Math.max(0, Math.floor(r.x)),
            y: Math.max(0, Math.floor(r.y)),
            width: Math.min(948, Math.ceil(r.width)),
            height: Math.ceil(r.height)
        };
    });

    sdaBox.width = sdaBox.width % 2 === 0 ? sdaBox.width : sdaBox.width - 1;
    sdaBox.height = sdaBox.height % 2 === 0 ? sdaBox.height : sdaBox.height - 1;

    console.log('📐 SDA Bounding Box:', sdaBox);

    const totalDurationMs = 3000;
    const frameIntervalMs = 90;
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames for SDA Animated GIF...`);
    const rawFrames = [];

    for (let f = 0; f < totalFrames; f++) {
        const pngBuf = await page.screenshot({ type: 'png', clip: sdaBox });
        const rawBuf = await sharp(pngBuf)
            .resize(sdaBox.width, sdaBox.height)
            .ensureAlpha()
            .raw()
            .toBuffer();
        rawFrames.push(rawBuf);
        await new Promise(r => setTimeout(r, frameIntervalMs));
    }

    await page.screenshot({ path: join(root, 'assets/sda-preview.png'), clip: sdaBox });

    await browser.close();

    console.log('🔄 Encoding SDA Animated GIF...');
    const encoder = new GIFEncoder(sdaBox.width, sdaBox.height, 'neuquant', true);
    encoder.setDelay(frameIntervalMs);
    encoder.setRepeat(0); // Loop forever
    encoder.setQuality(10);
    encoder.start();

    for (let i = 0; i < rawFrames.length; i++) {
        encoder.addFrame(rawFrames[i]);
    }

    encoder.finish();
    const gifBuffer = encoder.out.getData();
    writeFileSync(join(root, 'assets/demo-sda.gif'), gifBuffer);
    console.log(`✨ Generated assets/demo-sda.gif (${(gifBuffer.length / 1024).toFixed(1)} KB)!`);
}

async function main() {
    await recordHero();
    await recordSda();
}

main().catch(err => {
    console.error('❌ Error recording GIF:', err);
    process.exit(1);
});
