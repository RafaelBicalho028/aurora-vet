# Como adicionar um novo caso clínico

Os casos ficam em **`src/content/cases/*.json`**, separados do código, para que professores possam revisar e editar sem programar. O esquema tipado está em `src/systems/cases/caseTypes.ts` e o validador em `src/systems/cases/validateCase.ts`.

## Passo a passo

1. **Copie** um caso existente (`thor-prurido.json` é o mais simples) para `src/content/cases/<novo-id>.json`.
2. **Edite os metadados**: `id` (único), `title`, `difficulty` (1–5), `minStage` (etapa acadêmica mínima), `baseXp`, `passScore`, `disciplines` (quais habilidades recebem XP de domínio e por qual etapa do atendimento).
3. **Referências**: liste em `references` apenas ids existentes em `src/content/references.json`, dizendo em `supports` o que cada fonte sustenta. Para uma fonte nova, adicione-a ao catálogo **somente se ela for verificável** (não invente referências).
4. **Validação**: mantenha `validation.status = "pendente"` até a revisão por médico(a)-veterinário(a). Para marcar `"validado"`, preencha `reviewer` e `date`.
5. **Paciente**: `sprite` deve ser uma textura existente (`dog_caramelo`, `dog_campus`, `cat_laranja`, `cat_cinza`, `cow`, `sheep`) ou uma nova (veja `docs/ARTE.md`). `tutorNpc` deve ser o id de um NPC (para o retrato).
6. **Anamnese** (`anamnesis.questions`): cada pergunta tem `relevance` (`essential` | `complementary` | `irrelevant`), `answer`, `explanation` e, opcionalmente:
   - `requires`: ids de perguntas que precisam ser feitas antes (perguntas de aprofundamento);
   - `findingId`: o achado que a resposta revela.
7. **Exame físico** (`physicalExam.items`): `status` (`normal` | `altered`) é a interpretação correta; `reference` pode ser numérica (`{min, max, unit, note}`) ou textual.
8. **Exames complementares** (`tests.items`): `category` (`indicated` | `acceptable` | `unnecessary`), `cost`, `turnaround`, `result`, `table` opcional, `justification` e, se houver risco, `requires` + `requiresMessage` (pré-requisito de segurança).
9. **Achados** (`findings`): rótulo curto e `supports` = hipóteses que o achado sustenta.
10. **Diagnóstico**: `hypotheses` com `plausibility` (`key` | `plausible` | `unlikely`), `correctId`, `expectedDifferentials`, `keyEvidence` (achados que justificam o diagnóstico — precisam ser obtíveis em alguma etapa), limites de diferenciais e `explanation`.
11. **Conduta**: opções com `category` (`correct` | `acceptable` | `incorrect` | `critical`). Condutas críticas exigem `consequence` (descrição clínica realista, sem punição gráfica). Fármacos podem ter `pharmacology` (classe, mecanismo, indicações, contraindicações, princípios) — **nunca inclua doses**.
12. **Desfechos** (`outcome.success/partial/critical`), **VetiDex** liberado (`vetidexUnlocks`) e **revisão** (`review.topics` por etapa e `review.questions` com `triggeredBy` = ids de decisões cujo erro agenda a pergunta).
13. **Registre** o caso em `src/content/index.ts` (import + entrada em `CASES`).
14. **Crie a missão** em `src/content/quests.ts` (com objetivo `o_atender`, que é concluído automaticamente quando o caso é aprovado) e o diálogo do tutor em `src/content/dialogues.ts` com o efeito `{ "type": "startCase", "caseId": "<id>" }`. Posicione o NPC/animal em `src/content/npcs.ts`.
15. **Rode os testes**:

```bash
npm run validate:content
```

O teste valida o esquema e também **gera automaticamente a solução ideal** a partir dos dados (todas as perguntas não irrelevantes, todos os exames indicados, diferenciais esperados, evidências-chave e condutas corretas) e exige nota **100** — garantindo que o caso tem solução coerente com seus dados.

## O que o validador impede

- Campos clínicos vazios, ids duplicados, referências desconhecidas.
- Diagnóstico correto ausente das hipóteses ou sem plausibilidade `key`.
- Evidências-chave inexistentes, que não sustentam o diagnóstico ou que **não podem ser obtidas** em nenhuma etapa (evita casos resolvidos por adivinhação).
- Ausência de conduta correta; conduta crítica sem consequência; farmacologia incompleta.
- Perguntas inalcançáveis (ciclos em `requires`), pré-requisitos de exames inexistentes.
- Dicas do supervisor ausentes, desfechos ausentes, perguntas de revisão sem resposta válida.

## Regras de pontuação (resumo)

| Etapa | Regra |
|---|---|
| Anamnese (20) | 16 pts proporcionais às essenciais + 4 às complementares; −1 por pergunta irrelevante (máx. −4) |
| Exame físico (20) | 10 essenciais + 4 complementares + 6 pela interpretação correta dos itens avaliados |
| Exames (20) | 20 proporcionais aos indicados; −3 por desnecessário (máx. −9); −3 por pré-requisito de segurança violado |
| Diagnóstico (20) | 8 diagnóstico correto (2 se outro diferencial-chave); 6 diferenciais esperados (−2 por improvável); 6 evidências-chave (−1 por evidência que não sustenta) |
| Conduta (20) | 20 proporcionais às corretas; −5 por incorreta; crítica zera a etapa |
| Global | Decisão crítica limita a nota a 50; total arredondado para baixo (100 só sem falhas) |

## Banco de perguntas (aulas, quizzes e revisão)

Perguntas avulsas ficam em `src/content/questionBank.json`, agrupadas em *pools* (`anatomia_comparada`, `sinais_vitais`, `biosseguranca`). Cada pergunta tem `id` único, `prompt`, `options` (3+), `correctIndex`, `explanation`, `refs` (ids do catálogo) e, opcionalmente, `vetidexId`.

- Para ampliar um pool, basta acrescentar perguntas: o sorteio passa a usá-las automaticamente.
- Os testes exigem pools com pelo menos 12 perguntas e com o dobro do máximo usado por sessão, para garantir variedade ao repetir.
- Quizzes de personagens são configurados em `src/content/quizzes.ts` (pool, acertos exigidos, máximo de perguntas, efeitos ao concluir).
- Estruturas do esqueleto interativo ficam em `src/content/minigames/anatomia-intro.json` (`hotspots.structures`, com coordenadas no esquema de 400×240); o teste impede círculos sobrepostos.
