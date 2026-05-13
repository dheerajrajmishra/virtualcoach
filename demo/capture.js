const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'screenshots');

const SHOTS = [
  // CMS screens
  { name: 'cms-home',       url: 'http://localhost:3000/',              wait: 2500, full: false },
  { name: 'cms-dashboard',  url: 'http://localhost:3000/dashboard',     wait: 3000, full: false },
  { name: 'cms-assignments',url: 'http://localhost:3000/assignments',   wait: 2500, full: false },
  { name: 'cms-processing', url: 'http://localhost:3000/processing',    wait: 2000, full: false },
  // Mobile web (Expo web)
  { name: 'mobile-home',    url: 'http://localhost:8083/',              wait: 4000, full: false, mobile: true },
];

(async () => {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  for (const shot of SHOTS) {
    try {
      console.log(`Capturing: ${shot.name} → ${shot.url}`);
      const page = await browser.newPage();

      if (shot.mobile) {
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
      } else {
        await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
      }

      await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, shot.wait));

      const outPath = path.join(OUT, `${shot.name}.png`);
      await page.screenshot({
        path: outPath,
        fullPage: shot.full || false,
        type: 'png',
      });
      console.log(`  ✓ Saved: ${outPath}`);
      await page.close();
    } catch (e) {
      console.error(`  ✗ Failed ${shot.name}: ${e.message}`);
    }
  }

  // Extra CMS shots — dashboard tabs
  const extraTabs = [
    { name: 'cms-dash-trainings',  click: '[data-tab="trainings"], button:nth-child(2)' },
    { name: 'cms-dash-missed',     click: '[data-tab="missed"]' },
    { name: 'cms-dash-quiz',       click: '[data-tab="quiz"]' },
  ];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    // Take one clean full dashboard screenshot
    await page.screenshot({ path: path.join(OUT, 'cms-dashboard-full.png'), type: 'png' });
    console.log('  ✓ Saved: cms-dashboard-full.png');
    await page.close();
  } catch(e) { console.error('Dashboard extra:', e.message); }

  await browser.close();
  console.log('\nAll done. Screenshots in:', OUT);
})();
