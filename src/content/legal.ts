/**
 * Documentos legais exibidos no jogo. Ao mudar o conteúdo de forma relevante, aumente a versão:
 * jogadores com aceite de versão anterior verão o novo texto e precisarão aceitar de novo.
 *
 * PENDÊNCIAS DO RESPONSÁVEL (antes de abrir cadastros ao público):
 *  - e-mail de contato/privacidade: variável de build VITE_CONTACT_EMAIL
 *  - região do projeto Supabase (VITE_SUPABASE_REGION_LABEL) e provedor de e-mail, se não for o do Supabase
 *  - revisão por profissional da área jurídica
 */
export const GAME_NAME = 'Aurora Vet';
export const CONTROLLER_NAME = 'Bernardo Fantoni Olmo';
export const CONTACT_EMAIL = String(import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
export const CONTACT_LABEL = CONTACT_EMAIL || '[e-mail de contato ainda não definido]';
const REGION = String(import.meta.env.VITE_SUPABASE_REGION_LABEL ?? '').trim() || '[região escolhida ao criar o projeto]';

export const TERMS_VERSION = '1.0';
export const PRIVACY_VERSION = '1.0';
export const EDUCATIONAL_NOTICE_VERSION = '1.0';
const UPDATED = '19 de novembro de 2026';

export interface LegalSection { heading: string; paragraphs?: string[]; bullets?: string[]; table?: { head: string[]; rows: string[][] } }
export interface LegalDocument { id: 'termos' | 'privacidade' | 'aviso'; title: string; version: string; updated: string; intro?: string[]; sections: LegalSection[] }

export const EDUCATIONAL_NOTICE: LegalDocument = {
  id: 'aviso',
  title: 'Aviso importante',
  version: EDUCATIONAL_NOTICE_VERSION,
  updated: UPDATED,
  sections: [{
    heading: 'AVISO IMPORTANTE',
    paragraphs: [
      'Este jogo é uma ferramenta independente de entretenimento e apoio educacional voltada ao estudo da Medicina Veterinária.',
      'O conteúdo apresentado possui finalidade exclusivamente educativa e não representa curso superior, certificação profissional, formação técnica ou qualificação acadêmica oficialmente reconhecida.',
      'O jogo não possui aprovação, credenciamento ou reconhecimento acadêmico por instituições de ensino, pelo Ministério da Educação (MEC) ou por conselhos profissionais, salvo se essa condição vier a ser formalmente obtida e comprovada.',
      'As informações, simulações e casos clínicos apresentados não substituem livros acadêmicos, artigos científicos, aulas presenciais ou remotas, atividades práticas supervisionadas, estágios, orientação de professores ou formação universitária.',
      'Nenhuma informação do jogo deve ser utilizada isoladamente para diagnosticar, medicar ou tratar animais reais. Decisões clínicas devem ser tomadas por profissionais legalmente habilitados.',
      'Ao continuar, o jogador declara estar ciente da finalidade educacional e das limitações desta plataforma.',
    ],
  }],
};

export const TERMS: LegalDocument = {
  id: 'termos',
  title: 'Termos de Uso',
  version: TERMS_VERSION,
  updated: UPDATED,
  intro: [
    `Versão: ${TERMS_VERSION} • Data de atualização: ${UPDATED}`,
    `Responsável: ${CONTROLLER_NAME} • Contato: ${CONTACT_LABEL} • Nome do jogo: ${GAME_NAME}`,
  ],
  sections: [
    { heading: '1. Aceitação dos termos', paragraphs: [
      'Ao criar uma conta e utilizar este jogo, o usuário declara ter lido e aceitado estes Termos de Uso.',
      'Caso não concorde com as condições apresentadas, não deverá concluir seu cadastro ou utilizar os serviços sujeitos a estes termos.',
    ] },
    { heading: '2. Finalidade do jogo', paragraphs: [
      'Este jogo é uma plataforma independente de entretenimento e apoio ao aprendizado, com conteúdos relacionados à Medicina Veterinária.',
      'Seu objetivo é proporcionar experiências interativas de aprendizagem, incluindo simulações, casos clínicos fictícios, atividades e desafios.',
      'O jogo não constitui instituição de ensino, curso superior, programa de especialização ou entidade certificadora.',
    ] },
    { heading: '3. Ausência de reconhecimento acadêmico', paragraphs: [
      'O jogo não possui, por si só, aprovação, credenciamento ou reconhecimento acadêmico oficial do Ministério da Educação (MEC), de universidades, de faculdades ou de conselhos profissionais.',
      'A participação no jogo não concede diplomas, certificações acadêmicas reconhecidas, habilitações profissionais, créditos universitários ou autorização para exercer a Medicina Veterinária.',
      'Qualquer sistema de pontuação, nível, conquista ou certificado simbólico possui finalidade exclusivamente recreativa ou educativa interna.',
    ] },
    { heading: '4. Limitações educacionais', paragraphs: ['O conteúdo disponibilizado não substitui:'], bullets: [
      'Livros e bibliografias acadêmicas.', 'Artigos científicos.', 'Aulas ministradas por professores.', 'Atividades práticas supervisionadas.',
      'Estágios obrigatórios.', 'Laboratórios.', 'Orientação acadêmica.', 'Formação universitária oficial.',
    ] },
    { heading: '', paragraphs: [
      'O jogador é incentivado a complementar seus estudos com fontes científicas confiáveis e instituições reconhecidas.',
      'As situações apresentadas podem conter simplificações, adaptações e cenários fictícios para fins de aprendizagem.',
      'O aviso educacional exibido no primeiro acesso integra estes Termos e pode ser consultado a qualquer momento em “Minha Conta” e nas configurações do jogo.',
    ] },
    { heading: '5. Responsabilidade sobre conteúdos veterinários', paragraphs: [
      'As simulações de diagnóstico, tratamentos, medicamentos, procedimentos e demais condutas clínicas possuem caráter exclusivamente educativo.',
      'As informações apresentadas não devem ser utilizadas isoladamente para realizar diagnósticos, prescrever medicamentos, executar procedimentos ou tratar animais reais.',
      'Decisões clínicas reais devem ser tomadas por médicos-veterinários legalmente habilitados, com avaliação adequada do animal e observância das normas profissionais aplicáveis.',
      'O desenvolvedor buscará manter o conteúdo adequado e atualizado, mas não garante ausência absoluta de erros ou atualização científica contínua.',
      'Nada nestes termos exclui responsabilidades legais que não possam ser afastadas pela legislação aplicável.',
    ] },
    { heading: '6. Cadastro e conta', paragraphs: [
      'Para acessar determinadas funcionalidades, o usuário deverá criar uma conta utilizando informações verdadeiras e atualizadas.',
      'O usuário é responsável por preservar a confidencialidade de suas credenciais e comunicar suspeitas de acesso indevido.',
      'Os perfis disponíveis são:',
    ], bullets: ['Estudante de Medicina Veterinária.', 'Médico-veterinário formado.', 'Explorador.'] },
    { heading: '', paragraphs: [
      'A seleção do perfil é autodeclarada e não representa verificação de diploma, vínculo universitário ou registro profissional.',
      'Nesta versão, o cadastro é destinado a pessoas com 18 anos ou mais.',
    ] },
    { heading: '7. Regras de conduta', paragraphs: ['O usuário compromete-se a não:'], bullets: [
      'Utilizar o jogo para atividades ilícitas.', 'Praticar fraudes ou explorar vulnerabilidades.', 'Tentar acessar contas de terceiros.',
      'Distribuir códigos maliciosos.', 'Interferir deliberadamente no funcionamento da plataforma.', 'Utilizar conteúdos do jogo de forma que viole direitos de terceiros.',
    ] },
    { heading: '', paragraphs: ['Eventuais recursos de comunicação entre jogadores estarão sujeitos a regras adicionais de convivência e moderação, quando implementados.'] },
    { heading: '8. Propriedade intelectual', paragraphs: [
      'Personagens, artes, textos, elementos gráficos, mecânicas implementadas, músicas, marcas, códigos e outros conteúdos estarão sujeitos aos respectivos direitos de propriedade intelectual e às licenças aplicáveis.',
      'O acesso ao jogo não transfere ao usuário a propriedade dos conteúdos.',
      'É proibida a reprodução, redistribuição ou exploração comercial não autorizada de materiais protegidos, salvo nas hipóteses permitidas em lei ou nas licenças pertinentes.',
    ] },
    { heading: '9. Economia virtual', paragraphs: [
      'Moedas, pontos, itens e recompensas virtuais possuem finalidade interna ao jogo.',
      'Salvo quando informado expressamente e sujeito a condições específicas, esses elementos não possuem valor monetário real e não poderão ser convertidos em dinheiro.',
      'O desenvolvedor poderá ajustar o balanceamento da economia virtual para preservar a experiência de jogo, respeitando direitos dos usuários e obrigações legais aplicáveis.',
    ] },
    { heading: '10. Proteção de dados pessoais', paragraphs: [
      'O tratamento de dados pessoais observará a Lei Geral de Proteção de Dados Pessoais (LGPD), Lei nº 13.709/2018, e demais normas aplicáveis.',
      'Os dados necessários poderão incluir informações de cadastro, identificação da conta, perfil autodeclarado, registros de autenticação e progresso no jogo.',
      'As finalidades, bases legais, prazos de retenção, medidas de segurança, compartilhamentos e demais informações pertinentes serão detalhadas em Política de Privacidade separada.',
      'O usuário poderá exercer os direitos previstos na legislação, incluindo, quando aplicáveis, confirmação do tratamento, acesso, correção, portabilidade, informações sobre compartilhamento e exclusão de dados.',
      'As solicitações poderão ser encaminhadas ao contato de privacidade informado na Política de Privacidade.',
      'A eliminação dos dados observará as hipóteses de conservação legalmente permitidas ou exigidas.',
    ] },
    { heading: '11. Segurança', paragraphs: [
      'Serão adotadas medidas técnicas e administrativas apropriadas para proteger as informações pessoais contra acessos não autorizados e outros incidentes.',
      'Nenhum sistema informatizado pode garantir segurança absoluta.',
      'Eventuais incidentes serão tratados de acordo com as obrigações legais aplicáveis.',
    ] },
    { heading: '12. Disponibilidade e atualizações', paragraphs: [
      'O jogo poderá receber atualizações, correções, expansões e ajustes de funcionalidades.',
      'Interrupções temporárias podem ocorrer em razão de manutenção, falhas técnicas ou circunstâncias externas.',
      'Mudanças relevantes que afetem direitos ou obrigações dos usuários serão comunicadas de forma adequada.',
    ] },
    { heading: '13. Suspensão e encerramento de contas', paragraphs: [
      'Contas envolvidas em violações comprovadas destes termos poderão ser submetidas a medidas proporcionais, inclusive suspensão ou encerramento, respeitada a legislação aplicável.',
      'O usuário poderá solicitar o encerramento da própria conta.',
      'O tratamento dos dados após o encerramento seguirá a Política de Privacidade e as obrigações legais pertinentes.',
    ] },
    { heading: '14. Limitação de responsabilidade', paragraphs: [
      'O jogo é disponibilizado como ferramenta complementar de aprendizagem e entretenimento.',
      'O desenvolvedor não promete desempenho acadêmico, aprovação em avaliações, obtenção de emprego ou aquisição de competência profissional mediante seu uso.',
      'Eventuais limitações de responsabilidade previstas nestes termos não afastam garantias, direitos do consumidor ou outras responsabilidades legalmente irrenunciáveis.',
    ] },
    { heading: '15. Alterações dos termos', paragraphs: [
      'Os Termos de Uso poderão ser atualizados para acompanhar mudanças no jogo, nas funcionalidades ou nas exigências legais.',
      'Alterações relevantes serão comunicadas aos usuários, e novo aceite será solicitado quando necessário.',
    ] },
    { heading: '16. Legislação aplicável', paragraphs: [
      'Estes termos serão interpretados segundo a legislação brasileira, observadas as normas aplicáveis de proteção ao consumidor, privacidade e proteção de dados pessoais.',
      'Eventuais controvérsias serão tratadas de acordo com as regras legais de competência.',
    ] },
    { heading: '17. Contato', paragraphs: [
      'Para dúvidas sobre o jogo, estes termos e o uso da plataforma, entre em contato:',
      `Responsável: ${CONTROLLER_NAME}`,
      `E-mail: ${CONTACT_LABEL}`,
    ] },
    { heading: 'Declaração de aceite', paragraphs: [
      'Ao selecionar “Li e concordo com os Termos de Uso”, o usuário declara ter lido e aceitado as condições aplicáveis à utilização do jogo, incluindo sua finalidade educacional e suas limitações acadêmicas e profissionais.',
    ] },
  ],
};

export const PRIVACY: LegalDocument = {
  id: 'privacidade',
  title: 'Política de Privacidade',
  version: PRIVACY_VERSION,
  updated: UPDATED,
  intro: [
    `Versão: ${PRIVACY_VERSION} • Data de atualização: ${UPDATED}`,
    `Esta política explica como o ${GAME_NAME} trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).`,
  ],
  sections: [
    { heading: '1. Quem é o responsável pelos seus dados', paragraphs: [
      `Controlador: ${CONTROLLER_NAME}, desenvolvedor do jogo ${GAME_NAME}.`,
      `Canal de atendimento sobre privacidade (encarregado): ${CONTACT_LABEL}. Solicitações também podem ser feitas pelo menu “Minha Conta”, dentro do jogo.`,
    ] },
    { heading: '2. Quais dados pessoais tratamos', table: {
      head: ['Categoria', 'Dados', 'Origem'],
      rows: [
        ['Cadastro', 'Nome de usuário, e-mail, senha (guardada somente como código irreversível — hash — pelo provedor de autenticação; nunca temos acesso à senha), perfil profissional autodeclarado e declaração de ter 18 anos ou mais.', 'Você, no cadastro'],
        ['Registros de aceite', 'Identificador da conta, documento (Termos, Política, aviso educacional, maioridade, comunicações), versão, ação (aceite, ciência, consentimento ou revogação) e data/hora.', 'Gerados quando você aceita ou reconhece um documento'],
        ['Progresso no jogo', 'Nome e aparência do personagem, nível e experiência, missões, inventário e itens virtuais, casos clínicos realizados e notas, respostas a perguntas, revisões, pets virtuais e calendário do jogo.', 'Gerados enquanto você joga'],
        ['Autenticação e segurança', 'Data e hora de cadastro e de acesso, endereço IP, informações do navegador e registros técnicos de autenticação.', 'Coletados automaticamente pelo provedor de autenticação'],
        ['Comunicações (opcional)', 'Sua escolha de receber ou não novidades por e-mail.', 'Você, no cadastro ou em “Minha Conta”'],
        ['Armazenamento no seu aparelho', 'Sessão de login (token), cópia local do progresso, configurações do jogo e contador de tentativas de login.', 'Gravados no navegador (armazenamento local)'],
      ],
    }, paragraphs: [
      'Não coletamos CPF, data de nascimento, número de CRMV, documentos, fotos, localização, dados de pagamento nem dados pessoais sensíveis. O jogo não usa cookies de publicidade nem ferramentas de rastreamento ou análise de comportamento.',
    ] },
    { heading: '3. Para que usamos os dados e com qual base legal', table: {
      head: ['Finalidade', 'Dados', 'Base legal (LGPD)'],
      rows: [
        ['Criar e manter sua conta, permitir o login e manter a sessão', 'Cadastro, autenticação', 'Execução de contrato (art. 7º, V) — os Termos de Uso'],
        ['Salvar e sincronizar seu progresso e oferecer o jogo', 'Progresso no jogo, identificador da conta', 'Execução de contrato (art. 7º, V)'],
        ['Enviar e-mails de recuperação de senha (e de confirmação de cadastro, quando ativada)', 'E-mail', 'Execução de contrato (art. 7º, V)'],
        ['Registrar o aceite dos Termos, a ciência da Política e do aviso educacional e a declaração de maioridade', 'Registros de aceite', 'Exercício regular de direitos (art. 7º, VI)'],
        ['Proteger contas, impedir abusos e tentativas repetidas de login, investigar incidentes', 'Autenticação e segurança', 'Legítimo interesse (art. 7º, IX) e, quando aplicável, cumprimento de obrigação legal (art. 7º, II)'],
        ['Adaptar, no futuro, a linguagem e a dificuldade dos conteúdos ao seu perfil', 'Perfil profissional autodeclarado', 'Execução de contrato (art. 7º, V)'],
        ['Enviar novidades sobre o jogo por e-mail (somente se você optar)', 'E-mail, escolha de comunicações', 'Consentimento (art. 7º, I), que pode ser revogado a qualquer momento'],
        ['Atender pedidos de titulares e de autoridades', 'Os dados necessários a cada pedido', 'Cumprimento de obrigação legal (art. 7º, II)'],
      ],
    }, paragraphs: [
      'O perfil profissional é autodeclarado e não é usado para restringir o acesso a conteúdos nem para verificar habilitação profissional.',
    ] },
    { heading: '4. Com quem os dados são compartilhados', paragraphs: [
      'Não vendemos nem alugamos dados pessoais. Os dados são tratados por fornecedores que atuam como operadores, apenas para as finalidades acima:',
    ], bullets: [
      `Supabase Inc. (Estados Unidos) — autenticação, envio dos e-mails de conta e banco de dados. Os dados do jogo ficam hospedados na região ${REGION}.`,
      'GitHub Inc. (Estados Unidos) — hospedagem das páginas do jogo; registra dados técnicos de acesso, como endereço IP.',
      'Google LLC (Estados Unidos) — fornecimento de fontes tipográficas na página de apresentação do jogo (Google Fonts), que recebe o endereço IP de quem visita essa página.',
      'Autoridades públicas, quando houver obrigação legal ou ordem judicial.',
    ] },
    { heading: '5. Transferência internacional de dados', paragraphs: [
      'Os fornecedores acima são sediados nos Estados Unidos e podem tratar dados fora do Brasil, inclusive para suporte técnico, cópias de segurança e envio de e-mails. Essas transferências ocorrem com base nas hipóteses do art. 33 da LGPD, observando a regulamentação da Autoridade Nacional de Proteção de Dados (ANPD), como cláusulas contratuais previstas nos acordos de tratamento de dados dos fornecedores.',
    ] },
    { heading: '6. Por quanto tempo guardamos os dados', bullets: [
      'Conta, perfil, progresso e registros de aceite: enquanto a conta existir.',
      'Ao excluir a conta: os dados são apagados imediatamente do banco de dados do jogo. Cópias de segurança mantidas pelo fornecedor são eliminadas automaticamente ao fim do prazo de retenção do plano contratado.',
      'Registros técnicos de autenticação: pelo prazo definido pelo provedor de autenticação e, quando houver obrigação legal de guarda de registros de acesso, pelo prazo exigido em lei.',
      'Dados no seu aparelho: até você sair da conta, excluí-la ou limpar os dados do navegador. O progresso salvo antes da criação das contas permanece no navegador até que você mesmo o apague.',
    ] },
    { heading: '7. Como protegemos os dados', bullets: [
      'Conexão criptografada (HTTPS) em todas as comunicações.',
      'Senhas guardadas apenas como hash pelo provedor de autenticação.',
      'Regras de acesso no banco de dados: cada conta só consegue ler e alterar os próprios dados.',
      'Nenhuma chave administrativa no aplicativo; confirmação da senha para ações sensíveis, como alterar a senha ou excluir a conta.',
      'Limite de tentativas de login e coleta mínima de dados.',
    ], paragraphs: ['Nenhum sistema é totalmente imune a falhas. Em caso de incidente de segurança relevante, adotaremos as medidas e comunicações exigidas pela legislação.'] },
    { heading: '8. Seus direitos', paragraphs: ['Você pode, a qualquer momento (LGPD, art. 18):'], bullets: [
      'Confirmar se tratamos seus dados e acessá-los.',
      'Corrigir dados incompletos, inexatos ou desatualizados.',
      'Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou excessivos.',
      'Receber seus dados em formato estruturado (portabilidade).',
      'Pedir a eliminação dos dados tratados com base no consentimento e revogar o consentimento.',
      'Saber com quem compartilhamos seus dados.',
      'Opor-se a tratamentos que descumpram a lei e pedir a revisão de decisões automatizadas, quando houver.',
    ] },
    { heading: '', paragraphs: [
      'Pelo próprio jogo, em “Minha Conta”, você corrige o nome de usuário e o perfil, baixa seus dados (exportação em arquivo JSON), muda a preferência de comunicações e exclui a conta. Para os demais pedidos, escreva para o canal de privacidade indicado no item 1. Responderemos nos prazos do art. 19 da LGPD. Você também pode apresentar reclamação à ANPD (gov.br/anpd).',
    ] },
    { heading: '9. Crianças e adolescentes', paragraphs: [
      'Nesta versão, o cadastro é permitido somente a pessoas com 18 anos ou mais. Se soubermos que uma conta pertence a menor de 18 anos, ela será excluída.',
    ] },
    { heading: '10. Alterações desta política', paragraphs: [
      'Esta política pode ser atualizada. Mudanças relevantes serão comunicadas no jogo e, quando necessário, solicitaremos nova ciência. A versão e a data de atualização aparecem no início do documento.',
    ] },
    { heading: '11. Contato', paragraphs: [`Responsável: ${CONTROLLER_NAME} • E-mail: ${CONTACT_LABEL}`] },
  ],
};

export const LEGAL_DOCS: Record<LegalDocument['id'], LegalDocument> = { termos: TERMS, privacidade: PRIVACY, aviso: EDUCATIONAL_NOTICE };
