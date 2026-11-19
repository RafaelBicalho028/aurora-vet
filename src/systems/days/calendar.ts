/**
 * Sistema de dias: calendário do jogo, altas e chegada de novos pacientes.
 * Funções puras (sem Phaser) para poderem ser testadas em Node.
 *
 * Regras:
 * - Cada dia tem três períodos (manhã, tarde, noite). Cada atendimento avança um período.
 * - Dormir em casa leva à manhã do dia seguinte.
 * - Ao amanhecer: pacientes já atendidos recebem alta; novos pacientes chegam ao Hospital (Etapa 1)
 *   e à Clínica da Vila (Etapa 2), sorteados entre os quadros clínicos que o aluno já resolveu
 *   na história — com outro animal, outro tutor e as opções embaralhadas.
 */
import type { ClinicalCase } from '../cases/caseTypes';

export const PERIODS = ['Manhã', 'Tarde', 'Noite'] as const;
export type Period = 0 | 1 | 2;

export type PatientLocation = 'hospital' | 'clinica_vila';

export interface DailyPatient {
  uid: string;
  caseId: string;
  location: PatientLocation;
  slot: number;
  name: string;
  tutorName: string;
  tutorFem: boolean;
  /** semente para a aparência do tutor */
  seed: number;
  arrivedDay: number;
  status: 'waiting' | 'treated';
  score?: number;
}

export interface CalendarState {
  day: number;
  period: Period;
  patients: DailyPatient[];
  /** pacientes da história que já receberam alta (ids de caso) */
  storyDischarged: string[];
  /** contador para gerar ids únicos */
  seq: number;
}

export function newCalendar(): CalendarState {
  return { day: 1, period: 0, patients: [], storyDischarged: [], seq: 0 };
}

/** Vagas na sala de espera de cada local. */
export const SLOTS: Record<PatientLocation, number> = { hospital: 2, clinica_vila: 2 };

export function periodLabel(c: CalendarState): string {
  return `Dia ${c.day} • ${PERIODS[c.period]}`;
}

/** Avança um período (manhã → tarde → noite). À noite, permanece noite até dormir. */
export function advancePeriod(c: CalendarState): CalendarState {
  return { ...c, period: (Math.min(2, c.period + 1) as Period) };
}

// ------------------------------------------------------------ nomes para pacientes e tutores
const NAMES = {
  canino: { m: ['Bob', 'Toby', 'Fred', 'Zeca', 'Rufus', 'Teco', 'Dudu', 'Max', 'Simba', 'Paçoquinha'], f: ['Lola', 'Belinha', 'Mel', 'Pipoca', 'Kiara', 'Amora', 'Nina', 'Fiona', 'Jade', 'Pandora'] },
  felino: { m: ['Tom', 'Frajola', 'Garfield', 'Salem', 'Sushi', 'Café', 'Oliver', 'Bento', 'Tigrão', 'Pudim'], f: ['Mia', 'Nala', 'Cacau', 'Princesa', 'Jujuba', 'Bela', 'Pantera', 'Lili', 'Maya', 'Cereja'] },
};
const TUTORS = {
  m: ['Sr. Carlos', 'Sr. Renato', 'Sr. Wagner', 'Sr. Edson', 'Sr. Ivo', 'Sr. Nelson', 'Sr. Davi', 'Sr. Rogério'],
  f: ['Dona Lúcia', 'Dona Teresa', 'Dona Neide', 'Sra. Patrícia', 'Dona Fátima', 'Sra. Camila', 'Dona Zilda', 'Sra. Vânia'],
};
/** Gênero dos tutores originais (para manter a concordância das falas). */
const TUTOR_FEM: Record<string, boolean> = { joaquim: false, marta: true, sofia: true, paulo: false, cida: true, gabriel: false };

export function tutorIsFem(c: ClinicalCase): boolean {
  if (c.patient.tutorNpc in TUTOR_FEM) return TUTOR_FEM[c.patient.tutorNpc];
  return /^(Dona|Sra\.)/.test(c.patient.tutorName);
}

const pick = <T>(arr: T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length) % arr.length];

export function locationFor(c: ClinicalCase): PatientLocation {
  return c.minStage >= 2 ? 'clinica_vila' : 'hospital';
}

export interface DayContext {
  /** casos que podem gerar novos pacientes (já resolvidos na história) */
  pool: ClinicalCase[];
  /** etapa liberada pela história (1 ou 2) */
  storyStage: number;
  /** casos da história já aprovados (recebem alta ao amanhecer) */
  passedStoryCases: string[];
}

export interface DayReport {
  day: number;
  discharged: { name: string; where: PatientLocation | 'story' }[];
  arrived: DailyPatient[];
}

