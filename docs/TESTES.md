# Registro de testes e limitações conhecidas

Data da execução registrada: 24/11/2026. Ambiente: Linux, Node 22, Chromium (Playwright) em modo headless.

## 1. Testes automatizados (Vitest) — `npm test`

Resultado: **12 arquivos, 347 testes, todos aprovados** (versão 0.7). Inclui o cadastro **sem confirmação de e-mail** (configuração atual: conta criada já entra logada, sem e-mail enviado; sair e entrar só com e-mail e senha; e-mail repetido e termos não aceitos continuam recusados) e o diagnóstico de conexão. Os mesmos testes rodam automaticamente no GitHub Actions (`.github/workflows/ci.yml`) quando o repositório for publicado.

| Arquivo | Testes | O que verifica |
|---|---|---|
| `tests/content.test.ts` | 47 | Esquema e integridade dos dois casos clínicos; **a solução ideal derivada dos dados obtém 100**; validador detecta dados incompletos, referências inventadas, ausência de conduta correta, evidências inexistentes e ciclos de pré-requisitos; minigame, VetiDex (campos, categorias, referências, toda entrada é desbloqueável); missões, diálogos (nós existentes e alcançáveis, quizzes sempre com resposta correta), NPCs, animais e cadeia de missões completável. |
| `tests/scoring.test.ts` | 23 | Regras de pontuação de cada etapa: perguntas essenciais/irrelevantes, pré-requisitos de perguntas, interpretação do exame físico, exames desnecessários/aceitáveis, pré-requisito de segurança (aspirado antes do coagulograma), evidência não coletada não conta, diferenciais improváveis, condutas incorretas e **críticas (limite 50)**, nota 100 apenas sem falhas, agendamento de revisões e ganho de domínio. |
| `tests/maps.test.ts` | 150 | Estrutura dos mapas, ponto de chegada caminhável, transições campus↔interiores nos dois sentidos, destinos de transição válidos e sem laço, **busca em largura garantindo que o jogador não fica preso**, portas alcançáveis, portas trancadas com mensagem, todos os NPCs, animais e objetos interativos alcançáveis. |
| `tests/save.test.ts` | 10 | Salvar/carregar (ida e volta), JSON corrompido, estrutura inválida, versão futura, migração de saves antigos, apagar progresso, configurações e salvamento automático ao concluir objetivos. |
| `tests/progression.test.ts` | 10 | Curva de XP, etapas, níveis de domínio, XP por tentativa, revisão espaçada (promoção, reinício, consolidação) e pontuação do minigame. |
| `tests/questions.test.ts` | 12 | Sorteio sem repetição na sessão; **após reprovar, a nova tentativa traz perguntas inéditas enquanto houver no banco**; retorno às vistas há mais tempo; embaralhamento preserva a correta; casos embaralhados mantêm conteúdo e nota ideal 100. |
| `tests/pets.test.ts` | 11 | Fichas de 24 pets (raças de cães e gatos e outros animais) com referências válidas; sprites gerados dentro da área e com olhos; limite de adoção, troca de companheiro, afeição e migração de saves antigos. |
| `tests/clinicalTime.test.ts` | 10 | Interpretação dos tempos de resposta; **a solução ideal de cada caso cabe na meta de tempo e tira 100**; urgência penaliza excesso de perguntas e exames lentos (até −6); casos estáveis não perdem pontos por tempo. |
| `tests/appearance.test.ts` | 8 | Todas as combinações de cabelo, roupa, estampa e sexo geram quadros válidos; estilos de cabelo distintos; estampas só no tronco (no jaleco, só na roupa de baixo); traços por sexo; saves antigos sem sexo continuam funcionando; concordância de gênero nos textos. |
| `tests/account.test.ts` | 34 | Contas (backend simulado com as mesmas regras do real): validação do cadastro (campos, senha fraca, confirmação diferente, termos não aceitos, perfil obrigatório); cadastro válido registra perfil e aceites com versão e data, sem senha em texto puro; e-mail e nome de usuário duplicados; login bloqueado antes da confirmação; link de confirmação de uso único; login incorreto e bloqueio após 5 erros (espera que dobra); recuperação de senha (sem revelar e-mails; senha antiga deixa de valer); troca de senha exige a atual; logout; reabertura com sessão mantida; progresso salvo na conta e recuperado em outro aparelho; versão mais recente vence; isolamento entre contas; apagar progresso apaga na conta; aviso educacional e novo aceite de termos; alteração de nome e perfil; consentimento opcional e revogação; exportação; exclusão com senha (preserva o progresso antigo do navegador); migração verificada do progresso antigo (inclusive falha na verificação e "agora não"); configuração recusa chave secreta; tradução dos erros do Supabase. |
| `tests/days.test.ts` | 12 | Calendário (períodos, noite até dormir); ao dormir: altas, chegadas e vagas por sala; a Vila só recebe pacientes na Etapa 2; **variantes dos pacientes do dia trocam nomes em todos os textos e mantêm nota ideal 100 em todos os casos**; atendimento do dia marca o paciente, dá XP reduzido e não conclui missões; pacientes da história recebem alta no dia seguinte; migração de saves; relatório (CSV com BOM e separador “;”, texto, aluno sem atividades, células protegidas). |
| `tests/gamestate.test.ts` | 12 | Missões encadeadas e recompensas, condições compostas, XP de diálogo concedido uma vez, registro de atendimento aprovado/crítico, objetivos dinâmicos. |

