import puppeteer from 'puppeteer';
import { GifWriter } from 'omggif';
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const demoUrl = 'file:///' + join(root, 'demo/index.html').replace(/\\/g, '/');

// Simple NeuQuant or 256-color median cut / palette quantization for fast, crisp GIF encoding
function buildPaletteAndIndexedPixels(rgbaBuffer, width, height) {
    const paletteMap = new Map();
    const palette = [];
    const indexedPixels = new Uint8Array(width * height);

    // Reserved background color index 0
    palette.push(0x0b0f19); // #0b0f19
    paletteMap.set('11,15,25', 0);

    for (let i = 0; i < rgbaBuffer.length; i += 4) {
        const r = rgbaBuffer[i];
        const g = rgbaBuffer[i + 1];
        const b = rgbaBuffer[i + 2];
        const a = rgbaBuffer[i + 3];

        if (a < 128) {
            indexedPixels[i / 4] = 0;
            continue;
        }

        // Quantize colors slightly to fit into 256 palette
        const qr = (r >> 3) << 3;
        const qg = (g >> 3) << 3;
        const qb = (b >> 3) << 3;
        const key = `${qr},${qg},${qb}`;

        let idx = paletteMap.get(key);
        if (idx === undefined) {
            if (palette.length < 256) {
                idx = palette.length;
                const rgbNum = (qr << 16) | (qg << 8) | qb;
                palette.push(rgbNum);
                paletteMap.set(key, idx);
            } else {
                // Find nearest existing color in palette
                let minDist = Infinity;
                let bestIdx = 0;
                for (let p = 0; p < palette.length; p++) {
                    const pr = (palette[p] >> 16) & 0xff;
                    const pg = (palette[p] >> 8) & 0xff;
                    const pb = palette[p] & 0xff;
                    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
                    if (dist < minDist) {
                        minDist = dist;
                        bestIdx = p;
                    }
                }
                idx = bestIdx;
            }
        }
        indexedPixels[i / 4] = idx;
    }

    // Pad palette to power of 2 (min 256)
    while (palette.length < 256) {
        palette.push(0);
    }

    return { palette, indexedPixels };
}

