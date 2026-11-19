# VetQuest: Jornada Veterinária — MVP jogável

RPG educacional 2D em pixel art, para navegador, em que estudantes de Medicina Veterinária exploram a Universidade de Aurora, conhecem personagens, encontram animais e conduzem **atendimentos clínicos supervisionados** (anamnese → exame físico → exames complementares → diagnóstico → conduta → resultado).

> ⚠️ **Material educacional.** Todo o conteúdo clínico é uma síntese didática **pendente de validação por médico(a)-veterinário(a)**. O jogo não apresenta doses nem prescrições. Níveis e etapas representam progresso no jogo, **não habilitação profissional**.

Tecnologias: **TypeScript + Phaser 3.90 + Vite 6**, interface em DOM/CSS, salvamento em **LocalStorage**, testes com **Vitest** e verificação ponta a ponta com **Playwright**. Não precisa de servidor para jogar: o build é estático.

---

## 1. Instalação e execução

Requisitos: Node.js 18+ (testado com Node 22) e npm.

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço exibido (padrão `http://localhost:5173`). Navegadores recomendados: Chrome ou Edge.

### Testes e verificação de tipos

```bash
npm test
```

```bash
npm run typecheck
```

### Build de produção (hospedagem estática)

```bash
npm run build
```

Gera a pasta `dist/` com `index.html` e `assets/`. Os caminhos são relativos (`base: './'`), então a pasta pode ser publicada em qualquer hospedagem estática (GitHub Pages, Netlify, servidor da universidade, pasta em subdiretório). Para testar o build localmente:

```bash
npm run preview
```

> Abrir `dist/index.html` diretamente via `file://` pode ser bloqueado por alguns navegadores (módulos ES). Use `npm run preview` ou qualquer servidor estático simples.

---

## 2. Controles

| Ação | Teclas padrão |
|---|---|
| Mover | WASD ou setas (toque rápido apenas vira o personagem) |
| Correr | Shift |
| Interagir / confirmar | E, Enter ou Espaço |
| Menu | Esc |
| Inventário (Mochila) | I |
| Celular | Direcional analógico, **A** = interagir, **B** = correr, ☰ = menu |
| Mapa | M |
| VetiDex | V |
| Diário de missões | J |
| Painel de desempenho | P |

