// E2E do sistema de contas pela interface real, com o backend SIMULADO (mesmas regras do Supabase).
// Uso: npm run dev (sem Supabase configurado) e  URL=http://localhost:5173/ SP=<capturas> node dev/e2e-contas.cjs
const { chromium, devices } = require('playwright');
const SP = process.env.SP || '.';
const URL = process.env.URL || 'http://localhost:5173/';
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const banner = () => p.locator('.acc-card .acc-banner:not([hidden])').first().innerText().catch(() => '');
  const fieldError = (name) => p.locator(`.acc-card input[name="${name}"]`).locator('xpath=ancestor::div[contains(@class,"acc-field") or contains(@class,"acc-check")][1]//div[contains(@class,"acc-error")]').innerText().catch(() => '');
  const outbox = () => p.evaluate(() => window.__auroraDevAuth.outbox());
  const openLastMail = async (type) => {
    await p.click('.acc-devmail-btn');
    await p.waitForTimeout(150);
    const items = p.locator('.acc-devmail-item', { hasText: type === 'signup' ? 'Confirmação' : 'Recuperação' });
    await items.first().locator('text=Abrir link').click();
    await p.waitForTimeout(500);
  };
  const fillSignup = async (o) => {
    await p.fill('input[name=username]', o.username ?? '');
    await p.fill('input[name=email]', o.email ?? '');
    await p.fill('input[name=new-password]', o.password ?? '');
    await p.fill('input[name=confirm-password]', o.confirm ?? o.password ?? '');
    if (o.profile) await p.click(`.acc-profile:has(input[value="${o.profile}"])`);
    for (const k of ['terms', 'privacy', 'adult']) {
      const box = p.locator(`input[name=${k}]`);
      if ((o[k] ?? true) !== (await box.isChecked())) await box.click();
    }
  };

  await p.goto(URL); await p.waitForTimeout(2500);

  // ---------------------------------------------------------------- 1. acesso obrigatório
  check('Tela inicial com Entrar, Criar conta, Sobre, Termos e Privacidade', await p.locator('.acc-home button').allInnerTexts().then((t) => ['Entrar', 'Criar conta', 'Sobre o jogo', 'Termos de Uso', 'Política de Privacidade'].every((x) => t.some((y) => y.includes(x)))));
  check('Sem login não há "Novo jogo" nem "Continuar"', (await p.locator('text=Novo jogo').count()) === 0 && (await p.locator('text=Continuar').count()) === 0);
  await p.screenshot({ path: SP + '/c01_inicio.png' });
  await p.click('.acc-home >> text=Termos de Uso'); await p.waitForTimeout(300);
  check('Termos de Uso abrem com o texto-base (versão 1.0, MEC, 18 anos)', /Versão: 1\.0/.test(await p.locator('.acc-legal').innerText()) && /Ministério da Educação/.test(await p.locator('.acc-legal').innerText()) && /18 anos ou mais/.test(await p.locator('.acc-legal').innerText()));
  await p.screenshot({ path: SP + '/c02_termos.png' });
  await p.click('.acc-legal >> text=Fechar');
  await p.click('.acc-home >> text=Política de Privacidade'); await p.waitForTimeout(300);
  const priv = await p.locator('.acc-legal').innerText();
  check('Política de Privacidade traz dados, bases legais, fornecedores, transferência, retenção e direitos', ['Execução de contrato', 'Legítimo interesse', 'Consentimento (art. 7º, I)', 'Supabase', 'Transferência internacional', 'Por quanto tempo', 'Seus direitos'].every((x) => priv.includes(x)));
  await p.click('.acc-legal >> text=Fechar');

  // ---------------------------------------------------------------- 2. cadastro: erros
  await p.click('.acc-home >> text=Criar conta'); await p.waitForTimeout(300);
  check('Caixas de aceite começam desmarcadas', !(await p.locator('input[name=terms]').isChecked()) && !(await p.locator('input[name=privacy]').isChecked()) && !(await p.locator('input[name=adult]').isChecked()) && !(await p.locator('input[name=marketing]').isChecked()));
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(200);
  check('Envio vazio: erros em todos os campos obrigatórios', (await p.locator('.acc-card .has-error').count()) >= 8, `${await p.locator('.acc-card .has-error').count()} campos`);
  await fillSignup({ username: 'ana_vet', email: 'ana@exemplo.com', password: 'gatos', confirm: 'gatos', profile: 'estudante' });
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(200);
  check('Senha inválida é recusada', /Senha fraca/.test(await fieldError('new-password')));
  await fillSignup({ username: 'ana_vet', email: 'ana@exemplo.com', password: 'gatos123', confirm: 'gatos124', profile: 'estudante' });
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(200);
  check('Confirmação de senha diferente é recusada', /não são iguais/.test(await fieldError('confirm-password')));
  await fillSignup({ username: 'ana_vet', email: 'ana@exemplo.com', password: 'gatos123', profile: 'estudante', terms: false });
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(200);
  check('Termos não aceitos impedem o cadastro', /Termos de Uso/.test(await fieldError('terms')) && (await outbox()).length === 0);
  await p.screenshot({ path: SP + '/c03_cadastro_erros.png', fullPage: true });

  // ---------------------------------------------------------------- 3. cadastro válido e verificação
  await fillSignup({ username: 'ana_vet', email: 'ana@exemplo.com', password: 'gatos123', profile: 'estudante' });
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(500);
  check('Cadastro válido → tela "Confirme seu e-mail"', await p.locator('text=Confirme seu e-mail').count() > 0);
  await p.screenshot({ path: SP + '/c04_confirme_email.png' });
  const reg = await p.evaluate(() => { const d = window.__auroraDevAuth.inspect(); return { prof: d.profiles[0]?.professional_profile, consents: d.consents.map((c) => `${c.document}:${c.version}`) }; });
  check('Perfil profissional e aceites registrados (versão + data)', reg.prof === 'estudante' && reg.consents.includes('termos_de_uso:1.0') && reg.consents.includes('politica_de_privacidade:1.0'), JSON.stringify(reg));
  await p.click('text=Já confirmei — entrar'); await p.waitForTimeout(200);
  await p.fill('input[name=password]', 'gatos123');
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(400);
  check('Login antes de confirmar o e-mail é bloqueado', /Confirme seu e-mail/.test(await banner()));
  // cadastro duplicado (em outra aba da mesma tela)
  await p.click('text=Criar uma conta'); await p.waitForTimeout(200);
  await fillSignup({ username: 'outro_nome', email: 'ana@exemplo.com', password: 'gatos123', profile: 'explorador' });
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(400);
  check('Cadastro com e-mail já utilizado é recusado', /Já existe uma conta/.test(await fieldError('email')));
  await openLastMail('signup');
  await p.waitForSelector('text=Entendi, continuar', { timeout: 5000 });
  const notice = await p.locator('.acc-card').innerText();
  check('Verificação de e-mail pelo link → aviso educacional obrigatório (texto completo)', notice.includes('AVISO IMPORTANTE') && notice.includes('Ministério da Educação (MEC)') && notice.includes('Decisões clínicas devem ser tomadas por profissionais legalmente habilitados'));
  await p.screenshot({ path: SP + '/c05_aviso.png' });
  await p.click('text=Entendi, continuar');
  await p.waitForSelector('.title-menu >> text=Novo jogo', { timeout: 6000 });
  check('Menu principal liberado após o aviso; saudação com usuário e perfil', /Olá, ana_vet/.test(await p.locator('.acc-greeting').innerText()) && /Estudante/.test(await p.locator('.acc-greeting').innerText()));
  await p.screenshot({ path: SP + '/c06_menu.png' });

  // ---------------------------------------------------------------- 4. jogar e salvar na conta
  await p.click('text=Novo jogo'); await p.waitForTimeout(500);
  check('Nome do personagem sugerido a partir do usuário', (await p.inputValue('.name-input')) === 'ana vet');
  await p.fill('.name-input', 'Ana');
  await p.click('text=Iniciar jornada'); await p.waitForTimeout(500);
  await p.click('.pet-chooser >> text=Agora não'); await p.waitForTimeout(1500);
  for (let i = 0; i < 12 && await p.$('.dialogue'); i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(120); }
  await p.evaluate(() => { const s = window.__vetquest.state; s.data.totalXp = 640; s.save(); });
  await p.waitForTimeout(2200); // envio com atraso de 1,5 s
  const cloud = await p.evaluate(() => Object.values(window.__auroraDevAuth.inspect().saves)[0]?.data?.totalXp);
  check('Progresso salvo na conta', cloud === 640, `XP na conta: ${cloud}`);

  // ---------------------------------------------------------------- 5. Minha Conta e logout
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.click('.menu-tab:has-text("Configurações")').catch(() => {});
  await p.waitForTimeout(300);
  await p.click('text=👤 Minha Conta'); await p.waitForTimeout(300);
  check('"Minha Conta" acessível de dentro do jogo', await p.locator('.acc-panel').count() === 1);
  await p.screenshot({ path: SP + '/c07_minha_conta.png' });
  await p.fill('.acc-panel input[name=username]', 'ana.vet');
  await p.click('.acc-panel >> text=Salvar nome'); await p.waitForTimeout(300);
  await p.click('.acc-panel .acc-profile:has(input[value="explorador"])');
  await p.click('.acc-panel >> text=Salvar perfil'); await p.waitForTimeout(300);
  const prof = await p.evaluate(() => window.__auroraDevAuth.inspect().profiles[0]);
  check('Alterar nome de usuário e perfil profissional', prof.username === 'ana.vet' && prof.professional_profile === 'explorador');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('.acc-panel >> text=Baixar meus dados')]);
  check('Exportação dos dados pessoais (JSON)', !!dl && /meus-dados/.test(dl.suggestedFilename()));
  await p.click('.acc-panel >> text=Sair da conta'); await p.click('.confirm-box .btn-primary'); await p.waitForTimeout(1500);
  check('Logout volta à tela de acesso', await p.locator('.acc-home').count() === 1);

  // ---------------------------------------------------------------- 6. login incorreto, correto e reabertura
  await p.click('.acc-home >> text=Entrar'); await p.waitForTimeout(200);
  await p.fill('input[name=email]', 'ana@exemplo.com'); await p.fill('input[name=password]', 'errada99');
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(400);
  check('Login incorreto mostra erro claro', /E-mail ou senha incorretos/.test(await banner()));
  await p.fill('input[name=password]', 'gatos123');
  await p.click('.acc-form button[type=submit]');
  await p.waitForSelector('.title-menu >> text=Continuar', { timeout: 6000 });
  check('Login correto → menu com "Continuar" (progresso recuperado)', /Ana/.test(await p.locator('.title-menu .btn-primary').innerText()));
  await p.reload(); await p.waitForTimeout(2500);
  check('Reabrir o jogo: sessão mantida, sem novo cadastro', await p.locator('.title-menu >> text=Continuar').count() === 1 && await p.locator('.acc-home').count() === 0);
  await p.click('.title-menu >> text=Continuar'); await p.waitForTimeout(1500);
  check('Continuar recupera o progresso', (await p.evaluate(() => window.__vetquest.state.data.totalXp)) === 640);

  // ---------------------------------------------------------------- 7. recuperação de senha
  // sair pelo menu do jogo (Esc → Configurações → Minha Conta → Sair da conta)
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.click('.menu-tab:has-text("Configurações")').catch(() => {});
  await p.click('text=👤 Minha Conta'); await p.waitForTimeout(300);
  await p.click('.acc-panel >> text=Sair da conta'); await p.click('.confirm-box .btn-primary'); await p.waitForTimeout(1500);
  await p.click('.acc-home >> text=Entrar'); await p.waitForTimeout(200);
  await p.click('text=Esqueci minha senha');
  await p.fill('input[name=email]', 'ana@exemplo.com');
  await p.click('.acc-form button[type=submit]'); await p.waitForTimeout(400);
  check('Pedido de recuperação com mensagem que não revela se a conta existe', /Se houver uma conta/.test(await banner()));
  await openLastMail('recovery');
  await p.waitForSelector('text=Criar nova senha', { timeout: 5000 });
  await p.fill('input[name=new-password]', 'novasenha1'); await p.fill('input[name=confirm-password]', 'novasenha1');
  await p.click('.acc-form button[type=submit]');
  await p.waitForSelector('.title-menu >> text=Continuar', { timeout: 6000 });
  const pw = await p.evaluate(async () => { const d = window.__auroraDevAuth; await d.signOut(); try { await d.signIn('ana@exemplo.com', 'gatos123'); return 'antiga funcionou'; } catch { await d.signIn('ana@exemplo.com', 'novasenha1'); return 'nova ok'; } });
  check('Recuperação de senha: nova senha vale, a antiga não', pw === 'nova ok');

  // ---------------------------------------------------------------- 8. migração do progresso antigo
  await p.evaluate(() => window.__auroraDevAuth.signOut());
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('aurora.save.u.'))));
    localStorage.setItem('vetquest.save.v1', JSON.stringify({ ...s, player: { ...s.player, name: 'Veterano' }, totalXp: 4321, updatedAt: 1 }));
  });
  await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(async () => {
    const d = window.__auroraDevAuth;
    await d.signUp({ username: 'bruno', email: 'bruno@exemplo.com', password: 'gatos123', passwordConfirm: 'gatos123', professionalProfile: 'veterinario', termsAccepted: true, privacyAcknowledged: true, adultDeclared: true, marketingOptIn: false }, { terms: '1.0', privacy: '1.0' });
    await d.openEmailLink(d.outbox().filter((m) => m.to === 'bruno@exemplo.com').pop().token);
  });
  await p.click('text=Entendi, continuar').catch(() => {});
  await p.waitForSelector('text=Progresso encontrado neste navegador', { timeout: 6000 });
  await p.screenshot({ path: SP + '/c08_migracao.png' });
  await p.click('text=Vincular à minha conta');
  await p.waitForSelector('.title-menu >> text=Continuar', { timeout: 8000 });
  const mig = await p.evaluate(() => {
    const d = window.__auroraDevAuth.inspect();
    const bruno = d.users.find((u) => u.email === 'bruno@exemplo.com').id;
    return { cloud: d.saves[bruno]?.data?.totalXp, legacy: JSON.parse(localStorage.getItem('vetquest.save.v1')).totalXp };
  });
  check('Migração do progresso antigo: enviado, conferido e original mantido', mig.cloud === 4321 && mig.legacy === 4321, JSON.stringify(mig));

  // ---------------------------------------------------------------- 9. isolamento entre contas
  const iso = await p.evaluate(async () => {
    const d = window.__auroraDevAuth;
    const ana = d.inspect().users.find((u) => u.email === 'ana@exemplo.com').id;
    return { other: await d.loadSaveOf(ana), own: (await d.loadSave())?.data?.totalXp };
  });
  check('Uma conta não acessa o progresso de outra', iso.other === null && iso.own === 4321);

  // ---------------------------------------------------------------- 10. exclusão de conta
  await p.click('text=👤 Minha Conta'); await p.waitForTimeout(300);
  await p.click('text=Excluir minha conta…'); await p.waitForTimeout(200);
  await p.fill('.acc-delete input[name=current-password]', 'errada99');
  await p.fill('.acc-delete input[name=confirm-word]', 'EXCLUIR');
  await p.click('text=Excluir definitivamente'); await p.waitForTimeout(400);
  check('Exclusão exige a senha correta', /incorreta/.test(await p.locator('.acc-delete').innerText()));
  await p.screenshot({ path: SP + '/c09_exclusao.png' });
  await p.fill('.acc-delete input[name=current-password]', 'gatos123');
  await p.click('text=Excluir definitivamente'); await p.waitForTimeout(1800);
  const del = await p.evaluate(() => { const d = window.__auroraDevAuth.inspect(); return { bruno: d.users.some((u) => u.email === 'bruno@exemplo.com'), ana: d.users.some((u) => u.email === 'ana@exemplo.com') }; });
  check('Conta excluída (e só ela) e volta à tela de acesso', !del.bruno && del.ana && await p.locator('.acc-home').count() === 1);

  // ---------------------------------------------------------------- 11. celular
  const m = await b.newPage({ ...devices['Pixel 7'] });
  await m.goto(URL); await m.waitForTimeout(2500);
  await m.click('.acc-home >> text=Criar conta'); await m.waitForTimeout(300);
  const sw = await m.evaluate(() => [document.querySelector('.access-screen').scrollWidth, document.querySelector('.access-screen').clientWidth]);
  check('Celular: cadastro cabe na tela, sem rolagem lateral', sw[0] <= sw[1], JSON.stringify(sw));
  await m.screenshot({ path: SP + '/c10_celular_cadastro.png' });
  await m.locator('.acc-profiles').scrollIntoViewIfNeeded();
  await m.screenshot({ path: SP + '/c11_celular_perfis.png' });

  check('Sem erros de JavaScript', errs.length === 0, JSON.stringify(errs));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nRESULTADO: ${results.length - failed}/${results.length} verificações passaram`);
  await b.close();
  process.exit(failed ? 1 : 0);
})();
