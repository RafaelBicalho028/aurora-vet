# Contas, login e termos de uso

Este documento descreve o sistema de cadastro e autenticação do Aurora Vet:
- a arquitetura;
- o banco de dados;
- como configurar o serviço;
- o que ainda depende do responsável pelo jogo.

## 1. Diagnóstico da arquitetura (antes desta mudança)

| Item | Situação encontrada |
|---|---|
| Tipo de aplicação | Site estático (Vite + TypeScript + Phaser), publicado no GitHub Pages. Não há servidor próprio. |
| Progresso | Um único save por navegador no `localStorage` (chave `vetquest.save.v1`), com código de backup para copiar entre aparelhos. |
| Identidade do jogador | Inexistente: qualquer pessoa que abrisse o jogo naquele navegador continuava o mesmo progresso. |
| Fluxo de início | Cena `Title` → `showTitle()` (Continuar / Novo jogo) → `startGame()`. |
| Pontos a adaptar | `SaveManager` (save por conta + gatilhos de sincronização), `TitleScene` (acesso antes do menu), `TitleMenu` (saudação, Minha Conta, Sair), `SettingsPanel` (conta e documentos), `main.ts` (início do serviço e saída). |

Como o jogo não tem servidor, a autenticação real exige um serviço externo. O escolhido foi o **Supabase**, pelos seguintes motivos:
- Supabase Auth: confirmação de e-mail, recuperação de senha, senhas com bcrypt, sessões com renovação automática e limites de taxa.
- Banco PostgreSQL com **Row Level Security (RLS)**, que isola os dados de cada conta no próprio banco.
- Funciona com site estático: a chave pública pode ficar no navegador porque o acesso é controlado pelas regras do banco.
- Plano gratuito suficiente para a fase de testes, com servidores em São Paulo.

## 2. Como ficou

```
Abrir o jogo → [tela de acesso] Entrar | Criar conta | Sobre | Termos | Privacidade
   Criar conta (usuário, e-mail, senha, confirmação, perfil, aceites) → "Confirme seu e-mail" → link do e-mail
   Entrar → (novo aceite, se os documentos mudaram) → aviso educacional (1º acesso)
   → sincronização do progresso → (vincular progresso antigo deste navegador?) → menu: Novo jogo / Continuar
```

| Arquivo | Função |
|---|---|
| `src/account/types.ts` | Tipos e a interface `AuthBackend` (o jogo depende só dela) |
| `src/account/supabaseBackend.ts` | Implementação real: Supabase Auth + tabelas + funções do banco |
| `src/account/AccountService.ts` | Cadastro, login com freio de tentativas, perfil, aceites, sincronização do progresso, migração e exclusão |
| `src/account/validation.ts`, `errors.ts`, `throttle.ts`, `config.ts` | Regras dos formulários, mensagens de erro em português, freio de tentativas e leitura segura da configuração |
| `src/account/devBackend.ts` | Backend **simulado**, apenas para testes e desenvolvimento (fica fora do build publicado) |
| `src/ui/account/AccessScreen.ts` | Telas de acesso, cadastro, confirmação, recuperação, novo aceite, aviso educacional e migração |
| `src/ui/account/AccountPanel.ts` | "Minha Conta" |
| `src/ui/account/LegalView.ts`, `src/content/legal.ts` | Termos de Uso, Política de Privacidade e aviso educacional (com versões) |
| `supabase/schema.sql` | Estrutura do banco, regras de acesso e funções |
| `supabase/tests/` | Testes do banco em PostgreSQL (`npm run test:db`) |

**Progresso por conta:**
- Cada conta tem uma cópia local (`aurora.save.u.<id>`) e uma cópia no banco (`game_saves`).
- Ao entrar, vale a versão mais recente das duas.
- Durante o jogo, cada gravação é enviada à conta 1,5 s depois. Ao fechar a aba ou sair da conta, o envio é imediato.
- Sem internet, o jogo continua salvando no aparelho e envia o progresso depois.

