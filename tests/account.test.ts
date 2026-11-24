/**
 * Sistema de contas: validação, cadastro, confirmação de e-mail, login e bloqueio por tentativas,
 * recuperação de senha, saída, reabertura, progresso vinculado à conta, exclusão e migração.
 * Usa o backend SIMULADO (mesmas regras do backend real); as regras de acesso do banco real
 * são testadas em PostgreSQL por supabase/tests (npm run test:db).
 */
import { describe, expect, it } from 'vitest';
import { DevBackend } from '../src/account/devBackend';
import { AccountService, SignUpValidationError, canonical } from '../src/account/AccountService';
import { AccountError, type SignUpInput } from '../src/account/types';
import { validateSignUp, validatePassword } from '../src/account/validation';
import { normalizeError } from '../src/account/errors';
import { checkConnection, readAccountConfig } from '../src/account/config';
import { LoginThrottle } from '../src/account/throttle';
import { MemoryStorage, SaveManager, SAVE_KEY, type KeyValueStorage } from '../src/core/SaveManager';
import { GameState, newSaveData } from '../src/core/GameState';
import { TERMS_VERSION } from '../src/content/legal';

const appearance = { skin: 0, hairColor: 0, hairStyle: 'curto' as const, uniform: 'jaleco' as const, uniformColor: 0, glasses: false };
const input = (o: Partial<SignUpInput> = {}): SignUpInput => ({
  username: 'ana_vet', email: 'ana@exemplo.com', password: 'gatos123', passwordConfirm: 'gatos123',
  professionalProfile: 'estudante', termsAccepted: true, privacyAcknowledged: true, adultDeclared: true, marketingOptIn: false, ...o,
});

/** confirm = opção "Confirm email" do Supabase (os testes antigos cobrem o modo com confirmação) */
function setup(storage: KeyValueStorage = new MemoryStorage(), confirm = true) {
  const saver = new SaveManager(storage);
  const backend = new DevBackend(storage, Date.now, confirm);
  const acc = new AccountService(backend, saver, storage, 0);
  return { storage, saver, backend, acc };
}

async function confirmedUser(env = setup(), i = input()) {
  await env.acc.signUp(i);
  const mail = env.backend.outbox().filter((m) => m.to === i.email && m.type === 'signup').pop()!;
  await env.backend.openEmailLink(mail.token);
  await env.backend.signOut();
  await env.acc.signIn(i.email, i.password);
  await env.acc.loadProfile();
  return env;
}

async function expectAccountError(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(AccountError);
  await p.catch((e: AccountError) => expect(e.code).toBe(code));
}

describe('Validação do cadastro', () => {
  it('aceita um cadastro completo', () => {
    expect(validateSignUp(input())).toEqual({});
  });
  it('aponta cada problema no campo certo', () => {
    const e = validateSignUp(input({ username: 'a b', email: 'ana@', password: 'abc', passwordConfirm: 'abd', professionalProfile: null, termsAccepted: false, privacyAcknowledged: false, adultDeclared: false }));
    expect(Object.keys(e).sort()).toEqual(['adultDeclared', 'email', 'password', 'passwordConfirm', 'privacyAcknowledged', 'professionalProfile', 'termsAccepted', 'username']);
  });
  it('senha: mínimo de 8 caracteres, com letra e número', () => {
    expect(validatePassword('12345678')).toMatch(/letra/);
    expect(validatePassword('abcdefgh')).toMatch(/número/);
    expect(validatePassword('abc1')).toMatch(/8 caracteres/);
    expect(validatePassword('gatos123')).toBeNull();
  });
  it('confirmação de senha diferente é recusada', () => {
    expect(validateSignUp(input({ passwordConfirm: 'gatos124' })).passwordConfirm).toBe('As senhas não são iguais.');
  });
  it('termos não aceitos impedem o cadastro (e nada é criado)', async () => {
    const { acc, backend } = setup();
    await expect(acc.signUp(input({ termsAccepted: false }))).rejects.toBeInstanceOf(SignUpValidationError);
    expect(backend.inspect().users).toHaveLength(0);
  });
  it('perfil profissional é obrigatório', async () => {
    const { acc } = setup();
    const err = await acc.signUp(input({ professionalProfile: null })).then(() => null, (e) => e);
    expect(err).toBeInstanceOf(SignUpValidationError);
    expect((err as SignUpValidationError).fields.professionalProfile).toBe('Selecione o seu perfil.');
  });
});

