// E2E completo: joga as missões principais de ponta a ponta no navegador real.
// Uso: SP=<pasta de capturas> URL=http://localhost:5173/ node dev/e2e-full.cjs
const { chromium } = require('playwright');
const { devLogin } = require('./e2e-auth.cjs');
const fs = require('fs');
const SP = process.env.SP || '.';
const thor = JSON.parse(fs.readFileSync('src/content/cases/thor-prurido.json'));
const mimi = JSON.parse(fs.readFileSync('src/content/cases/mimi-hiporexia.json'));
const pingo = JSON.parse(fs.readFileSync('src/content/cases/pingo-diarreia.json'));
const nino = JSON.parse(fs.readFileSync('src/content/cases/nino-obstrucao.json'));
const healthSrc = fs.readFileSync('src/content/petHealth.ts', 'utf8');
const DISTRACTOR_TEXTS = [...healthSrc.slice(healthSrc.indexOf('CARE_DISTRACTORS')).matchAll(/text: '([^']+)'/g)].map((m) => m[1]);
const mg = JSON.parse(fs.readFileSync('src/content/minigames/anatomia-intro.json'));
const bank = JSON.parse(fs.readFileSync('src/content/questionBank.json'));
const BANKQ = bank.pools.flatMap((pl) => pl.questions);
/** Responde um quiz do banco (modal .quiz) acertando tudo. */
async function answerBankQuiz(p) {
  if (await p.locator('.quiz >> text=Começar').count()) await p.click('.quiz >> text=Começar');
  for (let i = 0; i < 10; i++) {
    const done = p.locator('.quiz button.btn-primary', { hasText: /^Continuar$/ });
    if (await done.count()) { await done.click(); return true; }
    const prompt = (await p.locator('.quiz h3').innerText()).trim();
    const q = BANKQ.find((x) => x.prompt === prompt);
    await p.locator('.quiz .btn.option', { hasText: q.options[q.correctIndex] }).first().click();
    await p.click('.quiz .review-feedback .btn-primary');
  }
  return false;
}
module.exports = { answerBankQuiz, playCase };
const log = (...a) => console.log('•', ...a);