**Progresso antigo:**
- O save anterior às contas (`vetquest.save.v1`) **nunca é apagado**.
- No primeiro login, o jogador pode vinculá-lo à conta. O jogo envia o progresso, baixa de volta e compara antes de usar.

## 3. Estrutura do banco de dados

O e-mail e a senha ficam no Supabase Auth (`auth.users`). A senha é guardada só como hash bcrypt. As tabelas do jogo **não copiam o e-mail** (minimização).

| Tabela | Colunas principais | Acesso do jogador (RLS) |
|---|---|---|
| `profiles` | `id` (= conta), `username` (único, sem diferenciar maiúsculas), `professional_profile` (`estudante`, `veterinario` ou `explorador`), `marketing_opt_in`, `terms_version`, `privacy_version`, `educational_notice_version`, `educational_notice_ack_at`, `created_at` | Lê só o próprio perfil. Altera só `username` e `professional_profile`. |
| `consent_records` | `user_id`, `document` (`termos_de_uso`, `politica_de_privacidade`, `aviso_educacional`, `maioridade` ou `comunicacoes`), `version`, `action` (`aceite`, `ciencia`, `declaracao`, `consentimento` ou `revogacao`), `created_at` | Lê só os próprios registros. Não insere, não altera e não apaga: os registros vêm de funções do servidor, com o horário do servidor. |
| `game_saves` | `user_id`, `data` (jsonb), `save_version`, `client_updated_at`, `updated_at` | Lê, grava e apaga só o próprio progresso. |

| Função (RPC) | O que faz |
|---|---|
| `handle_new_user` (gatilho) | Ao criar a conta: valida usuário, perfil, aceite dos Termos, ciência da Política e declaração de maioridade. Se faltar algo, **recusa o cadastro**. Se estiver tudo certo, cria o perfil e grava os registros de aceite. |
| `username_available` | Diz se um nome de usuário está livre (usado no formulário). |
| `accept_documents` | Registra o novo aceite quando os Termos ou a Política mudam de versão. |
| `acknowledge_educational_notice` | Registra a ciência do aviso educacional. |
| `set_marketing_consent` | Registra o consentimento opcional ou a revogação dele. |
| `export_my_data` | Devolve os dados da própria conta (acesso e portabilidade). |
| `delete_my_account` | Exclui a conta. Exige login com senha nos últimos 10 minutos. Apaga perfil, aceites e progresso em cascata. |

## 4. Configuração (passo a passo)

### 4.1 Criar o projeto no Supabase
1. Crie uma conta em **supabase.com** e um projeto novo. Em **Region**, escolha **South America (São Paulo)**, para manter os dados no Brasil.
2. Guarde a senha do banco num lugar seguro. O jogo não usa essa senha.

### 4.2 Criar as tabelas e regras
3. No painel do Supabase, abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**. O script pode ser executado de novo depois de atualizações.

### 4.3 Autenticação
4. Em **Authentication → Sign In / Providers → Email**:
   - mantenha **Email** ativado;
   - mantenha **Confirm email** ativado;
   - ative **Secure email change**.
5. Em **Authentication → Policies** (ou nas configurações de senha):
   - comprimento mínimo de **8**;
   - exigir **letras e números**.
6. Em **Authentication → URL Configuration**:
   - **Site URL:** `https://rafaelbicalho028.github.io/aurora-vet/jogo.html`
   - **Redirect URLs:** a mesma URL e, para testes locais, `http://localhost:5173/`.

   Os links de confirmação e de recuperação de senha levam a esse endereço. Se usar domínio próprio, troque aqui.
7. Em **Authentication → Rate Limits**, mantenha os limites padrão (ou reduza-os). Eles são a proteção do servidor contra tentativas abusivas. O jogo soma a isso um freio local: depois de 5 erros, uma espera que começa em 30 s e dobra a cada erro.

