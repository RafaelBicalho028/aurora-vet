// Ajudante dos roteiros E2E: cria e confirma uma conta SIMULADA e passa pelo aviso educacional,
// deixando o jogo no menu principal (Novo jogo / Continuar).
// Requer servidor de desenvolvimento (npm run dev) ou build de teste (VITE_DEV_AUTH=1 npm run build).
let n = 0;
async function devLogin(p, opts = {}) {
  const email = opts.email || `teste${Date.now().toString(36)}${n++}@exemplo.com`;
  const password = opts.password || 'gatos123';
  const username = opts.username || `teste_${Date.now().toString(36).slice(-6)}${n}`;
  await p.waitForSelector('.access-screen', { timeout: 15000 });
  await p.waitForFunction(() => !!window.__auroraDevAuth, null, { timeout: 15000 });
  await p.evaluate(async ([email, password, username]) => {
    const dev = window.__auroraDevAuth;
    const exists = dev.inspect().users.some((u) => u.email === email);
    if (!exists) {
      await dev.signUp({ username, email, password, passwordConfirm: password, professionalProfile: 'estudante', termsAccepted: true, privacyAcknowledged: true, adultDeclared: true, marketingOptIn: false }, { terms: '1.0', privacy: '1.0' });
      // sem confirmação de e-mail o cadastro já abre a sessão; com confirmação, abre o link
      const mail = dev.outbox().filter((m) => m.to === email).pop();
      if (mail) await dev.openEmailLink(mail.token);
    } else {
      await dev.signIn(email, password);
    }
  }, [email, password, username]);
  // aviso educacional no primeiro acesso
  for (let i = 0; i < 40; i++) {
    if (await p.locator('.title-menu >> text=Novo jogo').count()) break;
    const ok = p.locator('button:has-text("Entendi, continuar")');
    if (await ok.count()) await ok.click();
    const skip = p.locator('button:has-text("Agora não")');
    if (await skip.count() && await p.locator('text=Progresso encontrado').count()) await skip.click();
    await p.waitForTimeout(250);
  }
  await p.waitForSelector('.title-menu >> text=Novo jogo', { timeout: 10000 });
  return { email, password, username };
}
module.exports = { devLogin };