describe('Cadastro sem confirmação de e-mail (configuração atual)', () => {
  it('a conta é criada e já entra logada, sem e-mail de confirmação', async () => {
    const env = setup(new MemoryStorage(), false);
    const r = await env.acc.signUp(input());
    expect(r.needsConfirmation).toBe(false);
    expect(env.acc.user?.email).toBe('ana@exemplo.com');
    expect(env.saver.currentKey).toBe(`aurora.save.u.${env.acc.user!.id}`);
    expect(env.backend.outbox()).toHaveLength(0);
    expect(env.backend.inspect().consents.map((c) => c.document)).toEqual(['termos_de_uso', 'politica_de_privacidade', 'maioridade']);
    expect((await env.acc.loadProfile())?.professional_profile).toBe('estudante');
  });
  it('sair e entrar de novo só com e-mail e senha', async () => {
    const env = setup(new MemoryStorage(), false);
    await env.acc.signUp(input());
    await env.acc.signOut();
    expect((await env.acc.signIn('ana@exemplo.com', 'gatos123')).email).toBe('ana@exemplo.com');
  });
  it('continua recusando e-mail já cadastrado e termos não aceitos', async () => {
    const env = setup(new MemoryStorage(), false);
    await env.acc.signUp(input());
    await env.acc.signOut();
    const dup = await env.acc.signUp(input({ username: 'outra' })).then(() => null, (e) => e);
    expect((dup as SignUpValidationError).fields.email).toMatch(/Já existe uma conta/);
    await expect(env.acc.signUp(input({ email: 'b@exemplo.com', username: 'bia', termsAccepted: false }))).rejects.toBeInstanceOf(SignUpValidationError);
  });
});

describe('Cadastro, confirmação e login (com "Confirm email" ligado)', () => {
  it('cadastro válido exige confirmação por e-mail e registra perfil e aceites com versão e data', async () => {
    const { acc, backend } = setup();
    const r = await acc.signUp(input({ marketingOptIn: true }));
    expect(r.needsConfirmation).toBe(true);
    const db = backend.inspect();
    expect(db.profiles[0].professional_profile).toBe('estudante');
    expect(db.consents.map((c) => `${c.document}:${c.action}:${c.version}`)).toEqual([
      `termos_de_uso:aceite:${TERMS_VERSION}`, 'politica_de_privacidade:ciencia:1.0', `maioridade:declaracao:${TERMS_VERSION}`, 'comunicacoes:consentimento:1.0',
    ]);
    expect(db.consents.every((c) => !Number.isNaN(Date.parse(c.created_at)))).toBe(true);
    expect(db.outbox).toHaveLength(1);
    expect(JSON.stringify(db.users)).not.toContain('gatos123'); // senha nunca em texto puro
  });

  it('e-mail já utilizado é recusado no campo de e-mail', async () => {
    const { acc } = setup();
    await acc.signUp(input());
    const err = await acc.signUp(input({ username: 'outra' })).catch((e) => e);
    expect(err).toBeInstanceOf(SignUpValidationError);
    expect((err as SignUpValidationError).fields.email).toMatch(/Já existe uma conta/);
  });

  it('nome de usuário já utilizado é recusado (sem diferenciar maiúsculas)', async () => {
    const { acc } = setup();
    await acc.signUp(input());
    const err = await acc.signUp(input({ email: 'b@exemplo.com', username: 'ANA_VET' })).catch((e) => e);
    expect((err as SignUpValidationError).fields.username).toMatch(/em uso/);
  });

  it('não entra antes de confirmar o e-mail; entra depois do link', async () => {
    const { acc, backend } = setup();
    await acc.signUp(input());
    await expectAccountError(acc.signIn('ana@exemplo.com', 'gatos123'), 'email_not_confirmed');
    await backend.openEmailLink(backend.outbox()[0].token);
    expect((await backend.getUser())?.email).toBe('ana@exemplo.com'); // o link já abre a sessão
    await backend.signOut();
    const u = await acc.signIn('ana@exemplo.com', 'gatos123');
    expect(u.email).toBe('ana@exemplo.com');
  });

  it('link de confirmação só funciona uma vez', async () => {
    const { acc, backend } = setup();
    await acc.signUp(input());
    const t = backend.outbox()[0].token;
    await backend.openEmailLink(t);
    await expect(backend.openEmailLink(t)).rejects.toThrow(/inválido/);
  });

  it('login incorreto e bloqueio após tentativas repetidas', async () => {
    const env = await confirmedUser();
    await env.acc.signOut();
    for (let i = 0; i < 4; i++) await expectAccountError(env.acc.signIn('ana@exemplo.com', 'errada99'), 'invalid_credentials');
    await expectAccountError(env.acc.signIn('ana@exemplo.com', 'errada99'), 'locked'); // 5º erro: espera obrigatória
    await expectAccountError(env.acc.signIn('ana@exemplo.com', 'gatos123'), 'locked'); // nem a senha certa passa durante a espera
  });

  it('o bloqueio expira e um login correto zera o contador', () => {
    let now = 0;
    const t = new LoginThrottle(new MemoryStorage(), () => now);
    for (let i = 0; i < 4; i++) expect(t.recordFailure()).toBe(0);
    expect(t.recordFailure()).toBe(30_000);
    now += 31_000;
    expect(t.remainingMs()).toBe(0);
    expect(t.recordFailure()).toBe(60_000); // cada novo erro dobra a espera
    t.recordSuccess();
    expect(t.remainingMs()).toBe(0);
  });

  it('login correto com e-mail em maiúsculas e espaços', async () => {
    const env = await confirmedUser();
    await env.acc.signOut();
    expect((await env.acc.signIn('  ANA@exemplo.com ', 'gatos123')).email).toBe('ana@exemplo.com');
  });
});

