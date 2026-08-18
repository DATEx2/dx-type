import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const demoUrl = 'file:///' + join(root, 'demo/index.html').replace(/\\/g, '/');

async function capture() {
    console.log('🚀 Launching Puppeteer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });

    console.log('📄 Navigating to:', demoUrl);
    await page.goto(demoUrl, { waitUntil: 'networkidle0' });

    // Wait 3.5s for initial hero typing, reveal, and odometer roll to settle
    console.log('⏳ Waiting for hero animation to complete...');
    await new Promise(r => setTimeout(r, 3500));

    // Capture Hero Section
    const heroEl = await page.$('#section-hero');
    if (heroEl) {
        console.log('📸 Capturing Hero section...');
        await heroEl.screenshot({ path: join(root, 'assets/hero-preview.png') });
    }

    // Scroll smoothly to SDA section
    console.log('📜 Scrolling to SDA section...');
    await page.evaluate(() => {
        const sda = document.getElementById('section-sda');
        if (sda) sda.scrollIntoView({ behavior: 'smooth' });
    });

    // Wait 2.5s for scroll-triggered animations to complete
    console.log('⏳ Waiting for SDA animations to complete...');
    await new Promise(r => setTimeout(r, 2500));

    // Capture SDA Section
    const sdaEl = await page.$('#section-sda');
    if (sdaEl) {
        console.log('📸 Capturing SDA section...');
        await sdaEl.screenshot({ path: join(root, 'assets/sda-preview.png') });
    }

    console.log('📸 Capturing Full Page...');
    await page.screenshot({ path: join(root, 'assets/full-showcase.png'), fullPage: false });

    await browser.close();
    console.log('✨ All screenshots captured successfully!');
}

capture().catch(err => {
    console.error('❌ Error during capture:', err);
    process.exit(1);
});
