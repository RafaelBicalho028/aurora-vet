import { buildCharacterSheet, buildPortrait, lookFromAppearance } from '../src/art/characters';
import { buildAllAnimals } from '../src/art/animals';
const out = document.getElementById('out')!;
function show(c: HTMLCanvasElement, scale = 4, label = '') {
  const s = document.createElement('canvas'); s.width = c.width * scale; s.height = c.height * scale;
  const x = s.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, s.width, s.height);
  const d = document.createElement('div'); d.textContent = label; d.appendChild(s); out.appendChild(d);
}
const looks = [
  lookFromAppearance({ skin: 1, hairColor: 1, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false }),
  lookFromAppearance({ skin: 3, hairColor: 0, hairStyle: 'cacheado', uniform: 'pijama', uniformColor: 1, glasses: true }),
  lookFromAppearance({ skin: 0, hairColor: 4, hairStyle: 'coque', uniform: 'jaleco', uniformColor: 3, glasses: false }),
  lookFromAppearance({ skin: 4, hairColor: 0, hairStyle: 'longo', uniform: 'pijama', uniformColor: 5, glasses: false }),
  { ...lookFromAppearance({ skin: 2, hairColor: 5, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 2, glasses: true }), beard: true },
  { ...lookFromAppearance({ skin: 2, hairColor: 0, hairStyle: 'curto', uniform: 'pijama', uniformColor: 0, glasses: false }), hat: '#d8b25a', top:'#7a8a4a', accent:null },
];
const extra = [
  lookFromAppearance({ skin: 1, hairColor: 6, hairStyle: 'rabo', uniform: 'camiseta', uniformColor: 2, glasses: false, sex: 'feminino', pattern: 'coracoes', patternColor: 0 }),
  lookFromAppearance({ skin: 3, hairColor: 0, hairStyle: 'raspado', uniform: 'moletom', uniformColor: 4, glasses: false, sex: 'masculino', pattern: 'listras', patternColor: 1 }),
  lookFromAppearance({ skin: 2, hairColor: 3, hairStyle: 'trancas', uniform: 'pijama', uniformColor: 1, glasses: true, sex: 'feminino', pattern: 'patinhas', patternColor: 0 }),
  lookFromAppearance({ skin: 0, hairColor: 7, hairStyle: 'chanel', uniform: 'jaleco', uniformColor: 3, glasses: false, sex: 'feminino', pattern: 'bolinhas', patternColor: 0 }),
  lookFromAppearance({ skin: 4, hairColor: 1, hairStyle: 'curto', uniform: 'camiseta', uniformColor: 0, glasses: false, sex: 'masculino', pattern: 'xadrez', patternColor: 4 }),
  lookFromAppearance({ skin: 1, hairColor: 2, hairStyle: 'longo', uniform: 'moletom', uniformColor: 5, glasses: false, sex: 'masculino', pattern: 'cruz', patternColor: 0 }),
];
extra.forEach((l, i) => { show(buildCharacterSheet(l), 5, 'novo ' + i); show(buildPortrait(l, 'neutro'), 5, ''); });
looks.forEach((l, i) => { show(buildCharacterSheet(l), 4, 'char ' + i); });
looks.slice(0,3).forEach((l) => { (['neutro','feliz','preocupado','surpreso'] as const).forEach(e => show(buildPortrait(l, e), 5, e)); });
buildAllAnimals().forEach(a => show(a.canvas, 5, a.key));
(window as any).__ready = true;
