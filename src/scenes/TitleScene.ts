/** Tela de título: o campus ao fundo, com câmera panorâmica e animais animados. */
import Phaser from 'phaser';
import { app } from '../core/context';
import { getMap } from '../world/maps';
import { buildingTexture, groundTexture, objectTexture, OBJECTS } from '../art/TextureFactory';
import { implicitObjects } from '../world/MapBuilder';
import { TILE } from '../art/tiles';
import { computeZoom } from '../core/viewport';
import { AnimalEntity } from '../world/entities';
import { ui, type Modal } from '../ui/UIManager';
import { showTitle } from '../ui/TitleMenu';
import { GameState } from '../core/GameState';
import { startGame } from '../core/flow';

export class TitleScene extends Phaser.Scene {
  private modal: Modal | null = null;
  private animals: AnimalEntity[] = [];
  private t = 0;

  constructor() { super('Title'); }

  create(): void {
    const map = getMap('campus');
    this.add.image(0, 0, groundTexture(this, map)).setOrigin(0, 0).setDepth(-10000);
    for (const b of map.buildings) this.add.image(b.x * TILE, b.y * TILE, buildingTexture(this, map, b)).setOrigin(0, 0).setDepth((b.y + b.h) * TILE - 1);
    const place = (type: string, x: number, y: number, seed: number) => {
      const art = OBJECTS[type];
      this.add.image(x * TILE + (art.offsetX ?? 0), (y + 1) * TILE - art.h, objectTexture(this, type, seed)).setOrigin(0, 0).setDepth(art.flat ? -5000 : (y + 1) * TILE - 2);
    };
    for (const o of implicitObjects(map)) place(o.type, o.x, o.y, o.seed);
    for (const o of map.objects) place(o.type, o.x, o.y, o.seed ?? o.x * 31 + o.y);
    this.animals = [
      new AnimalEntity(this, 'a1', 'cow', 34, 5, 'graze', 0, false),
      new AnimalEntity(this, 'a2', 'sheep', 37, 4, 'graze', 0, false),
      new AnimalEntity(this, 'a3', 'dog_campus', 19, 16, 'idle', 0, false),
    ];
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.width * TILE, map.height * TILE);
    const fit = () => cam.setZoom(computeZoom(this.scale.width, this.scale.height));
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));
    cam.setScroll(10 * TILE, 4 * TILE);
    cam.fadeIn(500);

    app.state = null;
    ui().closeAll();
    this.modal = showTitle({
      onContinue: () => {
        const data = app.saver.load();
        if (!data) return;
        app.state = new GameState(data, app.saver);
        this.leave(() => startGame(false));
      },
      onNewGame: (state) => {
        app.state = state;
        this.leave(() => startGame(true));
      },
    });
    app.audio.play('title');
    this.events.once('shutdown', () => { if (this.modal) ui().close(this.modal); this.modal = null; });
  }

  private leave(next: () => void): void {
    if (this.modal) ui().close(this.modal);
    this.modal = null;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', next);
  }

  update(_t: number, dt: number): void {
    this.t += dt;
    const cam = this.cameras.main;
    cam.centerOn(22 * TILE + Math.sin(this.t / 9000) * 9 * TILE, 15 * TILE + Math.sin(this.t / 13000) * 6 * TILE);
    for (const a of this.animals) a.tick(dt, () => false);
  }
}