/** Gera novos pacientes para as vagas livres, sem repetir o mesmo quadro na mesma sala. */
export function generateArrivals(c: CalendarState, ctx: DayContext, rnd: () => number): { cal: CalendarState; arrived: DailyPatient[] } {
  const cal: CalendarState = { ...c, patients: [...c.patients] };
  const arrived: DailyPatient[] = [];
  const locations: PatientLocation[] = ctx.storyStage >= 2 ? ['hospital', 'clinica_vila'] : ['hospital'];
  for (const loc of locations) {
    const pool = ctx.pool.filter((k) => locationFor(k) === loc);
    if (!pool.length) continue;
    const used = new Set(cal.patients.filter((p) => p.location === loc).map((p) => p.slot));
    const free = Array.from({ length: SLOTS[loc] }, (_, i) => i).filter((i) => !used.has(i));
    // 1 ou 2 chegadas por dia em cada local, conforme as vagas
    const want = Math.min(free.length, 1 + (rnd() < 0.5 ? 1 : 0));
    for (let i = 0; i < want; i++) {
      const inRoom = new Set(cal.patients.filter((p) => p.location === loc).map((p) => p.caseId));
      const options = pool.filter((k) => !inRoom.has(k.id));
      const base = pick(options.length ? options : pool, rnd);
      const species = base.patient.species === 'felino' ? 'felino' : 'canino';
      const fem = /f[eê]mea/i.test(base.patient.sex);
      const tutorFem = tutorIsFem(base);
      const takenNames = new Set(cal.patients.map((p) => p.name));
      const nameOpts = NAMES[species][fem ? 'f' : 'm'].filter((n) => !takenNames.has(n) && n !== base.patient.name);
      cal.seq += 1;
      const p: DailyPatient = {
        uid: `d${cal.day}_${cal.seq}`,
        caseId: base.id,
        location: loc,
        slot: free[i],
        name: pick(nameOpts.length ? nameOpts : NAMES[species][fem ? 'f' : 'm'], rnd),
        tutorName: pick(TUTORS[tutorFem ? 'f' : 'm'], rnd),
        tutorFem,
        seed: Math.floor(rnd() * 1e9),
        arrivedDay: cal.day,
        status: 'waiting',
      };
      cal.patients.push(p);
      arrived.push(p);
    }
  }
  return { cal, arrived };
}

/** Dormir: amanhece o dia seguinte, com altas e novos pacientes. */
export function nextDay(c: CalendarState, ctx: DayContext, rnd: () => number): { cal: CalendarState; report: DayReport } {
  const discharged: DayReport['discharged'] = [];
  const staying = c.patients.filter((p) => {
    if (p.status === 'treated') { discharged.push({ name: p.name, where: p.location }); return false; }
    return true;
  });
  const storyDischarged = [...c.storyDischarged];
  for (const id of ctx.passedStoryCases) {
    if (!storyDischarged.includes(id)) { storyDischarged.push(id); discharged.push({ name: id, where: 'story' }); }
  }
  const base: CalendarState = { ...c, day: c.day + 1, period: 0, patients: staying, storyDischarged };
  const { cal, arrived } = generateArrivals(base, ctx, rnd);
  return { cal, report: { day: cal.day, discharged, arrived } };
}

// ------------------------------------------------------------ variante do caso para um paciente do dia
function deepReplace<T>(v: T, fn: (s: string) => string): T {
  if (typeof v === 'string') return fn(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepReplace(x, fn)) as unknown as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepReplace(x, fn)])) as T;
  return v;
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (s: string) => new RegExp(`(?<![\\p{L}])${esc(s)}(?![\\p{L}])`, 'gu');
const lastWord = (s: string) => s.split(/\s+/).pop() ?? s;

export type DailyCase = ClinicalCase & { dailyUid: string };

/**
 * Cria o caso do paciente do dia: mesmo quadro clínico, com nome do animal e do tutor trocados
 * em todos os textos. O id do caso é mantido (histórico e revisão continuam coerentes) e a missão é
 * removida (pacientes do dia não concluem objetivos da história).
 */
export function dailyCase(base: ClinicalCase, p: DailyPatient, tutorNpcId: string): DailyCase {
  const oldTutor = base.patient.tutorName;
  const oldTutorFirst = lastWord(oldTutor);
  const newTutorFirst = lastWord(p.tutorName);
  const replace = (s: string) => s
    .replace(word(oldTutor), p.tutorName)
    .replace(word(oldTutorFirst), newTutorFirst)
    .replace(word(base.patient.name), p.name);
  const c = deepReplace(base, replace);
  // ids e chaves técnicas não devem ser alterados: restaura os campos não textuais
  c.id = base.id;
  c.patient = { ...c.patient, name: p.name, tutorName: p.tutorName, tutorNpc: tutorNpcId, sprite: base.patient.sprite };
  const parts = c.title.split('—');
  c.title = `Paciente do dia • ${(parts.length > 1 ? parts.slice(1).join('—') : c.title).trim()}`;
  c.missionId = '';
  return { ...c, dailyUid: p.uid };
}
