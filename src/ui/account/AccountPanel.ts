/**
 * "Minha Conta": dados da conta, nome de usuário, perfil profissional, senha, recuperação de acesso,
 * comunicações, documentos, exportação de dados, exclusão da conta e saída.
 */
import { app } from '../../core/context';
import { bus } from '../../core/EventBus';
import { h } from '../dom';
import { ui } from '../UIManager';
import { askConfirm } from '../ConfirmDialog';
import { account } from '../../account';
import { AccountError, PROFILE_LABEL } from '../../account/types';
import { banner, checkbox, passwordField, profileCards, textField, withBusy } from './forms';
import { openLegal } from './LegalView';

function section(title: string | null, ...children: (Node | null)[]): HTMLElement {
  return h('section', { class: 'acc-section' }, title ? h('h3', null, title) : null, ...children);
}

function download(name: string, content: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
    const a = h('a', { href: url, download: name, style: 'display:none' }) as HTMLAnchorElement;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch { return false; }
}

export function openAccountPanel(): void {
  const acc = account();
  if (!acc?.user || !acc.profile) return;
  const user = acc.user;
  let profile = acc.profile;
  const top = banner();

  // ------------------------------------------------ cabeçalho
  const header = h('div', { class: 'acc-summary' });
  const paintHeader = () => header.replaceChildren(
    h('div', { class: 'acc-avatar', 'aria-hidden': 'true' }, profile.username.slice(0, 1).toUpperCase()),
    h('div', null,
      h('strong', null, profile.username),
      h('div', { class: 'small muted' }, user.email),
      h('div', { class: 'small muted' }, `${PROFILE_LABEL[profile.professional_profile]} • conta criada em ${new Date(profile.created_at).toLocaleDateString('pt-BR')}`),
      h('div', { class: 'small muted' }, `Progresso: ${({ idle: 'neste aparelho', saving: 'salvando na conta…', saved: 'salvo na conta', offline: 'sem conexão — salvo neste aparelho, será enviado depois', error: 'erro ao enviar — salvo neste aparelho' } as const)[acc.syncStatus]}`)),
  );
  paintHeader();

  // ------------------------------------------------ nome de usuário
  const uname = textField({ label: 'Nome de usuário', name: 'username', value: profile.username, maxlength: 20, autocomplete: 'nickname' });
  const unameBtn = h('button', { type: 'button', class: 'btn small' }, 'Salvar nome') as HTMLButtonElement;
  unameBtn.addEventListener('click', async () => {
    try { await withBusy(unameBtn, 'Salvando…', () => acc.changeUsername(uname.value())); profile = acc.profile!; paintHeader(); top.show('success', 'Nome de usuário atualizado.'); }
    catch (e) { const err = e as AccountError; if (err.field === 'username') uname.setError(err.message); else top.show('error', err.message); }
  });

  // ------------------------------------------------ perfil profissional
  const prof = profileCards(profile.professional_profile);
  const profBtn = h('button', { type: 'button', class: 'btn small' }, 'Salvar perfil') as HTMLButtonElement;
  profBtn.addEventListener('click', async () => {
    const v = prof.value();
    if (!v) { prof.setError('Selecione um perfil.'); return; }
    try { await withBusy(profBtn, 'Salvando…', () => acc.changeProfessionalProfile(v)); profile = acc.profile!; paintHeader(); top.show('success', 'Perfil profissional atualizado.'); }
    catch (e) { top.show('error', (e as Error).message); }
  });

  // ------------------------------------------------ senha
  const cur = passwordField({ label: 'Senha atual', name: 'current-password', autocomplete: 'current-password' });
  const next = passwordField({ label: 'Nova senha', name: 'new-password', autocomplete: 'new-password', withChecklist: true });
  const conf = passwordField({ label: 'Confirmação da nova senha', name: 'confirm-password', autocomplete: 'new-password' });
  const passBtn = h('button', { type: 'button', class: 'btn small' }, 'Alterar senha') as HTMLButtonElement;
  passBtn.addEventListener('click', async () => {
    try {
      await withBusy(passBtn, 'Alterando…', () => acc.changePassword(cur.value(), next.value(), conf.value()));
      [cur, next, conf].forEach((f) => { f.input.value = ''; });
      top.show('success', 'Senha alterada.');
    } catch (e) {
      const err = e as AccountError;
      if (err.field === 'current' || (err.field === 'password' && err.message.includes('atual'))) cur.setError(err.message);
      else if (err.field === 'password') next.setError(err.message);
      else top.show('error', err.message);
    }
  });

  // ------------------------------------------------ recuperação
  const recBtn = h('button', { type: 'button', class: 'btn small' }, 'Enviar link de redefinição de senha') as HTMLButtonElement;
  recBtn.addEventListener('click', async () => {
    try { await withBusy(recBtn, 'Enviando…', () => acc.requestPasswordReset(user.email)); top.show('success', `Enviamos um link para ${user.email}.`); }
    catch (e) { top.show('error', (e as Error).message); }
  });

  // ------------------------------------------------ comunicações (consentimento opcional)
  const mkt = checkbox('marketing', 'Quero receber novidades sobre o jogo por e-mail.');
  mkt.input.checked = profile.marketing_opt_in;
  mkt.input.addEventListener('change', async () => {
    try { await acc.setMarketingConsent(mkt.input.checked); profile = acc.profile!; top.show('success', mkt.input.checked ? 'Consentimento registrado.' : 'Consentimento revogado. Você não receberá novidades por e-mail.'); }
    catch (e) { mkt.input.checked = !mkt.input.checked; top.show('error', (e as Error).message); }
  });

  // ------------------------------------------------ dados pessoais
  const expBtn = h('button', { type: 'button', class: 'btn small' }, '⬇ Baixar meus dados (JSON)') as HTMLButtonElement;
  expBtn.addEventListener('click', async () => {
    try {
      const data = await withBusy(expBtn, 'Preparando…', () => acc.exportData());
      const ok = download(`aurora-vet_meus-dados_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      top.show(ok ? 'success' : 'error', ok ? 'Arquivo com seus dados baixado.' : 'Não foi possível baixar o arquivo neste navegador.');
    } catch (e) { top.show('error', (e as Error).message); }
  });
  const delBtn = h('button', { type: 'button', class: 'btn small danger' }, 'Excluir minha conta…');
  delBtn.addEventListener('click', () => openDeleteDialog());

  // ------------------------------------------------ sair
  const outBtn = h('button', { type: 'button', class: 'btn' }, '⎋ Sair da conta') as HTMLButtonElement;
  outBtn.addEventListener('click', async () => {
    if (!(await askConfirm('Sair da conta neste aparelho? Seu progresso fica salvo na conta.', 'Sair'))) return;
    await withBusy(outBtn, 'Saindo…', async () => {
      if (app.state) app.state.save();
      await acc.signOut();
    });
    ui().close(m);
    bus.emit('account:signedOut');
  });

  const el = h('div', { class: 'overlay' }, h('div', { class: 'panel acc-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Minha Conta' },
    h('h2', null, '👤 Minha Conta'),
    top.el,
    header,
    h('div', { class: 'acc-panel-body' },
      section(null, uname.wrap, unameBtn),
      section(null, prof.wrap, profBtn),
      section('Senha', h('p', { class: 'small muted' }, 'Por segurança, confirme a senha atual.'), cur.wrap, next.wrap, conf.wrap, passBtn),
      section('Recuperar acesso', h('p', { class: 'small muted' }, 'Esqueceu a senha ou quer redefini-la pelo e-mail?'), recBtn),
      section('Comunicações', mkt.wrap, h('p', { class: 'small muted' }, 'Opcional. Os e-mails de conta (confirmação e recuperação) são enviados sempre que necessários.')),
      section('Documentos',
        h('div', { class: 'acc-links' },
          h('button', { type: 'button', class: 'btn small', onclick: () => openLegal('termos') }, '📄 Termos de Uso'),
          h('button', { type: 'button', class: 'btn small', onclick: () => openLegal('privacidade') }, '🔒 Política de Privacidade'),
          h('button', { type: 'button', class: 'btn small', onclick: () => openLegal('aviso') }, '⚠ Aviso educacional'))),
      section('Seus dados pessoais',
        h('p', { class: 'small muted' }, 'Baixe uma cópia dos dados da sua conta (cadastro, registros de aceite e progresso) ou exclua a conta. Para outros pedidos, use o contato da Política de Privacidade.'),
        h('div', { class: 'acc-links' }, expBtn, delBtn)),
    ),
    h('div', { class: 'menu-footer' }, outBtn, h('button', { type: 'button', class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(m) }, 'Fechar')),
  ));
  const m = ui().open({ el });

  function openDeleteDialog(): void {
    const b = banner();
    const pass = passwordField({ label: 'Confirme sua senha', name: 'current-password', autocomplete: 'current-password' });
    const word = textField({ label: 'Digite EXCLUIR para confirmar', name: 'confirm-word', autocomplete: 'off' });
    const go = h('button', { type: 'button', class: 'btn danger' }, 'Excluir definitivamente') as HTMLButtonElement;
    go.addEventListener('click', async () => {
      if (word.value().trim().toUpperCase() !== 'EXCLUIR') { word.setError('Digite EXCLUIR (em letras maiúsculas) para confirmar.'); return; }
      if (!pass.value()) { pass.setError('Digite sua senha.'); return; }
      try {
        await withBusy(go, 'Excluindo…', () => acc!.deleteAccount(pass.value()));
        app.state = null;
        ui().close(d);
        ui().close(m);
        bus.emit('account:signedOut', 'deleted');
      } catch (e) {
        const err = e as AccountError;
        if (err.field === 'password') pass.setError(err.message); else b.show('error', err.message);
      }
    });
    const del = h('div', { class: 'overlay' }, h('div', { class: 'panel acc-delete', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': 'Excluir conta' },
      h('h2', null, 'Excluir conta'),
      b.el,
      h('p', null, 'Isto apaga sua conta, seu perfil, seus registros de aceite e todo o progresso salvo na conta. Não é possível desfazer.'),
      h('p', { class: 'small muted' }, 'Dica: antes, você pode baixar seus dados. Uma cópia de progresso salva neste navegador antes da criação das contas não é apagada.'),
      pass.wrap, word.wrap,
      h('div', { class: 'menu-footer' }, h('button', { type: 'button', class: 'btn', autofocus: true, onclick: () => ui().close(d) }, 'Cancelar'), go)));
    const d = ui().open({ el: del });
  }
}
