import puppeteer from 'puppeteer';
import { GifWriter } from 'omggif';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const demoUrl = 'file:///' + join(root, 'demo/index.html').replace(/\\/g, '/');

async function record() {
    console.log('🚀 Launching Puppeteer for Animated GIF Recording...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    const width = 860;
    const height = 480;
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    console.log('📄 Loading page:', demoUrl);
    await page.goto(demoUrl, { waitUntil: 'networkidle0' });

    // Click Replay button to start clean from t = 0
    await page.click('#btn-replay-all');

    const frames = [];
    const totalDurationMs = 3800;
    const frameIntervalMs = 70; // ~14 fps
    const totalFrames = Math.floor(totalDurationMs / frameIntervalMs);

    console.log(`🎬 Capturing ${totalFrames} frames...`);

    for (let f = 0; f < totalFrames; f++) {
        const heroBox = await page.$('#section-hero');
        if (heroBox) {
            // Read screenshot as raw RGBA pixels via canvas in browser context
            const rgbaArray = await page.evaluate(() => {
                return new Promise((resolve) => {
                    const hero = document.getElementById('section-hero');
                    const rect = hero.getBoundingClientRect();
                    
                    // Use HTML2Canvas or rasterize into an offscreen canvas
                    // Direct screencast buffer via SVG foreignObject or page snapshot
                    resolve(null);
                });
            });
        }
        await new Promise(r => setTimeout(r, frameIntervalMs));
    }

    await browser.close();
}

record().catch(console.error);
