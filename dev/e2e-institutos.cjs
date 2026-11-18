// E2E das disciplinas: caminha do campus ao Setor dos Institutos pela avenida oeste, entra em um
// prédio pela porta, assiste à aula (quadros clínicos) e faz o questionário com cada professor.
const { chromium } = require('playwright');
const { answerBankQuiz } = require('./e2e-full.cjs');
const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const st = () => p.evaluate(() => { const d = window.__vetquest.state.data; return { map: d.player.mapId, x: d.player.x, y: d.player.y }; });
  const talk = async (pick) => {
    for (let i = 0; i < 60; i++) {
      if (!(await p.$('.dialogue'))) return;
      const ch = await p.$$('.dlg-choice');
      if (ch.length) {
        const t = await Promise.all(ch.map((c) => c.innerText()));
        const idx = pick ? t.findIndex((x) => pick.test(x)) : 0;
        await ch[idx >= 0 ? idx : t.length - 1].click();
      } else await p.keyboard.press('KeyE');
      await p.waitForTimeout(100);
    }
  };
  const warp = async (m, x, y, f) => { await p.evaluate(([a, b2, c, d]) => window.__vetquest.game.scene.getScene('World').warp(a, b2, c, d), [m, x, y, f]); await p.waitForTimeout(900); };
  const pressTalk = async () => { for (let i = 0; i < 5 && !(await p.$('.dialogue')); i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(350); } };
  const hold = async (key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(400); };
  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1200);
  await p.click('text=Novo jogo');
  await p.fill('.name-input', 'Ana');
  await p.click('.chip:has-text("Feminino")');
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(500);
  await p.click('.pet-chooser >> text=Agora não');
  await p.waitForTimeout(1200);
  await talk();
  // anda pela avenida até a saída oeste do campus
  await warp('campus', 4, 17, 'left');
  await hold('KeyA', 1600);
  console.log('após a saída oeste:', JSON.stringify(await st()));
  await p.screenshot({ path: SP + '/inst-setor.png' });
  // entra no Instituto de Parasitologia andando pela porta (8,8)
  await warp('institutos', 8, 10, 'up');
  await hold('KeyW', 800);
  console.log('dentro do prédio:', JSON.stringify(await st()));

  const rooms = ['fisiologia', 'microbiologia', 'parasitologia', 'farmacologia', 'patologia', 'cirurgia', 'saude_publica'];
  let shot = false;
  for (const room of rooms) {
    await warp(room, 8, 4, 'up');
    if (room === 'cirurgia') await p.screenshot({ path: SP + '/inst-sala.png' });
    await pressTalk();
    await talk(/quadros clínicos/);
    try { await p.waitForSelector('.lesson', { timeout: 4000 }); } catch (e) { await p.screenshot({ path: SP + '/inst-falha.png' }); console.log('falha em', room, JSON.stringify(await st()), await p.evaluate(() => document.querySelector('.dialogue')?.innerText)); throw e; }
    for (let i = 0; i < 6; i++) {
      if (await p.locator('.lesson >> text=Revelar resposta').count()) await p.click('.lesson >> text=Revelar resposta');
      if (!shot && i === 1) { await p.screenshot({ path: SP + '/inst-aula.png' }); shot = true; }
      const label = await p.locator('.lesson .menu-footer .btn-primary').innerText();
      await p.click('.lesson .menu-footer .btn-primary');
      await p.waitForTimeout(150);
      if (/Concluir/.test(label)) break;
    }
    await p.click('.lesson .menu-footer .btn-primary'); // Fechar
    await p.waitForTimeout(500);
    if (room !== 'fisiologia') {
      await pressTalk();
      await talk(/questionário/);
      await p.waitForTimeout(400);
      console.log(room, 'questionário aprovado?', await answerBankQuiz(p));
      await p.waitForTimeout(400);
    }
  }
  const quests = await p.evaluate(() => Object.fromEntries(Object.entries(window.__vetquest.state.data.quests).filter(([k]) => k.startsWith('q_disc')).map(([k, v]) => [k, v.status])));
  console.log('missões de disciplina:', JSON.stringify(quests));
  // mapa (M) dentro de uma sala do setor
  await p.keyboard.press('KeyM'); await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/inst-mapa.png' });
  console.log('erros:', JSON.stringify(errs));
  await b.close();
})();
