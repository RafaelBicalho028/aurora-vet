/**
 * Cena de exploração: renderiza o mapa, controla o jogador em grade, NPCs, animais,
 * interações, portas e transições entre ambientes.
 */
import { syncDynamicActors } from '../world/dynamicActors';
import Phaser from 'phaser';
import { app, requireState } from '../core/context';
import { bus, Events } from '../core/EventBus';
import type { Direction } from '../core/types';
import { getMap } from '../world/maps';
import type { InteractionDef, MapDef } from '../world/mapTypes';
import { buildCollision, implicitObjects, key, type CollisionInfo } from '../world/MapBuilder';
import { buildingTexture, groundTexture, objectTexture, OBJECTS, petTexture, registerCharacter } from '../art/TextureFactory';
import { lookFromAppearance } from '../art/characters';
import { TILE } from '../art/tiles';
import { cameraBounds, computeZoom } from '../core/viewport';
import { AnimalEntity, DIR_VEC, faceToward, NpcEntity, PetFollower, Walker } from '../world/entities';
import { BREED_MAP } from '../content/pets';
import { NPCS, ANIMALS } from '../content/npcs';
import { runDialogue, showLines } from '../ui/DialogueBox';
import { ui } from '../ui/UIManager';
import { Hud } from '../ui/Hud';
import { openMenu } from '../ui/MenuScreen';
import type { Action } from '../core/InputManager';

export interface WorldData { mapId: string; x: number; y: number; facing: Direction; fromTransition?: boolean }

/** Objetivos concluídos ao entrar em mapas. */
const MAP_ENTER_OBJECTIVES: Record<string, [string, string][]> = {
  anatomia: [['q_boas_vindas', 'o_lab']],
  hospital: [['q_biosseguranca', 'o_hospital']],
  vila: [['q_vila_chegada', 'o_vila']],
};

let petReminderShown = false;
const WALK_MS = 190;
const RUN_MS = 115;

export class WorldScene extends Phaser.Scene {
  private map!: MapDef;
  private col!: CollisionInfo;
  private player!: Walker;
  private npcs: NpcEntity[] = [];
  private animals: AnimalEntity[] = [];
  private pet: PetFollower | null = null;
  private hud!: Hud;
  private transitioning = false;
  private busy = false;
  private turnTimer = 0;
  private lastDir: Direction | null = null;
  private bumpCooldown = 0;
  private saveTimer = 0;
  private offs: (() => void)[] = [];

  constructor() { super('World'); }

