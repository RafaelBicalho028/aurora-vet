/** Fluxo de início de partida (novo jogo / continuar). */
import { app, requireState } from './context';
import type { WorldData } from '../scenes/WorldScene';
import { showLines } from '../ui/DialogueBox';

export const VIEW_W = 480;
export const VIEW_H = 270;

/** Inicia a cena do mundo a partir do estado atual. */
export function startGame(isNew: boolean): void {
  const st = requireState();
  const p = st.data.player;
  const g = app.game!;
  g.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'World') s.scene.stop(); });
  g.scene.start('World', { mapId: p.mapId, x: p.x, y: p.y, facing: p.facing } satisfies WorldData);
  if (isNew) {
    st.startQuest('q_boas_vindas');
    st.save();
    setTimeout(() => {
      void showLines([
        'Universidade Veterinária de Aurora — primeiro dia do primeiro período.',
        'Você, {nome}, acaba de ingressar no curso de Medicina Veterinária. Pela frente: anatomia, fisiologia, biossegurança... e muitos animais que vão precisar do seu cuidado.',
        'No VetQuest, níveis e etapas representam seu progresso de estudos — não uma habilitação profissional. Todo atendimento é feito sob supervisão.',
        'Use WASD ou as setas para andar, E para interagir, Shift para correr e Esc para o menu. Procure o Lucas na avenida central!',
      ]);
    }, 450);
  }
}

