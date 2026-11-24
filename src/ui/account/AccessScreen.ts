/**
 * Fluxo de acesso (antes do menu principal):
 *   tela inicial → entrar | criar conta (perfil + aceites) → confirmar e-mail → entrar
 *   → novo aceite (se os documentos mudaram) → aviso educacional (primeiro acesso)
 *   → sincronização do progresso → migração do progresso antigo (se houver) → menu principal.
 * Também trata a recuperação de senha (link do e-mail) e os links #termos, #privacidade e #aviso.
 */
import { app } from '../../core/context';
import { h } from '../dom';
import { ui, type Modal } from '../UIManager';
import { askConfirm } from '../ConfirmDialog';
import { account, bootLinkError, BOOT_HASH, initAccount, onAccountEvent, takeRecoveryPending, testAccountConnection } from '../../account';
import { SignUpValidationError, type AccountService } from '../../account/AccountService';
import { AccountError } from '../../account/types';
import { validateSignUp, type FieldErrors } from '../../account/validation';
import { levelFromXp } from '../../systems/progression/xp';
import type { SaveData } from '../../core/types';
import { EDUCATIONAL_NOTICE, GAME_NAME } from '../../content/legal';
import { banner, checkbox, passwordField, profileCards, textField, withBusy } from './forms';
import { openLegal, renderLegal } from './LegalView';
import { openAbout } from '../TitleMenu';

type View = (card: HTMLElement) => void;

/** Em falhas de rede: detalhe técnico + botão "Testar conexão" (ajuda o jogador e o suporte). */
function networkHelp(e: unknown): HTMLElement | undefined {
  if (!(e instanceof AccountError) || e.code !== 'network') return undefined;
  const out = h('p', { class: 'small', role: 'status' });
  const btn = h('button', { type: 'button', class: 'btn small' }, '🔌 Testar conexão') as HTMLButtonElement;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    out.textContent = 'Testando…';
    const r = await testAccountConnection();
    out.textContent = r ? `${r.ok ? '✓' : '✗'} ${r.summary}` : 'Serviço de contas não configurado.';
    btn.disabled = false;
  });
  return h('details', { class: 'acc-details' },
    h('summary', null, 'Detalhes técnicos'),
    e.detail ? h('p', { class: 'small muted' }, `Erro do navegador: ${e.detail}`) : null,
    btn, out);
}

class AccessFlow {
  private modal: Modal;
  private root: HTMLElement;
  private logo: HTMLElement;
  private card: HTMLElement;
  private devMail: HTMLElement | null = null;
  private loginResolver: (() => void) | null = null;
  private offs: (() => void)[] = [];

  constructor() {
    this.logo = h('div', { class: 'logo acc-logo' }, h('div', { class: 'logo-mark' }, '✚'), h('h1', null, GAME_NAME), h('div', { class: 'logo-sub' }, 'Jornada Veterinária'));
    this.card = h('section', { class: 'panel acc-card', 'aria-live': 'polite' });
    this.root = h('div', { class: 'title-screen access-screen' }, this.logo, this.card,
      h('div', { class: 'title-foot' }, 'Ferramenta independente de apoio educacional • Não é curso nem certificação • Conteúdo pendente de validação técnica'));
    this.modal = ui().open({ el: this.root, persistent: true, onAction: () => false });
    this.root.addEventListener('pointerdown', () => app.audio.unlock(), { once: true });
  }

  close(): void {
    this.offs.forEach((o) => o());
    this.devMail?.remove();
    ui().close(this.modal);
  }