describe('Recuperação de senha, saída e reabertura', () => {
  it('pedido para e-mail inexistente não revela nada e não envia e-mail', async () => {
    const { acc, backend } = setup();
    await acc.requestPasswordReset('ninguem@exemplo.com');
    expect(backend.outbox()).toHaveLength(0);
  });

  it('link de recuperação permite definir nova senha; a antiga deixa de funcionar', async () => {
    const env = await confirmedUser();
    await env.acc.signOut();
    await env.acc.requestPasswordReset('ana@exemplo.com');
    const mail = env.backend.outbox().find((m) => m.type === 'recovery')!;
    expect(await env.backend.openEmailLink(mail.token)).toBe('PASSWORD_RECOVERY');
    await expectAccountError(env.acc.completePasswordRecovery('nova1234', 'nova1235'), 'invalid_input');
    await env.acc.completePasswordRecovery('nova1234', 'nova1234');
    await env.acc.signOut();
    await expectAccountError(env.acc.signIn('ana@exemplo.com', 'gatos123'), 'invalid_credentials');
    expect((await env.acc.signIn('ana@exemplo.com', 'nova1234')).email).toBe('ana@exemplo.com');
  });

  it('alterar senha exige a senha atual', async () => {
    const env = await confirmedUser();
    await expectAccountError(env.acc.changePassword('errada11', 'nova1234', 'nova1234'), 'invalid_credentials');
    await env.acc.changePassword('gatos123', 'nova1234', 'nova1234');
    await env.acc.signOut();
    expect((await env.acc.signIn('ana@exemplo.com', 'nova1234')).id).toBeTruthy();
  });

  it('logout encerra a sessão e volta a chave de progresso padrão', async () => {
    const env = await confirmedUser();
    expect(env.saver.currentKey).toContain('aurora.save.u.');
    await env.acc.signOut();
    expect(await env.backend.getUser()).toBeNull();
    expect(env.saver.currentKey).toBe(SAVE_KEY);
  });

  it('reabrir o jogo mantém a sessão (sem novo cadastro)', async () => {
    const env = await confirmedUser();
    const again = setup(env.storage); // mesmo navegador, jogo reaberto
    const u = await again.acc.restore();
    expect(u?.email).toBe('ana@exemplo.com');
    expect(again.saver.currentKey).toBe(`aurora.save.u.${u!.id}`);
  });
});

