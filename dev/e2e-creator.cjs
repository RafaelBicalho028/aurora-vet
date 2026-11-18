// Verifica a criação de personagem e captura a prévia.
const { chromium } = require('playwright');
const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('dialog', (d) => d.accept());
  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1200);
  await p.click('text=Novo jogo');
  await p.fill('.name-input', 'Bea');
  await p.click('.chip:has-text("Cacheado")');
  await p.click('.chip:has-text("Com óculos")');
  await p.click('.swatch[aria-label="Roxo"]');
  await p.waitForTimeout(500);
  await p.screenshot({ path: SP + '/creator.png' });
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(1000);
  console.log(JSON.stringify(await p.evaluate(() => window.__vetquest.state.data.player.appearance)));
  await b.close();
})();
