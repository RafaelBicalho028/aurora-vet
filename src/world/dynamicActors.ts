/**
 * Atores dinâmicos: pacientes do dia (tutor + animal + diálogo) e os pets que ficam em casa.
 * São (re)inseridos nas listas NPCS/ANIMALS/DIALOGUES a partir do estado salvo, antes de o mundo
 * criar os atores do mapa — assim o resto do jogo (retratos, diálogos, atendimento) funciona igual.
 */
import { CASES } from '../content';
import { ANIMALS, NPCS } from '../content/npcs';
import { DIALOGUES } from '../content/dialogues';
import { BREED_MAP } from '../content/pets';
import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type CharacterLook } from '../art/characters';
import { rng } from '../art/pixel';
import { dailyCase, type DailyPatient, type PatientLocation } from '../systems/days/calendar';
import type { GameState } from '../core/GameState';
import type { Direction } from '../core/types';
import { HOME_PET_SPOTS } from './maps/casa';

export const dailyTutorId = (uid: string) => `dtutor_${uid}`;
const dailyAnimalId = (uid: string) => `dpac_${uid}`;
const dailyDialogueId = (uid: string) => `daily_${uid}`;

/** Lugares na sala de espera: tutor e animal lado a lado. */
const SLOT_POS: Record<PatientLocation, { tutor: [number, number, Direction]; animal: [number, number] }[]> = {
  hospital: [
    { tutor: [12, 9, 'left'], animal: [11, 9] },
    { tutor: [12, 11, 'left'], animal: [11, 11] },
  ],
  clinica_vila: [
    { tutor: [6, 8, 'right'], animal: [7, 8] },
    { tutor: [6, 10, 'right'], animal: [7, 10] },
  ],
};

const SHIRTS = ['#3d6fb6', '#c8506a', '#3f9d76', '#e8c13c', '#8a6bc9', '#e8843a', '#2a8f99', '#b8553a'];
const PANTS = ['#38405a', '#3a5a8a', '#4a4038', '#5a4a6a'];

export function tutorLook(seed: number, fem: boolean): CharacterLook {
  const r = rng(seed);
  const p = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length) % a.length];
  const styles = HAIR_STYLES.filter((s) => (fem ? s !== 'raspado' : !['trancas', 'chanel', 'rabo'].includes(s)));
  return {
    skin: p(SKIN_TONES), hair: p(HAIR_COLORS.slice(0, 6)), hairStyle: p(styles),
    top: p(SHIRTS), inner: '#f3f3ec', pants: p(PANTS), shoes: '#4a3a30', accent: null,
    glasses: r() < 0.3, beard: !fem && r() < 0.3, sex: fem ? 'feminino' : 'masculino',
  };
}

function isDynamic(id: string): boolean { return id.startsWith('dtutor_') || id.startsWith('dpac_') || id.startsWith('dpet_'); }

function patientActors(p: DailyPatient): void {
  const base = CASES[p.caseId];
  const pos = SLOT_POS[p.location][p.slot];
  if (!base || !pos) return;
  const tutorId = dailyTutorId(p.uid);
  const c = dailyCase(base, p, tutorId);
  NPCS.push({
    id: tutorId, name: p.tutorName, role: `Tutor(a) de ${p.name}`, look: tutorLook(p.seed, p.tutorFem),
    map: p.location, x: pos.tutor[0], y: pos.tutor[1], facing: pos.tutor[2], dialogue: dailyDialogueId(p.uid),
  });
  ANIMALS.push({
    id: dailyAnimalId(p.uid), name: p.name, sprite: base.patient.sprite, map: p.location, x: pos.animal[0], y: pos.animal[1],
    behavior: 'idle', flip: p.location === 'hospital',
    interact: p.status === 'waiting'
      ? { lines: [`${p.name} (${c.patient.speciesLabel.split(' (')[0].toLowerCase()}, ${c.patient.age}) aguarda atendimento.`, `Converse com ${p.tutorName} para iniciar.`] }
      : { lines: [`${p.name} já foi atendido(a) e descansa. Recebe alta amanhã de manhã.`] },
  });
  DIALOGUES[dailyDialogueId(p.uid)] = p.status === 'waiting'
    ? {
      entries: [{ start: 'oi' }],
      nodes: {
        oi: { expression: 'preocupado', text: `Bom dia! Eu sou ${p.tutorName}. Trouxe ${p.name}: ${c.patient.presentingComplaint.charAt(0).toLowerCase()}${c.patient.presentingComplaint.slice(1)}`, next: 'oi2' },
        oi2: {
          text: 'Você pode atender? Disseram que os estudantes atendem com supervisão.',
          choices: [
            { text: 'Vamos começar o atendimento.', effects: [{ type: 'startCase', caseId: p.caseId, patient: p.uid }] },
            { text: 'Só um momento, já volto.', next: 'espera' },
          ],
        },
        espera: { text: 'Tudo bem, a gente espera aqui.' },
      },
    }
    : {
      entries: [{ start: 'grato' }],
      nodes: { grato: { expression: 'feliz', text: `Muito obrigado(a) pelo atendimento! ${p.name} fica em observação hoje e recebe alta amanhã de manhã.` } },
    };
}

function homePets(st: GameState): void {
  const others = st.data.pets.owned.filter((pt) => pt.id !== st.data.pets.companion && BREED_MAP[pt.breed]);
  others.slice(0, HOME_PET_SPOTS.length).forEach((pt, i) => {
    const b = BREED_MAP[pt.breed];
    const [x, y] = HOME_PET_SPOTS[i];
    ANIMALS.push({
      id: `dpet_${pt.id}`, name: pt.name, sprite: `pet_${pt.breed}`, map: 'casa', x, y,
      behavior: 'wander', wander: 1,
      interact: { lines: [`${pt.name} (${b.name}) vem correndo pedir carinho!`, 'Na aba Pets do menu você troca o companheiro e vê a carteira de saúde.'], effects: [{ type: 'openPanel', panel: 'pets' }] },
    });
  });
}

/** Reconstrói os atores dinâmicos a partir do estado atual. */
export function syncDynamicActors(st: GameState): void {
  for (let i = NPCS.length - 1; i >= 0; i--) if (isDynamic(NPCS[i].id)) NPCS.splice(i, 1);
  for (let i = ANIMALS.length - 1; i >= 0; i--) if (isDynamic(ANIMALS[i].id)) ANIMALS.splice(i, 1);
  for (const k of Object.keys(DIALOGUES)) if (k.startsWith('daily_')) delete DIALOGUES[k];
  for (const p of st.calendar.patients) patientActors(p);
  homePets(st);
}
