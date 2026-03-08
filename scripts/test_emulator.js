const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

    page.on('response', response => {
        if (!response.ok()) {
            console.warn('NETWORK ERROR:', response.status(), response.url());
        }
    });

    page.on('requestfailed', request => {
        console.error('REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    console.log('Navigating to http://localhost:3000/emulator.html ...');
    await page.goto('http://localhost:3000/emulator.html', { waitUntil: 'networkidle0' });

    console.log('Posting START_EMULATOR message...');
    await page.evaluate(() => {
        // Create a dummy ROM payload
        const dummyRom = new Uint8Array([0x00, 0x01, 0x02]);
        window.postMessage({
            type: 'START_EMULATOR',
            core: 'vice_x64sc',
            fileData: dummyRom,
            fileName: 'test.d64'
        }, '*');
    });

    console.log('Waiting 5 seconds for emulation sequence...');
    await new Promise(r => setTimeout(r, 5000));

    await browser.close();
    console.log('Done.');
})();
