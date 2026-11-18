/** Árvores de habilidades por disciplina. Cada habilidade acumula XP de domínio independente. */
export interface Skill {
  id: string;
  name: string;
}
export interface Discipline {
  id: string;
  name: string;
  color: string;
  icon: string; // emoji/ícone simples usado na interface
  skills: Skill[];
}

export const DISCIPLINES: Discipline[] = [
  {
    id: 'anatomia', name: 'Anatomia Veterinária', color: '#d98f4e', icon: '🦴',
    skills: [
      { id: 'osteologia', name: 'Osteologia' },
      { id: 'miologia', name: 'Miologia' },
      { id: 'sistema_nervoso', name: 'Sistema nervoso' },
      { id: 'cardiovascular', name: 'Sistema cardiovascular' },
      { id: 'digestorio', name: 'Sistema digestório' },
      { id: 'comparada', name: 'Anatomia comparada' },
    ],
  },
  {
    id: 'fisiologia', name: 'Fisiologia', color: '#d65a7a', icon: '❤',
    skills: [
      { id: 'homeostase', name: 'Homeostase' },
      { id: 'cardiaca', name: 'Função cardíaca' },
      { id: 'respiracao', name: 'Respiração' },
      { id: 'renal', name: 'Função renal' },
      { id: 'endocrinologia', name: 'Endocrinologia' },
      { id: 'digestiva', name: 'Fisiologia digestiva' },
    ],
  },
  {
    id: 'parasitologia', name: 'Parasitologia', color: '#8a6bc9', icon: '🪲',
    skills: [
      { id: 'ectoparasitas', name: 'Ectoparasitas' },
      { id: 'endoparasitas', name: 'Endoparasitas' },
      { id: 'ciclos', name: 'Ciclos biológicos' },
      { id: 'diagnostico_parasitologico', name: 'Diagnóstico parasitológico' },
      { id: 'zoonoses', name: 'Zoonoses' },
    ],
  },
  {
    id: 'microbiologia', name: 'Microbiologia', color: '#4aa3a0', icon: '🧫',
    skills: [
      { id: 'bacteriologia', name: 'Bacteriologia' },
      { id: 'virologia', name: 'Virologia' },
      { id: 'micologia', name: 'Micologia' },
      { id: 'metodos_lab', name: 'Métodos laboratoriais' },
      { id: 'biosseguranca', name: 'Biossegurança' },
    ],
  },
  {
    id: 'farmacologia', name: 'Farmacologia', color: '#e06a9a', icon: '💊',
    skills: [
      { id: 'farmacocinetica', name: 'Farmacocinética' },
      { id: 'farmacodinamica', name: 'Farmacodinâmica' },
      { id: 'antimicrobianos', name: 'Antimicrobianos' },
      { id: 'analgesia', name: 'Analgesia e anti-inflamatórios' },
      { id: 'toxicologia', name: 'Toxicologia' },
    ],
  },
  {
    id: 'patologia', name: 'Patologia Veterinária', color: '#9a5a4a', icon: '🔬',
    skills: [
      { id: 'geral', name: 'Patologia geral' },
      { id: 'necropsia', name: 'Necropsia' },
      { id: 'oncologia', name: 'Oncologia' },
      { id: 'histopatologia', name: 'Histopatologia' },
    ],
  },
  {
    id: 'clinica', name: 'Clínica Médica', color: '#3f8fd1', icon: '🩺',
    skills: [
      { id: 'semiologia', name: 'Semiologia' },
      { id: 'raciocinio', name: 'Raciocínio clínico' },
      { id: 'diferencial', name: 'Diagnóstico diferencial' },
      { id: 'exames', name: 'Interpretação de exames' },
      { id: 'condutas', name: 'Condutas terapêuticas' },
    ],
  },
  {
    id: 'cirurgia', name: 'Cirurgia e Anestesiologia', color: '#5a9e5a', icon: '✚',
    skills: [
      { id: 'assepsia', name: 'Assepsia' },
      { id: 'instrumentais', name: 'Instrumentais' },
      { id: 'pre_operatorio', name: 'Avaliação pré-operatória' },
      { id: 'monitorizacao', name: 'Monitorização' },
      { id: 'pos_operatorio', name: 'Cuidados pós-operatórios' },
    ],
  },
  {
    id: 'saude_publica', name: 'Saúde Pública Veterinária', color: '#c9a23a', icon: '🌎',
    skills: [
      { id: 'zoonoses', name: 'Zoonoses' },
      { id: 'epidemiologia', name: 'Epidemiologia' },
      { id: 'vigilancia', name: 'Vigilância sanitária' },
      { id: 'inspecao', name: 'Inspeção de produtos de origem animal' },
      { id: 'saude_unica', name: 'Saúde Única' },
    ],
  },
];

export function findSkill(disciplineId: string, skillId: string): { discipline: Discipline; skill: Skill } | null {
  const d = DISCIPLINES.find((x) => x.id === disciplineId);
  const s = d?.skills.find((x) => x.id === skillId);
  return d && s ? { discipline: d, skill: s } : null;
}
