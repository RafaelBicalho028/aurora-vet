// E2E da Etapa 2: simula o fim da Etapa 1, atravessa o Portão Sul andando, chega à Vila dos Animais,
// entra na clínica, atende o Bidu e a Luna e conclui as missões do pet shop e do centro de adoção.
// Uso: SP=<pasta de capturas> URL=http://localhost:5173/ node dev/e2e-vila.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const { playCase } = require('./e2e-full.cjs');
const SP = process.env.SP || '.';
const bidu = JSON.parse(fs.readFileSync('src/content/cases/bidu-erliquiose.json'));
const luna = JSON.parse(fs.readFileSync('src/content/cases/luna-permetrina.json'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const st = () => p.evaluate(() => { const d = window.__vetquest.state.data; return { map: d.player.mapId, x: d.player.x, y: d.player.y }; });
  const quests = () => p.evaluate(() => Object.fromEntries(Object.entries(window.__vetquest.state.data.quests).filter(([k]) => k.startsWith('q_vila')).map(([k, v]) => [k, v.status])));
  const talk = async (pick) => {
    for (let i = 0; i < 60; i++) {
      if (!(await p.$('.dialogue'))) return;
      const ch = await p.$$('.dlg-choice');
      if (ch.length) {
        const t = await Promise.all(ch.map((c) => c.innerText()));
        const idx = pick ? t.findIndex((x) => pick.test(x)) : 0;
        await ch[idx >= 0 ? idx : 0].click();
      } else await p.keyboard.press('KeyE');
      await p.waitForTimeout(110);
    }
  };
  const pressTalk = async () => { for (let i = 0; i < 5 && !(await p.$('.dialogue')); i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(350); } };
  const warp = async (m, x, y, f) => { await p.evaluate(([a, b2, c, d]) => window.__vetquest.game.scene.getScene('World').warp(a, b2, c, d), [m, x, y, f]); await p.waitForTimeout(900); };
  const hold = async (key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(500); };

  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1200);
  await p.click('text=Novo jogo');
  await p.fill('.name-input', 'Rui');
  await p.click('.chip:has-text("Masculino")');
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(500);
  await p.click('.pet-chooser >> text=Agora não');
  await p.waitForTimeout(1200);
  await talk();

  // Portão Sul fechado na Etapa 1
  await warp('campus', 21, 31, 'down');
  await hold('KeyS', 900);
  console.log('Etapa 1, tentando passar o portão:', JSON.stringify(await st()));

  // simula a conclusão da Etapa 1 (save antigo: missão concluída, sem a liberação)
  await p.evaluate(() => {
    const s = window.__vetquest.state;
    s.data.totalXp = 3200;
    s.data.quests['q_proxima_etapa'] = { status: 'completed', objectives: { o_revisao: true, o_nivel: true }, startedAt: Date.now() };
    s.ensureQuestChain();
    s.save();
  });
  await warp('campus', 21, 30, 'down'); // recarrega o campus (portões abertos)
  await p.screenshot({ path: SP + '/vila-portao.png' });
  await hold('KeyS', 1400);
  console.log('Etapa 2, atravessando o portão:', JSON.stringify(await st()));
  console.log('HUD:', await p.locator('.hud-stage').first().innerText().catch(() => '?'));
  await hold('KeyS', 400);
  await p.screenshot({ path: SP + '/vila-chegada.png' });

  // entra na clínica andando pela porta (26,11)
  await warp('vila', 26, 13, 'up');
  await hold('KeyW', 900);
  console.log('dentro da clínica:', JSON.stringify(await st()));
  // Dr. Marcos (10,5): fala de (10,6)
  await warp('clinica_vila', 10, 6, 'up');
  await pressTalk(); await talk();
  console.log('missões:', JSON.stringify(await quests()));
  await p.screenshot({ path: SP + '/vila-clinica.png' });

  // Bidu: Dona Cida em (3,7), fala de (3,6) olhando para baixo
  await warp('clinica_vila', 3, 6, 'down');
  await pressTalk(); await talk(/começar o atendimento/);
  await p.waitForSelector('.case-main', { timeout: 5000 });
  await playCase(p, bidu, 'bidu');
  await warp('clinica_vila', 10, 6, 'up');
  await pressTalk(); await talk();

  // Luna: Gabriel em (3,10), fala de (3,9) olhando para baixo
  await warp('clinica_vila', 3, 9, 'down');
  await pressTalk(); await talk(/atender a Luna/);
  await p.waitForSelector('.case-main', { timeout: 5000 });
  await playCase(p, luna, 'luna');
  await warp('clinica_vila', 10, 6, 'up');
  await pressTalk(); await talk();
  console.log('missões:', JSON.stringify(await quests()));

  // Pet shop: Seu Hiro atrás do balcão (8,3); fala de (8,5) através do balcão — escolhe só as respostas certas
  await warp('petshop', 8, 5, 'up');
  await pressTalk(); await talk(/Só produtos|Não: anti|Tratar todos/);
  await p.screenshot({ path: SP + '/vila-petshop.png' });
  // Centro de adoção: Tânia (8,3), fala de (8,4)
  await warp('adocao', 8, 4, 'up');
  await pressTalk(); await talk(/Evita ninhadas/);
  console.log('missões:', JSON.stringify(await quests()));
  await p.keyboard.press('KeyM'); await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/vila-mapa.png' });
  console.log('erros:', JSON.stringify(errs));
  await b.close();
})();