  create(data: WorldData): void {
    const st = requireState();
    this.map = getMap(data.mapId);
    this.transitioning = false;
    this.busy = false;
    this.npcs = [];
    this.animals = [];
    this.pet = null;

    st.data.player.mapId = data.mapId;
    st.data.player.x = data.x;
    st.data.player.y = data.y;
    st.data.player.facing = data.facing;

    this.col = buildCollision(this.map, (c) => st.check(c));
    this.add.image(0, 0, groundTexture(this, this.map)).setOrigin(0, 0).setDepth(-10000);

    // prédios
    for (const b of this.map.buildings) {
      this.add.image(b.x * TILE, b.y * TILE, buildingTexture(this, this.map, b)).setOrigin(0, 0).setDepth((b.y + b.h) * TILE - 1);
    }
    // objetos explícitos e implícitos
    const placeObj = (type: string, x: number, y: number, seed: number) => {
      const art = OBJECTS[type];
      const tex = objectTexture(this, type, seed);
      const px = x * TILE + (art.offsetX ?? 0);
      const py = (y + 1) * TILE - art.h;
      const img = this.add.image(px, py, tex).setOrigin(0, 0);
      img.setDepth(art.flat ? -5000 : (y + 1) * TILE - 2);
    };
    for (const o of implicitObjects(this.map)) placeObj(o.type, o.x, o.y, o.seed);
    for (const o of this.map.objects) if (!o.presentWhen || st.check(o.presentWhen)) placeObj(o.type, o.x, o.y, o.seed ?? o.x * 31 + o.y);

    // jogador
    registerCharacter(this, 'player', lookFromAppearance(st.data.player.appearance));
    this.player = new Walker(this, 'player', data.x, data.y, data.facing);

    this.spawnActors();
    this.spawnPet();

    // câmera
    const cam = this.cameras.main;
    this.fitCamera();
    const onResize = () => this.fitCamera();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    cam.setBackgroundColor(this.map.kind === 'indoor' ? '#1a1524' : '#2f5d2b');
    cam.startFollow(this.player.sprite, true, 0.2, 0.2, 0, 8);
    cam.setRoundPixels(true);
    cam.fadeIn(280, 0, 0, 0);

    // HUD
    this.hud = new Hud((a) => this.onHotkey(a));
    ui().hudLayer.appendChild(this.hud.el);
    this.hud.setLocation(this.map.name);
    ui().worldActive = true;
    ui().setHotkeys((a) => this.onHotkey(a));

    app.audio.play(this.map.music);

    for (const [q, o] of MAP_ENTER_OBJECTIVES[this.map.id] ?? []) st.completeObjective(q, o);
    this.remindPetCare();

    this.offs.push(bus.on(Events.WorldRefresh, () => this.refreshActors()));
    this.offs.push(bus.on('pets:changed', () => this.spawnPet()));
    this.offs.push(bus.on(Events.QuestUpdated, () => this.refreshActors()));
    this.events.once('shutdown', () => this.cleanup());
    st.save();
  }

  /** Lembrete de cuidados pendentes do pet (no início da sessão e ao entrar no hospital). */
  private remindPetCare(): void {
    const st = requireState();
    const comp = st.companion();
    if (!comp) return;
    const due = st.petDue(comp.id);
    if (!due.length) return;
    if (petReminderShown && this.map.id !== 'hospital') return;
    petReminderShown = true;
    const names = due.slice(0, 2).map((i) => i.name.split(' (')[0].split(',')[0].toLowerCase()).join(' e ');
    const where = this.map.id === 'hospital' ? 'Fale com a Carla, na recepção, para a consulta preventiva.' : 'Leve seu pet ao Hospital Veterinário.';
    this.time.delayedCall(900, () => bus.emit(Events.Toast, { text: `${comp.name} tem ${due.length} cuidado(s) pendente(s), como ${names}. ${where}`, kind: 'dex', icon: '🐾' }));
  }

  /** Ajusta zoom e limites da câmera ao tamanho atual da tela. */
  private fitCamera(): void {
    const cam = this.cameras.main;
    const zoom = computeZoom(this.scale.width, this.scale.height);
    cam.setZoom(zoom);
    const b = cameraBounds(this.map.width * TILE, this.map.height * TILE, this.scale.width / zoom, this.scale.height / zoom);
    cam.setBounds(b.x, b.y, b.w, b.h);
  }

  private cleanup(): void {
    this.offs.forEach((o) => o());
    this.offs = [];
    this.hud?.destroy();
    ui().worldActive = false;
    ui().setHotkeys(null);
  }

  // ------------------------------------------------------------ atores
  private spawnActors(): void {
    const st = requireState();
    syncDynamicActors(st);
    for (const n of NPCS) {
      if (n.map !== this.map.id || !st.check(n.visibleWhen)) continue;
      const k = `npc_${n.id}`;
      if (!this.textures.exists(k)) registerCharacter(this, k, n.look);
      this.npcs.push(new NpcEntity(this, k, n.id, n.x, n.y, n.facing, n.wander ?? 0));
    }
    for (const a of ANIMALS) {
      if (a.map !== this.map.id || !st.check(a.visibleWhen)) continue;
      if (a.sprite.startsWith('pet_')) petTexture(this, a.sprite.slice(4));
      this.animals.push(new AnimalEntity(this, a.id, a.sprite, a.x, a.y, a.behavior, a.wander ?? 0, !!a.flip));
    }
  }