describe('Progresso vinculado à conta', () => {
  it('o progresso salvo vai para a conta e é recuperado em outro aparelho', async () => {
    const env = await confirmedUser();
    const st = new GameState(newSaveData('Ana', appearance), env.saver);
    st.data.totalXp = 777;
    st.save();
    await env.acc.flush();
    expect(env.acc.syncStatus).toBe('saved');

    // outro aparelho: mesmo servidor (banco simulado), sem cópia local do progresso
    const other = new MemoryStorage();
    other.setItem('aurora.devAuth.db', env.storage.getItem('aurora.devAuth.db')!);
    const env2 = setup(other);
    await env2.acc.signIn('ana@exemplo.com', 'gatos123');
    expect(env2.saver.load()).toBeNull();
    expect(await env2.acc.syncOnLogin()).toBe('remote');
    expect(env2.saver.load()?.totalXp).toBe(777);
  });

  it('a versão mais recente vence ao entrar (local mais nova é enviada)', async () => {
    const env = await confirmedUser();
    await env.backend.storeSave({ ...newSaveData('Ana', appearance), totalXp: 10, updatedAt: 1000 }, 1000);
    env.saver.saveExact({ ...newSaveData('Ana', appearance), totalXp: 50, updatedAt: 5000 });
    expect(await env.acc.syncOnLogin()).toBe('local');
    expect((await env.backend.loadSave())?.data.totalXp).toBe(50);
  });

  it('uma conta não lê o progresso de outra', async () => {
    const env = await confirmedUser();
    const anaId = env.acc.user!.id;
    await env.backend.storeSave(newSaveData('Ana', appearance), 1);
    await env.acc.signOut();
    await confirmedUser(env, input({ email: 'bruno@exemplo.com', username: 'bruno' }));
    expect(await env.backend.loadSaveOf(anaId)).toBeNull();
    expect(await env.backend.loadSave()).toBeNull();
    expect(env.saver.load()).toBeNull(); // cópia local também é separada por conta
  });

  it('apagar o progresso apaga também na conta', async () => {
    const env = await confirmedUser();
    new GameState(newSaveData('Ana', appearance), env.saver).save();
    await env.acc.flush();
    env.saver.clear();
    await new Promise((r) => setTimeout(r, 0));
    expect(await env.backend.loadSave()).toBeNull();
  });
});

