// Verifica que a tela de atendimento NÃO volta ao topo ao avaliar/interpretar itens (desktop e celular).
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 720 } }], ['celular', devices['Pixel 7']]]) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    p.on('dialog', (d) => d.accept());
    await p.goto(process.env.URL || 'http://localhost:5173/');
    await p.waitForTimeout(1200);
    await p.click('text=Novo jogo');
    await p.fill('.name-input', 'Rolagem');
    await p.click('text=Iniciar jornada');
    await p.waitForTimeout(500);
    await p.click('.pet-chooser >> text=Agora não');
    await p.waitForSelector('.dialogue', { timeout: 5000 });
    for (let i = 0; i < 30; i++) { if (!(await p.$('.dialogue'))) break; await p.click('.dialogue'); await p.waitForTimeout(150); }
    await p.evaluate(() => window.__vetquestBus.emit('ui:startCase', 'caso_thor_prurido'));
    await p.waitForTimeout(500);
    // Anamnese: rola até o fim e faz a última pergunta
    await p.evaluate(() => { const m = document.querySelector('.case-main'); m.scrollTop = m.scrollHeight; });
    const before1 = await p.evaluate(() => document.querySelector('.case-main').scrollTop);
    await p.locator('.q-btn:not([disabled])').last().click();
    await p.waitForTimeout(200);
    const after1 = await p.evaluate(() => document.querySelector('.case-main').scrollTop);
    await p.click('text=Encerrar anamnese');
    await p.waitForTimeout(200);
    const atTop = await p.evaluate(() => document.querySelector('.case-main').scrollTop);
    // Exame físico: rola até o fim, avalia o último item e interpreta
    await p.evaluate(() => { const m = document.querySelector('.case-main'); m.scrollTop = m.scrollHeight; });
    const before2 = await p.evaluate(() => document.querySelector('.case-main').scrollTop);
    await p.locator('.exam-item .btn.small').last().click();
    await p.waitForTimeout(150);
    await p.locator('.exam-item').last().locator('.chip').first().click();
    await p.waitForTimeout(150);
    const after2 = await p.evaluate(() => document.querySelector('.case-main').scrollTop);
    console.log(name, JSON.stringify({ anamnese: [before1, after1], novaEtapaNoTopo: atTop, exame: [before2, after2] }));
    await ctx.close();
  }
  await b.close();
})();