Todas as teclas podem ser **remapeadas** em *Menu → Configurações*. Em telas de toque aparecem um direcional e botões **A**/**☰** (configurável: automático, sempre ou nunca). O modo tela cheia está no título, no menu e nas configurações.

---

## 3. O que está implementado (MVP)

| Requisito do MVP | Situação |
|---|---|
| Tela inicial funcional (Continuar, Novo jogo, Configurações, Tela cheia, Sobre) | ✅ |
| Criação de personagem (nome, sexo, tom de pele, 8 cores e 8 estilos de cabelo, 4 roupas, 6 cores, 7 estampas com 6 cores, óculos) com prévia animada | ✅ |
| Mapa externo explorável da universidade (44×34 tiles) com colisões, prédios, praça, lagoa, fazenda-escola e saídas bloqueadas por etapa | ✅ |
| Clínica acessível: Hospital Veterinário Universitário (recepção, sala de espera, atendimento, laboratório de análises) | ✅ |
| Interiores extras: Laboratório de Anatomia e Biblioteca | ✅ |
| NPCs interativos (21): Lucas, Rafaela, Bruno e Nara (colegas), Prof. Otávio (Anatomia), Profa. Lívia (Fisiologia), Profa. Renata (Microbiologia), Prof. Jorge (Parasitologia), Profa. Inês (Farmacologia), Prof. Raul (Patologia), Profa. Beatriz (Cirurgia e Anestesiologia), Prof. Tomás (Saúde Pública), Dra. Helena (hospital), Bia (técnica de laboratório), Carla (recepção), Sr. Joaquim e Dona Marta (tutores), Seu Antônio (produtor rural) | ✅ |
| Animais visualmente diferentes com sprites e animação própria: cães (2), gatos (2), vaca, ovelhas | ✅ |
| Atendimento completo do cão com prurido (Thor — DAPP) | ✅ |
| Casos extras: filhote com diarreia (Pingo) e emergência urinária felina (Nino) | ✅ |
| Segundo caso: gata com hiporexia (Mimi — lipidose hepática felina) | ✅ |
| Caso introdutório de anatomia (esqueleto interativo + anatomia comparada) | ✅ |
| Sistema de XP, níveis, etapas e domínio por disciplina (Iniciante → Especialista) | ✅ |
| VetiDex (46 entradas, 10 categorias) com desbloqueio progressivo | ✅ |
| Salvamento automático (missões, atendimentos, troca de mapa, a cada 60 s, ao ocultar/fechar a aba) e “Continuar” | ✅ |
| Diário de missões (principais e secundárias) | ✅ |
| Tela de desempenho educacional (histórico, médias por etapa, disciplinas, conteúdos para revisar, evolução, revisão espaçada) | ✅ |

### Novidades da versão 0.6 — Dias, casa e relatório

- **Sistema de dias**: o HUD mostra o dia e o período (☀ manhã, 🌤 tarde, 🌙 noite). Cada atendimento ocupa um período; à noite, um aviso sugere voltar para casa.
- **Altas e novos pacientes**: ao amanhecer, os pacientes atendidos recebem alta e saem da sala de espera (inclusive os da história). Chegam **1 ou 2 pacientes novos por dia** ao Hospital (Etapa 1) e à Clínica da Vila (Etapa 2), sorteados entre os quadros clínicos que você já resolveu na história — com outro animal, outro tutor e as opções embaralhadas. Valem metade do XP de um caso inédito.
- **Sua casa** (moradia estudantil no campus, ao lado da avenida central): **cama para dormir** e passar para o dia seguinte (com resumo de altas e chegadas), **cantinho dos pets** — os pets que não são o companheiro ficam passeando em casa — e um **computador** que abre o painel de desempenho.
- **Estatísticas e exportação** (aba Desempenho → “📤 Estatísticas e exportação”): resumo de nível, atendimentos, médias por etapa do atendimento, domínio por disciplina e histórico, com **download da planilha (CSV)**, **resumo em texto**, **copiar** e **imprimir/salvar em PDF**.

### Novidades da versão 0.5 — Etapa 2: Vila dos Animais

- **Etapa 2 liberada**: ao concluir “Rumo à Etapa 2” (nível 5), o **Portão Sul** do campus se abre. Saves antigos que já tinham concluído essa missão recebem a liberação automaticamente.
- **Novo mapa: Vila dos Animais**, com praça, **Clínica Veterinária da Vila** (Dr. Marcos Vieira), **Pet Shop Patas & Cia.** (Seu Hiro), **Centro de Adoção** (Tânia), residências e a Dona Rosa com os gatos comunitários.
- **Dois casos clínicos novos** (15 perguntas de revisão cada):
  - *Febre e Sangramento* — Bidu: erliquiose monocítica canina, com babesiose, raticida anticoagulante e leishmaniose como diferenciais; o AINE é conduta crítica.
  - *A Gata que Tremia* — Luna: intoxicação por permetrina (urgente, com tempo clínico); paracetamol e indução de vômito são condutas críticas.
- **Missões**: A Vila dos Animais → Febre e Sangramento → A Gata que Tremia → Saúde na Vizinhança (orientar clientes no pet shop e conhecer o centro de adoção).
- 5 entradas novas na VetiDex (babesiose, carrapato-marrom, doxiciclina, intoxicação por permetrina, relaxantes musculares).
- O mapa (M) agora mostra **“Em desenvolvimento”** nas regiões que ainda não existem (Região Rural, Reserva Ambiental, Centro Veterinário Avançado).

### Novidades da versão 0.4

- **Correção**: a tela de atendimento não volta mais ao topo ao fazer uma pergunta ou avaliar um item; ela só vai ao topo quando você muda de etapa.
- **Personagem**: escolha de **sexo** (Feminino/Masculino), com traços no rosto e textos que concordam com o gênero ("Bem-vinda", "pronto"...); **4 roupas** (jaleco, pijama cirúrgico, camiseta e jeans, moletom), **7 estampas** (listras, xadrez, bolinhas, corações, patinhas, cruz veterinária) em 6 cores; **8 estilos de cabelo** (novos: raspado, chanel com franja, rabo de cavalo, tranças) e cores rosa e azul.
- **Matérias por prédio**: 7 disciplinas, cada uma em seu prédio, com um professor, uma **aula de quadros clínicos explicativos** (situação clínica, explicação, pontos-chave, pergunta de reflexão e referências) e um **questionário** sorteado do banco:
  - Campus: **Instituto de Fisiologia** (Profa. Lívia) e **Laboratório de Microbiologia** (Profa. Renata).
  - Novo mapa **Setor dos Institutos** (pela avenida oeste): **Parasitologia** (Prof. Jorge), **Farmacologia** (Profa. Inês), **Patologia** (Prof. Raul), **Cirurgia e Anestesiologia** (Profa. Beatriz) e **Saúde Pública** (Prof. Tomás).
  - 21 quadros clínicos, 78 perguntas novas (13 por matéria), 21 entradas novas na VetiDex, 2 disciplinas novas no painel de desempenho (Farmacologia e Patologia) e 12 referências novas verificáveis.

### Novidades da versão 0.3

- **Dois casos clínicos novos**: *O Filhote Barrigudo* (Pingo, toxocaríase, com parvovirose como diferencial e foco em Saúde Única) e *Emergência Veterinária* (Nino, obstrução uretral felina com hipercalemia). A história principal agora tem 4 atendimentos.
- **Tempo clínico**: cada pergunta, exame físico e exame complementar consome minutos estimados. Em casos **urgentes**, passar da meta reduz a nota da conduta (até −6) e mostra a consequência clínica; nos estáveis, o tempo aparece como referência.
- **Pet como paciente**: carteira de saúde por espécie (vacinas, vermes, pulgas, dentes, dieta...), lembretes de pendências e **consulta preventiva** na recepção do Hospital, com alternativas incorretas e perigosas (ex.: permetrina em gatos) e uma pergunta sobre a raça. No jogo, 1 dia real = 1 mês do pet.
- **Backup do progresso**: copiar um código de salvamento e restaurá-lo em outro aparelho ou navegador (Configurações ou tela inicial).
- **Acessibilidade**: tamanho de texto ajustável, seleção indicada por ícone além da cor, foco visível no teclado e respeito à opção de reduzir movimento do sistema.
- **Repositório git com CI** (GitHub Actions): verificação de tipos, testes e build a cada envio.

### Novidades da versão 0.2

- **Feito para celular**: a tela ocupa todo o aparelho em retrato ou paisagem, com zoom inteiro (pixel art nítida). Direcional analógico (arraste o dedo em qualquer direção), botão **A** (interagir) e **B** (segurar para correr). Telas de menu, adoção e atendimento em tela cheia, prontuário recolhível e ações fixas no rodapé. Pode ser instalado na tela inicial (manifesto PWA), o teclado virtual não abre sozinho e o áudio pausa quando o app vai para segundo plano.
- **Banco de perguntas maior**: 62 perguntas sorteadas (anatomia comparada, sinais vitais e biossegurança), 21 estruturas no esqueleto interativo e 15–16 perguntas de revisão por caso. O sorteio prioriza perguntas nunca vistas e depois as vistas há mais tempo: **quem reprova e tenta de novo encontra perguntas diferentes**. As alternativas são embaralhadas a cada exibição, e as novas tentativas de um caso clínico embaralham a ordem de perguntas, exames, hipóteses e condutas. Os quizzes da Dra. Helena e da Profa. Lívia passaram a usar o banco (3 acertos em até 6 perguntas); erros vão para a revisão espaçada.
- **Pets**: adote até 4 pets entre **12 raças de cães, 8 de gatos** e **coelho, porquinho-da-índia, hamster-sírio e calopsita**. A adoção é oferecida ao criar o personagem, pela voluntária **Júlia** (praça central) ou pela aba **Pets** do menu. O pet escolhido acompanha o jogador pelo mundo; faça carinho para ver curiosidades e cuidados da raça. Cada ficha traz fatos e predisposições descritas com referências (predisposição não é destino).

### Destaques de jogabilidade

- **Movimento em grade em 4 direções** com animação de caminhada, corrida, colisão com cenário/NPCs/animais, NPCs que caminham e olham ao redor, animais que pastam, coçam ou abanam o rabo.
- **Transições suaves** (fade) entre campus e interiores; portas trancadas explicam o pré-requisito acadêmico.
- **Diálogos com retratos expressivos** (neutro, feliz, preocupado, surpreso), efeito de digitação e **escolhas** — incluindo perguntas educativas com feedback (biossegurança com a Dra. Helena, sinais vitais com a Profa. Lívia).
- **Atendimento clínico (etapas A–F)**:
  - **A. Anamnese**: o jogador escolhe as perguntas; há perguntas essenciais, complementares e irrelevantes, e **perguntas de aprofundamento (✦) que só surgem após certas escolhas** e revelam informações novas.
  - **B. Exame físico**: avaliação item a item (sinais vitais, mucosas, TPC, hidratação, linfonodos, auscultação, palpação, neurológico e exames específicos) e **interpretação normal/alterado**. Valores de referência por espécie aparecem com o *Guia de bolso* (missão da Profa. Lívia) ou no VetiDex.
  - **C. Exames complementares** com custo fictício, tempo de resposta, tabelas de resultado com marcação ↑/↓ e **pré-requisitos de segurança** (ex.: coagulograma antes do aspirado hepático).
  - **D. Diagnóstico**: lista de diferenciais, diagnóstico mais provável e **justificativa com os achados efetivamente obtidos** (não dá para justificar com o que não foi investigado).
  - **E. Conduta** com tipos (observação, suporte, tratamento, encaminhamento, internação, procedimento supervisionado, prevenção) e **farmacologia educacional** (classe, mecanismo, indicações, contraindicações, princípios) — sem doses.
  - **F. Resultado**: nota 0–100 por etapa, decisões certas/erradas com explicação científica, desfecho clínico (sem punição gráfica), XP, conteúdos para revisão com links ao VetiDex e fontes.
- **Avaliação**: 20 pontos por etapa; decisões críticas de segurança zeram a conduta e limitam a nota a 50; a nota só é 100 sem nenhuma falha; não há bônus por rapidez.
- **Revisão espaçada** (caixas de Leitner): erros agendam perguntas específicas; Estação de Revisão na biblioteca e no painel de desempenho; modo prática quando não há pendências.

---

## 4. Funcionalidades planejadas (ainda não implementadas)

- Mais casos e visitas domiciliares na Vila dos Animais; regiões **Região Rural**, **Reserva Ambiental** e **Centro Veterinário Avançado** (aparecem no mapa como “em desenvolvimento”).
- Missões 2 e 4 do roteiro (bovino com queda na produção, investigação epidemiológica).
- Minigames de microscopia, hemograma, diagnóstico por imagem, parasitologia e farmacologia.
- Aulas de Histologia, Imunologia, Nutrição e Diagnóstico por Imagem; práticas interativas (microscópio, necrópsia virtual) dentro dos institutos.
- Árvores de habilidades com desbloqueios ativos (hoje o domínio é medido e exibido, mas não libera habilidades).
- Arte profissional, trilhas sonoras gravadas, mais expressões e animações.
- Contas com salvamento na nuvem e painel para professores (relatórios da turma).
- Validação técnica do conteúdo por médicos-veterinários docentes.

---

## 5. Estrutura do projeto

```
vetquest/
├── index.html                  # página única do jogo
├── vite.config.ts              # build (base relativa) e configuração do Vitest
├── src/
│   ├── main.ts                 # inicialização do Phaser, UI e ganchos globais
│   ├── core/                   # engine: estado, salvamento, entrada, áudio, eventos, fluxo
│   │   ├── GameState.ts        # missões, XP, VetiDex, inventário, domínio, histórico, revisão
│   │   ├── SaveManager.ts      # LocalStorage com validação, versão e migração
│   │   ├── InputManager.ts     # teclado/toque com ações remapeáveis
│   │   ├── AudioManager.ts     # efeitos e músicas originais sintetizados (WebAudio)
│   │   └── ...
│   ├── scenes/                 # cenas Phaser: Boot, Title, World (exploração)
│   ├── world/                  # mapas, colisões, entidades (jogador, NPCs, animais)
│   │   └── maps/               # campus, hospital, laboratório de anatomia, biblioteca
│   ├── art/                    # pixel art procedural: personagens, animais, tiles, objetos, prédios
│   ├── systems/
│   │   ├── cases/              # esquema dos casos, pontuação, validação, minigame
│   │   ├── progression/        # XP, níveis, etapas e domínio
│   │   ├── review/             # revisão espaçada
│   │   ├── questions/          # sorteio do banco de perguntas
│   │   └── dialogue/           # tipos de condições e efeitos
│   ├── ui/                     # HUD, diálogo, menus, atendimento, minigame, revisão, título
│   ├── content/                # CONTEÚDO EDUCACIONAL (separado do código)
│   │   ├── cases/*.json        # casos clínicos revisáveis por professores
│   │   ├── minigames/*.json    # atividade de anatomia
│   │   ├── vetidex.json        # enciclopédia
│   │   ├── questionBank.json   # banco de perguntas sorteadas
│   │   ├── lessons.json        # aulas dos professores (quadros clínicos explicativos)
│   │   ├── quizzes.ts          # quizzes conduzidos por personagens
│   │   ├── pets.ts             # raças/espécies adotáveis e fichas
│   │   ├── references.json     # catálogo central de referências
│   │   ├── dialogues.ts, quests.ts, npcs.ts, disciplines.ts
│   └── styles/main.css
├── tests/                      # testes automatizados (Vitest)
├── dev/                        # roteiros Playwright de verificação ponta a ponta e prévia de arte
└── docs/
    ├── ADICIONANDO_CASOS.md    # como criar novos casos clínicos
    ├── TESTES.md               # registro de testes e limitações conhecidas
    └── ARTE.md                 # como substituir a arte procedural por arte profissional
```

---

## 6. Validação científica

- Referências em `src/content/references.json` (Dyce/Sack/Wensing; Cunningham/Klein; Ettinger; Nelson & Couto; Merck Veterinary Manual; Muller & Kirk; artigos revisados por pares; diretrizes WSAVA, OMS, FDA e CFMV). Casos, minigames e VetiDex apontam para esse catálogo, e os testes falham se um id não existir.
- **Transparência**: as obras são indicadas como **fontes para verificação**. O texto do jogo é uma síntese própria de conhecimento consolidado, sem reprodução de trechos, e **deve ser conferido na edição disponível** pelo(a) revisor(a).
- Cada caso possui `validation.status` (`pendente` → `em_revisao` → `validado`); um caso só pode ser marcado como validado com revisor e data (o validador exige).
- O VetiDex separa **conhecimento consolidado**, **simplificação didática** e **o que depende de avaliação profissional**.

---

## 7. Créditos

Personagens, mapas, arte em pixel (gerada por código), efeitos sonoros e músicas são originais deste projeto. Fontes tipográficas: Pixelify Sans e Nunito (SIL Open Font License, via Fontsource, incluídas no build — funciona offline).
