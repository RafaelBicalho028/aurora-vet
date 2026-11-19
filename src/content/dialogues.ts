/**
 * Diálogos dos personagens. {nome} é substituído pelo nome do jogador.
 * A primeira entrada cuja condição for verdadeira define onde a conversa começa.
 */
import type { DialogueDef } from '../systems/dialogue/types';

/** Diálogo padrão de professor de disciplina: aula com quadros clínicos, questionário e informações. */
function professor(c: { sid: string; name: string; area: string; hello: string; about: string; tip: string }): DialogueDef {
  const quest = `q_disc_${c.sid}`;
  return {
    entries: [
      { when: { questNotStarted: quest }, start: 'intro' },
      { when: { questDone: quest }, start: 'concluido' },
      { start: 'menu' },
    ],
    nodes: {
      intro: { expression: 'feliz', text: c.hello, effects: [{ type: 'startQuest', quest }], next: 'menu' },
      menu: {
        text: `O que vamos fazer hoje, {nome}? Recomendo estudar os quadros clínicos antes do questionário de ${c.area}.`,
        choices: [
          { text: '📖 Ver os quadros clínicos da aula', effects: [{ type: 'startQuest', quest }, { type: 'openLesson', id: `aula_${c.sid}` }] },
          { text: '📝 Fazer o questionário', effects: [{ type: 'startQuest', quest }, { type: 'startQuiz', id: `quiz_${c.sid}` }] },
          { text: `O que estuda ${c.area}?`, next: 'sobre' },
          { text: 'Até logo!' },
        ],
      },
      sobre: { text: c.about, next: 'dica' },
      dica: { expression: 'feliz', text: `Uma dica: ${c.tip}` },
      concluido: {
        expression: 'feliz',
        text: `Parabéns pela aprovação em ${c.area}, {nome}! Pode rever a aula ou treinar mais quando quiser — as perguntas mudam a cada vez.`,
        choices: [
          { text: '📖 Rever os quadros clínicos', effects: [{ type: 'openLesson', id: `aula_${c.sid}` }] },
          { text: '📝 Treinar o questionário', effects: [{ type: 'startQuiz', id: `quiz_${c.sid}` }] },
          { text: 'Até logo!' },
        ],
      },
    },
  };
}

