/**
 * Contexto global da sessão: estado do jogo, salvamento, configurações, entrada e áudio.
 * Mantém a integração entre as cenas do Phaser e a interface DOM.
 */
import type Phaser from 'phaser';
import { SaveManager } from './SaveManager';
import { GameState } from './GameState';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import type { Settings } from './types';

export interface AppContext {
  saver: SaveManager;
  settings: Settings;
  input: InputManager;
  audio: AudioManager;
  state: GameState | null;
  game: Phaser.Game | null;
}

const saver = new SaveManager();
const settings = saver.loadSettings();

export const app: AppContext = {
  saver,
  settings,
  input: new InputManager(settings.keybinds),
  audio: new AudioManager(),
  state: null,
  game: null,
};
app.audio.setVolumes(settings.musicVolume, settings.sfxVolume);

export function saveSettings(): void {
  app.saver.saveSettings(app.settings);
  app.input.setBinds(app.settings.keybinds);
  app.audio.setVolumes(app.settings.musicVolume, app.settings.sfxVolume);
}

export function requireState(): GameState {
  if (!app.state) throw new Error('Estado de jogo não inicializado');
  return app.state;
}
