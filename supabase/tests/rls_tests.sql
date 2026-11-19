-- Testes do schema: cadastro, aceites, isolamento entre contas (RLS), funções e exclusão de conta.
-- Cada bloco lança erro (e interrompe o psql) se a expectativa falhar.
\set ON_ERROR_STOP 1
\set QUIET 1

-- utilitário: executa um comando esperando erro
create or replace function pg_temp.expect_error(cmd text, label text) returns void language plpgsql as $$
begin
  begin
    execute cmd;
  exception when others then
    raise notice 'OK (erro esperado) — %: %', label, sqlerrm;
    return;
  end;
  raise exception 'FALHOU — % deveria ter dado erro', label;
end $$;

create or replace function pg_temp.meta(username text, prof text, terms bool, priv bool, adult bool, mkt bool) returns jsonb language sql as $$
  select jsonb_build_object('username', username, 'professional_profile', prof, 'terms_accepted', terms, 'terms_version', '1.0',
                            'privacy_acknowledged', priv, 'privacy_version', '1.0', 'adult_declared', adult, 'marketing_opt_in', mkt)
$$;

-- ---------------------------------------------------------------- 1. cadastro válido
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@exemplo.com', pg_temp.meta('ana_vet', 'estudante', true, true, true, false)),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bruno@exemplo.com', pg_temp.meta('bruno', 'veterinario', true, true, true, true));
do $$ begin
  if (select count(*) from public.profiles) <> 2 then raise exception 'FALHOU — perfis não criados'; end if;
  if (select professional_profile from public.profiles where username = 'ana_vet') <> 'estudante' then raise exception 'FALHOU — perfil profissional'; end if;
  if (select count(*) from public.consent_records where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 3 then raise exception 'FALHOU — aceites da Ana (esperado 3)'; end if;
  if (select count(*) from public.consent_records where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and document = 'comunicacoes') <> 1 then raise exception 'FALHOU — consentimento opcional do Bruno'; end if;
  if exists (select 1 from public.consent_records where created_at is null or version is null) then raise exception 'FALHOU — registro sem versão ou data'; end if;
  raise notice 'OK — cadastro válido cria perfil e registra aceite dos termos, ciência da privacidade e declaração de maioridade (com versão e data/hora)';
end $$;

-- ---------------------------------------------------------------- 2. cadastros inválidos são recusados pelo servidor
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('c@x.com', pg_temp.meta('carla', 'estudante', false, true, true, false))$$, 'termos não aceitos');
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('c@x.com', pg_temp.meta('carla', 'estudante', true, false, true, false))$$, 'privacidade não reconhecida');
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('c@x.com', pg_temp.meta('carla', 'estudante', true, true, false, false))$$, 'menor de 18 / sem declaração');
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('c@x.com', pg_temp.meta('carla', null, true, true, true, false))$$, 'sem perfil profissional');
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('c@x.com', pg_temp.meta('carla', 'curioso', true, true, true, false))$$, 'perfil profissional fora das 3 opções');
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('c@x.com', pg_temp.meta('ANA_VET', 'estudante', true, true, true, false))$$, 'nome de usuário repetido (sem diferenciar maiúsculas)');
select pg_temp.expect_error($$insert into auth.users (email, raw_user_meta_data) values ('ana@exemplo.com', pg_temp.meta('outra', 'estudante', true, true, true, false))$$, 'e-mail já cadastrado');
do $$ begin
  if (select count(*) from auth.users) <> 2 then raise exception 'FALHOU — cadastro inválido deixou conta criada'; end if;
  raise notice 'OK — nenhum cadastro inválido foi criado';
end $$;

-- ---------------------------------------------------------------- 3. visitante sem login
set role anon;
select pg_temp.expect_error('select * from public.profiles', 'visitante lendo perfis');
select pg_temp.expect_error('select * from public.game_saves', 'visitante lendo saves');
do $$ begin
  if public.username_available('ana_vet') then raise exception 'FALHOU — ana_vet deveria estar indisponível'; end if;
  if not public.username_available('novo_nome') then raise exception 'FALHOU — novo_nome deveria estar disponível'; end if;
  if public.username_available('a b') then raise exception 'FALHOU — formato inválido aceito'; end if;
  raise notice 'OK — visitante só consulta disponibilidade de nome de usuário';
end $$;
select pg_temp.expect_error('select public.export_my_data()', 'visitante exportando dados');
reset role;

-- ---------------------------------------------------------------- 4. Bruno salva o próprio progresso
set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
insert into public.game_saves (user_id, data, save_version, client_updated_at)
values ('bbbbbbbb-0000-0000-0000-000000000002', '{"player":{"name":"Bruno"},"totalXp":900}', 1, 1);
reset role;

