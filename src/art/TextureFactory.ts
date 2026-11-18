/**
 * Registra no Phaser as texturas geradas proceduralmente.
 * Para usar arte profissional no futuro, basta carregar imagens com as mesmas chaves (ver docs/ARTE.md).
 */
import Phaser from 'phaser';
import { buildAllAnimals } from './animals';
import { buildHeart, buildPetSheet, PET_H, PET_W } from './pets';
import { BREED_MAP } from '../content/pets';
import { buildCharacterSheet, FRAME_H, FRAME_W, type CharacterLook } from './characters';
import { OBJECTS, renderBuilding, renderObject } from './objects';
import { createCanvas, ctx2d, hashString } from './pixel';
import { drawGroundTile, TILE, type GroundKind } from './tiles';
import type { MapDef } from '../world/mapTypes';
import { groundKindAt } from '../world/MapBuilder';

export const ANIMAL_FRAMES: Record<string, { w: number; h: number; frames: number }> = {};

function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, fw: number, fh: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, canvas)!;
  const cols = Math.floor(canvas.width / fw);
  for (let i = 0; i < cols; i++) tex.add(i, 0, i * fw, 0, fw, fh);
}

export function registerCharacter(scene: Phaser.Scene, key: string, look: CharacterLook): void {
  addSheet(scene, key, buildCharacterSheet(look), FRAME_W, FRAME_H);
}

/** Textura do pet (gerada sob demanda a partir da raça). */
export function petTexture(scene: Phaser.Scene, breedId: string): string {
  const key = `pet_${breedId}`;
  if (!scene.textures.exists(key)) {
    const breed = BREED_MAP[breedId];
    if (breed) addSheet(scene, key, buildPetSheet(breed.look), PET_W, PET_H);
  }
  return key;
}

export function registerStatic(scene: Phaser.Scene): void {
  if (!scene.textures.exists('heart')) scene.textures.addCanvas('heart', buildHeart());
  for (const a of buildAllAnimals()) {
    addSheet(scene, a.key, a.canvas, a.frameW, a.frameH);
    ANIMAL_FRAMES[a.key] = { w: a.frameW, h: a.frameH, frames: a.frames };
  }
}

/** Textura de objeto com variação limitada por semente (ex.: 4 árvores diferentes). */
export function objectTexture(scene: Phaser.Scene, type: string, seed: number): string {
  const variants = type === 'tree' || type === 'bush' ? 4 : type === 'bookshelf' || type === 'poster' || type === 'cabinet' || type === 'flowerbed' ? 6 : 1;
  const v = Math.abs(seed) % variants;
  const key = `obj_${type}_${v}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, renderObject(type, 1000 + v * 37));
  return key;
}

export function buildingTexture(scene: Phaser.Scene, map: MapDef, b: MapDef['buildings'][number]): string {
  const key = `bld_${map.id}_${b.id}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, renderBuilding(b.w, b.h, b.style, b.doors.map((d) => d.dx), b.id));
  return key;
}

export function renderGroundCanvas(map: MapDef): HTMLCanvasElement {
  const c = createCanvas(map.width * TILE, map.height * TILE);
  const ctx = ctx2d(c);
  const defaultFloor: GroundKind = map.floor ?? 'floor_clinic';
  const base = hashString(map.id);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const kind = groundKindAt(map, x, y)!;
      drawGroundTile(ctx, x * TILE, y * TILE, {
        kind,
        same: (dx, dy) => { const k = groundKindAt(map, x + dx, y + dy); return k === null ? true : k === kind; },
        kindAt: (dx, dy) => groundKindAt(map, x + dx, y + dy),
        seed: base + x * 374761393 + y * 668265263,
        wallColor: map.wallColor,
      }, defaultFloor);
    }
  }
  return c;
}

export function groundTexture(scene: Phaser.Scene, map: MapDef): string {
  const key = `ground_${map.id}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, renderGroundCanvas(map));
  return key;
}

export { OBJECTS };