### 4.4 Envio de e-mails (obrigatório para abrir ao público)
8. O serviço de e-mail padrão do Supabase serve só para testes. Ele tem limite baixo e **envia apenas para endereços da equipe do projeto**.
9. Para testadores de fora, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**, com um provedor como Resend, Brevo ou Amazon SES.
10. Adicione esse provedor à Política de Privacidade, no item 4, se ele não for coberto pelo Supabase.
11. Opcional: traduza os modelos em **Authentication → Emails → Templates** (Confirm signup, Reset password). Exemplo de assunto: "Confirme sua conta no Aurora Vet".

### 4.5 Ligar o jogo ao projeto
12. Em **Project Settings → API Keys**, copie:
    - a **Project URL**;
    - a chave **pública**: `anon` ou `publishable`.

    **Nunca** use a chave `service_role` ou `secret`. O jogo recusa essa chave de propósito.
13. No GitHub (`RafaelBicalho028/aurora-vet`), abra **Settings → Secrets and variables → Actions → Variables → New repository variable** e crie:

    | Variável | Valor |
    |---|---|
    | `SUPABASE_URL` | Project URL (ex.: `https://abcd1234.supabase.co`) |
    | `SUPABASE_ANON_KEY` | chave pública (anon/publishable) |
    | `CONTACT_EMAIL` | e-mail de contato e privacidade |
    | `SUPABASE_REGION_LABEL` | ex.: `São Paulo, Brasil (sa-east-1)` |

14. Junte a branch `contas-e-login` à `main`. A publicação automática só roda quando `SUPABASE_URL` e `SUPABASE_ANON_KEY` existem; sem elas, o site anterior continua no ar.

### 4.6 Desenvolvimento local
- Copie `.env.example` para `.env.local`, preencha os campos e rode `npm run dev`.
- Sem `.env.local`, o `npm run dev` usa contas **simuladas** e mostra a faixa "MODO DE TESTE". Nesse modo, os e-mails aparecem no botão "📬 E-mails (simulação)".

## 5. Segurança

- Senhas: nunca passam pelo código do jogo além do envio ao Supabase pela conexão HTTPS. O Supabase guarda só o hash (bcrypt).
- Sessão: o token fica no armazenamento do navegador (`aurora-vet-auth`) e é renovado automaticamente pelo `supabase-js`.
- Chaves: no cliente vai apenas a chave pública. O isolamento entre contas é feito pelas políticas RLS, testadas em `supabase/tests/rls_tests.sql`.
- Ações sensíveis pedem a senha de novo:
  - alterar a senha;
  - excluir a conta (o servidor também confere se o login com senha tem menos de 10 minutos).
- Cadastro: e-mail duplicado é recusado pelo Supabase Auth; nome de usuário duplicado é recusado por um índice único.
- Mensagens de erro: não revelam detalhes internos. A recuperação de senha não informa se o e-mail existe.

## 6. Pendências do responsável

- [ ] **E-mail de contato e privacidade.** Hoje os documentos mostram "[e-mail de contato ainda não definido]". Defina a variável `CONTACT_EMAIL`.
- [ ] **Criar o projeto Supabase e configurar o SMTP próprio** (itens 4.1 a 4.5).
- [ ] **Revisão jurídica** dos Termos de Uso e da Política de Privacidade. O texto da Política foi redigido conforme a LGPD, mas não substitui a análise de um profissional.
- [ ] **Faixa etária.** O cadastro exige a declaração de ter 18 anos ou mais. Essa declaração não é uma verificação de idade. Liberar menores exige outra política e outros mecanismos (consentimento dos responsáveis e linguagem adequada).
- [ ] Opcional: **CAPTCHA** (Cloudflare Turnstile ou hCaptcha) no cadastro e no login, ativado no Supabase e acrescentado às telas.
- [ ] Rever o prazo de retenção de backups do plano do Supabase e atualizar o item 6 da Política, se necessário.