describe('Perfil, aceites e aviso educacional', () => {
  it('primeiro acesso exige o aviso educacional; depois de reconhecido não aparece mais', async () => {
    const env = await confirmedUser();
    expect(env.acc.needsEducationalNotice()).toBe(true);
    await env.acc.acknowledgeEducationalNotice();
    expect(env.acc.needsEducationalNotice()).toBe(false);
    expect(env.backend.inspect().consents.some((c) => c.document === 'aviso_educacional')).toBe(true);
  });

  it('nova versão dos termos exige novo aceite', async () => {
    const env = await confirmedUser();
    expect(env.acc.needsDocumentAcceptance()).toBe(false);
    const db = env.backend.inspect();
    db.profiles[0].terms_version = '0.9';
    env.storage.setItem('aurora.devAuth.db', JSON.stringify(db));
    await env.acc.loadProfile();
    expect(env.acc.needsDocumentAcceptance()).toBe(true);
    await env.acc.acceptCurrentDocuments();
    expect(env.acc.needsDocumentAcceptance()).toBe(false);
  });

  it('nome de usuário e perfil profissional podem ser alterados', async () => {
    const env = await confirmedUser();
    await env.acc.changeUsername('ana.vet');
    await env.acc.changeProfessionalProfile('explorador');
    expect(env.acc.profile).toMatchObject({ username: 'ana.vet', professional_profile: 'explorador' });
  });

  it('consentimento opcional pode ser dado e revogado, com registro', async () => {
    const env = await confirmedUser();
    await env.acc.setMarketingConsent(true);
    await env.acc.setMarketingConsent(false);
    expect(env.acc.profile?.marketing_opt_in).toBe(false);
    expect(env.backend.inspect().consents.filter((c) => c.document === 'comunicacoes').map((c) => c.action)).toEqual(['consentimento', 'revogacao']);
  });

  it('exportação traz só os dados da própria conta', async () => {
    const env = await confirmedUser();
    const d = (await env.acc.exportData()) as { conta: { email: string }; registros_de_aceite: unknown[] };
    expect(d.conta.email).toBe('ana@exemplo.com');
    expect(d.registros_de_aceite.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Exclusão de conta', () => {
  it('exige a senha; apaga conta, perfil, aceites e progresso; não mexe no progresso antigo do navegador', async () => {
    const env = await confirmedUser();
    env.storage.setItem(SAVE_KEY, JSON.stringify(newSaveData('Antigo', appearance)));
    new GameState(newSaveData('Ana', appearance), env.saver).save();
    await env.acc.flush();
    const key = env.saver.currentKey;
    await expectAccountError(env.acc.deleteAccount('errada99'), 'invalid_credentials');
    await env.acc.deleteAccount('gatos123');
    const db = env.backend.inspect();
    expect(db.users).toHaveLength(0);
    expect(db.profiles).toHaveLength(0);
    expect(db.consents).toHaveLength(0);
    expect(Object.keys(db.saves)).toHaveLength(0);
    expect(env.storage.getItem(key)).toBeNull();
    expect(env.storage.getItem(SAVE_KEY)).not.toBeNull();
    await expectAccountError(env.acc.signIn('ana@exemplo.com', 'gatos123'), 'invalid_credentials');
  });
});

describe('Migração do progresso antigo', () => {
  it('vincula o save anterior às contas, confere o resultado e mantém a cópia original', async () => {
    const env = await confirmedUser();
    const legacy = { ...newSaveData('Veterana', appearance), totalXp: 2500 };
    env.storage.setItem(SAVE_KEY, JSON.stringify(legacy));
    expect(env.acc.legacyCandidate()?.player.name).toBe('Veterana');
    const r = await env.acc.migrateLegacy();
    expect(r.ok).toBe(true);
    const remote = await env.backend.loadSave();
    expect(remote?.data.totalXp).toBe(2500);
    expect(canonical(env.saver.load())).toBe(canonical(remote?.data));
    expect(env.storage.getItem(SAVE_KEY)).not.toBeNull(); // original preservado
    expect(env.acc.legacyCandidate()).toBeNull(); // não pergunta de novo
  });

  it('se a verificação falhar, nada é alterado neste navegador', async () => {
    const env = await confirmedUser();
    env.storage.setItem(SAVE_KEY, JSON.stringify(newSaveData('Veterana', appearance)));
    const orig = env.backend.loadSave.bind(env.backend);
    env.backend.loadSave = async () => { const s = await orig(); return s ? { ...s, data: { ...s.data, totalXp: -1 } } : s; };
    const r = await env.acc.migrateLegacy();
    expect(r.ok).toBe(false);
    expect(env.saver.load()).toBeNull();
    expect(env.acc.legacyCandidate()).not.toBeNull();
  });

  it('"agora não" deixa de perguntar sem apagar o save antigo', async () => {
    const env = await confirmedUser();
    env.storage.setItem(SAVE_KEY, JSON.stringify(newSaveData('Veterana', appearance)));
    env.acc.dismissLegacy();
    expect(env.acc.legacyCandidate()).toBeNull();
    expect(env.saver.loadLegacy()?.player.name).toBe('Veterana');
  });
});

describe('Configuração e mensagens de erro', () => {
  it('só aceita a chave pública do Supabase (recusa chave secreta)', () => {
    const jwt = (role: string) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.y`;
    expect(readAccountConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: jwt('anon') })).toEqual({ url: 'https://abc.supabase.co', anonKey: jwt('anon') });
    expect(readAccountConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: jwt('service_role') })).toBeNull();
    expect(readAccountConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_secret_123' })).toBeNull();
    expect(readAccountConfig({ VITE_SUPABASE_URL: 'http://exemplo.com', VITE_SUPABASE_ANON_KEY: jwt('anon') })).toBeNull();
    expect(readAccountConfig({})).toBeNull();
  });
  it('traduz os erros do Supabase em mensagens claras', () => {
    expect(normalizeError({ code: 'invalid_credentials', message: 'Invalid login credentials' }).code).toBe('invalid_credentials');
    expect(normalizeError({ code: 'email_not_confirmed' }).code).toBe('email_not_confirmed');
    expect(normalizeError({ code: 'user_already_exists' }).field).toBe('email');
    expect(normalizeError({ code: 'over_request_rate_limit', status: 429 }).code).toBe('rate_limited');
    expect(normalizeError({ code: 'weak_password' }).code).toBe('weak_password');
    expect(normalizeError({ code: 'P0001', message: 'reautenticacao_necessaria' }).code).toBe('reauth_required');
    expect(normalizeError({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_unique"' }).field).toBe('username');
    expect(normalizeError(new TypeError('Failed to fetch')).code).toBe('network');
    expect(normalizeError({ message: 'qualquer outra coisa' }).message).toBe('Algo deu errado. Tente novamente em instantes.');
  });
});

describe('Diagnóstico de conexão', () => {
  const cfg = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_x' };
  const res = (status: number) => (async () => ({ ok: status >= 200 && status < 300, status })) as unknown as typeof fetch;
  it('falha de rede guarda o detalhe técnico do navegador', () => {
    const e = normalizeError(new TypeError('Failed to fetch'));
    expect(e.code).toBe('network');
    expect(e.detail).toBe('TypeError: Failed to fetch');
  });
  it('servidor respondendo', async () => {
    expect(await checkConnection(cfg, res(200))).toMatchObject({ ok: true });
  });
  it('chave pública recusada', async () => {
    expect((await checkConnection(cfg, res(401))).summary).toMatch(/SUPABASE_ANON_KEY/);
  });
  it('projeto pausado', async () => {
    expect((await checkConnection(cfg, res(540))).summary).toMatch(/pausado/);
  });
  it('sem conexão com o servidor', async () => {
    const r = await checkConnection(cfg, (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/Não foi possível alcançar abc\.supabase\.co/);
  });
});