Verificação de tipos (`npm run typecheck`): sem erros. Build (`npm run build`): concluído.

## 1b. Testes do banco de dados (PostgreSQL real) — `npm run test:db`

`supabase/schema.sql` aplicado duas vezes (idempotente) num PostgreSQL 16 local, com o schema `auth` do Supabase simulado (`supabase/tests/auth_stub.sql`). **24 verificações, todas aprovadas**: cadastro válido cria perfil e registros de aceite (termos, privacidade, maioridade, com versão e data/hora); o servidor recusa cadastro sem termos, sem ciência da privacidade, sem declaração de maioridade, sem perfil ou com perfil fora das 3 opções, com nome de usuário repetido e com e-mail já cadastrado; visitante sem login não lê tabelas nem exporta dados; **uma conta não lê, não altera, não apaga, não toma para si e não grava em nome do progresso, perfil ou aceites de outra**; o jogador não forja versão de termos nem insere ou apaga registros de aceite; funções de aceite, aviso educacional, consentimento e exportação (só os próprios dados); **exclusão de conta recusada sem autenticação recente** e, com ela, remove conta, perfil, aceites e progresso sem afetar outras contas.

## 2. Verificação ponta a ponta no navegador (Playwright, sobre o build de produção)

Roteiros em `dev/` (precisam de um servidor rodando: `npm run dev` ou `npm run preview`; defina `URL`).

| Roteiro | Resultado |
|---|---|
| `dev/e2e-contas.cjs` (v0.7) — fluxo completo de contas pela interface, com backend simulado, no modo **sem confirmação de e-mail** e uma verificação separada do modo com confirmação | **33/33** (24/11): cadastro válido entra direto, sem e-mail de confirmação; com "Confirm email" ligado, pede confirmação e bloqueia o login até o link. Também: tela inicial com os 5 botões; sem login não há Novo jogo/Continuar; Termos e Política abrem com o conteúdo exigido; caixas desmarcadas; erros de envio vazio, senha inválida, confirmação diferente, termos não aceitos; cadastro válido → "Confirme seu e-mail"; aceites registrados; login antes da confirmação bloqueado; e-mail duplicado recusado; link do e-mail → aviso educacional completo → menu; nome do personagem sugerido; progresso salvo na conta; Minha Conta dentro do jogo; alterar nome e perfil; exportar dados; logout; login incorreto/correto; reabertura sem novo login; Continuar recupera o progresso; recuperação de senha pelo link; migração do progresso antigo verificada e original mantido; isolamento entre contas; exclusão exige senha e remove só a conta certa; celular sem rolagem lateral; 0 erros de JavaScript. |
| Todos os roteiros anteriores (v0.7) — `e2e-full`, `e2e-side`, `e2e-mobile`, `e2e-scroll`, `e2e-institutos`, `e2e-vila`, `e2e-dias`, `e2e-creator`, agora entrando com conta simulada antes de jogar | Jogo preservado: Thor 100, Mimi 99 (erro proposital), Pingo 100, Nino 100, consulta do pet 100, backup restaurado em outro navegador/conta; Lívia e missões secundárias; d-pad no celular; rolagem do atendimento; 7 disciplinas; Bidu 100 e Luna 100 na Vila; dia/altas/paciente do dia 100 e planilha exportada; criação de personagem. 0 erros em todos. |
| Build de publicação sem Supabase configurado | Acesso bloqueado ("Acesso temporariamente indisponível"), sem Novo jogo/Continuar, sem código de contas simuladas no pacote, progresso antigo do navegador intacto. |
| `dev/e2e-dias.cjs` (v0.6) — entra em casa andando, vê o segundo pet em casa, dorme (sem pacientes extras antes do 1º caso), simula o Thor aprovado, dorme de novo (alta do Thor, chegada de paciente novo), atende o paciente do dia no hospital e baixa a planilha do relatório | Alta e chegada corretas; paciente do dia **100**; período avançou; CSV baixado com os dados do aluno. 0 erros. |
| `dev/e2e-vila.cjs` (v0.5) — Portão Sul fechado na Etapa 1; save antigo com “Rumo à Etapa 2” concluída recebe a liberação; atravessa o portão andando, entra na clínica pela porta, atende o Bidu e a Luna e conclui as missões do pet shop e do centro de adoção | Portão bloqueado na Etapa 1 e aberto na 2; HUD “Etapa 2”; Bidu **100**, Luna **100**; 4 missões da Vila concluídas. 0 erros. |
| `dev/e2e-institutos.cjs` (v0.4) — caminha do campus ao Setor dos Institutos pela avenida oeste, entra em um prédio pela porta, estuda as 7 aulas (revelando as respostas) e faz os 6 questionários novos | 7 missões de disciplina concluídas. 0 erros. |
| `dev/e2e-scroll.cjs` (v0.4) — no atendimento, perguntar/avaliar mantém a posição da rolagem; mudar de etapa volta ao topo (desktop e celular) | Posição mantida; nova etapa no topo. |
| `dev/e2e-creator.cjs` (v0.4) — criação com sexo, tranças, camiseta e estampa de patinhas | Aparência salva; texto concorda com o sexo escolhido. |
| `dev/e2e-full.cjs` (v0.3) — inclui ainda os casos do Pingo e do Nino, a consulta preventiva do pet e o backup por código restaurado em um navegador sem save | Pingo 100, Nino 100, consulta do pet 100; progresso (nome, XP, pet, 5 atendimentos) restaurado. 0 erros. |
| `dev/e2e-full.cjs` (v0.1) — título → criação de personagem → caminhada com teclado até o Lucas → entrada no Laboratório de Anatomia **andando pela porta** → atividade de anatomia → entrada no Hospital pela porta → quiz de biossegurança → atendimento completo do Thor → relatório à Dra. Helena → atendimento completo da Mimi (com um erro proposital de interpretação) → menus (Diário, VetiDex, Desempenho, Mapa, Mochila) → Estação de Revisão → **recarregar a página e “Continuar”** | Thor: **100**; Mimi: **99** (o erro proposital impede o 100). Todas as 6 missões principais concluídas; posição, XP e missões preservados após recarregar. **0 erros de JavaScript.** |
| `dev/e2e-side.cjs` — Seu Antônio e observação da vaca/ovelhas **por cima da cerca**, quiz da Profa. Lívia, leituras da biblioteca | As 3 missões secundárias concluídas; guia de bolso recebido. 0 erros. |
| `dev/e2e-mobile.cjs` — celular em retrato e paisagem (Pixel 7): título, criação, caminhada com o **d-pad de toque**, tela de atendimento | Personagem andou com o d-pad; layouts responsivos. 0 erros. |

