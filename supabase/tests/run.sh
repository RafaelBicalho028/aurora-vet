#!/usr/bin/env bash
# Testa supabase/schema.sql num PostgreSQL local descartável (simulando o schema "auth" do Supabase).
# Uso: npm run test:db   (requer PostgreSQL 14+ instalado: initdb, pg_ctl e psql)
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() { pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; }
trap cleanup EXIT
# o PostgreSQL não roda como root: usa o usuário "postgres" quando necessário
RUN=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; RUN=(runuser -u postgres --); fi
"${RUN[@]}" initdb -D "$WORK/data" -A trust -U postgres >/dev/null
"${RUN[@]}" pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
echo "== aplicando supabase/schema.sql (2x, para verificar que é idempotente)"
PGOPTIONS="-c client_min_messages=warning" "${PSQL[@]}" -f supabase/schema.sql
PGOPTIONS="-c client_min_messages=warning" "${PSQL[@]}" -f supabase/schema.sql
echo "== testes"
set -o pipefail
"${PSQL[@]}" -t -f supabase/tests/rls_tests.sql 2>&1 | sed 's/^psql:[^:]*:[0-9]*: //' | grep -E "NOTICE|ERROR|FALHOU|TODOS" | sed 's/^NOTICE:  //'
