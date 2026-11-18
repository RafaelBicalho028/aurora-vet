# Registro de testes e limitações conhecidas

Data da execução registrada: 17/11/2026. Ambiente: Linux, Node 22, Chromium (Playwright) em modo headless.

## 1. Testes automatizados (Vitest) — `npm test`

Resultado: **9 arquivos, 162 testes, todos aprovados** (versão 0.3). Os mesmos testes rodam automaticamente no GitHub Actions (`.github/workflows/ci.yml`) quando o repositório for publicado.

| Arquivo | Testes | O que verifica |
|---|---|---|
| `tests/content.test.ts` | 35 | Esquema e integridade dos dois casos clínicos; **a solução ideal derivada dos dados obtém 100**; validador detecta dados incompletos, referências inventadas, ausência de conduta correta, evidências inexistentes e ciclos de pré-requisitos; minigame, VetiDex (campos, categorias, referências, toda entrada é desbloqueável); missões, diálogos (nós existentes e alcançáveis, quizzes sempre com resposta correta), NPCs, animais e cadeia de missões completável. |
| `tests/scoring.test.ts` | 23 | Regras de pontuação de cada etapa: perguntas essenciais/irrelevantes, pré-requisitos de perguntas, interpretação do exame físico, exames desnecessários/aceitáveis, pré-requisito de segurança (aspirado antes do coagulograma), evidência não coletada não conta, diferenciais improváveis, condutas incorretas e **críticas (limite 50)**, nota 100 apenas sem falhas, agendamento de revisões e ganho de domínio. |
| `tests/maps.test.ts` | 47 | Estrutura dos mapas, ponto de chegada caminhável, transições campus↔interiores nos dois sentidos, destinos de transição válidos e sem laço, **busca em largura garantindo que o jogador não fica preso**, portas alcançáveis, portas trancadas com mensagem, todos os NPCs, animais e objetos interativos alcançáveis. |
| `tests/save.test.ts` | 10 | Salvar/carregar (ida e volta), JSON corrompido, estrutura inválida, versão futura, migração de saves antigos, apagar progresso, configurações e salvamento automático ao concluir objetivos. |
| `tests/progression.test.ts` | 10 | Curva de XP, etapas, níveis de domínio, XP por tentativa, revisão espaçada (promoção, reinício, consolidação) e pontuação do minigame. |
| `tests/questions.test.ts` | 10 | Sorteio sem repetição na sessão; **após reprovar, a nova tentativa traz perguntas inéditas enquanto houver no banco**; retorno às vistas há mais tempo; embaralhamento preserva a correta; casos embaralhados mantêm conteúdo e nota ideal 100. |
| `tests/pets.test.ts` | 11 | Fichas de 24 pets (raças de cães e gatos e outros animais) com referências válidas; sprites gerados dentro da área e com olhos; limite de adoção, troca de companheiro, afeição e migração de saves antigos. |
| `tests/clinicalTime.test.ts` | 8 | Interpretação dos tempos de resposta; **a solução ideal de cada caso cabe na meta de tempo e tira 100**; urgência penaliza excesso de perguntas e exames lentos (até −6); casos estáveis não perdem pontos por tempo. |
| `tests/gamestate.test.ts` | 8 | Missões encadeadas e recompensas, condições compostas, XP de diálogo concedido uma vez, registro de atendimento aprovado/crítico, objetivos dinâmicos. |

Verificação de tipos (`npm run typecheck`): sem erros. Build (`npm run build`): concluído.

## 2. Verificação ponta a ponta no navegador (Playwright, sobre o build de produção)

Roteiros em `dev/` (precisam de um servidor rodando: `npm run dev` ou `npm run preview`; defina `URL`).

| Roteiro | Resultado |
|---|---|
| `dev/e2e-full.cjs` (v0.3) — inclui ainda os casos do Pingo e do Nino, a consulta preventiva do pet e o backup por código restaurado em um navegador sem save | Pingo 100, Nino 100, consulta do pet 100; progresso (nome, XP, pet, 5 atendimentos) restaurado. 0 erros. |
| `dev/e2e-full.cjs` (v0.1) — título → criação de personagem → caminhada com teclado até o Lucas → entrada no Laboratório de Anatomia **andando pela porta** → atividade de anatomia → entrada no Hospital pela porta → quiz de biossegurança → atendimento completo do Thor → relatório à Dra. Helena → atendimento completo da Mimi (com um erro proposital de interpretação) → menus (Diário, VetiDex, Desempenho, Mapa, Mochila) → Estação de Revisão → **recarregar a página e “Continuar”** | Thor: **100**; Mimi: **99** (o erro proposital impede o 100). Todas as 6 missões principais concluídas; posição, XP e missões preservados após recarregar. **0 erros de JavaScript.** |
| `dev/e2e-side.cjs` — Seu Antônio e observação da vaca/ovelhas **por cima da cerca**, quiz da Profa. Lívia, leituras da biblioteca | As 3 missões secundárias concluídas; guia de bolso recebido. 0 erros. |
| `dev/e2e-mobile.cjs` — celular em retrato e paisagem (Pixel 7): título, criação, caminhada com o **d-pad de toque**, tela de atendimento | Personagem andou com o d-pad; layouts responsivos. 0 erros. |

As capturas de tela produzidas foram inspecionadas visualmente (título, criação, campus, interiores, diálogo, cada etapa do atendimento, resultado, minigame, menus e telas de celular).

## 3. Testes manuais

Não houve teste manual por pessoas além da automação acima. Não foram testados: Safari/Firefox, leitores de tela, controles físicos (gamepad), teclados não-QWERTY.

## 4. Limitações conhecidas

- **Conteúdo clínico pendente de validação técnica** por médico(a)-veterinário(a); intervalos de referência são ilustrativos.
- As referências indicam **onde verificar**; o texto do jogo é uma síntese e não foi conferido página a página nas edições citadas.
- Somente a região da Universidade está disponível; demais regiões aparecem bloqueadas.
- Áudio sintetizado simples (chiptune); começa após a primeira interação do usuário (política dos navegadores).
- O save é local ao navegador/dispositivo (LocalStorage); limpar dados do site apaga o progresso. Não há sincronização entre dispositivos.
- Abrir `dist/index.html` via `file://` pode não funcionar em alguns navegadores; use um servidor estático.
- Confirmações usam caixas de diálogo nativas do navegador (`confirm`).
- O pacote do Phaser tem ~1,5 MB (≈340 kB comprimido); o primeiro carregamento depende da conexão, depois funciona offline enquanto em cache.
- Os ganchos `window.__vetquest` e `window.__vetquestBus` ficam expostos para automação de testes.
