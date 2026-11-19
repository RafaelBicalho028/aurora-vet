// E2E das missões secundárias: fazenda-escola (interação por cima da cerca), Profa. Lívia e biblioteca.
const { chromium } = require('playwright');
const { devLogin } = require('./e2e-auth.cjs');
const { answerBankQuiz } = require('./e2e-full.cjs');
const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  const quests = () => p.evaluate(() => Object.fromEntries(Object.entries(window.__vetquest.state.data.quests).map(([k, v]) => [k, v.status + ' ' + JSON.stringify(v.objectives)])));
  const talk = async (pick) => {
    for (let i = 0; i < 60; i++) {
      if (!(await p.$('.dialogue'))) return;
      const ch = await p.$$('.dlg-choice');
      if (ch.length) {
        const t = await Promise.all(ch.map((c) => c.innerText()));
        const idx = pick ? t.findIndex((x) => pick.test(x)) : 0;
        await ch[idx >= 0 ? idx : 0].click();
      } else await p.keyboard.press('KeyE');
      await p.waitForTimeout(100);
    }
  };
  const warp = async (m, x, y, f) => { await p.evaluate(([a, b2, c, d]) => window.__vetquest.game.scene.getScene('World').warp(a, b2, c, d), [m, x, y, f]); await p.waitForTimeout(900); };
  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1200);
  await devLogin(p); // contas: entra antes de jogar
  await p.click('text=Novo jogo');
  await p.fill('.name-input', 'Caio');
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(500);
  await p.click('.pet-chooser >> text=Agora não');
  await p.waitForTimeout(1200);
  await talk();
  // Seu Antônio (31,10): fica em (31,11) olhando para cima
  await warp('campus', 31, 11, 'up');
  await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
  await talk(/Quero sim/);
  // observa animais por cima da cerca (linha y=8): encontra coluna alinhada com cada animal
  for (const id of ['estrela', 'ovelha1']) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const a = await p.evaluate((aid) => { const s = window.__vetquest.game.scene.getScene('World'); const an = s.animals.find((x) => x.id === aid); return an && !an.moving ? [an.tx, an.ty] : null; }, id);
      if (!a) { await p.waitForTimeout(400); continue; }
      await warp('campus', a[0], 9, 'up');
      const again = await p.evaluate((aid) => { const s = window.__vetquest.game.scene.getScene('World'); const an = s.animals.find((x) => x.id === aid); return [an.tx, an.ty]; }, id);
      if (again[0] !== a[0]) continue;
      await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
      if (await p.$('.dialogue')) { await p.screenshot({ path: `${SP}/side_${id}.png` }); await talk(); break; }
    }
  }
  // Profa. Lívia, no Instituto de Fisiologia (8,3): fica em (8,4) olhando para cima
  await warp('fisiologia', 8, 4, 'up');
  await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
  await talk(/sinais vitais/);
  await p.waitForTimeout(400);
  console.log('quiz Lívia ok?', await answerBankQuiz(p));
  // Júlia (26,15): fica em (25,15) olhando para a direita e adota um gato siamês
  await warp('campus', 25, 15, 'right');
  await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
  await talk(/adotar/);
  await p.waitForTimeout(400);
  await p.click('.pet-tabs >> text=Gatos');
  await p.click('.pet-cell:has-text("Siamês")');
  await p.fill('#pet-name', 'Sushi');
  await p.click('.pet-chooser .menu-footer .btn-primary');
  await p.waitForTimeout(500);
  // anda alguns passos e verifica que o pet acompanha
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(600); await p.keyboard.up('ArrowDown'); await p.waitForTimeout(300);
  const fol = await p.evaluate(() => { const s = window.__vetquest.game.scene.getScene('World'); const pl = window.__vetquest.state.data.player; return { pet: s.pet && [s.pet.tx, s.pet.ty], player: [pl.x, pl.y] }; });
  console.log('pet segue:', JSON.stringify(fol));
  // faz carinho: vira para o pet
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(200); await p.keyboard.press('KeyE'); await p.waitForTimeout(400);
  await p.screenshot({ path: SP + '/side_pet.png' });
  await talk();
  // Biblioteca: Bruno (5,7) -> fica em (5,8) olhando para cima; estantes em (1..6, 2)
  await warp('biblioteca', 5, 8, 'up');
  await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
  await talk(/Vou ler/);
  for (const x of [1, 3, 5]) { await warp('biblioteca', x, 3, 'up'); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); await talk(); }
  console.log(JSON.stringify(await quests(), null, 1));
  console.log('pets', JSON.stringify(await p.evaluate(() => window.__vetquest.state.data.pets)));
  console.log('inventário', JSON.stringify(await p.evaluate(() => window.__vetquest.state.data.inventory)));
  console.log('erros', JSON.stringify(errs));
  await b.close();
})();
