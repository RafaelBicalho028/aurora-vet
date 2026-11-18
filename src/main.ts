/**
 * Ponto de entrada: inicializa o Phaser, a interface DOM e os sistemas globais.
 */
import Phaser from 'phaser';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import './styles/main.css';
import { app, applyTextSize } from './core/context';
import { bus } from './core/EventBus';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { VIEW_H, VIEW_W } from './core/flow';
import { initToasts } from './ui/Hud';
import { ui } from './ui/UIManager';
import { openCase } from './ui/CaseScreen';
import { openMinigame } from './ui/AnatomyGame';
import { openQuiz } from './ui/QuizSession';
import { openPetChooser } from './ui/PetChooser';
import { openPetCheckup } from './ui/PetCheckup';
import { openReview } from './ui/ReviewSession';
import { openLesson } from './ui/LessonViewer';
import { openMenu } from './ui/MenuScreen';
import { CASES, REFERENCE_MAP, VETIDEX } from './content';
import { validateCase } from './systems/cases/validateCase';

function boot(): void {
  // Validação do conteúdo em desenvolvimento (os testes automatizados cobrem o build).
  if (import.meta.env.DEV) {
    const ctx = { referenceIds: new Set(Object.keys(REFERENCE_MAP)), vetidexIds: new Set(VETIDEX.map((e) => e.id)) };
    for (const c of Object.values(CASES)) {
      const errs = validateCase(c, ctx);
      if (errs.length) console.error('[VetQuest] Caso clínico inválido:', errs);
    }
  }

  applyTextSize();
  ui();
  initToasts();
  bus.on('ui:startCase', (id: string) => openCase(id));
  bus.on('ui:startMinigame', (id: string) => openMinigame(id));
  bus.on('ui:startQuiz', (id: string) => openQuiz(id));
  bus.on('ui:adoptPet', () => openPetChooser());
  bus.on('ui:petCheckup', () => openPetCheckup());
  bus.on('ui:openReview', () => openReview());
  bus.on('ui:openLesson', (id: string) => openLesson(id));
  bus.on('ui:openPanel', (p: 'performance' | 'vetidex' | 'journal' | 'map' | 'inventory') => {
    const map = { performance: 'desempenho', vetidex: 'vetidex', journal: 'diario', map: 'mapa', inventory: 'mochila' } as const;
    openMenu(map[p]);
  });

  app.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: window.innerWidth || VIEW_W,
    height: window.innerHeight || VIEW_H,
    backgroundColor: '#1b1626',
    pixelArt: true,
    roundPixels: true,
    // RESIZE: ocupa a tela inteira em retrato ou paisagem; o zoom inteiro é aplicado pela câmera
    scale: { mode: Phaser.Scale.RESIZE },
    render: { antialias: false, powerPreference: 'low-power' },
    scene: [BootScene, TitleScene, WorldScene],
    input: { keyboard: false },
    audio: { noAudio: true },
    banner: false,
  });

  // salva ao fechar/ocultar a aba
  const persist = () => { if (app.state) app.state.save(); };
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
  document.addEventListener('pointerdown', () => app.audio.unlock(), { once: true });
  // ganchos de depuração/automação de testes (E2E)
  Object.assign(window as object, { __vetquest: app, __vetquestBus: bus });
}

boot();