  /** Atualiza NPCs/animais que dependem do progresso (ex.: tutora da Mimi aparece). */
  private refreshActors(): void {
    if (!this.scene.isActive()) return;
    const st = requireState();
    syncDynamicActors(st);
    const wantNpc = new Set(NPCS.filter((n) => n.map === this.map.id && st.check(n.visibleWhen)).map((n) => n.id));
    const wantAnimal = new Set(ANIMALS.filter((a) => a.map === this.map.id && st.check(a.visibleWhen)).map((a) => a.id));
    const haveNpc = new Set(this.npcs.map((n) => n.id));
    const haveAnimal = new Set(this.animals.map((a) => a.id));
    if ([...wantNpc].every((i) => haveNpc.has(i)) && [...wantAnimal].every((i) => haveAnimal.has(i)) && wantNpc.size === haveNpc.size && wantAnimal.size === haveAnimal.size) return;
    this.npcs.forEach((n) => n.destroy());
    this.animals.forEach((a) => a.destroy());
    this.npcs = [];
    this.animals = [];
    this.spawnActors();
    // garante que nenhum ator surgiu sobre o jogador
    this.npcs = this.npcs.filter((n) => { if (n.tx === this.player.tx && n.ty === this.player.ty) { n.destroy(); return false; } return true; });
  }

  // ------------------------------------------------------------ colisão
  private inBounds(x: number, y: number) { return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height; }

  private occupied(x: number, y: number, ignore?: unknown): boolean {
    for (const n of this.npcs) {
      if (n === ignore) continue;
      if ((n.tx === x && n.ty === y) || (n.moving && n.moving.tx === x && n.moving.ty === y)) return true;
    }
    for (const a of this.animals) {
      if (a === ignore) continue;
      const [tx, ty] = a.target();
      if ((a.tx === x && a.ty === y) || (tx === x && ty === y)) return true;
    }
    return false;
  }

