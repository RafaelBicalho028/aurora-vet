// Prévia: mesmo visual, versão feminina e masculina lado a lado (frente, lado, costas, passo e retrato).
// ?s=escala  ?all=1 mostra a folha inteira
import { buildCharacterSheet, buildPortrait, lookFromAppearance, HAIR_STYLES, OUTFITS, FRAME_W, FRAME_H } from '../src/art/characters';
const out = document.getElementById('out')!;
const params = new URLSearchParams(location.search);
const scale = Number(params.get('s') || 3);
function scaled(c: HTMLCanvasElement, sx = 0, sw = c.width) {
  const s = document.createElement('canvas'); s.width = sw * scale; s.height = c.height * scale;
  const x = s.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, sx, 0, sw, c.height, 0, 0, s.width, s.height); return s;
}
HAIR_STYLES.forEach((hairStyle, i) => {
  const uniform = OUTFITS[i % OUTFITS.length];
  const row = document.createElement('div'); row.className = 'row';
  const label = document.createElement('b'); label.textContent = `${hairStyle} / ${uniform}`; row.appendChild(label);
  for (const sex of ['feminino', 'masculino'] as const) {
    const l = lookFromAppearance({ skin: i % 5, hairColor: i % 8, hairStyle, uniform, uniformColor: i % 6, glasses: i === 6, sex });
    const sheet = buildCharacterSheet(l);
    if (params.get('all')) row.appendChild(scaled(sheet));
    else for (const f of [0, 1, 6, 9]) row.appendChild(scaled(sheet, f * FRAME_W, FRAME_W));
    row.appendChild(scaled(buildPortrait(l, sex === 'feminino' ? 'feliz' : 'neutro')));
  }
  out.appendChild(row);
});
void FRAME_H;
(window as any).__ready = true;
