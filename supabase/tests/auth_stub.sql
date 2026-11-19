-- Simulação mínima do ambiente do Supabase para testar o schema localmente (NÃO aplicar no Supabase).
-- Reproduz: papéis anon/authenticated, tabela auth.users e as funções auth.uid() / auth.jwt(),
-- que no Supabase leem as declarações (claims) do token da sessão.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  encrypted_password text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now(),
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