  private walkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && !this.col.blocked[y][x];
  }

  /** Cria (ou remove) o pet que acompanha o jogador, atrás dele quando possível. */
  private spawnPet(): void {
    const want = requireState().data.pets.companion;
    if (this.pet && this.pet.petId === want) return; // mesmo companheiro: mantém a posição
    this.pet?.destroy();
    this.pet = null;
    const comp = requireState().companion();
    if (!comp || !BREED_MAP[comp.breed]) return;
    const [dx, dy] = DIR_VEC[this.player.facing];
    const bx = this.player.tx - dx, by = this.player.ty - dy;
    const ok = this.walkable(bx, by) && !this.occupied(bx, by) && !this.col.warps.has(key(bx, by));
    this.pet = new PetFollower(this, petTexture(this, comp.breed), comp.id, ok ? bx : this.player.tx, ok ? by : this.player.ty);
    this.pet.sprite.setFlipX(dx < 0);
  }

  private canActorMove(x: number, y: number, self: unknown): boolean {
    if (!this.walkable(x, y) || this.occupied(x, y, self)) return false;
    if (this.pet) { const [qx, qy] = this.pet.target(); if ((qx === x && qy === y) || (this.pet.tx === x && this.pet.ty === y)) return false; }
    const [px, py] = this.player.target();
    if ((px === x && py === y) || (this.player.tx === x && this.player.ty === y)) return false;
    if (this.col.warps.has(key(x, y)) || this.col.doors.has(key(x, y))) return false;
    return true;
  }

  // ------------------------------------------------------------ loop
  update(_t: number, dt: number): void {
    const blocking = ui().isBlocking() || this.busy || this.transitioning;
    for (const n of this.npcs) n.tick(dt, (x, y) => this.canActorMove(x, y, n), blocking);
    for (const a of this.animals) a.tick(dt, (x, y) => this.canActorMove(x, y, a));
    this.pet?.tick(dt);

    this.saveTimer += dt;
    if (this.saveTimer > 60000) { this.saveTimer = 0; requireState().save(); }
    requireState().data.stats.playTimeSec += dt / 1000;

    if (this.player.moving) {
      if (this.player.update(dt)) this.onArrive();
      return;
    }
    if (blocking) { app.input.consumeTap(); this.hud.setHint(null); return; }

    this.bumpCooldown -= dt;
    const dir = app.input.direction();
    const tap = app.input.consumeTap();
    if (!dir) {
      // toque rápido (tecla já solta): apenas vira o personagem
      if (tap && tap !== this.player.facing) this.player.setFacing(tap);
      this.lastDir = null;
      this.turnTimer = 0;
      this.updateHint();
      return;
    }

    if (dir !== this.player.facing && this.lastDir !== dir) {
      // toque rápido apenas vira o personagem
      this.player.setFacing(dir);
      this.lastDir = dir;
      this.turnTimer = 85;
      return;
    }
    this.lastDir = dir;
    if (this.turnTimer > 0) { this.turnTimer -= dt; return; }
    this.tryMove(dir);
  }

  private tryMove(dir: Direction): void {
    const [dx, dy] = DIR_VEC[dir];
    const nx = this.player.tx + dx, ny = this.player.ty + dy;
    if (this.walkable(nx, ny) && !this.occupied(nx, ny)) {
      const dur = app.input.isHeld('run') ? RUN_MS : WALK_MS;
      const fromX = this.player.tx, fromY = this.player.ty;
      this.player.startMove(dir, dur);
      this.pet?.moveTo(fromX, fromY, dur);
      requireState().data.stats.steps++;
    } else {
      this.player.setFacing(dir);
      if (this.bumpCooldown <= 0) { app.audio.sfx('bump'); this.bumpCooldown = 350; }
    }
  }

  private onArrive(): void {
    const st = requireState();
    st.data.player.x = this.player.tx;
    st.data.player.y = this.player.ty;
    st.data.player.facing = this.player.facing;
    const w = this.col.warps.get(key(this.player.tx, this.player.ty));
    if (w) this.warp(w.map, w.x, w.y, w.facing);
  }

  warp(mapId: string, x: number, y: number, facing: Direction): void {
    if (this.transitioning) return;
    this.transitioning = true;
    app.audio.sfx('door');
    const st = requireState();
    st.data.player.mapId = mapId;
    st.data.player.x = x;
    st.data.player.y = y;
    st.data.player.facing = facing;
    st.save();
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ mapId, x, y, facing, fromTransition: true } satisfies WorldData);
    });
  }

  // ------------------------------------------------------------ interação
  private facingTile(): [number, number] {
    const [dx, dy] = DIR_VEC[this.player.facing];
    return [this.player.tx + dx, this.player.ty + dy];
  }

  private findTarget(): { kind: 'npc'; npc: NpcEntity } | { kind: 'animal'; animal: AnimalEntity } | { kind: 'pet'; pet: PetFollower } | { kind: 'interaction'; def: InteractionDef; k: string } | { kind: 'door'; message: string } | null {
    let [x, y] = this.facingTile();
    if (this.pet && !this.pet.moving && this.pet.tx === x && this.pet.ty === y) return { kind: 'pet', pet: this.pet };
    const at = (xx: number, yy: number) => {
      const npc = this.npcs.find((n) => n.tx === xx && n.ty === yy && !n.moving);
      if (npc) return { kind: 'npc' as const, npc };
      const animal = this.animals.find((a) => a.tx === xx && a.ty === yy);
      if (animal) return { kind: 'animal' as const, animal };
      return null;
    };
    const direct = at(x, y);
    if (direct) return direct;
    const k = key(x, y);
    const inter = this.col.interactions.get(k);
    const door = this.col.doors.get(k);
    if (door?.door.locked && this.col.blocked[y]?.[x]) return { kind: 'door', message: door.door.locked.message };
    if (inter) return { kind: 'interaction', def: inter, k };
    if (this.inBounds(x, y) && this.col.talkThrough[y][x]) {
      // balcões e cercas: permite interagir com quem está do outro lado (até 4 tiles em linha reta)
      const [dx, dy] = DIR_VEC[this.player.facing];
      for (let k = 0; k < 4; k++) {
        x += dx; y += dy;
        if (!this.inBounds(x, y)) break;
        const beyond = at(x, y);
        if (beyond) return beyond;
        if (this.col.blocked[y][x] && !this.col.talkThrough[y][x]) break;
      }
    }
    return null;
  }

  private updateHint(): void {
    const t = this.findTarget();
    if (!t) { this.hud.setHint(null); return; }
    const label = t.kind === 'npc' ? 'Conversar' : t.kind === 'animal' ? 'Observar' : t.kind === 'pet' ? 'Fazer carinho' : 'Examinar';
    const keyName = document.body.classList.contains('touch-ui') ? 'A' : app.settings.keybinds.interact?.[0]?.replace('Key', '') ?? 'E';
    this.hud.setHint(`${keyName} — ${label}`);
  }

  private async interact(): Promise<void> {
    if (this.busy || this.player.moving || ui().isBlocking()) return;
    const t = this.findTarget();
    if (!t) return;
    this.busy = true;
    this.hud.setHint(null);
    try {
      if (t.kind === 'npc') {
        t.npc.setFacing(faceToward(t.npc.tx, t.npc.ty, this.player.tx, this.player.ty));
        const def = NPCS.find((n) => n.id === t.npc.id)!;
        await runDialogue(def.dialogue, def.id);
      } else if (t.kind === 'animal') {
        const def = ANIMALS.find((a) => a.id === t.animal.id)!;
        await this.runInteraction(def.interact, `animal.${def.id}`);
      } else if (t.kind === 'pet') {
        await this.petThePet(t.pet);
      } else if (t.kind === 'door') {
        app.audio.sfx('error');
        await showLines([t.message]);
      } else {
        await this.runInteraction(t.def, `${this.map.id}.${t.k}`);
      }
    } finally {
      this.busy = false;
      this.refreshActors();
    }
  }

  private async petThePet(pet: PetFollower): Promise<void> {
    const st = requireState();
    const rec = st.data.pets.owned.find((p) => p.id === pet.petId);
    if (!rec) return;
    const breed = BREED_MAP[rec.breed];
    pet.sprite.setFlipX(this.player.tx < pet.tx);
    const heart = this.add.image(pet.sprite.x, pet.sprite.y - 18, 'heart').setDepth(100000);
    this.tweens.add({ targets: heart, y: heart.y - 14, alpha: 0, duration: 900, onComplete: () => heart.destroy() });
    app.audio.sfx('unlock');
    const aff = st.petAffection(rec.id);
    const mood = aff >= 8 ? 'está radiante ao seu lado' : aff >= 4 ? 'parece muito feliz' : 'gostou do carinho';
    const tip = Math.random() < 0.5 ? `Você sabia? ${breed.fact}` : `Cuidado do dia: ${breed.care}`;
    await showLines([`${rec.name} ${mood}! ❤`, tip]);
  }

  private async runInteraction(def: InteractionDef, onceKey: string): Promise<void> {
    const st = requireState();
    if (def.when && !st.check(def.when)) {
      if (def.otherwise) await this.runInteraction(def.otherwise, onceKey + '.alt');
      return;
    }
    if (def.dialogue) await runDialogue(def.dialogue);
    else await showLines(def.lines ?? [], def.effects, onceKey);
    if (def.dialogue && def.effects) st.apply(def.effects, onceKey);
  }

  private onHotkey(a: Action): void {
    if (this.transitioning) return;
    switch (a) {
      case 'interact': void this.interact(); break;
      case 'menu': openMenu('mochila', true); break;
      case 'inventory': openMenu('mochila'); break;
      case 'map': openMenu('mapa'); break;
      case 'vetidex': openMenu('vetidex'); break;
      case 'journal': openMenu('diario'); break;
      case 'performance': openMenu('desempenho'); break;
      default: break;
    }
  }
}
