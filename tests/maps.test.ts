/**
 * Testes de mapas: colisões, transições e garantia de que o jogador não fica preso.
 * Faz busca em largura (BFS) a partir do ponto de chegada de cada mapa.
 */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/world/maps';
import { buildCollision, key, isDoorLocked } from '../src/world/MapBuilder';
import { LEGEND } from '../src/world/mapTypes';
import { NPCS, ANIMALS } from '../src/content/npcs';

type Pt = [number, number];
const DIRS: Pt[] = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/** BFS sobre tiles caminháveis; NPCs parados contam como obstáculos. */
function reachable(mapId: string, start: Pt, opts: { unlockAll?: boolean } = {}): Set<string> {
  const m = MAPS[mapId];
  const col = buildCollision(m, () => !opts.unlockAll);
  const npcTiles = new Set(NPCS.filter((n) => n.map === mapId && !n.wander).map((n) => key(n.x, n.y)));
  const seen = new Set<string>([key(...start)]);
  const q: Pt[] = [start];
  while (q.length) {
    const [x, y] = q.shift()!;
    if (col.warps.has(key(x, y)) && !(x === start[0] && y === start[1])) continue; // warps levam a outro mapa
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      const k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height || seen.has(k)) continue;
      if (col.blocked[ny][nx] || npcTiles.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('Estrutura dos mapas', () => {
  for (const m of Object.values(MAPS)) {
    it(`${m.id}: linhas com largura correta e caracteres conhecidos`, () => {
      expect(m.tiles.length).toBe(m.height);
      for (const row of m.tiles) {
        expect(row.length).toBe(m.width);
        for (const ch of row) expect(LEGEND[ch], `caractere desconhecido "${ch}"`).toBeDefined();
      }
    });
    it(`${m.id}: ponto de chegada é caminhável`, () => {
      const col = buildCollision(m, () => false);
      expect(col.blocked[m.spawn.y][m.spawn.x]).toBe(false);
    });
  }
});

describe('Transições entre ambientes', () => {
  const allWarps: { from: string; x: number; y: number; to: string; tx: number; ty: number }[] = [];
  for (const m of Object.values(MAPS)) {
    const col = buildCollision(m, () => false);
    for (const [k, w] of col.warps) {
      const [x, y] = k.split(',').map(Number);
      allWarps.push({ from: m.id, x, y, to: w.map, tx: w.x, ty: w.y });
    }
  }
  it('há transições entre o campus e cada interior, nos dois sentidos', () => {
    for (const interior of ['hospital', 'anatomia', 'biblioteca']) {
      expect(allWarps.some((w) => w.from === 'campus' && w.to === interior)).toBe(true);
      expect(allWarps.some((w) => w.from === interior && w.to === 'campus')).toBe(true);
    }
  });
  for (const w of allWarps) {
    it(`destino válido: ${w.from}(${w.x},${w.y}) → ${w.to}(${w.tx},${w.ty})`, () => {
      const dest = MAPS[w.to];
      expect(dest).toBeDefined();
      const col = buildCollision(dest, () => false);
      expect(col.blocked[w.ty][w.tx], 'destino bloqueado').toBe(false);
      expect(col.warps.has(key(w.tx, w.ty)), 'destino sobre outro warp (laço)').toBe(false);
      // a partir do destino, é possível alcançar uma saída e voltar
      const r = reachable(w.to, [w.tx, w.ty]);
      const exits = [...col.warps.keys()].filter((k) => r.has(k));
      expect(exits.length, 'jogador ficaria preso sem saída').toBeGreaterThan(0);
      // e o destino não está isolado (há espaço para se mover)
      expect(r.size).toBeGreaterThan(5);
    });
  }
});

describe('Ninguém fica preso / tudo é alcançável', () => {
  it('campus: todas as portas destrancáveis e a área principal são alcançáveis a partir do início', () => {
    const m = MAPS.campus;
    const r = reachable('campus', [m.spawn.x, m.spawn.y], { unlockAll: true });
    for (const b of m.buildings) for (const d of b.doors) {
      const front: Pt = [b.x + d.dx, b.y + b.h];
      expect(r.has(key(...front)), `frente da porta de ${b.name}`).toBe(true);
    }
  });

  it('portas trancadas exibem mensagem e portas com condição destrancam', () => {
    const m = MAPS.campus;
    const hosp = m.buildings.find((b) => b.id === 'hospital')!;
    expect(isDoorLocked(hosp.doors[0], () => true)).toBe(true);
    expect(isDoorLocked(hosp.doors[0], () => false)).toBe(false);
    expect(hosp.doors[0].locked!.message.length).toBeGreaterThan(10);
  });

  it('todos os prédios de disciplinas estão abertos e levam a uma sala com professor', () => {
    const buildings = [...MAPS.campus.buildings.filter((b) => b.id === 'aulas' || b.id === 'labs'), ...MAPS.institutos.buildings];
    expect(buildings.length).toBe(7);
    for (const b of buildings) {
      const door = b.doors[0];
      expect(isDoorLocked(door, () => false), b.id).toBe(false);
      expect(door.warp, b.id).toBeDefined();
      const room = door.warp!.map;
      expect(NPCS.some((n) => n.map === room && /^Prof/.test(n.name)), `${b.id}: professor em ${room}`).toBe(true);
    }
  });

  it('o Portão Sul fica fechado na Etapa 1 e leva à Vila dos Animais quando a Etapa 2 é liberada', () => {
    const fechado = buildCollision(MAPS.campus, () => true);   // condição "portão presente" verdadeira
    const aberto = buildCollision(MAPS.campus, () => false);
    for (const x of [20, 21, 22, 23]) {
      expect(fechado.blocked[33][x], `fechado ${x}`).toBe(true);
      expect(aberto.blocked[33][x], `aberto ${x}`).toBe(false);
      expect(aberto.warps.get(`${x},33`)?.map).toBe('vila');
    }
    const r = reachable('campus', [MAPS.campus.spawn.x, MAPS.campus.spawn.y], { unlockAll: true });
    expect([...r].some((k) => aberto.warps.get(k)?.map === 'vila')).toBe(true);
    const back = buildCollision(MAPS.vila, () => false);
    expect(back.warps.get('19,0')?.map).toBe('campus');
  });

  it('o Setor dos Institutos é alcançável a partir do campus pela avenida oeste', () => {
    const r = reachable('campus', [MAPS.campus.spawn.x, MAPS.campus.spawn.y], { unlockAll: false });
    const col = buildCollision(MAPS.campus, () => true);
    expect([...r].some((k) => col.warps.get(k)?.map === 'institutos')).toBe(true);
  });

  for (const n of NPCS) {
    it(`NPC ${n.name} é alcançável para conversa`, () => {
      const m = MAPS[n.map];
      const col = buildCollision(m, () => false);
      expect(col.blocked[n.y][n.x], 'NPC sobre tile bloqueado').toBe(false);
      const r = reachable(n.map, [m.spawn.x, m.spawn.y], { unlockAll: true });
      const ok = DIRS.some(([dx, dy]) => {
        if (r.has(key(n.x + dx, n.y + dy))) return true;
        // através de balcão
        const bx = n.x + dx, by = n.y + dy;
        return col.talkThrough[by]?.[bx] && r.has(key(bx + dx, by + dy));
      });
      expect(ok).toBe(true);
    });
  }

  for (const a of ANIMALS) {
    it(`animal ${a.name} pode ser observado`, () => {
      const m = MAPS[a.map];
      const col = buildCollision(m, () => false);
      expect(col.blocked[a.y][a.x], 'animal sobre tile bloqueado').toBe(false);
      const r = reachable(a.map, [m.spawn.x, m.spawn.y], { unlockAll: true });
      const ok = DIRS.some(([dx, dy]) => {
        if (r.has(key(a.x + dx, a.y + dy))) return true;
        // por cima de cerca/balcão: até 4 tiles em linha reta
        for (let k = 1; k <= 4; k++) {
          const fx = a.x + dx * k, fy = a.y + dy * k;
          if (col.talkThrough[fy]?.[fx] && r.has(key(fx + dx, fy + dy))) return true;
        }
        return false;
      });
      expect(ok).toBe(true);
    });
  }

  for (const m of Object.values(MAPS)) {
    it(`${m.id}: objetos interativos são alcançáveis`, () => {
      const col = buildCollision(m, () => false);
      const r = reachable(m.id, [m.spawn.x, m.spawn.y], { unlockAll: true });
      for (const k of col.interactions.keys()) {
        const [x, y] = k.split(',').map(Number);
        const ok = DIRS.some(([dx, dy]) => r.has(key(x + dx, y + dy)));
        expect(ok, `interação inalcançável em ${m.id} (${k})`).toBe(true);
      }
    });
  }
});