async function playCase(p, c, tag, mistakes = false) {
  // A: perguntas não irrelevantes (em rodadas, para liberar perguntas de aprofundamento)
  for (let round = 0; round < 3; round++) {
    for (const q of c.anamnesis.questions) {
      if (q.relevance === 'irrelevant') continue;
      const btn = p.locator('.q-btn:not([disabled])', { hasText: q.text });
      if (await btn.count()) { await btn.first().click(); await p.waitForTimeout(30); }
    }
  }
  await p.screenshot({ path: `${SP}/c_${tag}_A.png` });
  await p.click('text=Encerrar anamnese');
  // B: avalia tudo e interpreta (um erro proposital se mistakes)
  for (let i = 0; i < 40; i++) {
    const b = p.locator('.exam-item .btn.small');
    if (!(await b.count())) break;
    await b.first().click();
  }
  let n = 0;
  for (const it of c.physicalExam.items) {
    const card = p.locator('.exam-item', { has: p.locator('.exam-label', { hasText: it.label }) }).first();
    const wrong = mistakes && n++ === 0;
    const want = (it.status === 'normal') !== wrong ? 'Normal' : 'Alterado';
    await card.locator('.chip', { hasText: want }).click();
  }
  await p.screenshot({ path: `${SP}/c_${tag}_B.png` });
  await p.click('text=Seguir → Exames complementares');
  // C: exames indicados (pré-requisitos primeiro)
  const ind = c.tests.items.filter((t) => t.category === 'indicated').sort((a, b) => (a.requires ? a.requires.length : 0) - (b.requires ? b.requires.length : 0));
  for (const t of ind) await p.locator('.test', { has: p.locator('strong', { hasText: t.name }) }).first().locator('text=Solicitar').click();
  await p.screenshot({ path: `${SP}/c_${tag}_C.png` });
  await p.click('text=Seguir → Diagnóstico');
  // D
  for (const id of c.diagnosis.expectedDifferentials) {
    const hname = c.diagnosis.hypotheses.find((x) => x.id === id).name;
    await p.locator('.chip', { hasText: hname }).first().click();
  }
  const correct = c.diagnosis.hypotheses.find((x) => x.id === c.diagnosis.correctId).name;
  await p.locator('.radio', { hasText: correct }).locator('input').click();
  for (const k of c.diagnosis.keyEvidence) {
    const label = c.findings.find((f) => f.id === k).label;
    await p.locator('.check', { hasText: label }).locator('input').click();
  }
  await p.screenshot({ path: `${SP}/c_${tag}_D.png` });
  await p.click('text=Confirmar → Conduta');
  // E
  for (const o of c.conduct.options.filter((x) => x.category === 'correct')) {
    await p.locator('.conduct', { hasText: o.text }).locator('input').click();
  }
  if (await p.locator('.pharm summary').count()) await p.locator('.pharm summary').first().click();
  await p.screenshot({ path: `${SP}/c_${tag}_E.png` });
  await p.click('text=Finalizar atendimento');
  await p.click('.confirm-box .btn-primary');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${SP}/c_${tag}_F.png` });
  console.log('• nota', tag, await p.locator('.score-num').innerText());
  await p.click('text=Concluir e voltar');
  await p.waitForTimeout(400);
}

if (require.main === module) (async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('dialog', (d) => d.accept());
  const state = () => p.evaluate(() => { const s = window.__vetquest.state.data; return { map: s.player.mapId, x: s.player.x, y: s.player.y, xp: s.totalXp, quests: Object.fromEntries(Object.entries(s.quests).map(([k, v]) => [k, v.status])) }; });
  const press = async (k, n = 1, wait = 120) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(wait); } };
  const talkUntilClosed = async (pick) => {
    for (let i = 0; i < 80; i++) {
      if (!(await p.$('.dialogue'))) return;
      const choices = await p.$$('.dlg-choice');
      if (choices.length) {
        const texts = await Promise.all(choices.map((c) => c.innerText()));
        const idx = pick ? texts.findIndex((t) => pick.test(t)) : 0;
        await choices[idx >= 0 ? idx : 0].click();
      } else await p.keyboard.press('KeyE');
      await p.waitForTimeout(110);
    }
  };
  const warp = async (map, x, y, facing) => { await p.evaluate(([m, xx, yy, f]) => window.__vetquest.game.scene.getScene('World').warp(m, xx, yy, f), [map, x, y, facing]); await p.waitForTimeout(900); };
  const hold = async (key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(300); };

  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForTimeout(1200);
  await devLogin(p); // contas: entra antes de jogar
  await p.click('text=Novo jogo');
  await p.fill('.name-input', 'Ana');
  await p.click('.chip:has-text("Cacheado")');
  await p.click('.chip:has-text("Pijama cirúrgico")');
  await p.click('text=Iniciar jornada');
  await p.waitForTimeout(500);
  // adoção opcional na criação: adota um Golden Retriever
  await p.click('.pet-cell:has-text("Golden")');
  await p.fill('#pet-name', 'Mel');
  await p.screenshot({ path: SP + '/f0_adocao.png' });
  await p.click('.pet-chooser .menu-footer .btn-primary');
  await p.waitForTimeout(1200);
  await talkUntilClosed();
  log('início', await state());
  log('pets', JSON.stringify(await p.evaluate(() => window.__vetquest.state.data.pets)));

  // Caminha de verdade até o Lucas: (21,29) -> (21,24) e olha para a direita
  // anda segurando a tecla até chegar na linha do Lucas (y = 24)
  await p.keyboard.down('ArrowUp');
  for (let i = 0; i < 60; i++) { const st0 = await state(); if (st0.y <= 24) break; await p.waitForTimeout(40); }
  await p.keyboard.up('ArrowUp');
  await p.waitForTimeout(300);
  log('após andar', await state());
  // posiciona exatamente ao lado do Lucas (a caminhada pode passar um tile)
  const pos = await state();
  if (pos.y !== 24 || pos.x !== 21) await warp('campus', 21, 24, 'up');
  await press('ArrowRight'); await p.waitForTimeout(200);
  await press('KeyE'); await p.waitForTimeout(400);
  await p.screenshot({ path: SP + '/f1_lucas.png' });
  await talkUntilClosed();
  log('lucas', (await state()).quests);

  // Laboratório de Anatomia: entra andando pela porta (7,15)
  await warp('campus', 7, 17, 'up');
  await hold('ArrowUp', 450);
  await p.waitForTimeout(800);
  let s = await state(); log('lab?', s.map, s.x, s.y);
  await p.screenshot({ path: SP + '/f2_lab.png' });
  await warp('anatomia', 8, 4, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed(/pronto|Começar/);
  await p.waitForTimeout(500);
  await p.click('.mg-body >> text=Começar');
  const seenStructures = [];
  for (let i = 0; i < mg.hotspots.count; i++) {
    const prompt = await p.locator('.mg-prompt').innerText();
    const name = prompt.split(': ').slice(1).join(': ').trim();
    const sdef = mg.hotspots.structures.find((x) => x.name === name);
    seenStructures.push(sdef.id);
    await p.click(`circle[data-id="${sdef.id}"]`, { force: true });
    if (i === 1) await p.screenshot({ path: SP + '/f3_anatomia.png' });
    await p.click('.mg-feedback .btn-primary');
  }
  const seenQuiz = [];
  for (let i = 0; i < mg.quiz.count; i++) {
    const prompt = (await p.locator('.mg-prompt').innerText()).trim();
    const q = BANKQ.find((x) => x.prompt === prompt);
    seenQuiz.push(q.id);
    await p.locator('.btn.option', { hasText: q.options[q.correctIndex] }).first().click();
    await p.click('.mg-feedback .btn-primary');
  }
  log('anatomia sorteou', seenStructures.join(','), '|', seenQuiz.join(','));
  await p.screenshot({ path: SP + '/f4_anatomia_result.png' });
  await p.click('.mg-body >> text=Concluir');
  log('após anatomia', (await state()).quests);

  // Hospital: entra andando pela porta (22,8)
  await warp('campus', 22, 10, 'up');
  await hold('ArrowUp', 450);
  await p.waitForTimeout(900);
  s = await state(); log('hospital?', s.map, s.x, s.y);
  await p.screenshot({ path: SP + '/f5_hospital.png' });
  await warp('hospital', 15, 7, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await p.screenshot({ path: SP + '/f6_helena.png' });
  await talkUntilClosed(/pronto/);
  await p.waitForTimeout(400);
  await p.screenshot({ path: SP + '/f6b_quiz.png' });
  log('quiz biosseg ok?', await answerBankQuiz(p));
  log('após biosseg', (await state()).quests);

  await warp('hospital', 4, 8, 'down');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed(/começar/);
  await p.waitForTimeout(600);
  await playCase(p, thor, 'thor');
  log('após Thor', (await state()).quests);
  await warp('hospital', 15, 7, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed();
  log('após relato Thor', (await state()).quests);

  await warp('hospital', 4, 12, 'up');
  await p.screenshot({ path: SP + '/f9_hospital_mimi.png' });
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed(/examiná-la/);
  await p.waitForTimeout(600);
  await playCase(p, mimi, 'mimi', true);
  await warp('hospital', 15, 7, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed();
  log('após relato Mimi', (await state()).quests);

  // Caso Pingo (Sofia em 8,8)
  await warp('hospital', 8, 9, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed(/começar/);
  await p.waitForTimeout(600);
  await playCase(p, pingo, 'pingo');
  await warp('hospital', 15, 7, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed();

  // Emergência Nino (Sr. Paulo em 8,11)
  await warp('hospital', 8, 12, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed(/agora mesmo/);
  await p.waitForTimeout(600);
  await p.screenshot({ path: SP + '/c_nino_inicio.png' });
  await playCase(p, nino, 'nino');
  await warp('hospital', 15, 7, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed();
  log('final', await state());

  // Consulta preventiva do pet com a Carla (atrás do balcão em 4,4)
  await warp('hospital', 4, 6, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed(/consulta preventiva/);
  await p.waitForTimeout(500);
  await p.screenshot({ path: SP + '/pet_checkup1.png' });
  await p.click('.checkup >> text=Iniciar consulta');
  const labels = await p.locator('.checkup .check').allInnerTexts();
  for (const [i, t] of labels.entries()) if (!DISTRACTOR_TEXTS.includes(t.trim())) await p.locator('.checkup .check input').nth(i).check();
  await p.click('.checkup >> text=Próximo');
  await p.locator('.checkup .btn.option', { hasText: 'Escovação frequente da pelagem longa' }).click();
  await p.click('.checkup >> text=Ver resultado');
  await p.waitForTimeout(300);
  await p.screenshot({ path: SP + '/pet_checkup2.png' });
  log('consulta do pet: nota', await p.locator('.checkup .score-num').innerText());
  await p.click('.checkup >> text=Concluir');

  for (const [k, name] of [['KeyJ', 'diario'], ['KeyV', 'vetidex'], ['KeyP', 'desempenho'], ['KeyM', 'mapa'], ['KeyI', 'mochila']]) {
    await press(k); await p.waitForTimeout(400);
    await p.screenshot({ path: SP + `/m_${name}.png` });
    await press('Escape'); await p.waitForTimeout(200);
  }
  // Revisão espaçada (biblioteca)
  await warp('biblioteca', 14, 7, 'up');
  await press('KeyE'); await p.waitForTimeout(300);
  await talkUntilClosed();
  await p.waitForTimeout(400);
  await p.screenshot({ path: SP + '/f10_review.png' });
  for (let i = 0; i < 5; i++) {
    const opt = p.locator('.review .btn.option');
    if (!(await opt.count())) break;
    await opt.first().click();
    await p.locator('.review-feedback .btn-primary').click();
  }
  if (await p.locator('.review >> text=Fechar').count()) await p.click('.review >> text=Fechar');

  await p.reload(); await p.waitForTimeout(1500);
  await p.click('text=Continuar'); await p.waitForTimeout(1200);
  log('após reload', await state());
  await p.screenshot({ path: SP + '/f99_continue.png' });

  // Backup: copia o código nas configurações e restaura em um navegador "novo"
  await press('Escape'); await p.waitForTimeout(300);
  await p.click('.menu-tab:has-text("Configurações")');
  await p.click('text=Copiar código do meu progresso');
  await p.waitForTimeout(300);
  const code = await p.locator('#save-code-out').inputValue();
  log('código de backup', code.slice(0, 16) + '…', `${Math.round(code.length / 1024)} KB`);
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errs.push('pageerror(p2): ' + e.message));
  await p2.goto(process.env.URL || 'http://localhost:5173/');
  await p2.waitForTimeout(1200);
  await devLogin(p2); // navegador novo: outra conta, sem progresso
  const hasContinue = await p2.locator('text=Continuar').count();
  await p2.click('text=Restaurar progresso');
  await p2.fill('#save-code-in', code);
  await p2.click('text=Restaurar a partir do código');
  await p2.waitForTimeout(1200);
  await p2.screenshot({ path: SP + '/backup_restore.png' });
  await p2.click('text=Continuar');
  await p2.waitForTimeout(1200);
  const restored = await p2.evaluate(() => { const s = window.__vetquest.state.data; return { name: s.player.name, xp: s.totalXp, pets: s.pets.owned.length, cases: s.caseHistory.length }; });
  log('restaurado em navegador novo (antes não havia save:', hasContinue === 0, ')', JSON.stringify(restored));
  console.log('ERROS:', JSON.stringify(errs, null, 1));
  await b.close();
})();
