-- =====================================================================================
-- Aurora Vet — estrutura do banco de dados (Supabase / PostgreSQL)
--
-- Como aplicar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- O script é idempotente (pode ser executado novamente após atualizações).
--
-- Princípios:
--  * Senhas, e-mails e sessões ficam no Supabase Auth (schema "auth"): o jogo nunca
--    armazena senhas; o Supabase guarda apenas o hash (bcrypt).
--  * Cada tabela tem Row Level Security (RLS): uma conta só lê e altera os próprios dados.
--  * Operações sensíveis (aceites, exclusão de conta, exportação) passam por funções no
--    servidor, que gravam data/hora do próprio servidor e validam a sessão.
--  * Minimização: o e-mail não é copiado para tabelas do jogo; o registro de aceite guarda
--    só o identificador da conta, o documento, a versão e a data/hora.
-- =====================================================================================

-- ------------------------------------------------------------------ perfis
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  professional_profile text not null,
  marketing_opt_in boolean not null default false,
  terms_version text not null,
  privacy_version text not null,
  educational_notice_version text,
  educational_notice_ack_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_.]{3,20}$'),
  constraint profiles_professional_profile check (professional_profile in ('estudante', 'veterinario', 'explorador'))
);
create unique index if not exists profiles_username_unique on public.profiles (lower(username));

-- ------------------------------------------------------------------ registros de aceite e ciência
-- Histórico somente de inclusão (não há update nem delete para o jogador).
create table if not exists public.consent_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document text not null,
  version text not null,
  action text not null,
  created_at timestamptz not null default now(),
  constraint consent_document check (document in ('termos_de_uso', 'politica_de_privacidade', 'aviso_educacional', 'maioridade', 'comunicacoes')),
  constraint consent_action check (action in ('aceite', 'ciencia', 'declaracao', 'consentimento', 'revogacao'))
);
create index if not exists consent_records_user on public.consent_records (user_id, created_at);

-- ------------------------------------------------------------------ progresso do jogo (um save por conta)
create table if not exists public.game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  save_version integer not null,
  client_updated_at bigint not null,
  updated_at timestamptz not null default now(),
  constraint game_saves_size check (pg_column_size(data) < 2000000),
  constraint game_saves_object check (jsonb_typeof(data) = 'object')
);

-- ------------------------------------------------------------------ updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists game_saves_touch on public.game_saves;
create trigger game_saves_touch before update on public.game_saves for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ RLS
alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.game_saves enable row level security;

revoke all on public.profiles, public.consent_records, public.game_saves from anon, authenticated;
grant select on public.profiles, public.consent_records, public.game_saves to authenticated;
-- o jogador só pode alterar diretamente o nome de usuário e o perfil profissional
grant update (username, professional_profile) on public.profiles to authenticated;
grant insert, update, delete on public.game_saves to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists consents_select_own on public.consent_records;
create policy consents_select_own on public.consent_records for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists saves_select_own on public.game_saves;
create policy saves_select_own on public.game_saves for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists saves_insert_own on public.game_saves;
create policy saves_insert_own on public.game_saves for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists saves_update_own on public.game_saves;
create policy saves_update_own on public.game_saves for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists saves_delete_own on public.game_saves;
create policy saves_delete_own on public.game_saves for delete to authenticated using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------ cadastro: cria perfil e registra os aceites
-- Executado pelo próprio Supabase quando a conta é criada (antes da confirmação do e-mail).
-- Rejeita o cadastro se faltar perfil, aceite dos termos, ciência da privacidade ou maioridade.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username text := meta ->> 'username';
  v_profile text := meta ->> 'professional_profile';
  v_terms text := meta ->> 'terms_version';
  v_privacy text := meta ->> 'privacy_version';
