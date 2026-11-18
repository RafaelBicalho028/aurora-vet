/**
 * Entidades do mundo: personagens (jogador e NPCs) com movimento em grade e animais.
 */
import Phaser from 'phaser';
import type { Direction } from '../core/types';
import { TILE } from '../art/tiles';

export const DIR_VEC: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };

export class Walker {
  sprite: Phaser.GameObjects.Sprite;
  tx: number;
  ty: number;
  facing: Direction;
  moving: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number } | null = null;
  private parity = 0;

  constructor(scene: Phaser.Scene, public textureKey: string, tx: number, ty: number, facing: Direction) {
    this.tx = tx;
    this.ty = ty;
    this.facing = facing;
    this.sprite = scene.add.sprite(0, 0, textureKey, DIR_ROW[facing] * 3).setOrigin(0.5, 1);
    this.place();
  }

  place(): void {
    this.sprite.setPosition(this.tx * TILE + 8, this.ty * TILE + TILE);
    this.sprite.setDepth(this.sprite.y);
  }

  setFacing(d: Direction): void {
    this.facing = d;
    if (!this.moving) this.sprite.setFrame(DIR_ROW[d] * 3);
  }

  target(): [number, number] {
    return this.moving ? [this.moving.tx, this.moving.ty] : [this.tx, this.ty];
  }

  startMove(d: Direction, dur: number): void {
    const [dx, dy] = DIR_VEC[d];
    this.facing = d;
    this.moving = { fx: this.tx, fy: this.ty, tx: this.tx + dx, ty: this.ty + dy, t: 0, dur };
    this.parity = 1 - this.parity;
  }

  /** Retorna true quando chega ao tile de destino. */
  update(dt: number): boolean {
    if (!this.moving) return false;
    const m = this.moving;
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    const x = (m.fx + (m.tx - m.fx) * k) * TILE + 8;
    const y = (m.fy + (m.ty - m.fy) * k) * TILE + TILE;
    this.sprite.setPosition(Math.round(x), Math.round(y));
    this.sprite.setDepth(this.sprite.y);
    const step = k < 0.5 ? 1 + this.parity : 0;
    this.sprite.setFrame(DIR_ROW[this.facing] * 3 + step);
    if (k >= 1) {
      this.tx = m.tx;
      this.ty = m.ty;
      this.moving = null;
      this.place();
      this.sprite.setFrame(DIR_ROW[this.facing] * 3);
      return true;
    }
    return false;
  }

  destroy(): void { this.sprite.destroy(); }
}

export function faceToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX, dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** NPC com comportamento de caminhada aleatória perto da posição inicial. */
export class NpcEntity extends Walker {
  private wait = 1000 + Math.random() * 2500;
  constructor(scene: Phaser.Scene, key: string, public id: string, public homeX: number, public homeY: number, facing: Direction, public radius: number) {
    super(scene, key, homeX, homeY, facing);
  }

  tick(dt: number, canMove: (x: number, y: number) => boolean, paused: boolean): void {
    if (this.moving) { this.update(dt); return; }
    if (paused) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = 1500 + Math.random() * 3000;
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    const d = dirs[Math.floor(Math.random() * 4)];
    if (this.radius <= 0) {
      // NPC parado: apenas olha ao redor ocasionalmente
      if (Math.random() < 0.35) this.setFacing(d);
      return;
    }
    const [dx, dy] = DIR_VEC[d];
    const nx = this.tx + dx, ny = this.ty + dy;
    if (Math.abs(nx - this.homeX) > this.radius || Math.abs(ny - this.homeY) > this.radius) { this.setFacing(d); return; }
    if (canMove(nx, ny)) this.startMove(d, 320);
    else this.setFacing(d);
  }
}

