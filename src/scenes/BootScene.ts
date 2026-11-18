/** Gera as texturas procedurais e segue para a tela de título. */
import Phaser from 'phaser';
import { registerStatic } from '../art/TextureFactory';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    registerStatic(this);
    document.getElementById('boot-loading')?.remove();
    this.scene.start('Title');
  }
}