export const DIALOGUES: Record<string, DialogueDef> = {
  // ---------------------------------------------------------------- LUCAS
  lucas: {
    entries: [
      { when: { objectiveNotDone: ['q_boas_vindas', 'o_lucas'] }, start: 'intro' },
      { when: { questActive: 'q_primeiro_paciente' }, start: 'dica_thor' },
      { when: { questActive: 'q_gato_nao_come' }, start: 'dica_mimi' },
      { when: { questStarted: 'q_proxima_etapa' }, start: 'estudar' },
      { start: 'padrao' },
    ],
    nodes: {
      intro: { expression: 'feliz', text: 'Ei! Você deve ser {nome}, da turma nova também, né? Eu sou o Lucas!', next: 'intro2' },
      intro2: {
        text: 'Primeiro dia na Universidade de Aurora... Tá nervoso(a)?',
        choices: [
          { text: 'Um pouco, mas muito animado(a)!', next: 'intro3a' },
          { text: 'Muito! Nem sei por onde começar.', next: 'intro3b' },
        ],
      },
      intro3a: { expression: 'feliz', text: 'Também tô! Dizem que o Prof. Otávio, de Anatomia, é exigente, mas explica muito bem.', next: 'intro4' },
      intro3b: { text: 'Relaxa, a gente aprende junto. O primeiro passo é a aula de Anatomia com o Prof. Otávio.', next: 'intro4' },
      intro4: {
        text: 'O Laboratório de Anatomia fica a oeste, seguindo a rua principal. Ah, toma: um caderno pra anotar tudo — inclusive os erros. É com eles que a gente mais aprende!',
        effects: [{ type: 'item', id: 'caderno' }, { type: 'objective', quest: 'q_boas_vindas', objective: 'o_lucas' }],
        next: 'intro5',
      },
      intro5: { expression: 'feliz', text: 'Dica: aperte J para ver o diário de missões e M para o mapa. Te vejo por aí!' },
      dica_thor: { text: 'Soube que você vai atender um cão no Hospital! Lembra: uma anamnese bem feita é metade do diagnóstico.' },
      dica_mimi: { expression: 'surpreso', text: 'Um gato que não come? A professora disse que em gatos isso pode virar emergência rapidinho...' },
      estudar: { expression: 'feliz', text: 'Dois casos atendidos?! Bora estudar na biblioteca? A Estação de Revisão faz perguntas sobre os pontos em que a gente errou.' },
      padrao: { text: 'O Prof. Otávio está no Laboratório de Anatomia, a oeste. Boa sorte, {nome}!' },
    },
  },

  // ---------------------------------------------------------------- PROF. OTÁVIO
  otavio: {
    entries: [
      { when: { objectiveNotDone: ['q_boas_vindas', 'o_otavio'], questActive: 'q_boas_vindas' }, start: 'apresenta' },
      { when: { questActive: 'q_aula_anatomia' }, start: 'aula' },
      { when: { questDone: 'q_aula_anatomia' }, start: 'pos' },
      { start: 'geral' },
    ],
    nodes: {
      apresenta: { expression: 'feliz', text: 'Bom dia! Você deve ser {nome}, da nova turma. Sou o Prof. Otávio Ramos, de Anatomia Veterinária.', next: 'ap2' },
      ap2: { text: 'Antes de pensar em diagnosticar qualquer animal, é preciso conhecer o corpo dele. A anatomia é o mapa da clínica.', next: 'ap3' },
      ap3: {
        text: 'Alguma pergunta antes de começarmos?',
        choices: [
          { text: 'Por que estudar tantas espécies?', next: 'ap_esp' },
          { text: 'Estou pronto(a) para a aula!', next: 'ap_pronto' },
        ],
      },
      ap_esp: { text: 'Porque o médico-veterinário atende espécies muito diferentes. O equino não tem vesícula biliar; o bovino não tem incisivos superiores. Comparar evita erros graves na prática.', next: 'ap_pronto' },
      ap_pronto: {
        expression: 'feliz',
        text: 'Excelente. Hoje: osteologia do cão e anatomia comparada. Vou acompanhar suas respostas.',
        effects: [{ type: 'objective', quest: 'q_boas_vindas', objective: 'o_otavio' }],
        next: 'ap_start',
      },
      ap_start: {
        text: 'Quer começar agora?',
        choices: [
          { text: 'Começar a atividade', effects: [{ type: 'startMinigame', id: 'mg_anatomia_intro' }] },
          { text: 'Vou observar o laboratório primeiro', next: 'ap_depois' },
        ],
      },
      ap_depois: { text: 'Boa ideia. Observe os esqueletos e os pôsteres — eles têm pistas. Volte quando estiver pronto(a).' },
      aula: {
        text: 'Pronto(a) para a atividade de osteologia e anatomia comparada? Nota mínima: 60.',
        choices: [
          { text: 'Começar a atividade', effects: [{ type: 'startMinigame', id: 'mg_anatomia_intro' }] },
          { text: 'Ainda não', next: 'ap_depois' },
        ],
      },
      pos: {
        expression: 'feliz',
        text: 'Muito bem, {nome}! Você já pode ir ao Hospital Veterinário, ao norte do campus. A Dra. Helena vai orientar sua vivência — sempre sob supervisão.',
        choices: [
          { text: 'Quero refazer a atividade para praticar', effects: [{ type: 'startMinigame', id: 'mg_anatomia_intro' }] },
          { text: 'Obrigado(a), professor!' },
        ],
      },
      geral: { text: 'Bem-vindo(a) ao Laboratório de Anatomia. Respeito às peças: elas vieram de animais que contribuem para a sua formação.' },
    },
  },

  // ---------------------------------------------------------------- DRA. HELENA
  helena: {
    entries: [
      { when: { questActive: 'q_biosseguranca', objectiveNotDone: ['q_biosseguranca', 'o_helena'], flag: 'helena_apresentada' }, start: 'bio2' },
      { when: { questActive: 'q_biosseguranca', objectiveNotDone: ['q_biosseguranca', 'o_helena'] }, start: 'bio' },
      { when: { questActive: 'q_primeiro_paciente', objectiveDone: ['q_primeiro_paciente', 'o_atender'] }, start: 'relato_thor' },
      { when: { questActive: 'q_primeiro_paciente' }, start: 'thor_dica' },
      { when: { questActive: 'q_gato_nao_come', objectiveDone: ['q_gato_nao_come', 'o_atender'] }, start: 'relato_mimi' },
      { when: { questActive: 'q_gato_nao_come' }, start: 'mimi_dica' },
      { when: { questActive: 'q_filhote', objectiveDone: ['q_filhote', 'o_atender'] }, start: 'relato_pingo' },
      { when: { questActive: 'q_filhote' }, start: 'pingo_dica' },
      { when: { questActive: 'q_emergencia', objectiveDone: ['q_emergencia', 'o_atender'] }, start: 'relato_nino' },
      { when: { questActive: 'q_emergencia' }, start: 'nino_dica' },
      { when: { questStarted: 'q_vila_chegada' }, start: 'vila' },
      { when: { questStarted: 'q_proxima_etapa' }, start: 'final' },
      { start: 'geral' },
    ],
    nodes: {
      bio: { expression: 'feliz', text: 'Olá! Sou a Dra. Helena Duarte, responsável pelo Hospital. O Prof. Otávio falou muito bem de você.', effects: [{ type: 'flag', key: 'helena_apresentada' }], next: 'bio2' },
      bio2: {
        text: 'Aqui, estudantes participam dos atendimentos SEMPRE sob supervisão. O primeiro passo é a biossegurança. Vou fazer algumas perguntas — e elas mudam a cada tentativa.',
        choices: [
          { text: 'Estou pronto(a)!', effects: [{ type: 'startQuiz', id: 'quiz_biosseguranca' }] },
          { text: 'Vou revisar antes.', next: 'bio_depois' },
        ],
      },
      bio_depois: { text: 'Boa ideia. A Biblioteca Central tem um manual de biossegurança. Volte quando quiser.' },

      thor_dica: {
        text: 'O Sr. Joaquim e o Thor estão na sala de espera. Siga as etapas: anamnese, exame físico, exames complementares, diagnóstico e conduta.',
        choices: [
          { text: 'Pode me dar uma dica?', next: 'thor_dica2' },
          { text: 'Vou lá!' },
        ],
      },
      thor_dica2: { text: 'Em dermatologia, a distribuição das lesões e o controle de parasitas de TODOS os animais da casa são pistas valiosas. E exame caro não é sinônimo de exame bom.' },
      relato_thor: { expression: 'feliz', text: 'Li seu relatório do Thor. A DAPP é muito comum na rotina — e o controle precisa incluir todos os animais e o ambiente.', next: 'relato_thor2' },
      relato_thor2: {
        text: 'Lembre: o diagnóstico se confirma pela resposta ao controle rigoroso de pulgas. Raciocínio clínico é isso — hipóteses, evidências e reavaliação.',
        effects: [{ type: 'objective', quest: 'q_primeiro_paciente', objective: 'o_relatar' }],
        next: 'relato_thor3',
      },
      relato_thor3: { expression: 'preocupado', text: 'Ah... acabou de chegar a Dona Marta com a Mimi, uma gata que não come há dias. Em gatos, isso pode ser sério. Você pode atendê-la comigo?' },
      mimi_dica: {
        text: 'A Mimi está com a Dona Marta na sala de espera. Em gatos, anorexia por vários dias é sinal de alerta, especialmente em obesos.',
        choices: [
          { text: 'Alguma dica?', next: 'mimi_dica2' },
          { text: 'Entendido!' },
        ],
      },
      mimi_dica2: { text: 'Pense no que acontece com o metabolismo de gordura de um gato obeso que para de comer. E não deixe de avaliar a urgência — e a micção!' },
      relato_mimi: { expression: 'feliz', text: 'A lipidose hepática felina pode ser grave, e a recuperação depende do suporte nutricional precoce. Você reconheceu a urgência — isso faz diferença.', next: 'relato_mimi2' },
      relato_mimi2: {
        text: 'Continue revisando: a Estação de Revisão da biblioteca traz perguntas sobre os pontos em que você teve dificuldade.',
        effects: [{ type: 'objective', quest: 'q_gato_nao_come', objective: 'o_relatar' }],
        next: 'relato_mimi3',
      },
      relato_mimi3: { expression: 'preocupado', text: 'E já temos outro paciente: a Sofia trouxe o Pingo, um filhote com diarreia e a barriga inchada. Filhotes pioram rápido — vá conversar com ela.' },
      pingo_dica: {
        text: 'A Sofia e o Pingo estão na sala de espera. Em filhote com diarreia, pense em parasitas, mas não esqueça das doenças virais graves.',
        choices: [{ text: 'Alguma dica?', next: 'pingo_dica2' }, { text: 'Vou lá!' }],
      },
      pingo_dica2: { text: 'Pergunte se ele foi vermifugado e vacinado. E lembre-se: há uma criança em casa. Parasitas de cães podem ser zoonoses.' },
      relato_pingo: { expression: 'feliz', text: 'Toxocaríase é muito comum em filhotes — e é uma zoonose. Orientar a família faz parte do tratamento: isso é Saúde Única na prática.', effects: [{ type: 'objective', quest: 'q_filhote', objective: 'o_relatar' }], next: 'relato_pingo2' },
      relato_pingo2: { expression: 'surpreso', text: '{nome}, emergência chegando! O Sr. Paulo trouxe o Nino, um gato que não consegue urinar. Em gatos machos isso pode matar em poucas horas. Seja rápido(a) e priorize!' },
      nino_dica: {
        text: 'O Nino está na sala de espera com o Sr. Paulo. É um caso URGENTE: o tempo clínico conta na nota. Priorize o que muda a conduta imediata.',
        choices: [{ text: 'Alguma dica?', next: 'nino_dica2' }, { text: 'Estou indo!' }],
      },
      nino_dica2: { text: 'Bexiga, potássio e coração. E a ordem importa: estabilizar antes de desobstruir.' },
      relato_nino: { expression: 'feliz', text: 'Excelente trabalho sob pressão! Na obstrução uretral, a hipercalemia é o que mata — por isso estabilizamos antes de desobstruir.', effects: [{ type: 'objective', quest: 'q_emergencia', objective: 'o_relatar' }], next: 'relato_nino2' },
      relato_nino2: { expression: 'feliz', text: 'Com isso você conclui seus atendimentos da Etapa 1. Continue revisando na Estação de Revisão da biblioteca. Quando estiver preparado(a), a Etapa 2 abrirá a Vila dos Animais e os laboratórios. Estou orgulhosa de você, {nome}!' },
      vila: { expression: 'feliz', text: 'Parabéns pela Etapa 2, {nome}! O Portão Sul do campus está aberto: o Dr. Marcos espera você na Clínica Veterinária da Vila.', next: 'final' },
      final: {
        text: 'Quer refazer algum atendimento para treinar? Treinos rendem menos XP, mas fixam o conteúdo e atualizam sua revisão.',
        choices: [
          { text: 'Treinar o caso do Thor (prurido)', effects: [{ type: 'startCase', caseId: 'caso_thor_prurido' }] },
          { text: 'Treinar o caso da Mimi (hiporexia)', effects: [{ type: 'startCase', caseId: 'caso_mimi_hiporexia' }] },
          { text: 'Treinar o caso do Pingo (diarreia)', effects: [{ type: 'startCase', caseId: 'caso_pingo_diarreia' }], when: { questDone: 'q_filhote' } },
          { text: 'Treinar a emergência do Nino', effects: [{ type: 'startCase', caseId: 'caso_nino_obstrucao' }], when: { questDone: 'q_emergencia' } },
          { text: 'Agora não, obrigado(a).' },
        ],
      },
      geral: { text: 'Bem-vindo(a) ao Hospital Veterinário Universitário.' },
    },
  },

  // ---------------------------------------------------------------- TUTORES
  joaquim: {
    entries: [
      { when: { questActive: 'q_primeiro_paciente', objectiveNotDone: ['q_primeiro_paciente', 'o_atender'] }, start: 'atender' },
      { when: { objectiveDone: ['q_primeiro_paciente', 'o_atender'] }, start: 'grato' },
      { when: { questDone: 'q_primeiro_paciente' }, start: 'grato' },
      { start: 'espera' },
    ],
    nodes: {
      espera: { expression: 'preocupado', text: 'Bom dia! Estou esperando a doutora... O Thor não para de se coçar.' },
      atender: { expression: 'preocupado', text: 'Ah, você é o(a) estudante! A Dra. Helena disse que vai acompanhar você no atendimento do Thor.', next: 'atender2' },
      atender2: {
        text: 'Ele se coça tanto que ninguém dorme lá em casa... Pode ajudar?',
        choices: [
          { text: 'Vamos começar o atendimento.', effects: [{ type: 'startCase', caseId: 'caso_thor_prurido' }] },
          { text: 'Só um momento, já volto.', next: 'aguarda' },
        ],
      },
      aguarda: { text: 'Tudo bem, a gente espera aqui.' },
      grato: { expression: 'feliz', text: 'Obrigado pela atenção com o Thor! Já comprei o antipulgas certo pra ele E pra Pipoca, a gata, cada um com o produto da sua espécie. E vou aspirar a casa toda!' },
    },
  },
  marta: {
    entries: [
      { when: { questActive: 'q_gato_nao_come', objectiveNotDone: ['q_gato_nao_come', 'o_atender'] }, start: 'atender' },
      { start: 'grata' },
    ],
    nodes: {
      atender: { expression: 'preocupado', text: 'Por favor, me ajuda! A Mimi quase não come há dias e só fica escondida...', next: 'atender2' },
      atender2: {
        text: 'Ela sempre foi tão comilona... Será que é grave?',
        choices: [
          { text: 'Vamos examiná-la agora mesmo.', effects: [{ type: 'startCase', caseId: 'caso_mimi_hiporexia' }] },
          { text: 'Um momento, já volto.', next: 'aguarda' },
        ],
      },
      aguarda: { expression: 'preocupado', text: 'Por favor, não demore...' },
      grata: { expression: 'feliz', text: 'Aprendi que gato não pode ficar dias sem comer, e que a troca de ração tem que ser aos pouquinhos. Obrigada!' },
    },
  },

  sofia: {
    entries: [
      { when: { questActive: 'q_filhote', objectiveNotDone: ['q_filhote', 'o_atender'] }, start: 'atender' },
      { start: 'grata' },
    ],
    nodes: {
      atender: { expression: 'preocupado', text: 'Oi! O Pingo está com diarreia há três dias e a barriga dele está enorme... Meu filho está preocupadíssimo.', next: 'atender2' },
      atender2: {
        text: 'Você pode examinar ele?',
        choices: [
          { text: 'Vamos começar o atendimento.', effects: [{ type: 'startCase', caseId: 'caso_pingo_diarreia' }] },
          { text: 'Um momento, já volto.', next: 'aguarda' },
        ],
      },
      aguarda: { text: 'Tá bom, a gente espera aqui.' },
      grata: { expression: 'feliz', text: 'Agora eu recolho as fezes do quintal todo dia, e meu filho lava as mãos depois de brincar com o Pingo. Ele já ganhou peso!' },
    },
  },
  paulo: {
    entries: [
      { when: { questActive: 'q_emergencia', objectiveNotDone: ['q_emergencia', 'o_atender'] }, start: 'atender' },
      { start: 'grato' },
    ],
    nodes: {
      atender: { expression: 'surpreso', text: 'Por favor, rápido! O Nino não consegue fazer xixi desde ontem e agora está largado, quase sem reagir!', next: 'atender2' },
      atender2: {
        text: 'Ele vai ficar bem?',
        choices: [
          { text: 'Vamos atendê-lo agora mesmo!', effects: [{ type: 'startCase', caseId: 'caso_nino_obstrucao' }] },
          { text: 'Só um instante.', next: 'aguarda' },
        ],
      },
      aguarda: { expression: 'preocupado', text: 'Por favor, não demore... ele está muito mal.' },
      grato: { expression: 'feliz', text: 'O Nino está em casa, bebendo água na fonte nova e comendo ração úmida. Nunca mais vou achar que é “só manha” quando ele fizer força na caixa!' },
    },
  },
  pingo_animal: {
    entries: [
      { when: { questActive: 'q_filhote', objectiveNotDone: ['q_filhote', 'o_atender'] }, start: 'mal' },
      { start: 'bem' },
    ],
    nodes: {
      mal: { speaker: 'narrador', text: 'O Pingo abana o rabo, brincalhão, mas a barriga dele está bem distendida para um filhote tão magrinho.' },
      bem: { speaker: 'narrador', text: 'O Pingo morde o cadarço do seu tênis, cheio de energia.' },
    },
  },
  nino_animal: {
    entries: [
      { when: { questActive: 'q_emergencia', objectiveNotDone: ['q_emergencia', 'o_atender'] }, start: 'mal' },
      { start: 'bem' },
    ],
    nodes: {
      mal: { speaker: 'narrador', text: 'O Nino está deitado, apático, e mia baixinho quando você se aproxima. Ele lambe a região genital.' },
      bem: { speaker: 'narrador', text: 'O Nino está bem mais disposto e observa tudo pela grade da caixa de transporte.' },
    },
  },

  // ---------------------------------------------------------------- EQUIPE DO HOSPITAL
  carla: {
    entries: [{ start: 'oi' }],
    nodes: {
      oi: {
        expression: 'feliz',
        text: 'Bem-vindo(a) ao Hospital Veterinário Universitário! A Dra. Helena fica na área de atendimento, à direita.',
        choices: [
          { text: 'O que é o Centro Veterinário Avançado?', next: 'centro' },
          { text: 'Quero agendar a consulta preventiva do meu pet.', when: { hasPet: true }, effects: [{ type: 'petCheckup' }] },
          { text: 'Como funciona a vivência dos estudantes?', next: 'vivencia' },
          { text: 'Obrigado(a)!' },
        ],
      },
      centro: { text: 'É a nossa ala de internação, diagnóstico por imagem, centro cirúrgico, UTI e laboratório de análises avançadas. Estudantes participam a partir das etapas mais avançadas do curso.' },
      vivencia: { text: 'Você participa dos atendimentos sempre com um médico-veterinário responsável. As decisões clínicas e prescrições são dele(a) — você aprende a raciocinar e a propor condutas.' },
    },
  },
  bia: {
    entries: [{ start: 'oi' }],
    nodes: {
      oi: {
        expression: 'feliz',
        text: 'Oi! Sou a Bia, técnica do laboratório de análises clínicas. Quando você solicita um exame no atendimento, a amostra é processada aqui.',
        choices: [
          { text: 'Por que alguns exames demoram mais?', next: 'tempo' },
          { text: 'Como coletar bem uma amostra?', next: 'coleta' },
          { text: 'Até mais!' },
        ],
      },
      tempo: { text: 'Hemograma e bioquímica levam algumas horas; culturas podem levar dias ou semanas, porque dependem do crescimento dos microrganismos. Peça o que vai mudar sua conduta!' },
      coleta: { text: 'Identifique o tubo, use o anticoagulante correto — EDTA para hemograma, por exemplo — e envie rápido, refrigerando quando indicado. Amostra ruim gera resultado ruim!' },
    },
  },

  // ---------------------------------------------------------------- PROFA. LÍVIA (quiz de sinais vitais)
  livia: {
    entries: [
      { when: { questNotStarted: 'q_sinais_vitais' }, start: 'intro' },
      { start: 'menu' },
    ],
    nodes: {
      intro: { expression: 'feliz', text: 'Olá! Sou a Profa. Lívia Campos, de Fisiologia. Bem-vindo(a) ao Instituto de Fisiologia! Aqui a gente estuda como o corpo funciona — e como ele compensa quando algo dá errado.', effects: [{ type: 'startQuest', quest: 'q_sinais_vitais' }, { type: 'startQuest', quest: 'q_disc_fisiologia' }], next: 'menu' },
      menu: {
        text: 'O que vamos estudar hoje, {nome}?',
        choices: [
          { text: '📖 Ver os quadros clínicos da aula', effects: [{ type: 'startQuest', quest: 'q_disc_fisiologia' }, { type: 'openLesson', id: 'aula_fisiologia' }] },
          { text: '📝 Questionário de sinais vitais', effects: [{ type: 'startQuest', quest: 'q_sinais_vitais' }, { type: 'startQuiz', id: 'quiz_sinais_vitais' }] },
          { text: 'Uma dica de fisiologia', next: 'dica' },
          { text: 'Até logo!' },
        ],
      },
      dica: { text: 'O estresse do ambiente clínico pode elevar a frequência cardíaca e a temperatura, especialmente em gatos. Interprete sempre os parâmetros no contexto!' },
    },
  },

  nara: {
    entries: [{ start: 'oi' }],
    nodes: {
      oi: { expression: 'feliz', text: 'Oi, {nome}! Sou a Nara, monitora dos institutos. Cada prédio daqui tem um professor com aula de quadros clínicos e um questionário.', next: 'oi2' },
      oi2: {
        text: 'Quer uma dica de por onde começar?',
        choices: [
          { text: 'Quero!', next: 'dica' },
          { text: 'Onde ficam Fisiologia e Microbiologia?', next: 'onde' },
          { text: 'Valeu, Nara!' },
        ],
      },
      dica: { text: 'Estude os quadros clínicos antes do questionário: as perguntas mudam a cada tentativa, então decorar não adianta — entender, sim. E tudo o que você aprende vai para a VetiDex e para o painel de desempenho.' },
      onde: { text: 'Ficam no campus central: o Instituto de Fisiologia, da Profa. Lívia, no sudoeste, e o Laboratório de Microbiologia, da Profa. Renata, no sudeste. Siga a avenida para o leste.' },
    },
  },

  // ---------------------------------------------------------------- CASA
  cama: {
    entries: [{ start: 'cama' }],
    nodes: {
      cama: {
        speaker: 'narrador',
        text: 'Sua cama, arrumadinha. Dormir leva à manhã seguinte: pacientes atendidos recebem alta e novos pacientes chegam.',
        choices: [
          { text: '🌙 Dormir até amanhã', effects: [{ type: 'sleep' }] },
          { text: 'Ainda não' },
        ],
      },
    },
  },

  // ---------------------------------------------------------------- ETAPA 2: VILA DOS ANIMAIS
  marcos: {
    entries: [
      { when: { objectiveNotDone: ['q_vila_chegada', 'o_marcos'] }, start: 'intro' },
      { when: { questActive: 'q_vila_bidu', objectiveDone: ['q_vila_bidu', 'o_atender'] }, start: 'relato_bidu' },
      { when: { questActive: 'q_vila_bidu' }, start: 'bidu_dica' },
      { when: { questActive: 'q_vila_luna', objectiveDone: ['q_vila_luna', 'o_atender'] }, start: 'relato_luna' },
      { when: { questActive: 'q_vila_luna' }, start: 'luna_dica' },
      { when: { questActive: 'q_vila_rotina' }, start: 'rotina' },
      { when: { questDone: 'q_vila_rotina' }, start: 'final' },
      { start: 'geral' },
    ],
    nodes: {
      intro: { expression: 'feliz', text: 'Você deve ser {nome}, da Universidade! Sou o Dr. Marcos Vieira. A Dra. Helena me contou do seu bom trabalho no Hospital.', effects: [{ type: 'objective', quest: 'q_vila_chegada', objective: 'o_marcos' }], next: 'intro2' },
      intro2: { text: 'Aqui na Vila a rotina é de clínica de bairro: doenças transmitidas por carrapatos, intoxicações em casa, prevenção. Você atende, eu supervisiono. Combinado?', next: 'intro3' },
      intro3: { expression: 'preocupado', text: 'E já temos trabalho: a Dona Cida está na sala de espera com o Bidu, que sangrou pelo nariz. Converse com ela para começar.' },
      geral: { text: 'Na clínica de bairro, prevenção é metade do trabalho: vacina, controle de parasitas e orientação ao tutor.' },
      bidu_dica: {
        text: 'O Bidu está na sala de espera com a Dona Cida. Sangramento tem muitas causas — pense em plaquetas, coagulação e no que o carrapato pode transmitir.',
        choices: [{ text: 'Pode me dar uma dica?', next: 'bidu_dica2' }, { text: 'Vou lá!' }],
      },
      bidu_dica2: { text: 'Petéquias sugerem problema de plaquetas; hematomas e sangramento em cavidades, de coagulação. Hemograma e coagulograma separam esses grupos.' },
      relato_bidu: { expression: 'feliz', text: 'Bom raciocínio com o Bidu. A erliquiose é muito comum onde há carrapato-marrom — e o coagulograma normal ajudou a afastar o raticida.', effects: [{ type: 'objective', quest: 'q_vila_bidu', objective: 'o_relatar' }], next: 'relato_bidu2' },
      relato_bidu2: { expression: 'surpreso', text: 'Ih, ouviu isso? Alguém chegou correndo com uma gata nos braços. É o Gabriel, com a Luna. Parece urgente — vá logo!' },
      luna_dica: {
        expression: 'preocupado',
        text: 'A Luna está tremendo na sala de espera. Urgência: priorize o que muda a conduta e não perca tempo com o que não ajuda.',
        choices: [{ text: 'Pode me dar uma dica?', next: 'luna_dica2' }, { text: 'Estou indo!' }],
      },
      luna_dica2: { text: 'Pergunte o que ela recebeu nas últimas horas — e para qual espécie era o produto. Gato não é cão pequeno.' },
      relato_luna: { expression: 'feliz', text: 'A Luna está bem melhor. Intoxicação por permetrina é das urgências mais comuns em gatos, e quase sempre evitável com uma leitura de rótulo.', effects: [{ type: 'objective', quest: 'q_vila_luna', objective: 'o_relatar' }], next: 'relato_luna2' },
      relato_luna2: { text: 'Por isso quero que você ajude a prevenir: passe no Pet Shop do Seu Hiro, que sempre pede orientação, e conheça o Centro de Adoção da Tânia.' },
      rotina: { text: 'O Pet Shop Patas & Cia. fica a oeste da rua principal, e o Centro de Adoção, ao sul da praça. Prevenção também é medicina veterinária!' },
      final: {
        expression: 'feliz',
        text: 'Você concluiu a primeira parte da Etapa 2, {nome}! Novos casos da Vila chegam em breve. Quer treinar algum atendimento enquanto isso?',
        choices: [
          { text: 'Treinar o caso do Bidu (erliquiose)', effects: [{ type: 'startCase', caseId: 'caso_bidu_erliquiose' }] },
          { text: 'Treinar o caso da Luna (permetrina)', effects: [{ type: 'startCase', caseId: 'caso_luna_permetrina' }] },
          { text: 'Agora não, obrigado(a).' },
        ],
      },
    },
  },
  cida: {
    entries: [
      { when: { questActive: 'q_vila_bidu', objectiveNotDone: ['q_vila_bidu', 'o_atender'] }, start: 'atender' },
      { when: { questStarted: 'q_vila_luna' }, start: 'grata' },
      { when: { objectiveDone: ['q_vila_bidu', 'o_atender'] }, start: 'grata' },
      { start: 'espera' },
    ],
    nodes: {
      espera: { expression: 'preocupado', text: 'Estou esperando o Dr. Marcos... o Bidu está tão quietinho.' },
      atender: { expression: 'preocupado', text: 'Você é o(a) estagiário(a)? O Dr. Marcos disse que vai acompanhar. O Bidu está desanimado há uma semana e hoje sangrou pelo nariz!', next: 'atender2' },
      atender2: {
        text: 'Pode ver o que ele tem?',
        choices: [
          { text: 'Vamos começar o atendimento.', effects: [{ type: 'startCase', caseId: 'caso_bidu_erliquiose' }] },
          { text: 'Só um momento, já volto.', next: 'aguarda' },
        ],
      },
      aguarda: { text: 'Tudo bem, a gente espera aqui.' },
      grata: { expression: 'feliz', text: 'O Bidu já está comendo de novo! Tratei a casinha e o quintal, e a Mel também ganhou carrapaticida. Obrigada!' },
    },
  },
  gabriel: {
    entries: [
      { when: { questActive: 'q_vila_luna', objectiveNotDone: ['q_vila_luna', 'o_atender'] }, start: 'atender' },
      { when: { objectiveDone: ['q_vila_luna', 'o_atender'] }, start: 'grato' },
      { start: 'grato' },
    ],
    nodes: {
      atender: { expression: 'preocupado', text: 'Por favor, me ajuda! A Luna começou a tremer e babar umas horas depois que eu coloquei o antipulgas!', next: 'atender2' },
      atender2: {
        text: 'Ela vai ficar bem?',
        choices: [
          { text: 'Vamos atender a Luna agora.', effects: [{ type: 'startCase', caseId: 'caso_luna_permetrina' }] },
          { text: 'Um instante!', next: 'aguarda' },
        ],
      },
      aguarda: { expression: 'preocupado', text: 'Rápido, por favor... ela não para de tremer.' },
      grato: { expression: 'feliz', text: 'A Luna está ótima! Agora eu leio o rótulo de tudo: produto de gato para gato, de cachorro para cachorro. E o Rex fica longe dela até o produto secar.' },
    },
  },
  hiro: {
    entries: [
      { when: { questActive: 'q_vila_rotina', objectiveNotDone: ['q_vila_rotina', 'o_petshop'] }, start: 'ajuda' },
      { start: 'padrao' },
    ],
    nodes: {
      padrao: { expression: 'feliz', text: 'Bem-vindo(a) ao Patas & Cia.! Aqui, antes de vender antiparasitário, eu pergunto: qual espécie e quanto pesa?' },
      ajuda: { expression: 'feliz', text: 'Ah, o(a) estagiário(a) do Dr. Marcos! Chegou na hora: tenho três clientes com dúvidas. Me ajuda a orientar?', next: 'c1' },
      c1: {
        text: 'Uma cliente quer antipulgas para o gato, mas o de cachorro está em promoção. O que eu digo a ela?',
        choices: [
          { text: 'Só produtos indicados para gatos: os de cão podem ter permetrina, que é tóxica para gatos.', correct: true, next: 'c2' },
          { text: 'Pode usar metade de uma pipeta de cachorro.', correct: false, next: 'c1_erro' },
        ],
      },
      c1_erro: { expression: 'preocupado', text: 'Hmm... a Luna quase morreu assim! Gatos eliminam mal a permetrina; não é questão de dose. Vamos pensar de novo?', next: 'c1' },
      c2: {
        text: 'Agora um senhor quer dar o remédio de dor dele para o cachorro, que está mancando. E aí?',
        choices: [
          { text: 'Não: anti-inflamatórios humanos podem causar úlcera e lesão renal em cães. Ele precisa levar o cão ao veterinário.', correct: true, next: 'c3' },
          { text: 'Pode dar, se for uma dose pequena.', correct: false, next: 'c2_erro' },
        ],
      },
      c2_erro: { expression: 'preocupado', text: 'Cuidado: ibuprofeno e naproxeno, por exemplo, são perigosos para cães mesmo em doses que parecem pequenas. Tenta de novo?', next: 'c2' },
      c3: {
        text: 'Por último, um moço tem três cães e quer carrapaticida só para o que está com carrapato. O que você recomenda?',
        choices: [
          { text: 'Tratar todos os cães da casa e o ambiente, conforme a orientação do veterinário.', correct: true, next: 'fim' },
          { text: 'Só o cão que tem carrapato precisa.', correct: false, next: 'c3_erro' },
        ],
      },
      c3_erro: { expression: 'preocupado', text: 'Os outros cães e o ambiente mantêm o ciclo do carrapato — foi assim com o Bidu e a Mel. De novo?', next: 'c3' },
      fim: { expression: 'feliz', text: 'Perfeito! Vou colar essas orientações no balcão. Obrigado, você ajudou a prevenir mais casos como o da Luna.', effects: [{ type: 'objective', quest: 'q_vila_rotina', objective: 'o_petshop' }, { type: 'mastery', discipline: 'farmacologia', skill: 'toxicologia', xp: 20 }] },
    },
  },
  tania: {
    entries: [
      { when: { questActive: 'q_vila_rotina', objectiveNotDone: ['q_vila_rotina', 'o_adocao'] }, start: 'visita' },
      { start: 'padrao' },
    ],
    nodes: {
      visita: { expression: 'feliz', text: 'Oi! Sou a Tânia, coordenadora do Centro de Adoção. O Dr. Marcos avisou que você viria.', next: 'visita2' },
      visita2: {
        text: 'Aqui todo animal sai castrado, vacinado, vermifugado e com microchip. Na sua opinião, por que castramos antes da adoção?',
        choices: [
          { text: 'Evita ninhadas indesejadas e reduz riscos de doenças, como piometra e tumores mamários.', correct: true, next: 'visita_ok' },
          { text: 'Só para o animal ficar mais calmo.', correct: false, next: 'visita_erro' },
        ],
      },
      visita_erro: { text: 'O comportamento pode mudar, mas o principal é outro: controle populacional e prevenção de doenças reprodutivas. Pense de novo?', next: 'visita2' },
      visita_ok: { expression: 'feliz', text: 'Isso! E a adoção responsável continua depois: acompanhamos as famílias por meses. Se um dia quiser um companheiro, é só falar comigo.', effects: [{ type: 'objective', quest: 'q_vila_rotina', objective: 'o_adocao' }, { type: 'mastery', discipline: 'saude_publica', skill: 'saude_unica', xp: 15 }, { type: 'dex', ids: ['prev_vacinacao'] }] },
      padrao: {
        text: 'Bem-vindo(a) ao Centro de Adoção! Quer conhecer os animais ou adotar um companheiro?',
        choices: [
          { text: 'Quero adotar um companheiro', effects: [{ type: 'adoptPet' }] },
          { text: 'Só vim visitar.' },
        ],
      },
    },
  },
  rosa: {
    entries: [{ start: 'oi' }],
    nodes: {
      oi: { expression: 'feliz', text: 'Bom dia! Eu cuido dos gatos da praça. Viu o Mingau? Ele tem a pontinha da orelha cortada.', next: 'oi2' },
      oi2: {
        text: 'Sabe o que essa marca significa?',
        choices: [
          { text: 'Que ele foi castrado num programa de captura, esterilização e devolução.', correct: true, next: 'certo' },
          { text: 'Que ele brigou com outro gato.', correct: false, next: 'errado' },
        ],
      },
      certo: { expression: 'feliz', text: 'Isso mesmo! A gente captura, a clínica castra e vacina contra a raiva, e devolvemos à praça. Assim a colônia para de crescer e fica mais saudável.' },
      errado: { text: 'Não! É uma marca feita durante a castração, sob anestesia, para identificar de longe quem já foi castrado e vacinado — e evitar capturas repetidas.' },
    },
  },

  // ---------------------------------------------------------------- PROFESSORES DOS INSTITUTOS
  renata: professor({ sid: 'microbiologia', name: 'Profa. Renata Okabe', area: 'Microbiologia',
    hello: 'Olá! Sou a Profa. Renata Okabe, de Microbiologia. Aqui no laboratório a regra é simples: jaleco fechado, cabelo preso e mãos higienizadas.',
    about: 'A Microbiologia estuda bactérias, vírus e fungos: como causam doença, como identificá-los no laboratório e como controlá-los. Ela sustenta a biossegurança, o uso racional de antimicrobianos e a Saúde Única.',
    tip: 'Antes de pedir uma cultura, pense na coleta: amostra certa, no momento certo, antes do antimicrobiano e sem contaminação.' }),
  jorge: professor({ sid: 'parasitologia', name: 'Prof. Jorge Bastos', area: 'Parasitologia',
    hello: 'Bom dia! Prof. Jorge Bastos, Parasitologia. Pulgas, carrapatos, vermes e protozoários: cada um tem um ciclo, e todo ciclo tem um ponto fraco.',
    about: 'A Parasitologia estuda parasitas, seus ciclos biológicos, vetores e o diagnóstico. Ela orienta o controle no animal, no ambiente e no rebanho — e evita a resistência aos antiparasitários.',
    tip: 'Exame de fezes negativo não é sinônimo de ausência de parasitas: alguns eliminam ovos ou cistos de forma intermitente.' }),
  ines: professor({ sid: 'farmacologia', name: 'Profa. Inês Moura', area: 'Farmacologia',
    hello: 'Olá! Profa. Inês Moura, de Farmacologia. Aqui a gente aprende como os fármacos agem — e por que nenhum remédio é inofensivo.',
    about: 'A Farmacologia estuda o caminho do fármaco no organismo (farmacocinética) e o que ele faz (farmacodinâmica). Doses e prescrições são responsabilidade do médico-veterinário; o seu papel aqui é entender mecanismos, indicações e riscos.',
    tip: 'Gato não é cão pequeno: várias diferenças de metabolismo tornam alguns fármacos comuns perigosos para felinos.' }),
  raul: professor({ sid: 'patologia', name: 'Prof. Raul Siqueira', area: 'Patologia',
    hello: 'Prof. Raul Siqueira, Patologia. Os tecidos contam a história da doença — basta saber ler.',
    about: 'A Patologia estuda as alterações dos tecidos e órgãos: inflamação, degenerações, distúrbios circulatórios e neoplasias. Necrópsia e histopatologia confirmam diagnósticos e protegem rebanhos e pessoas.',
    tip: 'Segurança primeiro: diante de morte súbita em ruminantes com sangramento pelos orifícios, NÃO abra a carcaça.' }),
  beatriz: professor({ sid: 'cirurgia', name: 'Profa. Beatriz Leal', area: 'Cirurgia e Anestesiologia',
    hello: 'Oi! Sou a Profa. Beatriz Leal, de Cirurgia e Anestesiologia. Uma boa cirurgia começa muito antes do bisturi.',
    about: 'Cirurgia e Anestesiologia envolvem avaliação pré-operatória, técnica asséptica, anestesia, monitorização e cuidados pós-operatórios. Estudantes participam sempre sob supervisão.',
    tip: 'Na sala cirúrgica, honestidade salva vidas: se contaminou a luva, avise e troque.' }),
  tomas: professor({ sid: 'saude_publica', name: 'Prof. Tomás Araújo', area: 'Saúde Pública',
    hello: 'Olá! Prof. Tomás Araújo, Saúde Pública Veterinária. O médico-veterinário cuida de animais, de pessoas e do ambiente — tudo ao mesmo tempo.',
    about: 'A Saúde Pública Veterinária trata de zoonoses, vigilância epidemiológica, inspeção de alimentos de origem animal e Saúde Única. É uma área em que o médico-veterinário protege a população inteira.',
    tip: 'Mordedura de animal? Primeiro, água e sabão em abundância; depois, unidade de saúde para avaliar a profilaxia da raiva.' }),

  // ---------------------------------------------------------------- FAZENDA-ESCOLA
  antonio: {
    entries: [
      { when: { questNotStarted: 'q_fazenda' }, start: 'intro' },
      { when: { questActive: 'q_fazenda' }, start: 'dica' },
      { start: 'pos' },
    ],
    nodes: {
      intro: { expression: 'feliz', text: 'Ô, bom dia! Bem-vindo(a) à fazenda-escola. Eu cuido da Estrela e das ovelhas.', next: 'intro2' },
      intro2: {
        text: 'Quer conhecer a bicharada? Só observe de fora da cerca, com calma, pra não estressar ninguém.',
        choices: [
          { text: 'Quero sim!', effects: [{ type: 'startQuest', quest: 'q_fazenda' }], next: 'intro3' },
          { text: 'Depois eu volto.' },
        ],
      },
      intro3: { text: 'Então observe a Estrela e as ovelhas lá no piquete. Repare como elas ruminam!' },
      dica: { text: 'Já viu a Estrela e as ovelhas? Ficam ali dentro do piquete. Pode chegar perto da cerca.' },
      pos: { expression: 'feliz', text: 'Ruminante é bicho fascinante: aquele estômago de quatro compartimentos é uma fábrica de fermentação! Na Região Rural você vai ver muito mais.' },
    },
  },
  vaca: {
    entries: [
      { when: { questActive: 'q_fazenda', objectiveNotDone: ['q_fazenda', 'o_vaca'] }, start: 'obs' },
      { when: { questNotStarted: 'q_fazenda' }, start: 'antes' },
      { start: 'depois' },
    ],
    nodes: {
      obs: { speaker: 'narrador', text: 'A Estrela, uma vaca da raça Holandesa, rumina tranquila. A mandíbula faz movimentos laterais ritmados.', next: 'obs2' },
      obs2: {
        speaker: 'narrador',
        text: 'Na ruminação, o alimento é regurgitado, remastigado e deglutido novamente. Ruminação ativa e apetite preservado são bons sinais de saúde digestiva.',
        effects: [{ type: 'dex', ids: ['especie_bovino'] }, { type: 'mastery', discipline: 'anatomia', skill: 'comparada', xp: 10 }, { type: 'objective', quest: 'q_fazenda', objective: 'o_vaca' }],
      },
      antes: { speaker: 'narrador', text: 'Uma vaca holandesa pasta do outro lado da cerca. Talvez o Seu Antônio possa contar mais sobre ela.' },
      depois: { speaker: 'narrador', text: 'A Estrela rumina tranquilamente.' },
    },
  },
  ovelha: {
    entries: [
      { when: { questActive: 'q_fazenda', objectiveNotDone: ['q_fazenda', 'o_ovelha'] }, start: 'obs' },
      { start: 'simples' },
    ],
    nodes: {
      obs: {
        speaker: 'narrador',
        text: 'As ovelhas pastam juntas: são animais gregários e se estressam quando isoladas. Também são ruminantes, com estômago de quatro compartimentos.',
        effects: [{ type: 'dex', ids: ['especie_ovino'] }, { type: 'mastery', discipline: 'anatomia', skill: 'comparada', xp: 10 }, { type: 'objective', quest: 'q_fazenda', objective: 'o_ovelha' }],
      },
      simples: { speaker: 'narrador', text: 'A ovelha bale baixinho e continua pastando.' },
    },
  },

  // ---------------------------------------------------------------- ANIMAIS DO HOSPITAL
  thor_animal: {
    entries: [
      { when: { objectiveDone: ['q_primeiro_paciente', 'o_atender'] }, start: 'bem' },
      { when: { questDone: 'q_primeiro_paciente' }, start: 'bem' },
      { start: 'coca' },
    ],
    nodes: {
      coca: { speaker: 'narrador', text: 'Um cão caramelo se coça sem parar, mordiscando a base da cauda. Fale com o tutor para iniciar o atendimento.' },
      bem: { speaker: 'narrador', text: 'O Thor abana o rabo e cheira sua mão, bem mais tranquilo.' },
    },
  },
  mimi_animal: {
    entries: [
      { when: { questActive: 'q_gato_nao_come', objectiveNotDone: ['q_gato_nao_come', 'o_atender'] }, start: 'mal' },
      { start: 'bem' },
    ],
    nodes: {
      mal: { speaker: 'narrador', text: 'A Mimi está encolhida e quieta. A pele da parte interna das orelhas parece levemente amarelada...' },
      bem: { speaker: 'narrador', text: 'A Mimi ronrona baixinho.' },
    },
  },

  // ---------------------------------------------------------------- ADOÇÃO
  julia: {
    entries: [{ start: 'oi' }],
    nodes: {
      oi: {
        expression: 'feliz',
        text: 'Oi, {nome}! Sou a Júlia, voluntária do projeto de adoção responsável da universidade. Temos cães, gatos e outros pets esperando um lar.',
        choices: [
          { text: 'Quero adotar um pet!', effects: [{ type: 'adoptPet' }] },
          { text: 'O que é adoção responsável?', next: 'info' },
          { text: 'Até mais!' },
        ],
      },
      info: { text: 'É assumir o animal para toda a vida dele: vacinação, vermifugação, alimentação adequada, castração, identificação e consultas periódicas. Animal não é presente surpresa!', next: 'info2' },
      info2: { text: 'Cada espécie e raça tem necessidades próprias. Na ficha de cada pet você encontra curiosidades e cuidados — e seu pet pode passear com você pelo campus.' },
    },
  },

  // ---------------------------------------------------------------- COLEGAS
  rafa: {
    entries: [{ start: 'oi' }],
    nodes: {
      oi: { expression: 'feliz', text: 'Oi, {nome}! Tô revisando fisiologia renal... Sabia que a Profa. Lívia fica perto da lagoa, a noroeste? Ela adora perguntar sobre sinais vitais.', next: 'oi2' },
      oi2: { text: 'E o Seu Antônio, na fazenda-escola, deixa a gente observar os ruminantes. Vale a visita!' },
    },
  },
  bruno: {
    entries: [
      { when: { questNotStarted: 'q_biblioteca' }, start: 'intro' },
      { when: { questActive: 'q_biblioteca' }, start: 'dica' },
      { start: 'pos' },
    ],
    nodes: {
      intro: { expression: 'feliz', text: 'Psiu! Biblioteca, né? Sou o Bruno. Separei três estantes com leituras introdutórias ótimas: vacinação, Saúde Única e biossegurança.', next: 'intro2' },
      intro2: {
        text: 'Ficam à esquerda, no fundo. Topa ler?',
        choices: [
          { text: 'Vou ler agora!', effects: [{ type: 'startQuest', quest: 'q_biblioteca' }] },
          { text: 'Depois.' },
        ],
      },
      dica: { text: 'As três primeiras estantes à esquerda têm as leituras que recomendei.' },
      pos: { expression: 'feliz', text: 'A Estação de Revisão, à direita, faz perguntas sobre os seus erros nos casos. É revisão espaçada: quanto mais você acerta, mais tempo leva para a pergunta voltar.' },
    },
  },

  // ---------------------------------------------------------------- LIVROS
  livro_vacinacao: {
    entries: [{ start: 'a' }],
    nodes: {
      a: { speaker: 'narrador', text: 'Diretrizes de vacinação de cães e gatos (WSAVA, 2016) — resumo didático:', next: 'b' },
      b: { speaker: 'narrador', text: 'Vacinas essenciais devem ser aplicadas em todos os cães e gatos: em cães, contra cinomose, parvovirose e adenovírus; em gatos, contra panleucopenia, herpesvírus e calicivírus. A antirrábica é essencial onde é exigida por lei ou a doença é endêmica.', next: 'c' },
      c: { speaker: 'narrador', text: 'O protocolo é definido pelo médico-veterinário conforme idade, histórico e risco de cada animal.', effects: [{ type: 'dex', ids: ['prev_vacinacao'] }, { type: 'objective', quest: 'q_biblioteca', objective: 'o_vacinacao' }] },
    },
  },
  livro_saude_unica: {
    entries: [{ start: 'a' }],
    nodes: {
      a: { speaker: 'narrador', text: 'Saúde Única: a saúde humana, a saúde animal e a saúde ambiental são interdependentes.', next: 'b' },
      b: { speaker: 'narrador', text: 'Muitas doenças infecciosas emergentes em humanos têm origem animal. O médico-veterinário atua na prevenção de zoonoses, na segurança dos alimentos e no uso racional de antimicrobianos.', effects: [{ type: 'dex', ids: ['prev_saude_unica'] }, { type: 'mastery', discipline: 'saude_publica', skill: 'saude_unica', xp: 15 }, { type: 'objective', quest: 'q_biblioteca', objective: 'o_saude_unica' }] },
    },
  },
  livro_biosseguranca: {
    entries: [{ start: 'a' }],
    nodes: {
      a: { speaker: 'narrador', text: 'Manual de biossegurança: higienização das mãos, uso de EPI conforme o risco, descarte correto de resíduos e perfurocortantes, limpeza e desinfecção de superfícies.', next: 'b' },
      b: { speaker: 'narrador', text: 'Biossegurança protege pacientes, equipe e comunidade — e é responsabilidade de todos, inclusive dos estudantes.', effects: [{ type: 'dex', ids: ['prev_biosseguranca'] }, { type: 'mastery', discipline: 'microbiologia', skill: 'biosseguranca', xp: 15 }, { type: 'objective', quest: 'q_biblioteca', objective: 'o_biosseg' }] },
    },
  },
};
