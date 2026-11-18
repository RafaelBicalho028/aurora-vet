// Roteiro E2E de fumaça: título -> criação -> mundo -> diálogo
const { chromium } = require('playwright');
const SP = process.env.SP;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.type()+': '+m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('dialog', d => d.accept());
  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + '/e1_title.png' });
  await p.click('text=Novo jogo');
  await p.waitForTimeout(400);
  await p.fill('.name-input', 'Ana');
  await p.screenshot({ path: SP + '/e2_creator.png' });
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: SP + '/e3_world_intro.png' });
  for (let i = 0; i < 12; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(150); }
  await p.waitForTimeout(500);
  await p.screenshot({ path: SP + '/e4_world.png' });
  console.log(JSON.stringify(errs, null, 1));
  await b.close();
})();
