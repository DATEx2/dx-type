import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const demoUrl = 'file:///' + join(root, 'demo/index.html').replace(/\\/g, '/');

async function recordHero() {
    console.log('🚀 Launching Puppeteer for Sharp Hero Animation Capture...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const vpWidth = 1000;
    const vpHeight = 900;
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 1 });

    console.log('📄 Loading page:', demoUrl);
    await page.goto(demoUrl, { waitUntil: 'networkidle0' });

    // Measure exact #hero-demo bounding rect
    const heroBox = await page.evaluate(() => {
        const el = document.getElementById('hero-demo');
        const r = el.getBoundingClientRect();
        return {
            x: Math.max(0, Math.floor(r.x)),
            y: Math.max(0, Math.floor(r.y)),
            width: Math.min(980, Math.ceil(r.width)),
            height: Math.ceil(r.height)
        };
    });

    // Make dimensions even numbers (required by encoders)
    heroBox.width = heroBox.width % 2 === 0 ? heroBox.width : heroBox.width - 1;
    heroBox.height = heroBox.height % 2 === 0 ? heroBox.height : heroBox.height - 1;

    console.log('📐 Hero Bounding Box:', heroBox);

    // Click Replay All
    await page.click('#btn-replay-all');

    const totalDurationMs = 3800;
    const frameIntervalMs = 70; // ~14 fps for silky-smooth motion
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames for Hero Showcase...`);
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

    // Capture final static crisp PNG
    await page.screenshot({ path: join(root, 'assets/hero-preview.png'), clip: heroBox });
    console.log('📸 Saved assets/hero-preview.png');

    await browser.close();

    console.log('🔄 Encoding with libvips / Sharp...');
    const combinedRaw = Buffer.concat(rawFrames);

    // High-Quality Animated GIF
    await sharp(combinedRaw, {
        raw: {
            width: heroBox.width,
            height: heroBox.height * rawFrames.length,
            channels: 4
        }
    })
    .gif({
        pageHeight: heroBox.height,
        loop: 0,
        delay: frameIntervalMs,
        effort: 7,
        dither: 1.0
    })
    .toFile(join(root, 'assets/hero-showcase.gif'));

    console.log('✨ Generated assets/hero-showcase.gif with Sharp!');
}

async function recordSda() {
    console.log('🚀 Launching Puppeteer for Sharp SDA Animation Capture...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const vpWidth = 1000;
    const vpHeight = 950;
    await page.setViewport({ width: vpWidth, height: vpHeight, deviceScaleFactor: 1 });

    await page.goto(demoUrl, { waitUntil: 'networkidle0' });

    // Scroll to SDA section
    await page.evaluate(() => {
        const sda = document.getElementById('section-sda');
        if (sda) sda.scrollIntoView({ behavior: 'auto' });
    });

    // Measure exact #section-sda bounding rect
    const sdaBox = await page.evaluate(() => {
        const el = document.getElementById('section-sda');
        const r = el.getBoundingClientRect();
        return {
            x: Math.max(0, Math.floor(r.x)),
            y: Math.max(0, Math.floor(r.y)),
            width: Math.min(980, Math.ceil(r.width)),
            height: Math.ceil(r.height)
        };
    });

    sdaBox.width = sdaBox.width % 2 === 0 ? sdaBox.width : sdaBox.width - 1;
    sdaBox.height = sdaBox.height % 2 === 0 ? sdaBox.height : sdaBox.height - 1;

    console.log('📐 SDA Bounding Box:', sdaBox);

    const totalDurationMs = 3000;
    const frameIntervalMs = 80;
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames for SDA Showcase...`);
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
    console.log('📸 Saved assets/sda-preview.png');

    await browser.close();

    console.log('🔄 Encoding SDA with Sharp...');
    const combinedRaw = Buffer.concat(rawFrames);

    // High-Quality Animated GIF
    await sharp(combinedRaw, {
        raw: {
            width: sdaBox.width,
            height: sdaBox.height * rawFrames.length,
            channels: 4
        }
    })
    .gif({
        pageHeight: sdaBox.height,
        loop: 0,
        delay: frameIntervalMs,
        effort: 7,
        dither: 1.0
    })
    .toFile(join(root, 'assets/sda-showcase.gif'));

    console.log('✨ Generated assets/sda-showcase.gif with Sharp!');
}

async function main() {
    await recordHero();
    await recordSda();
}

main().catch(err => {
    console.error('❌ Error recording GIF:', err);
    process.exit(1);
});