As capturas de tela produzidas foram inspecionadas visualmente (título, criação, campus, interiores, diálogo, cada etapa do atendimento, resultado, minigame, menus e telas de celular).

## 3. Testes manuais

Não houve teste manual por pessoas além da automação acima. Não foram testados: Safari/Firefox, leitores de tela, controles físicos (gamepad), teclados não-QWERTY.

## 4. Limitações conhecidas

- **Contas (v0.7) — o que NÃO foi testado de ponta a ponta**: o envio real de e-mails (confirmação e recuperação), os limites de taxa do servidor e a sessão real do Supabase, porque ainda não existe um projeto Supabase e este ambiente não acessa supabase.co. A integração (`src/account/supabaseBackend.ts`) segue a API documentada do `@supabase/supabase-js` 2.118.0 e compila, mas precisa ser verificada no primeiro uso com o projeto real (roteiro em `docs/CONTAS.md`). As regras de acesso do banco foram testadas em PostgreSQL real; os fluxos de interface, com o backend simulado.
- A maioridade é **autodeclarada** (caixa de seleção); não há verificação de idade.

- **Conteúdo clínico pendente de validação técnica** por médico(a)-veterinário(a); intervalos de referência são ilustrativos.
- As referências indicam **onde verificar**; o texto do jogo é uma síntese e não foi conferido página a página nas edições citadas.
- Disponíveis: Universidade (campus e Setor dos Institutos) e Vila dos Animais (Etapa 2, primeira parte). As demais regiões aparecem como “em desenvolvimento”.
- Avisos rápidos (toasts) e o diário mostram os textos sem concordância de gênero; por isso os objetivos usam formas neutras.
- Áudio sintetizado simples (chiptune); começa após a primeira interação do usuário (política dos navegadores).
- O save é local ao navegador/dispositivo (LocalStorage); limpar dados do site apaga o progresso. Não há sincronização entre dispositivos.
- Abrir `dist/index.html` via `file://` pode não funcionar em alguns navegadores; use um servidor estático.
- O pacote do Phaser tem ~1,5 MB (≈340 kB comprimido); o primeiro carregamento depende da conexão, depois funciona offline enquanto em cache.
- Os ganchos `window.__vetquest` e `window.__vetquestBus` ficam expostos para automação de testes.
