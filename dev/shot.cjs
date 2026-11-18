const { chromium } = require('playwright');
(async () => {
const [,, url, out, w='1400', h='1800'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto(url);
await p.waitForTimeout(1500);
await p.screenshot({ path: out, fullPage: true });
console.log('errors:', JSON.stringify(errs));
await b.close();
})();
