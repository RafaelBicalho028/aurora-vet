// Prévia: mesmo visual, versão feminina e masculina lado a lado (sprites em todas as direções + retrato).
import { buildCharacterSheet, buildPortrait, lookFromAppearance, HAIR_STYLES, OUTFITS } from '../src/art/characters';
const out = document.getElementById('out')!;
function scaled(c: HTMLCanvasElement, scale: number) {
  const s = document.createElement('canvas'); s.width = c.width * scale; s.height = c.height * scale;
  const x = s.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, s.width, s.height); return s;
}
const params = new URLSearchParams(location.search);
const scale = Number(params.get('s') || 3);
HAIR_STYLES.forEach((hairStyle, i) => {
  const uniform = OUTFITS[i % OUTFITS.length];
  const row = document.createElement('div'); row.className = 'row';
  const label = document.createElement('b'); label.textContent = `${hairStyle} / ${uniform}`; row.appendChild(label);
  for (const sex of ['feminino', 'masculino'] as const) {
    const l = lookFromAppearance({ skin: i % 5, hairColor: i % 8, hairStyle, uniform, uniformColor: i % 6, glasses: false, sex });
    row.appendChild(scaled(buildCharacterSheet(l), scale));
    row.appendChild(scaled(buildPortrait(l, 'neutro'), scale));
  }
  out.appendChild(row);
});
(window as any).__ready = true;
