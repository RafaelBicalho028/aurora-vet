/**
 * Pets adotáveis: espécies, raças, aparência (para o gerador de sprites) e ficha educativa.
 * As informações são sínteses didáticas pendentes de validação técnica; predisposição não é destino:
 * indica maior frequência relatada na raça, não que todo animal terá a doença.
 */
export type PetKind = 'dog' | 'cat' | 'rabbit' | 'guineapig' | 'hamster' | 'cockatiel';

export interface PetLook {
  kind: PetKind;
  size: 'xs' | 's' | 'm' | 'l';
  bodyLen: number;
  legLen: number;
  ear: 'up' | 'flop' | 'long' | 'small' | 'bat' | 'tuft';
  snout: number;
  tail: 'up' | 'curl' | 'down' | 'plume' | 'stub' | 'pom';
  coat: 'short' | 'long' | 'fluffy' | 'curly' | 'hairless';
  pattern: 'solid' | 'belly' | 'saddle' | 'tan' | 'tuxedo' | 'mask' | 'darkmask' | 'patches' | 'tricolor' | 'tabby' | 'point';
  base: string;
  light?: string;
  dark?: string;
  accent?: string;
  eye?: string;
}

export interface Breed {
  id: string;
  name: string;
  species: string;
  look: PetLook;
  fact: string;
  care: string;
  refs: string[];
}

export interface PetSpecies {
  id: string;
  name: string;
  scientific: string;
  icon: string;
}

export const PET_SPECIES: PetSpecies[] = [
  { id: 'cao', name: 'Cães', scientific: 'Canis lupus familiaris', icon: '🐕' },
  { id: 'gato', name: 'Gatos', scientific: 'Felis catus', icon: '🐈' },
  { id: 'outros', name: 'Outros pets', scientific: 'Lagomorfos, roedores e aves', icon: '🐇' },
];

const dog = (l: Partial<PetLook>): PetLook => ({ kind: 'dog', size: 'm', bodyLen: 10, legLen: 3, ear: 'up', snout: 2, tail: 'up', coat: 'short', pattern: 'solid', base: '#d08a45', ...l });
const cat = (l: Partial<PetLook>): PetLook => ({ kind: 'cat', size: 'm', bodyLen: 9, legLen: 3, ear: 'up', snout: 1, tail: 'up', coat: 'short', pattern: 'solid', base: '#8a8d99', ...l });

