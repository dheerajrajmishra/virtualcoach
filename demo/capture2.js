const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'screenshots');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), type: 'png' });
  console.log(`  ✓ ${name}.png`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  const desk = async () => {
    const p = await browser.newPage();
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    return p;
  };

  // ── Dashboard: Trainings tab
  {
    const p = await desk();
    await p.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    // Click Trainings tab
    await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const t = btns.find(b => b.textContent.trim().toLowerCase().startsWith('training'));
      if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await shot(p, 'cms-dash-trainings');
    await p.close();
  }

  // ── Dashboard: Missed FAQs tab
  {
    const p = await desk();
    await p.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const t = btns.find(b => b.textContent.toLowerCase().includes('faq') || b.textContent.toLowerCase().includes('missed'));
      if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await shot(p, 'cms-dash-faq');
    await p.close();
  }

  // ── Dashboard: Quiz Answers tab
  {
    const p = await desk();
    await p.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    await p.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const t = btns.find(b => b.textContent.toLowerCase().includes('quiz'));
      if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await shot(p, 'cms-dash-quiz');
    await p.close();
  }

  // ── Trainings list page
  {
    const p = await desk();
    await p.goto('http://localhost:3000/trainings', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    await shot(p, 'cms-trainings');
    await p.close();
  }

  // ── Preview page (first training if available)
  {
    const p = await desk();
    await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    // Try clicking first training card
    const firstLink = await p.$('a[href*="preview"]');
    if (firstLink) {
      await firstLink.click();
      await new Promise(r => setTimeout(r, 2500));
      await shot(p, 'cms-preview');
    }
    await p.close();
  }

  // ── Mobile: click first training to get player
  {
    const p = await browser.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await p.goto('http://localhost:8083/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 5000));
    // Try tapping the first training card
    try {
      const card = await p.$('[class*="training"], [class*="Training"], button, .pressable');
      if (card) {
        await card.tap();
        await new Promise(r => setTimeout(r, 3000));
        await shot(p, 'mobile-player');
      }
    } catch(e) {}
    // Also scroll down to show more cards
    await p.evaluate(() => window.scrollTo(0, 300));
    await new Promise(r => setTimeout(r, 500));
    await shot(p, 'mobile-home-scrolled');
    await p.close();
  }

  await browser.close();
  console.log('\nDone.');
})();
