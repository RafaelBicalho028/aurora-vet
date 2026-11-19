// E2E do sistema de dias: entra em casa andando, vê os pets, dorme, confere altas e novos pacientes,
// atende um paciente do dia no hospital e exporta o relatório de desempenho.
// Uso: SP=<pasta de capturas> URL=http://localhost:5173/ node dev/e2e-dias.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const { playCase } = require('./e2e-full.cjs');
const SP = process.env.SP || '.';
const CASES = Object.fromEntries(fs.readdirSync('src/content/cases').map((f) => { const c = JSON.parse(fs.readFileSync('src/content/cases/' + f)); return [c.id, c]; }));

/** Mesmo princípio de dailyCase(): troca nomes do tutor e do animal em todos os textos. */
function variant(base, p) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = (s) => new RegExp(`(?<![\\p{L}])${esc(s)}(?![\\p{L}])`, 'gu');
  const last = (s) => s.split(/\s+/).pop();
  const rep = (s) => s.replace(word(base.patient.tutorName), p.tutorName).replace(word(last(base.patient.tutorName)), last(p.tutorName)).replace(word(base.patient.name), p.name);
  const walk = (v) => (typeof v === 'string' ? rep(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  return walk(base);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const st = () => p.evaluate(() => { const d = window.__vetquest.state.data; return { map: d.player.mapId, x: d.player.x, y: d.player.y, dia: d.calendar.day, periodo: d.calendar.period }; });
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
  const sleep = async () => {
    await warp('casa', 2, 3, 'left'); // ao lado da cama
    await pressTalk(); await talk(/Dormir/);
    await p.waitForSelector('.sleep', { timeout: 4000 });
    const txt = await p.locator('.sleep').innerText();
    await p.click('.sleep .btn-primary');
    await p.waitForTimeout(400);
    return txt;
  };

  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1200);
  await p.click('text=Novo jogo');
  await p.fill('.name-input', 'Lia');
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(500);
  await p.click('.pet-chooser .menu-footer .btn-primary'); // adota o pet sugerido como companheiro
  await p.waitForTimeout(1200);
  await talk();
  // um segundo pet, que fica em casa
  await p.evaluate(() => window.__vetquest.state.adoptPet('gato_frajola', 'Pretinha'));
  console.log('HUD:', await p.locator('.hud-day').innerText());

  // anda até a porta de casa (15,25) a partir da calçada
  await warp('campus', 15, 27, 'up');
  await hold('KeyW', 800);
  console.log('em casa:', JSON.stringify(await st()));
  await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/dias-casa.png' });

  // 1ª noite: ainda sem casos resolvidos → sem pacientes extras
  console.log('--- 1ª noite ---\n' + (await sleep()));
  console.log('depois de dormir:', JSON.stringify(await st()));

  // simula o atendimento do Thor aprovado (história)
  await p.evaluate(() => {
    const s = window.__vetquest.state;
    s.data.caseHistory.push({ caseId: 'caso_thor_prurido', title: 'Thor', kind: 'clinical', date: Date.now(), attempt: 1, total: 100, sections: { anamnesis: 20, physicalExam: 20, tests: 20, diagnosis: 20, conduct: 20 }, sectionMax: { anamnesis: 20, physicalExam: 20, tests: 20, diagnosis: 20, conduct: 20 }, criticalErrors: [], reviewTopics: [], xpGained: 0, disciplines: ['clinica'] });
  });
  const second = await sleep();
  console.log('--- 2ª noite ---\n' + second);
  await p.screenshot({ path: SP + '/dias-bomdia.png' });
  const patients = await p.evaluate(() => window.__vetquest.state.data.calendar.patients);
  console.log('pacientes do dia:', JSON.stringify(patients.map((x) => [x.name, x.tutorName, x.caseId, x.location, x.slot])));

  // hospital: o Sr. Joaquim e o Thor receberam alta; o paciente do dia espera no lugar dele
  const pat = patients.find((x) => x.location === 'hospital' && x.slot === 0) || patients[0];
  await warp('hospital', 13, 9 + pat.slot * 2, 'left');
  await p.screenshot({ path: SP + '/dias-hospital.png' });
  const npcsNoHospital = await p.evaluate(() => window.__vetquest.game.scene.getScene('World').npcs.map((n) => n.id));
  console.log('NPCs no hospital:', JSON.stringify(npcsNoHospital));
  await pressTalk(); await talk(/começar o atendimento/);
  await p.waitForSelector('.case-main', { timeout: 5000 });
  console.log('caso aberto:', (await p.locator('.case-head h2, .case-title, h1, h2').first().innerText()).slice(0, 90));
  await playCase(p, variant(CASES[pat.caseId], pat), 'dia');
  console.log('após o atendimento:', JSON.stringify(await st()), 'status:', await p.evaluate((u) => window.__vetquest.state.data.calendar.patients.find((x) => x.uid === u)?.status, pat.uid));

  // relatório de desempenho e exportação
  await p.keyboard.press('KeyP'); await p.waitForTimeout(500);
  await p.click('text=Estatísticas e exportação');
  await p.waitForSelector('.report');
  await p.screenshot({ path: SP + '/dias-relatorio.png' });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }), p.click('text=Baixar planilha (CSV)')]);
  const csvPath = SP + '/' + dl.suggestedFilename();
  await dl.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, 'utf8');
  console.log('CSV baixado:', dl.suggestedFilename(), '\n' + csv.split('\r\n').slice(0, 12).join('\n'));
  console.log('status:', await p.locator('.report [role=status]').innerText());
  console.log('erros:', JSON.stringify(errs));
  await b.close();
})();