-- ---------------------------------------------------------------- 5. Ana tenta acessar dados do Bruno
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$
declare n int;
begin
  select count(*) into n from public.profiles; if n <> 1 then raise exception 'FALHOU — Ana viu % perfis', n; end if;
  select count(*) into n from public.game_saves where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'; if n <> 0 then raise exception 'FALHOU — Ana leu o save do Bruno'; end if;
  select count(*) into n from public.consent_records where user_id <> 'aaaaaaaa-0000-0000-0000-000000000001'; if n <> 0 then raise exception 'FALHOU — Ana leu aceites de outra conta'; end if;
  update public.game_saves set data = '{"hack":true}' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALHOU — Ana alterou o save do Bruno'; end if;
  update public.profiles set username = 'roubado' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALHOU — Ana alterou o perfil do Bruno'; end if;
  delete from public.game_saves where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALHOU — Ana apagou o save do Bruno'; end if;
  raise notice 'OK — Ana não lê, não altera e não apaga dados do Bruno';
end $$;
select pg_temp.expect_error($$insert into public.game_saves (user_id, data, save_version, client_updated_at) values ('bbbbbbbb-0000-0000-0000-000000000002', '{}', 1, 1)$$, 'Ana gravando save em nome do Bruno');
do $$
declare n int;
begin
  update public.game_saves set user_id = 'aaaaaaaa-0000-0000-0000-000000000001' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALHOU — Ana tomou o save do Bruno'; end if;
  raise notice 'OK — Ana não consegue transferir o save do Bruno para a própria conta (0 linhas afetadas)';
end $$;
select pg_temp.expect_error($$update public.profiles set terms_version = '9.9'$$, 'Ana forjando a versão dos termos aceitos');
select pg_temp.expect_error($$insert into public.consent_records (user_id, document, version, action) values ('aaaaaaaa-0000-0000-0000-000000000001', 'termos_de_uso', '9.9', 'aceite')$$, 'Ana inserindo aceite diretamente');
select pg_temp.expect_error($$delete from public.consent_records$$, 'Ana apagando o histórico de aceites');

-- ---------------------------------------------------------------- 6. Ana usa os próprios dados normalmente
insert into public.game_saves (user_id, data, save_version, client_updated_at) values ('aaaaaaaa-0000-0000-0000-000000000001', '{"player":{"name":"Ana"},"totalXp":120}', 1, 10);
update public.game_saves set data = '{"player":{"name":"Ana"},"totalXp":300}', client_updated_at = 20 where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.expect_error($$update public.game_saves set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'Ana movendo o próprio save para a conta do Bruno');
update public.profiles set username = 'ana.vet', professional_profile = 'explorador' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.acknowledge_educational_notice('1.0');
select public.set_marketing_consent(true, '1.0');
select public.set_marketing_consent(false, '1.0');
select public.accept_documents('1.1', '1.1');
do $$
declare p public.profiles; d jsonb;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.username <> 'ana.vet' or p.professional_profile <> 'explorador' then raise exception 'FALHOU — alteração de perfil'; end if;
  if p.educational_notice_ack_at is null then raise exception 'FALHOU — ciência do aviso educacional'; end if;
  if p.marketing_opt_in then raise exception 'FALHOU — revogação do consentimento'; end if;
  if p.terms_version <> '1.1' then raise exception 'FALHOU — novo aceite dos termos'; end if;
  if (select count(*) from public.consent_records where user_id = auth.uid()) <> 3 + 1 + 2 + 2 then raise exception 'FALHOU — histórico de aceites incompleto'; end if;
  if (select (data ->> 'totalXp')::int from public.game_saves where user_id = auth.uid()) <> 300 then raise exception 'FALHOU — progresso salvo'; end if;
  d := public.export_my_data();
  if d -> 'conta' ->> 'email' <> 'ana@exemplo.com' then raise exception 'FALHOU — exportação sem e-mail da conta'; end if;
  if (d -> 'progresso_do_jogo' -> 'data' ->> 'totalXp')::int <> 300 then raise exception 'FALHOU — exportação sem progresso'; end if;
  if d::text like '%bruno%' then raise exception 'FALHOU — exportação vazou dados de outra conta'; end if;
  raise notice 'OK — Ana altera o próprio perfil, registra ciência/consentimentos e exporta só os próprios dados';
end $$;

-- ---------------------------------------------------------------- 7. exclusão de conta exige autenticação recente
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint - 7200)))::text, false);
select pg_temp.expect_error('select public.delete_my_account()', 'excluir conta com login de 2 horas atrás (sem reautenticação)');
select set_config('request.jwt.claims', '{}', false);
select pg_temp.expect_error('select public.delete_my_account()', 'excluir conta sem informação de autenticação');
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint - 30)))::text, false);
select public.delete_my_account();
reset role;
do $$ begin
  if exists (select 1 from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001') then raise exception 'FALHOU — conta não excluída'; end if;
  if exists (select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001')
     or exists (select 1 from public.game_saves where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
     or exists (select 1 from public.consent_records where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') then raise exception 'FALHOU — dados da conta excluída permaneceram'; end if;
  if not exists (select 1 from public.game_saves where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') then raise exception 'FALHOU — exclusão afetou outra conta'; end if;
  if not public.username_available('ana.vet') then raise exception 'FALHOU — nome de usuário não foi liberado'; end if;
  raise notice 'OK — exclusão com reautenticação remove conta, perfil, aceites e progresso, sem afetar outras contas';
end $$;
\echo 'TODOS OS TESTES DO BANCO PASSARAM'
