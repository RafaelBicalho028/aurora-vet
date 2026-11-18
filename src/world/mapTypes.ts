/** Definições de mapas, NPCs, animais, portas e interações. */
import type { Direction } from '../core/types';
import type { GroundKind } from '../art/tiles';
import type { BuildingStyle } from '../art/objects';
import type { Condition, Effect } from '../systems/dialogue/types';
import type { CharacterLook } from '../art/characters';

export interface BuildingDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  style: BuildingStyle;
  doors: { dx: number; warp?: WarpTarget; locked?: { message: string; when?: Condition } }[];
}

export interface WarpTarget {
  map: string;
  x: number;
  y: number;
  facing: Direction;
}

export interface WarpDef extends WarpTarget {
  fromX: number;
  fromY: number;
}

export interface ObjectPlacement {
  type: string;
  x: number; // tile-âncora (inferior esquerdo)
  y: number;
  seed?: number;
  interact?: InteractionDef;
}

export interface InteractionDef {
  /** texto(s) exibidos; pode usar {nome} */
  lines?: string[];
  dialogue?: string; // id de diálogo
  effects?: Effect[];
  when?: Condition;
  /** interação alternativa quando a condição falha */
  otherwise?: InteractionDef;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  look: CharacterLook;
  map: string;
  x: number;
  y: number;
  facing: Direction;
  wander?: number; // raio de caminhada (0 = parado)
  dialogue: string;
  visibleWhen?: Condition;
}

export interface AnimalDef {
  id: string;
  name: string;
  sprite: string;
  map: string;
  x: number;
  y: number;
  behavior: 'idle' | 'wander' | 'scratch' | 'graze';
  wander?: number;
  flip?: boolean;
  interact: InteractionDef;
  visibleWhen?: Condition;
}

export interface MapDef {
  id: string;
  name: string;
  kind: 'outdoor' | 'indoor';
  music: 'campus' | 'clinic' | 'lab';
  width: number;
  height: number;
  /** linhas de caracteres; ver LEGEND */
  tiles: string[];
  floor?: GroundKind;
  wallColor?: string;
  buildings: BuildingDef[];
  objects: ObjectPlacement[];
  warps: WarpDef[];
  /** interações em tiles específicos ("x,y") */
  interactions: Record<string, InteractionDef>;
  spawn: { x: number; y: number; facing: Direction };
}

/** Legenda dos caracteres de tile. */
export const LEGEND: Record<string, { kind: GroundKind | 'floor'; block?: boolean; object?: string; talkThrough?: boolean }> = {
  '.': { kind: 'grass' },
  '"': { kind: 'flowers' },
  '=': { kind: 'path' },
  P: { kind: 'path', block: true },
  '-': { kind: 'dirt' },
  p: { kind: 'plaza' },
  '~': { kind: 'water', block: true },
  s: { kind: 'sand' },
  T: { kind: 'grass', block: true, object: 'tree' },
  b: { kind: 'grass', block: true, object: 'bush' },
  f: { kind: 'grass', block: true, object: 'fence', talkThrough: true },
  F: { kind: 'dirt', block: true, object: 'fence', talkThrough: true },
  X: { kind: 'grass', block: true },
  // interiores
  _: { kind: 'floor' },
  ',': { kind: 'rug' },
  W: { kind: 'wall', block: true },
  '#': { kind: 'void', block: true },
  m: { kind: 'mat' },
  c: { kind: 'counter', block: true, talkThrough: true },
};
