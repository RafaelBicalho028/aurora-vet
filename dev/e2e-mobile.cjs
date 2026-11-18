// Verificação em tela pequena (celular) com controles de toque.
const { chromium, devices } = require('playwright');
const SP = process.env.SP || '.';
(async () => {
  const b = await chromium.launch();
  for (const [name, dev] of [['portrait', devices['Pixel 7']], ['landscape', devices['Pixel 7 landscape']]]) {
    const ctx = await b.newContext({ ...dev });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(process.env.URL || 'http://localhost:5173/');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${SP}/mob_${name}_title.png` });
    await p.tap('text=Novo jogo');
    await p.fill('.name-input', 'Leo');
    await p.screenshot({ path: `${SP}/mob_${name}_creator.png` });
    await p.tap('text=Iniciar jornada');
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${SP}/mob_${name}_adocao.png` });
    await p.tap('.pet-cell:has-text("Pug")');
    await p.tap('.pet-chooser .menu-footer .btn-primary');
    await p.waitForTimeout(1200);
    for (let i = 0; i < 8; i++) { if (!(await p.$('.dialogue'))) break; await p.tap('.dialogue'); await p.waitForTimeout(150); }
    for (let i = 0; i < 8; i++) { if (!(await p.$('.dialogue'))) break; await p.tap('.dialogue'); await p.waitForTimeout(150); }
    // arrasta o direcional analógico para cima
    const pad = await p.locator('.stick').boundingBox();
    const cx = pad.x + pad.width / 2, cy = pad.y + pad.height / 2;
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touch('touchStart', cx, cy);
    await touch('touchMove', cx, cy - pad.height * 0.4);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${SP}/mob_${name}_world.png` });
    await touch('touchEnd', cx, cy);
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => window.__vetquest.state.data.player);
    console.log(name, 'posição após d-pad:', st.x, st.y);
    await p.evaluate(() => window.__vetquestBus.emit('ui:startCase', 'caso_mimi_hiporexia'));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SP}/mob_${name}_case.png` });
    await p.tap('.side-toggle');
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${SP}/mob_${name}_case_side.png` });
    console.log(name, 'erros:', JSON.stringify(errs));
    await ctx.close();
  }
  await b.close();
})();