/** Animal com animação de quadros e passeio opcional. */
export class AnimalEntity {
  sprite: Phaser.GameObjects.Sprite;
  tx: number;
  ty: number;
  moving: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number } | null = null;
  private wait = 1500 + Math.random() * 3000;
  private animT = 0;
  private frameSeq: number[];
  private frameMs: number;
  private seqIdx = 0;

  constructor(scene: Phaser.Scene, public id: string, key: string, tx: number, ty: number, public behavior: 'idle' | 'wander' | 'scratch' | 'graze', public radius: number, flip: boolean) {
    this.tx = tx;
    this.ty = ty;
    this.homeX = tx;
    this.homeY = ty;
    this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 1).setFlipX(!!flip);
    const isDog = key.startsWith('dog'), isCat = key.startsWith('cat');
    if (behavior === 'scratch') { this.frameSeq = [0, 2, 0, 2, 0, 2, 0, 0, 1, 0, 1, 0, 0, 0, 3, 0]; this.frameMs = 140; }
    else if (isDog) { this.frameSeq = [0, 1, 0, 1, 0, 0, 0, 3, 0, 0]; this.frameMs = 220; }
    else if (isCat) { this.frameSeq = [0, 0, 1, 0, 0, 0, 3, 0, 1, 1, 0, 0]; this.frameMs = 380; }
    else { this.frameSeq = [0, 0, 0, 1, 1, 1, 1, 0]; this.frameMs = 500; }
    if (scene.textures.get(key).frameTotal <= 2) this.frameSeq = [0];
    this.place();
  }
  homeX: number;
  homeY: number;

  place(): void {
    this.sprite.setPosition(this.tx * TILE + 8, this.ty * TILE + TILE);
    this.sprite.setDepth(this.sprite.y);
  }

  tick(dt: number, canMove: (x: number, y: number) => boolean): void {
    this.animT += dt;
    if (this.animT >= this.frameMs) {
      this.animT = 0;
      this.seqIdx = (this.seqIdx + 1) % this.frameSeq.length;
      const f = this.frameSeq[this.seqIdx];
      if (this.sprite.texture.has(String(f))) this.sprite.setFrame(f);
    }
    if (this.moving) {
      const m = this.moving;
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      this.sprite.setPosition(Math.round((m.fx + (m.tx - m.fx) * k) * TILE + 8), Math.round((m.fy + (m.ty - m.fy) * k) * TILE + TILE));
      this.sprite.setDepth(this.sprite.y);
      if (k >= 1) { this.tx = m.tx; this.ty = m.ty; this.moving = null; this.place(); }
      return;
    }
    if (this.behavior !== 'wander' && this.behavior !== 'graze') return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = (this.behavior === 'graze' ? 3000 : 1500) + Math.random() * 3500;
    const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
    const nx = this.tx + dx, ny = this.ty + dy;
    if (Math.abs(nx - this.homeX) > this.radius || Math.abs(ny - this.homeY) > this.radius) return;
    if (!canMove(nx, ny)) return;
    if (dx !== 0) this.sprite.setFlipX(dx < 0);
    this.moving = { fx: this.tx, fy: this.ty, tx: nx, ty: ny, t: 0, dur: this.behavior === 'graze' ? 700 : 380 };
  }

  target(): [number, number] { return this.moving ? [this.moving.tx, this.moving.ty] : [this.tx, this.ty]; }
  destroy(): void { this.sprite.destroy(); }
}

/** Pet que acompanha o jogador, ocupando o tile que ele acabou de deixar. */
export class PetFollower {
  sprite: Phaser.GameObjects.Sprite;
  tx: number;
  ty: number;
  moving: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number } | null = null;
  private animT = 0;
  private idleT = 0;

  constructor(scene: Phaser.Scene, key: string, public petId: string, tx: number, ty: number) {
    this.tx = tx;
    this.ty = ty;
    this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 1);
    this.place();
  }

  place(): void {
    this.sprite.setPosition(this.tx * TILE + 8, this.ty * TILE + TILE);
    this.sprite.setDepth(this.sprite.y - 1);
  }

  teleport(x: number, y: number): void {
    this.moving = null;
    this.tx = x;
    this.ty = y;
    this.place();
  }

  moveTo(x: number, y: number, dur: number): void {
    if (x === this.tx && y === this.ty) return;
    if (Math.abs(x - this.tx) + Math.abs(y - this.ty) > 2) { this.teleport(x, y); return; }
    if (x !== this.tx) this.sprite.setFlipX(x < this.tx);
    this.moving = { fx: this.tx, fy: this.ty, tx: x, ty: y, t: 0, dur };
  }

  tick(dt: number): void {
    this.animT += dt;
    if (this.moving) {
      const m = this.moving;
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      this.sprite.setPosition(Math.round((m.fx + (m.tx - m.fx) * k) * TILE + 8), Math.round((m.fy + (m.ty - m.fy) * k) * TILE + TILE));
      this.sprite.setDepth(this.sprite.y - 1);
      this.sprite.setFrame(Math.floor(this.animT / 110) % 2 === 0 ? 1 : 2);
      if (k >= 1) { this.tx = m.tx; this.ty = m.ty; this.moving = null; this.place(); this.sprite.setFrame(0); }
      return;
    }
    this.idleT += dt;
    const cycle = this.idleT % 2400;
    this.sprite.setFrame(cycle > 2000 ? (Math.floor(cycle / 140) % 2 === 0 ? 3 : 0) : 0);
  }

  target(): [number, number] { return this.moving ? [this.moving.tx, this.moving.ty] : [this.tx, this.ty]; }
  destroy(): void { this.sprite.destroy(); }
}