  private show(view: View, compact = true): void {
    this.root.classList.toggle('compact', compact);
    this.card.replaceChildren();
    view(this.card);
    requestAnimationFrame(() => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches;
      const f = this.card.querySelector<HTMLElement>(coarse ? '[data-autofocus-btn], button' : '[data-autofocus], button');
      f?.focus({ preventScroll: true });
    });
  }

  // ---------------------------------------------------------------- execução
  async run(): Promise<void> {
    const acc = await initAccount();
    if (!acc) { this.viewUnconfigured(); await new Promise<never>(() => undefined); return; }
    if ((import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH === '1') && acc.backend.kind === 'dev') {
      this.mountDevMailbox(acc);
      this.root.prepend(h('div', { class: 'acc-banner info acc-devflag', role: 'note' }, 'MODO DE TESTE — contas simuladas neste navegador (não use dados reais).'));
    }
    this.offs.push(onAccountEvent((e) => {
      if (e === 'SIGNED_IN' && this.loginResolver) this.loginResolver();
      // o link de recuperação abre uma sessão temporária: segue direto para "Criar nova senha"
      if (e === 'PASSWORD_RECOVERY') { this.recovery = true; this.loginResolver?.(); }
    }));

    let user = await acc.restore();
    if (user && (takeRecoveryPending() || this.recovery)) { this.recovery = false; await this.viewResetPassword(acc); }
    if (!user) {
      await this.waitForLogin(acc);
      user = await acc.restore();
      if (takeRecoveryPending() || this.recovery) { this.recovery = false; await this.viewResetPassword(acc); }
    }
    await this.afterLogin(acc);
  }
  private recovery = false;

  private waitForLogin(acc: AccountService): Promise<void> {
    return new Promise<void>((resolve) => {
      this.loginResolver = () => { this.loginResolver = null; resolve(); };
      this.viewHome(acc);
      const linkErr = bootLinkError();
      if (linkErr) this.viewLogin(acc, { message: linkErr, kind: 'error' });
      const route = BOOT_HASH.replace(/^#/, '');
      if (route === 'termos' || route === 'privacidade' || route === 'aviso') setTimeout(() => openLegal(route), 50);
    });
  }

  private async afterLogin(acc: AccountService): Promise<void> {
    for (;;) {
      try {
        const profile = await acc.loadProfile();
        if (!profile) { await this.viewFatal(acc, 'Não encontramos o perfil desta conta. Saia e entre novamente; se o problema continuar, fale com o suporte.'); continue; }
        break;
      } catch (e) {
        await this.viewFatal(acc, e instanceof AccountError ? e.message : 'Não foi possível carregar sua conta.');
      }
    }
    if (acc.needsDocumentAcceptance()) await this.viewReaccept(acc);
    if (acc.needsEducationalNotice()) await this.viewNotice(acc);
    this.show((c) => c.append(h('p', { class: 'acc-loading', role: 'status' }, h('span', { class: 'acc-spinner', 'aria-hidden': 'true' }), 'Carregando seu progresso…')));
    await acc.syncOnLogin();
    const legacy = acc.legacyCandidate();
    if (legacy) await this.viewMigrate(acc, legacy);
    this.close();
  }

  // ---------------------------------------------------------------- telas
  private viewUnconfigured(): void {
    this.show((c) => c.append(
      h('h2', null, 'Acesso temporariamente indisponível'),
      h('p', null, 'O serviço de contas ainda não foi configurado neste endereço, então não é possível entrar ou criar conta agora.'),
      h('p', { class: 'muted small' }, 'Se você administra o jogo, siga o guia docs/CONTAS.md para configurar o Supabase.'),
      this.legalLinks(),
    ), false);
  }

  private legalLinks(): HTMLElement {
    return h('div', { class: 'acc-links' },
      h('button', { class: 'btn small', onclick: () => openAbout() }, 'ℹ Sobre o jogo'),
      h('button', { class: 'btn small', onclick: () => openLegal('termos') }, '📄 Termos de Uso'),
      h('button', { class: 'btn small', onclick: () => openLegal('privacidade') }, '🔒 Política de Privacidade'),
    );
  }

  private viewHome(acc: AccountService): void {
    this.show((c) => c.append(
      h('p', { class: 'acc-lead' }, 'Estude Medicina Veterinária jogando: atenda pacientes, assista às aulas e evolua na sua jornada. Seu progresso fica salvo na sua conta.'),
      h('div', { class: 'title-menu acc-home' },
        h('button', { class: 'btn btn-primary big', 'data-autofocus': true, 'data-autofocus-btn': true, onclick: () => this.viewLogin(acc) }, '🔑 Entrar'),
        h('button', { class: 'btn big', onclick: () => this.viewSignUp(acc) }, '✚ Criar conta'),
        h('button', { class: 'btn', onclick: () => openAbout() }, 'ℹ Sobre o jogo'),
        h('button', { class: 'btn', onclick: () => openLegal('termos') }, '📄 Termos de Uso'),
        h('button', { class: 'btn', onclick: () => openLegal('privacidade') }, '🔒 Política de Privacidade'),
      ),
      h('p', { class: 'muted small acc-center' }, 'Cadastro gratuito, para maiores de 18 anos.'),
    ), false);
  }

  private viewLogin(acc: AccountService, opts: { email?: string; message?: string; kind?: 'error' | 'success' | 'info' } = {}): void {
    this.show((c) => {
      const b = banner();
      const email = textField({ label: 'E-mail', type: 'email', name: 'email', autocomplete: 'username', value: opts.email });
      const pass = passwordField({ label: 'Senha', name: 'password', autocomplete: 'current-password' });
      email.input.setAttribute('data-autofocus', '');
      const submit = h('button', { type: 'submit', class: 'btn btn-primary big' }, 'Entrar') as HTMLButtonElement;
      const form = h('form', { class: 'acc-form', novalidate: true, 'aria-label': 'Entrar' }, b.el, email.wrap, pass.wrap, submit);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        b.hide();
        try {
          await withBusy(submit, 'Entrando…', () => acc.signIn(email.value(), pass.value()));
          app.audio.sfx('confirm');
          this.loginResolver?.();
        } catch (e) {
          const err = e instanceof AccountError ? e : null;
          app.audio.sfx('error');
          if (err?.field === 'email') email.setError(err.message);
          else if (err?.field === 'password') pass.setError(err.message);
          else if (err?.code === 'email_not_confirmed') {
            const resend = h('button', { type: 'button', class: 'btn small', onclick: async () => {
              try { await acc.backend.resendConfirmation(email.value()); b.show('success', 'Enviamos um novo link de confirmação. Confira sua caixa de entrada e o spam.'); } catch (x) { b.show('error', (x as Error).message); }
            } }, 'Reenviar e-mail de confirmação');
            b.show('error', err.message, resend);
          } else b.show('error', err?.message ?? 'Não foi possível entrar.', networkHelp(err));
          pass.input.value = '';
        }
      });
      if (opts.message) b.show(opts.kind ?? 'info', opts.message);
      c.append(h('h2', null, 'Entrar'), form,
        h('div', { class: 'acc-links' },
          h('button', { type: 'button', class: 'link-btn', onclick: () => this.viewForgot(acc, email.value()) }, 'Esqueci minha senha'),
          h('button', { type: 'button', class: 'link-btn', onclick: () => this.viewSignUp(acc) }, 'Criar uma conta'),
          h('button', { type: 'button', class: 'link-btn', onclick: () => this.viewHome(acc) }, '← Voltar')));
    });
  }

  private viewSignUp(acc: AccountService): void {
    this.show((c) => {
      const b = banner();
      const username = textField({ label: 'Nome de usuário', name: 'username', autocomplete: 'nickname', maxlength: 20, hint: 'De 3 a 20 caracteres: letras sem acento, números, ponto ou sublinhado. Aparece no jogo.' });
      username.input.setAttribute('data-autofocus', '');
      const email = textField({ label: 'E-mail', type: 'email', name: 'email', autocomplete: 'email', hint: 'Usado para entrar e para recuperar a senha, se você esquecê-la.' });
      const pass = passwordField({ label: 'Senha', name: 'new-password', autocomplete: 'new-password', withChecklist: true });
      const confirm = passwordField({ label: 'Confirmação da senha', name: 'confirm-password', autocomplete: 'new-password' });
      const profile = profileCards();
      const linkTerms = h('button', { type: 'button', class: 'link-btn inline', onclick: () => openLegal('termos') }, 'Termos de Uso');
      const linkPriv = h('button', { type: 'button', class: 'link-btn inline', onclick: () => openLegal('privacidade') }, 'Política de Privacidade');
      const terms = checkbox('terms', 'Li e concordo com os ', linkTerms, ', incluindo a finalidade educacional e as limitações do jogo.');
      const privacy = checkbox('privacy', 'Li e estou ciente da ', linkPriv, ', que explica como meus dados são tratados.');
      const adult = checkbox('adult', 'Declaro que tenho 18 anos ou mais.');
      const marketing = checkbox('marketing', 'Quero receber novidades sobre o jogo por e-mail (opcional; posso cancelar quando quiser).');
      const submit = h('button', { type: 'submit', class: 'btn btn-primary big' }, 'Criar conta') as HTMLButtonElement;
      const form = h('form', { class: 'acc-form', novalidate: true, 'aria-label': 'Criar conta' },
        b.el, username.wrap, email.wrap, pass.wrap, confirm.wrap, profile.wrap,
        h('div', { class: 'acc-consents' }, terms.wrap, privacy.wrap, adult.wrap, h('div', { class: 'acc-optional' }, marketing.wrap)),
        submit);
      const setErrors = (e: FieldErrors) => {
        username.setError(e.username ?? null); email.setError(e.email ?? null); pass.setError(e.password ?? null);
        confirm.setError(e.passwordConfirm ?? null); profile.setError(e.professionalProfile ?? null);
        terms.setError(e.termsAccepted ?? null); privacy.setError(e.privacyAcknowledged ?? null); adult.setError(e.adultDeclared ?? null);
        const first = form.querySelector<HTMLElement>('.has-error input');
        first?.focus();
      };
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        b.hide();
        const input = {
          username: username.value(), email: email.value(), password: pass.value(), passwordConfirm: confirm.value(),
          professionalProfile: profile.value(), termsAccepted: terms.checked(), privacyAcknowledged: privacy.checked(),
          adultDeclared: adult.checked(), marketingOptIn: marketing.checked(),
        };
        const errs = validateSignUp(input);
        if (Object.keys(errs).length) { app.audio.sfx('error'); setErrors(errs); b.show('error', 'Revise os campos destacados.'); return; }
        try {
          const r = await withBusy(submit, 'Criando conta…', () => acc.signUp(input));
          app.audio.sfx('success');
          if (r.needsConfirmation) this.viewCheckEmail(acc, input.email.trim());
          else this.loginResolver?.();
        } catch (e) {
          app.audio.sfx('error');
          if (e instanceof SignUpValidationError) { setErrors(e.fields); b.show('error', 'Revise os campos destacados.'); }
          else b.show('error', e instanceof AccountError ? e.message : 'Não foi possível criar a conta.', networkHelp(e));
        }
      });
      c.append(h('h2', null, 'Criar conta'), h('p', { class: 'muted small' }, 'Todos os campos são obrigatórios, exceto o de novidades.'), form,
        h('div', { class: 'acc-links' },
          h('button', { type: 'button', class: 'link-btn', onclick: () => this.viewLogin(acc) }, 'Já tenho conta'),
          h('button', { type: 'button', class: 'link-btn', onclick: () => this.viewHome(acc) }, '← Voltar')));
    });
  }

  private viewCheckEmail(acc: AccountService, email: string): void {
    this.show((c) => {
      const b = banner();
      let cooldown = 0;
      const resend = h('button', { type: 'button', class: 'btn' }, 'Reenviar e-mail') as HTMLButtonElement;
      const tick = () => {
        resend.disabled = cooldown > 0;
        resend.textContent = cooldown > 0 ? `Reenviar e-mail (${cooldown}s)` : 'Reenviar e-mail';
        if (cooldown > 0) { cooldown--; setTimeout(tick, 1000); }
      };
      resend.addEventListener('click', async () => {
        try { await acc.backend.resendConfirmation(email); b.show('success', 'Link reenviado. Confira também a pasta de spam.'); cooldown = 60; tick(); }
        catch (e) { b.show('error', (e as Error).message); }
      });
      c.append(
        h('div', { class: 'acc-icon', 'aria-hidden': 'true' }, '📬'),
        h('h2', null, 'Confirme seu e-mail'),
        b.el,
        h('p', null, 'Enviamos um link de confirmação para ', h('strong', null, email), '. Abra o e-mail e toque no link para ativar sua conta.'),
        h('p', { class: 'muted small' }, 'Não chegou? Confira a pasta de spam ou promoções. O link expira em algumas horas.'),
        h('div', { class: 'title-menu' },
          h('button', { type: 'button', class: 'btn btn-primary', 'data-autofocus': true, onclick: () => this.viewLogin(acc, { email, message: 'Depois de confirmar o e-mail, entre com sua senha.', kind: 'info' }) }, 'Já confirmei — entrar'),
          resend));
    });
  }

  private viewForgot(acc: AccountService, prefill = ''): void {
    this.show((c) => {
      const b = banner();
      const email = textField({ label: 'E-mail da conta', type: 'email', name: 'email', autocomplete: 'email', value: prefill });
      email.input.setAttribute('data-autofocus', '');
      const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Enviar link de recuperação') as HTMLButtonElement;
      const form = h('form', { class: 'acc-form', novalidate: true }, b.el, email.wrap, submit);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        b.hide();
        try {
          await withBusy(submit, 'Enviando…', () => acc.requestPasswordReset(email.value()));
          b.show('success', 'Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha. Abra-o neste aparelho.');
        } catch (e) {
          const err = e as AccountError;
          if (err.field === 'email') email.setError(err.message); else b.show('error', err.message, networkHelp(err));
        }
      });
      c.append(h('h2', null, 'Recuperar acesso'), h('p', { class: 'muted small' }, 'Informe o e-mail da conta. Enviaremos um link para você definir uma nova senha.'), form,
        h('div', { class: 'acc-links' }, h('button', { type: 'button', class: 'link-btn', onclick: () => this.viewLogin(acc, { email: email.value() }) }, '← Voltar para entrar')));
    });
  }

  private viewResetPassword(acc: AccountService): Promise<void> {
    return new Promise((resolve) => this.show((c) => {
      const b = banner();
      const pass = passwordField({ label: 'Nova senha', name: 'new-password', autocomplete: 'new-password', withChecklist: true });
      const confirm = passwordField({ label: 'Confirmação da nova senha', name: 'confirm-password', autocomplete: 'new-password' });
      pass.input.setAttribute('data-autofocus', '');
      const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Salvar nova senha') as HTMLButtonElement;
      const form = h('form', { class: 'acc-form', novalidate: true }, b.el, pass.wrap, confirm.wrap, submit);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        b.hide();
        try {
          await withBusy(submit, 'Salvando…', () => acc.completePasswordRecovery(pass.value(), confirm.value()));
          app.audio.sfx('success');
          b.show('success', 'Senha alterada com sucesso.');
          setTimeout(resolve, 900);
        } catch (e) {
          const err = e as AccountError;
          if (err.field === 'password') pass.setError(err.message); else b.show('error', err.message, networkHelp(err));
        }
      });
      c.append(h('h2', null, 'Criar nova senha'), h('p', { class: 'muted small' }, 'Você abriu o link de recuperação. Defina a nova senha da sua conta.'), form);
    }));
  }

  private viewReaccept(acc: AccountService): Promise<void> {
    return new Promise((resolve) => this.show((c) => {
      const b = banner();
      const terms = checkbox('terms', 'Li e concordo com os ', h('button', { type: 'button', class: 'link-btn inline', onclick: () => openLegal('termos') }, 'Termos de Uso'), ' atualizados.');
      const privacy = checkbox('privacy', 'Li e estou ciente da ', h('button', { type: 'button', class: 'link-btn inline', onclick: () => openLegal('privacidade') }, 'Política de Privacidade'), ' atualizada.');
      const ok = h('button', { type: 'button', class: 'btn btn-primary' }, 'Aceitar e continuar') as HTMLButtonElement;
      ok.addEventListener('click', async () => {
        if (!terms.checked()) terms.setError('É preciso concordar com os Termos de Uso para continuar.');
        if (!privacy.checked()) privacy.setError('Confirme que leu a Política de Privacidade.');
        if (!terms.checked() || !privacy.checked()) return;
        try { await withBusy(ok, 'Registrando…', () => acc.acceptCurrentDocuments()); resolve(); }
        catch (e) { b.show('error', (e as Error).message); }
      });
      c.append(h('h2', null, 'Documentos atualizados'), b.el,
        h('p', null, 'Os Termos de Uso ou a Política de Privacidade mudaram desde o seu último acesso. Leia e confirme para continuar.'),
        terms.wrap, privacy.wrap,
        h('div', { class: 'menu-footer' }, h('button', { type: 'button', class: 'btn', onclick: async () => { await acc.signOut(); location.reload(); } }, 'Sair'), ok));
    }));
  }

  private viewNotice(acc: AccountService): Promise<void> {
    return new Promise((resolve) => this.show((c) => {
      const b = banner();
      const ok = h('button', { type: 'button', class: 'btn btn-primary big', 'data-autofocus': true, 'data-autofocus-btn': true }, 'Entendi, continuar') as HTMLButtonElement;
      ok.addEventListener('click', async () => {
        try { await withBusy(ok, 'Registrando…', () => acc.acknowledgeEducationalNotice()); app.audio.sfx('confirm'); resolve(); }
        catch (e) { b.show('error', (e as Error).message); }
      });
      c.classList.add('acc-notice');
      c.append(h('div', { class: 'acc-icon', 'aria-hidden': 'true' }, '⚠'), b.el,
        h('div', { class: 'acc-notice-body', tabindex: '0', role: 'document' }, renderLegal(EDUCATIONAL_NOTICE)),
        h('p', { class: 'muted small' }, 'Este aviso fica disponível depois em “Minha Conta” e nos Termos de Uso.'),
        ok);
    }));
  }

  private viewMigrate(acc: AccountService, legacy: SaveData): Promise<void> {
    const remote = app.saver.load();
    return new Promise((resolve) => this.show((c) => {
      const b = banner();
      const describe = (s: SaveData) => `${s.player.name} • Nível ${levelFromXp(s.totalXp)} • salvo em ${new Date(s.updatedAt).toLocaleString('pt-BR')}`;
      const link = h('button', { type: 'button', class: 'btn btn-primary', 'data-autofocus': true }, remote ? 'Substituir pelo progresso deste navegador' : 'Vincular à minha conta') as HTMLButtonElement;
      link.addEventListener('click', async () => {
        if (remote && !(await askConfirm('O progresso atual da sua conta será substituído pelo progresso antigo deste navegador. Continuar?', 'Substituir'))) return;
        const r = await withBusy(link, 'Enviando e conferindo…', () => acc.migrateLegacy());
        if (r.ok) { b.show('success', r.message); app.audio.sfx('success'); setTimeout(resolve, 1400); }
        else b.show('error', r.message);
      });
      c.append(h('div', { class: 'acc-icon', 'aria-hidden': 'true' }, '💾'), h('h2', null, 'Progresso encontrado neste navegador'), b.el,
        h('p', null, 'Encontramos um progresso salvo neste navegador antes da criação das contas:'),
        h('p', { class: 'acc-save-line' }, '🗂 ', describe(legacy)),
        remote ? h('p', null, 'Sua conta já tem um progresso: ', h('strong', null, describe(remote)), '.') : h('p', null, 'Você pode vinculá-lo à sua conta para continuar de onde parou, em qualquer aparelho.'),
        h('p', { class: 'muted small' }, 'Por segurança, o progresso é enviado, baixado de volta e conferido antes de ser usado. A cópia antiga não é apagada deste navegador.'),
        h('div', { class: 'menu-footer' },
          h('button', { type: 'button', class: 'btn', onclick: () => { acc.dismissLegacy(); resolve(); } }, remote ? 'Manter o progresso da conta' : 'Agora não'),
          link));
    }));
  }

  private viewFatal(acc: AccountService, message: string): Promise<void> {
    return new Promise((resolve) => this.show((c) => c.append(
      h('h2', null, 'Não foi possível continuar'),
      h('p', { role: 'alert' }, message),
      h('div', { class: 'menu-footer' },
        h('button', { class: 'btn', onclick: async () => { await acc.signOut(); location.reload(); } }, 'Sair da conta'),
        h('button', { class: 'btn btn-primary', 'data-autofocus': true, onclick: () => resolve() }, 'Tentar novamente')),
    )));
  }

  // ---------------------------------------------------------------- modo de desenvolvimento
  private mountDevMailbox(acc: AccountService): void {
    const dev = acc.backend as unknown as { outbox(): { to: string; type: string; token: string; at: string }[]; openEmailLink(t: string): Promise<string> };
    const panel = h('div', { class: 'acc-devmail panel', hidden: true });
    const btn = h('button', { class: 'btn small acc-devmail-btn', title: 'Somente no modo de desenvolvimento' }, '📬 E-mails (simulação)');
    const paint = () => {
      const items = dev.outbox().slice().reverse();
      panel.replaceChildren(h('strong', null, 'Caixa de e-mails simulada (desenvolvimento)'),
        ...(items.length ? items.map((m) => h('div', { class: 'acc-devmail-item' },
          h('span', { class: 'small' }, `${m.type === 'signup' ? 'Confirmação de cadastro' : 'Recuperação de senha'} → ${m.to}`),
          h('button', { class: 'btn small', onclick: async () => { panel.hidden = true; try { await dev.openEmailLink(m.token); } catch (e) { console.error(e); } } }, 'Abrir link'))) : [h('p', { class: 'small muted' }, 'Nenhum e-mail enviado.')]));
    };
    btn.addEventListener('click', () => { paint(); panel.hidden = !panel.hidden; });
    this.devMail = h('div', { class: 'acc-devmail-wrap' }, btn, panel);
    ui().toastLayer.appendChild(this.devMail);
  }
}

let running: Promise<void> | null = null;

/** Garante que há um jogador autenticado e com os aceites em dia antes de mostrar o menu principal. */
export function ensureAccess(): Promise<void> {
  if (running) return running;
  const flow = new AccessFlow();
  running = flow.run().finally(() => { running = null; });
  return running;
}

/** Atalho usado pelo menu: há uma conta ativa? */
export function signedInAccount(): AccountService | null {
  const a = account();
  return a?.user ? a : null;
}