begin
  if v_username is null or v_username !~ '^[A-Za-z0-9_.]{3,20}$' then
    raise exception 'cadastro_invalido: nome de usuário inválido' using errcode = 'check_violation';
  end if;
  if v_profile is null or v_profile not in ('estudante', 'veterinario', 'explorador') then
    raise exception 'cadastro_invalido: perfil profissional obrigatório' using errcode = 'check_violation';
  end if;
  if coalesce((meta ->> 'terms_accepted')::boolean, false) is not true or v_terms is null then
    raise exception 'cadastro_invalido: aceite dos Termos de Uso obrigatório' using errcode = 'check_violation';
  end if;
  if coalesce((meta ->> 'privacy_acknowledged')::boolean, false) is not true or v_privacy is null then
    raise exception 'cadastro_invalido: ciência da Política de Privacidade obrigatória' using errcode = 'check_violation';
  end if;
  if coalesce((meta ->> 'adult_declared')::boolean, false) is not true then
    raise exception 'cadastro_invalido: cadastro restrito a maiores de 18 anos' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username, professional_profile, marketing_opt_in, terms_version, privacy_version)
  values (new.id, v_username, v_profile, coalesce((meta ->> 'marketing_opt_in')::boolean, false), v_terms, v_privacy);

  insert into public.consent_records (user_id, document, version, action) values
    (new.id, 'termos_de_uso', v_terms, 'aceite'),
    (new.id, 'politica_de_privacidade', v_privacy, 'ciencia'),
    (new.id, 'maioridade', v_terms, 'declaracao');
  if coalesce((meta ->> 'marketing_opt_in')::boolean, false) then
    insert into public.consent_records (user_id, document, version, action) values (new.id, 'comunicacoes', v_privacy, 'consentimento');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ funções chamadas pelo jogo (RPC)
-- Nome de usuário disponível? (usado no formulário de cadastro, antes de existir sessão)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[A-Za-z0-9_.]{3,20}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

-- Novo aceite quando os Termos ou a Política mudarem de versão
create or replace function public.accept_documents(p_terms_version text, p_privacy_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'nao_autenticado' using errcode = 'insufficient_privilege'; end if;
  insert into public.consent_records (user_id, document, version, action) values
    (uid, 'termos_de_uso', p_terms_version, 'aceite'),
    (uid, 'politica_de_privacidade', p_privacy_version, 'ciencia');
  update public.profiles set terms_version = p_terms_version, privacy_version = p_privacy_version where id = uid;
end $$;

-- Ciência do aviso educacional (exibido no primeiro acesso)
create or replace function public.acknowledge_educational_notice(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'nao_autenticado' using errcode = 'insufficient_privilege'; end if;
  insert into public.consent_records (user_id, document, version, action) values (uid, 'aviso_educacional', p_version, 'ciencia');
  update public.profiles set educational_notice_version = p_version, educational_notice_ack_at = now() where id = uid;
end $$;

-- Consentimento opcional para comunicações (pode ser dado ou revogado a qualquer momento)
create or replace function public.set_marketing_consent(p_opt_in boolean, p_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'nao_autenticado' using errcode = 'insufficient_privilege'; end if;
  insert into public.consent_records (user_id, document, version, action)
  values (uid, 'comunicacoes', p_version, case when p_opt_in then 'consentimento' else 'revogacao' end);
  update public.profiles set marketing_opt_in = p_opt_in where id = uid;
end $$;

-- Exportação dos dados pessoais da própria conta (direito de acesso e portabilidade — LGPD art. 18)
create or replace function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'nao_autenticado' using errcode = 'insufficient_privilege'; end if;
  return jsonb_build_object(
    'gerado_em', now(),
    'conta', (select jsonb_build_object('id', u.id, 'email', u.email, 'criada_em', u.created_at, 'email_confirmado_em', u.email_confirmed_at, 'ultimo_acesso_em', u.last_sign_in_at) from auth.users u where u.id = uid),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'registros_de_aceite', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.consent_records c where c.user_id = uid), '[]'::jsonb),
    'progresso_do_jogo', (select to_jsonb(s) from public.game_saves s where s.user_id = uid)
  );
end $$;

-- Exclusão da própria conta. Exige autenticação recente (senha digitada há no máximo 10 minutos).
-- Remove a conta do Supabase Auth; perfil, aceites e progresso são apagados em cascata.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  claims jsonb := auth.jwt();
  auth_time bigint;
begin
  if uid is null then raise exception 'nao_autenticado' using errcode = 'insufficient_privilege'; end if;
  select max((m ->> 'timestamp')::bigint) into auth_time
    from jsonb_array_elements(coalesce(claims -> 'amr', '[]'::jsonb)) m
   where m ->> 'method' in ('password', 'otp', 'recovery');
  if auth_time is null or auth_time < extract(epoch from now())::bigint - 600 then
    raise exception 'reautenticacao_necessaria' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.username_available(text) from public;
revoke all on function public.accept_documents(text, text) from public, anon;
revoke all on function public.acknowledge_educational_notice(text) from public, anon;
revoke all on function public.set_marketing_consent(boolean, text) from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.accept_documents(text, text) to authenticated;
grant execute on function public.acknowledge_educational_notice(text) to authenticated;
grant execute on function public.set_marketing_consent(boolean, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
