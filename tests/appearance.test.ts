import { describe, expect, it } from 'vitest';
import { genderize } from '../src/core/genderize';
import { frameTemplate, HAIR_STYLES, lookFromAppearance, OUTFITS, PATTERNS, PATTERN_COLORS, HAIR_COLORS } from '../src/art/characters';
import type { Appearance } from '../src/core/types';

const base: Appearance = { skin: 1, hairColor: 1, hairStyle: 'curto', uniform: 'pijama', uniformColor: 0, glasses: false };
const VALID = /^[.HhLSsEOGCcUTPpBKkMRrQZz]{16}$/;
const dirs = ['down', 'up', 'right'] as const;

describe('aparência do personagem', () => {
  it('todas as combinações de cabelo, roupa, estampa e sexo geram quadros 16x24 válidos', () => {
    for (const hairStyle of HAIR_STYLES) for (const uniform of OUTFITS) for (const pattern of PATTERNS) for (const sex of ['feminino', 'masculino', undefined] as const) {
      const look = lookFromAppearance({ ...base, hairStyle, uniform, pattern, sex });
      for (const d of dirs) for (const step of [0, 1, 2] as const) {
        const rows = frameTemplate(look, d, step);
        expect(rows).toHaveLength(24);
        for (const r of rows) expect(r).toMatch(VALID);
      }
    }
  });

  it('cada estilo de cabelo é visualmente distinto', () => {
    const seen = new Set<string>();
    for (const hairStyle of HAIR_STYLES) {
      const look = lookFromAppearance({ ...base, hairStyle });
      seen.add(dirs.map((d) => frameTemplate(look, d, 0).join('')).join('|'));
    }
    expect(seen.size).toBe(HAIR_STYLES.length);
  });

  it('estampas alteram pixels da roupa (exceto liso) e respeitam o jaleco', () => {
    const liso = frameTemplate(lookFromAppearance({ ...base, pattern: 'liso' }), 'down', 0).join('');
    expect(liso).not.toMatch(/[Zz]/);
    for (const p of PATTERNS.filter((x) => x !== 'liso')) {
      const rows = frameTemplate(lookFromAppearance({ ...base, pattern: p }), 'down', 0);
      expect(rows.join(''), p).toMatch(/[Zz]/);
      // nada da estampa fora do tronco
      rows.forEach((r, y) => { if (y < 14 || y > 20) expect(r).not.toMatch(/[Zz]/); });
    }
    // no jaleco, a estampa fica só na roupa de baixo: a parte branca (C) não muda
    const coat = frameTemplate(lookFromAppearance({ ...base, uniform: 'jaleco', pattern: 'listras' }), 'down', 0).join('');
    const coatPlain = frameTemplate(lookFromAppearance({ ...base, uniform: 'jaleco' }), 'down', 0).join('');
    expect(coat.split('').filter((c) => c === 'C').length).toBe(coatPlain.split('').filter((c) => c === 'C').length);
    expect(coat).toMatch(/Z/);
  });

  it('sexo muda traços do rosto; saves antigos (sem sexo) continuam funcionando', () => {
    const f = frameTemplate(lookFromAppearance({ ...base, sex: 'feminino' }), 'down', 0).join('');
    const m = frameTemplate(lookFromAppearance({ ...base, sex: 'masculino' }), 'down', 0).join('');
    const n = frameTemplate(lookFromAppearance(base), 'down', 0).join('');
    expect(f).not.toBe(m);
    expect(f).not.toBe(n);
    expect(lookFromAppearance(base).pattern).toBe('liso');
  });

  it('feminino e masculino têm silhuetas diferentes em todas as direções e passos (não só o rosto)', () => {
    for (const uniform of OUTFITS) for (const d of dirs) for (const step of [0, 1, 2] as const) {
      const f = frameTemplate(lookFromAppearance({ ...base, uniform, sex: 'feminino' }), d, step);
      const m = frameTemplate(lookFromAppearance({ ...base, uniform, sex: 'masculino' }), d, step);
      const bodyDiff = f.slice(14, 21).join('') !== m.slice(14, 21).join('');
      expect(bodyDiff, `${uniform} ${d} ${step}`).toBe(true);
    }
  });

  it('feminino tem laço no cabelo e bochechas rosadas; masculino tem ombros mais largos', () => {
    const f = frameTemplate(lookFromAppearance({ ...base, sex: 'feminino' }), 'down', 0);
    const m = frameTemplate(lookFromAppearance({ ...base, sex: 'masculino' }), 'down', 0);
    expect(f.slice(0, 14).join('')).toMatch(/R/);
    expect(f.join('')).toMatch(/Q/);
    expect(m.join('')).not.toMatch(/[RQ]/);
    const width = (r: string) => r.replace(/^\.+|\.+$/g, '').length;
    expect(width(m[15])).toBeGreaterThan(width(f[15]));
    expect(width(f[20])).toBeGreaterThan(width(m[20]));
  });

  it('roupas têm visual próprio e índices de cor fora da paleta caem no padrão', () => {
    const looks = OUTFITS.map((uniform) => lookFromAppearance({ ...base, uniform }));
    expect(new Set(looks.map((l) => `${l.top}|${l.pants}|${l.shortSleeves}|${l.pocket}`)).size).toBe(OUTFITS.length);
    const l = lookFromAppearance({ ...base, hairColor: 99, patternColor: 99, pattern: 'bolinhas' });
    expect(l.hair).toBe(HAIR_COLORS[0]);
    expect(l.patternColor).toBe(PATTERN_COLORS[0]);
  });
});

describe('concordância de gênero', () => {
  const t = 'Bem-vindo(a)! Você é o(a) estudante? Está pronto(a)? Obrigado(a). Um(a) médico(a)-veterinário(a) revisa; tutor(a) e doutor(a).';
  it('feminino', () => {
    expect(genderize(t, 'feminino')).toBe('Bem-vinda! Você é a estudante? Está pronta? Obrigada. Um(a) médico(a)-veterinário(a) revisa; tutor(a) e doutora.');
  });
  it('masculino', () => {
    expect(genderize(t, 'masculino')).toBe('Bem-vindo! Você é o estudante? Está pronto? Obrigado. Um(a) médico(a)-veterinário(a) revisa; tutor(a) e doutor.');
  });
  it('sem sexo definido mantém a forma neutra', () => {
    expect(genderize(t, undefined)).toBe(t);
  });
});