export const BREEDS: Breed[] = [
  // ---------------- Cães ----------------
  { id: 'cao_srd', name: 'SRD (vira-lata caramelo)', species: 'cao', look: dog({ base: '#d08a45', light: '#f1d3a1', pattern: 'belly' }),
    fact: 'Cães sem raça definida têm grande variabilidade genética. Não existe animal “imune”: vacinação, controle de parasitas e consultas periódicas valem para todos.',
    care: 'Vacinas, vermifugação, controle de pulgas e carrapatos e castração conforme orientação veterinária.', refs: ['day2016'] },
  { id: 'cao_labrador', name: 'Labrador Retriever', species: 'cao', look: dog({ size: 'l', bodyLen: 11, legLen: 4, ear: 'flop', snout: 3, tail: 'down', base: '#e3bd72', light: '#f3dca8', pattern: 'belly' }),
    fact: 'Há maior frequência relatada de obesidade e de displasia coxofemoral e de cotovelo na raça.',
    care: 'Controle de peso, exercícios regulares e porções medidas de alimento.', refs: ['gough2018'] },
  { id: 'cao_golden', name: 'Golden Retriever', species: 'cao', look: dog({ size: 'l', bodyLen: 11, legLen: 4, ear: 'flop', snout: 3, tail: 'plume', coat: 'long', base: '#d49a46', light: '#ecc483', pattern: 'belly' }),
    fact: 'Raça com predisposição relatada a displasia coxofemoral e a algumas neoplasias, como linfoma e hemangiossarcoma.',
    care: 'Escovação frequente da pelagem longa e consultas periódicas.', refs: ['gough2018'] },
  { id: 'cao_pastor', name: 'Pastor-Alemão', species: 'cao', look: dog({ size: 'l', bodyLen: 11, legLen: 4, ear: 'up', snout: 3, tail: 'plume', base: '#c68a4a', dark: '#2e2a33', pattern: 'saddle' }),
    fact: 'Predisposição relatada a displasia coxofemoral e a mielopatia degenerativa.',
    care: 'Atividade física e estímulo mental diários; avaliação ortopédica quando indicada.', refs: ['gough2018'] },
  { id: 'cao_dachshund', name: 'Dachshund (Teckel)', species: 'cao', look: dog({ size: 's', bodyLen: 11, legLen: 1, ear: 'long', snout: 3, tail: 'down', base: '#8e4a2a', light: '#b8693e', pattern: 'solid' }),
    fact: 'Raça condrodistrófica, com predisposição à doença do disco intervertebral.',
    care: 'Evitar sobrepeso e saltos de lugares altos (escadas, sofás).', refs: ['gough2018'] },
  { id: 'cao_poodle', name: 'Poodle', species: 'cao', look: dog({ size: 's', bodyLen: 8, legLen: 4, ear: 'flop', snout: 2, tail: 'pom', coat: 'curly', base: '#efe7da', pattern: 'solid' }),
    fact: 'Luxação patelar é relatada nas variedades pequenas; o hipoadrenocorticismo (doença de Addison) é descrito no Poodle padrão.',
    care: 'Tosa regular: a pelagem cresce continuamente e forma nós.', refs: ['gough2018'] },
  { id: 'cao_shihtzu', name: 'Shih Tzu', species: 'cao', look: dog({ size: 's', bodyLen: 8, legLen: 2, ear: 'long', snout: 1, tail: 'curl', coat: 'long', base: '#f2ece0', dark: '#a8774a', pattern: 'patches' }),
    fact: 'Raça braquicefálica, com olhos proeminentes mais sujeitos a lesões de córnea.',
    care: 'Higiene dos olhos, cuidado com o calor e tosa regular.', refs: ['gough2018'] },
  { id: 'cao_pug', name: 'Pug', species: 'cao', look: dog({ size: 's', bodyLen: 8, legLen: 2, ear: 'small', snout: 0, tail: 'curl', base: '#d9c08f', dark: '#2e2a33', pattern: 'darkmask' }),
    fact: 'Raça braquicefálica, predisposta à síndrome obstrutiva das vias aéreas dos braquicefálicos (BOAS), com intolerância ao calor e ao esforço.',
    care: 'Evitar calor e exercício intenso, manter peso adequado e preferir peitoral à coleira.', refs: ['gough2018'] },
  { id: 'cao_bulldog', name: 'Buldogue Francês', species: 'cao', look: dog({ size: 's', bodyLen: 8, legLen: 2, ear: 'bat', snout: 0, tail: 'stub', base: '#c9a376', light: '#efdcbc', dark: '#3a3036', pattern: 'darkmask' }),
    fact: 'Braquicefálico: predisposto à BOAS e à dermatite nas dobras de pele.',
    care: 'Evitar calor, limpar e secar as dobras e observar o padrão respiratório.', refs: ['gough2018'] },
  { id: 'cao_border', name: 'Border Collie', species: 'cao', look: dog({ size: 'm', bodyLen: 10, legLen: 3, ear: 'small', snout: 3, tail: 'plume', coat: 'long', base: '#2b2630', light: '#f2efe8', pattern: 'tuxedo' }),
    fact: 'A anomalia do olho do collie, doença ocular hereditária, é descrita na raça.',
    care: 'Raça muito ativa: precisa de exercício e estímulo mental diários.', refs: ['gough2018'] },
  { id: 'cao_yorkshire', name: 'Yorkshire Terrier', species: 'cao', look: dog({ size: 'xs', bodyLen: 7, legLen: 2, ear: 'up', snout: 1, tail: 'up', coat: 'long', base: '#4a5468', accent: '#c8955a', pattern: 'tan' }),
    fact: 'Colapso de traqueia e desvio portossistêmico congênito são descritos na raça.',
    care: 'Usar peitoral em vez de coleira e cuidar da higiene dental (doença periodontal é comum em cães pequenos).', refs: ['gough2018'] },
  { id: 'cao_husky', name: 'Husky Siberiano', species: 'cao', look: dog({ size: 'l', bodyLen: 11, legLen: 4, ear: 'up', snout: 3, tail: 'curl', coat: 'fluffy', base: '#6d7280', light: '#f2f2f0', eye: '#5aa8e8', pattern: 'mask' }),
    fact: 'Pelagem dupla adaptada ao frio; catarata hereditária é descrita na raça.',
    care: 'Evitar exercícios nos horários quentes e oferecer sombra e água fresca.', refs: ['gough2018'] },

  // ---------------- Gatos ----------------
  { id: 'gato_tricolor', name: 'SRD tricolor', species: 'gato', look: cat({ base: '#f4efe6', accent: '#e08a3a', dark: '#2e2a33', pattern: 'tricolor' }),
    fact: 'Gatos tricolores são quase sempre fêmeas: os genes das cores laranja e preta ficam no cromossomo X. Machos tricolores geralmente têm alteração cromossômica, como XXY.',
    care: 'Castração, telas de proteção nas janelas e caixa de areia sempre limpa.', refs: ['nicholas2010'] },
  { id: 'gato_frajola', name: 'SRD frajola (preto e branco)', species: 'gato', look: cat({ base: '#2b2630', light: '#f2efe8', pattern: 'tuxedo' }),
    fact: 'A cor da pelagem não define raça nem temperamento; gatos SRD são a maioria dos gatos brasileiros.',
    care: 'Vacinação, castração e enriquecimento ambiental (arranhadores, prateleiras, brinquedos).', refs: ['day2016'] },
  { id: 'gato_rajado', name: 'SRD laranja rajado', species: 'gato', look: cat({ base: '#e59a45', dark: '#b9692a', light: '#f8e2bf', pattern: 'tabby' }),
    fact: 'O padrão rajado (tabby) é o mais comum entre os gatos; a cor laranja está ligada ao cromossomo X.',
    care: 'Controle de peso e água fresca em vários pontos da casa.', refs: ['nicholas2010'] },
  { id: 'gato_siames', name: 'Siamês', species: 'gato', look: cat({ bodyLen: 10, base: '#efe3cc', dark: '#4a3a33', eye: '#5aa8e8', pattern: 'point' }),
    fact: 'O padrão “point” depende da temperatura: a enzima da pigmentação é termossensível, e as extremidades, mais frias, ficam escuras. A amiloidose é descrita na raça.',
    care: 'Raça muito comunicativa e ativa; enriquecimento ambiental é essencial.', refs: ['nicholas2010', 'gough2018'] },
  { id: 'gato_persa', name: 'Persa', species: 'gato', look: cat({ legLen: 2, ear: 'small', snout: 0, tail: 'plume', coat: 'fluffy', base: '#ecebe6', light: '#ffffff', pattern: 'solid' }),
    fact: 'Raça braquicefálica com predisposição à doença renal policística (PKD), para a qual existe teste genético.',
    care: 'Escovação diária para evitar nós e limpeza do lacrimejamento.', refs: ['gough2018'] },
  { id: 'gato_mainecoon', name: 'Maine Coon', species: 'gato', look: cat({ size: 'l', bodyLen: 11, legLen: 3, ear: 'tuft', tail: 'plume', coat: 'fluffy', base: '#8a6a4a', dark: '#4e3a2a', light: '#e8dcc8', pattern: 'tabby' }),
    fact: 'Gato de grande porte; a cardiomiopatia hipertrófica é associada, na raça, a uma mutação no gene MYBPC3.',
    care: 'Escovação regular e acompanhamento cardiológico quando indicado.', refs: ['gough2018'] },
  { id: 'gato_sphynx', name: 'Sphynx', species: 'gato', look: cat({ ear: 'bat', coat: 'hairless', base: '#e9b7a6', dark: '#c98f80', pattern: 'solid' }),
    fact: 'Sem pelagem, a pele acumula oleosidade; a cardiomiopatia hipertrófica também é descrita na raça.',
    care: 'Banhos periódicos e proteção contra frio e sol.', refs: ['gough2018'] },
  { id: 'gato_ragdoll', name: 'Ragdoll', species: 'gato', look: cat({ size: 'l', bodyLen: 10, tail: 'plume', coat: 'fluffy', base: '#f1ead8', dark: '#6a5a52', eye: '#5aa8e8', pattern: 'point' }),
    fact: 'Na raça, a cardiomiopatia hipertrófica está associada a uma mutação específica do gene MYBPC3.',
    care: 'Escovação regular e manter dentro de casa com enriquecimento ambiental.', refs: ['gough2018'] },

  // ---------------- Outros ----------------
  { id: 'coelho', name: 'Coelho (Oryctolagus cuniculus)', species: 'outros', look: { kind: 'rabbit', size: 's', bodyLen: 8, legLen: 1, ear: 'long', snout: 0, tail: 'stub', coat: 'short', pattern: 'patches', base: '#f4f1ea', dark: '#7a5a46' },
    fact: 'Todos os dentes do coelho crescem continuamente. Um coelho que deixa de comer pode desenvolver estase gastrintestinal — é uma urgência.',
    care: 'Feno à vontade como base da dieta, verduras adequadas e ração em pequena quantidade.', refs: ['quesenberry2012'] },
  { id: 'porquinho', name: 'Porquinho-da-índia (Cavia porcellus)', species: 'outros', look: { kind: 'guineapig', size: 's', bodyLen: 9, legLen: 1, ear: 'small', snout: 0, tail: 'stub', coat: 'short', pattern: 'tricolor', base: '#f4efe6', accent: '#d08a45', dark: '#3a3036' },
    fact: 'Assim como os humanos, não sintetiza vitamina C: ela precisa vir da dieta todos os dias.',
    care: 'Feno à vontade, ração própria para a espécie e vegetais frescos ricos em vitamina C.', refs: ['quesenberry2012'] },
  { id: 'hamster', name: 'Hamster-sírio (Mesocricetus auratus)', species: 'outros', look: { kind: 'hamster', size: 'xs', bodyLen: 6, legLen: 1, ear: 'small', snout: 0, tail: 'stub', coat: 'short', pattern: 'belly', base: '#d9a050', light: '#f6ead2' },
    fact: 'O hamster-sírio adulto é solitário: dividir a gaiola costuma gerar brigas. Tem hábitos crepusculares e noturnos.',
    care: 'Gaiola espaçosa com roda adequada, substrato para cavar e manuseio calmo.', refs: ['quesenberry2012'] },
  { id: 'calopsita', name: 'Calopsita (Nymphicus hollandicus)', species: 'outros', look: { kind: 'cockatiel', size: 's', bodyLen: 6, legLen: 1, ear: 'small', snout: 0, tail: 'down', coat: 'short', pattern: 'mask', base: '#9a9aa6', light: '#f2e28a', accent: '#e8843a' },
    fact: 'Dieta só de sementes é desequilibrada. Vapores de panelas antiaderentes superaquecidas são tóxicos para aves.',
    care: 'Ração extrusada ou peletizada, vegetais, viveiro amplo e convivência diária.', refs: ['harrison2006'] },
];

export const BREED_MAP: Record<string, Breed> = Object.fromEntries(BREEDS.map((b) => [b.id, b]));
export const MAX_PETS = 4;