async function recordHero() {
    console.log('🚀 Launching Puppeteer for Exact Hero Animation Capture...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const vpWidth = 1000;
    const vpHeight = 850;
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
            width: Math.min(1000, Math.ceil(r.width)),
            height: Math.min(850, Math.ceil(r.height))
        };
    });

    console.log('📐 Hero Bounding Box:', heroBox);

    // Click Replay All
    await page.click('#btn-replay-all');

    const totalDurationMs = 3800;
    const frameIntervalMs = 80;
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames for Hero GIF...`);
    const capturedPngBuffers = [];

    for (let f = 0; f < totalFrames; f++) {
        const buf = await page.screenshot({ type: 'png', clip: heroBox });
        capturedPngBuffers.push(buf);
        await new Promise(r => setTimeout(r, frameIntervalMs));
    }

    await page.screenshot({ path: join(root, 'assets/hero-preview.png'), clip: heroBox });
    console.log('📸 Saved assets/hero-preview.png');

    await browser.close();

    console.log('🔄 Encoding frames to Animated GIF...');
    const decodedFrames = capturedPngBuffers.map(buf => PNG.sync.read(Buffer.from(buf)));

    const width = heroBox.width;
    const height = heroBox.height;

    const sampleBuffer = decodedFrames[Math.floor(decodedFrames.length / 2)].data;
    const { palette } = buildPaletteAndIndexedPixels(sampleBuffer, width, height);

    const gifBuffer = Buffer.alloc(width * height * decodedFrames.length + 2048 * 1024);
    const writer = new GifWriter(gifBuffer, width, height, { loop: 0, palette });

    for (let i = 0; i < decodedFrames.length; i++) {
        const frame = decodedFrames[i];
        const indexed = new Uint8Array(width * height);
        for (let p = 0; p < indexed.length; p++) {
            const r = frame.data[p * 4];
            const g = frame.data[p * 4 + 1];
            const b = frame.data[p * 4 + 2];
            
            let minDist = Infinity;
            let bestIdx = 0;
            for (let palIdx = 0; palIdx < palette.length; palIdx++) {
                const pr = (palette[palIdx] >> 16) & 0xff;
                const pg = (palette[palIdx] >> 8) & 0xff;
                const pb = palette[palIdx] & 0xff;
                const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    bestIdx = palIdx;
                    if (dist === 0) break;
                }
            }
            indexed[p] = bestIdx;
        }
        writer.addFrame(0, 0, width, height, indexed, { delay: Math.round(frameIntervalMs / 10) });
    }

    const finalGif = gifBuffer.subarray(0, writer.end());
    writeFileSync(join(root, 'assets/hero-animated.gif'), finalGif);
    console.log(`✨ Generated assets/hero-animated.gif (${(finalGif.length / 1024).toFixed(1)} KB)!`);
}

async function recordSda() {
    console.log('🚀 Launching Puppeteer for SDA Animation Capture...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const vpWidth = 1000;
    const vpHeight = 900;
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
            width: Math.min(1000, Math.ceil(r.width)),
            height: Math.min(850, Math.ceil(r.height))
        };
    });

    console.log('📐 SDA Bounding Box:', sdaBox);

    const totalDurationMs = 3000;
    const frameIntervalMs = 90;
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames for SDA GIF...`);
    const capturedPngBuffers = [];

    for (let f = 0; f < totalFrames; f++) {
        const buf = await page.screenshot({ type: 'png', clip: sdaBox });
        capturedPngBuffers.push(buf);
        await new Promise(r => setTimeout(r, frameIntervalMs));
    }

    await page.screenshot({ path: join(root, 'assets/sda-preview.png'), clip: sdaBox });
    console.log('📸 Saved assets/sda-preview.png');

    await browser.close();

    console.log('🔄 Encoding SDA frames to Animated GIF...');
    const decodedFrames = capturedPngBuffers.map(buf => PNG.sync.read(Buffer.from(buf)));

    const width = sdaBox.width;
    const height = sdaBox.height;

    const sampleBuffer = decodedFrames[Math.floor(decodedFrames.length / 2)].data;
    const { palette } = buildPaletteAndIndexedPixels(sampleBuffer, width, height);

    const gifBuffer = Buffer.alloc(width * height * decodedFrames.length + 2048 * 1024);
    const writer = new GifWriter(gifBuffer, width, height, { loop: 0, palette });

    for (let i = 0; i < decodedFrames.length; i++) {
        const frame = decodedFrames[i];
        const indexed = new Uint8Array(width * height);
        for (let p = 0; p < indexed.length; p++) {
            const r = frame.data[p * 4];
            const g = frame.data[p * 4 + 1];
            const b = frame.data[p * 4 + 2];
            
            let minDist = Infinity;
            let bestIdx = 0;
            for (let palIdx = 0; palIdx < palette.length; palIdx++) {
                const pr = (palette[palIdx] >> 16) & 0xff;
                const pg = (palette[palIdx] >> 8) & 0xff;
                const pb = palette[palIdx] & 0xff;
                const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    bestIdx = palIdx;
                    if (dist === 0) break;
                }
            }
            indexed[p] = bestIdx;
        }
        writer.addFrame(0, 0, width, height, indexed, { delay: Math.round(frameIntervalMs / 10) });
    }

    const finalGif = gifBuffer.subarray(0, writer.end());
    writeFileSync(join(root, 'assets/sda-animated.gif'), finalGif);
    console.log(`✨ Generated assets/sda-animated.gif (${(finalGif.length / 1024).toFixed(1)} KB)!`);
}

async function main() {
    await recordHero();
    await recordSda();
}

main().catch(err => {
    console.error('❌ Error recording GIF:', err);
    process.exit(1);
});
