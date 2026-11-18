/**
 * Menu com abas: Mochila, Mapa, VetiDex, Diário de missões, Desempenho e Configurações.
 */
import { app, requireState } from '../core/context';
import { ITEMS, QUESTS, QUEST_MAP } from '../content/quests';
import { VETIDEX, VETIDEX_CATEGORIES, VETIDEX_MAP, REFERENCE_MAP, CASES } from '../content';
import { DISCIPLINES } from '../content/disciplines';
import { levelProgress, masteryTier, MASTERY_TIERS, stageFor, STAGES } from '../systems/progression/xp';
import { dueReviews, isMastered } from '../systems/review/spacedReview';
import type { Action } from '../core/InputManager';
import { renderSettingsPanel } from './SettingsPanel';
import { SECTION_LABELS, SECTION_ORDER } from '../systems/cases/caseTypes';
import { getMap, MAPS } from '../world/maps';
import { renderGroundCanvas } from '../art/TextureFactory';
import { goToTitle } from '../core/flow';
import { h, clear, frameCanvas } from './dom';
import { ui, type Modal } from './UIManager';
import { openReview } from './ReviewSession';
import { buildAllAnimals } from '../art/animals';
import { renderObject } from '../art/objects';
import { toggleFullscreen } from './fullscreen';
import { BREED_MAP, MAX_PETS } from '../content/pets';
import { breedCard, openPetChooser, petThumb } from './PetChooser';
import { healthCard, openPetCheckup } from './PetCheckup';
import { bus, Events } from '../core/EventBus';

export type Tab = 'mochila' | 'pets' | 'mapa' | 'vetidex' | 'diario' | 'desempenho' | 'config';
const TABS: { id: Tab; label: string; icon: string; key: string }[] = [
  { id: 'mochila', label: 'Mochila', icon: '🎒', key: 'I' },
  { id: 'pets', label: 'Pets', icon: '🐾', key: '' },
  { id: 'mapa', label: 'Mapa', icon: '🗺', key: 'M' },
  { id: 'vetidex', label: 'VetiDex', icon: '📖', key: 'V' },
  { id: 'diario', label: 'Diário', icon: '📜', key: 'J' },
  { id: 'desempenho', label: 'Desempenho', icon: '📊', key: 'P' },
  { id: 'config', label: 'Configurações', icon: '⚙', key: '' },
];

let current: Modal | null = null;
let currentTab: Tab = 'mochila';

export function openMenu(tab: Tab, fromEsc = false): void {
  if (current) { switchTab(tab); return; }
  void fromEsc;
  app.audio.sfx('page');
  currentTab = tab;
  const body = h('div', { class: 'menu-body' });
  const tabBar = h('div', { class: 'menu-tabs', role: 'tablist' });
  const footer = h('div', { class: 'menu-footer' },
    h('button', { class: 'btn', onclick: () => { requireState().save(); bus.emit(Events.Toast, { text: 'Jogo salvo neste navegador.', icon: '💾' }); } }, '💾 Salvar'),
    h('button', { class: 'btn', onclick: () => toggleFullscreen() }, '⛶ Tela cheia'),
    h('button', { class: 'btn', onclick: () => { requireState().save(); ui().closeAll(); goToTitle(); } }, '⏏ Título'),
    h('button', { class: 'btn btn-primary', onclick: () => closeMenu() }, 'Voltar ao jogo (Esc)'),
  );
  const el = h('div', { class: 'overlay' }, h('div', { class: 'menu panel', role: 'dialog', 'aria-label': 'Menu' }, tabBar, body, footer));
  const render = () => {
    clear(tabBar);
    for (const t of TABS) {
      tabBar.appendChild(h('button', {
        class: 'menu-tab' + (t.id === currentTab ? ' active' : ''), role: 'tab', 'aria-selected': String(t.id === currentTab),
        onclick: () => switchTab(t.id),
      }, h('span', { class: 'tab-icon' }, t.icon), h('span', { class: 'tab-label' }, t.label), t.key ? h('kbd', null, t.key) : null));
    }
    const sameTab = body.dataset.tab === currentTab;
    const top = sameTab ? body.scrollTop : 0;
    clear(body);
    body.appendChild(renderTab(currentTab));
    body.dataset.tab = currentTab;
    body.scrollTop = top;
    (tabBar.querySelector('.menu-tab.active') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  (el as any)._render = render;
  current = ui().open({
    el,
    onAction: (a: Action) => {
      const map: Partial<Record<Action, Tab>> = { inventory: 'mochila', map: 'mapa', vetidex: 'vetidex', journal: 'diario', performance: 'desempenho' };
      if (map[a]) { if (map[a] === currentTab) closeMenu(); else switchTab(map[a]!); return true; }
      if (a === 'left' || a === 'right') {
        const i = TABS.findIndex((t) => t.id === currentTab);
        switchTab(TABS[(i + (a === 'right' ? 1 : TABS.length - 1)) % TABS.length].id);
        return true;
      }
      return false;
    },
    onClose: () => { current = null; },
  });
  render();
}

function switchTab(t: Tab) {
  if (!current) return;
  currentTab = t;
  app.audio.sfx('select');
  (current.el as any)._render();
}

export function closeMenu(): void {
  if (current) ui().close(current);
}

function renderTab(t: Tab): HTMLElement {
  switch (t) {
    case 'mochila': return renderInventory();
    case 'pets': return renderPets();
    case 'mapa': return renderMap();
    case 'vetidex': return renderVetiDex();
    case 'diario': return renderJournal();
    case 'desempenho': return renderPerformance();
    case 'config': return renderSettingsPanel(true);
  }
}

// ------------------------------------------------------------------ Mochila
function renderInventory(): HTMLElement {
  const st = requireState();
  const items = Object.entries(st.data.inventory).filter(([, q]) => q > 0);
  const detail = h('div', { class: 'item-detail' }, 'Selecione um item para ver a descrição.');
  const grid = h('div', { class: 'item-grid' }, ...items.map(([id, q]) => {
    const def = ITEMS[id];
    return h('button', {
      class: 'item-cell', title: def?.name ?? id,
      onclick: () => { clear(detail); detail.append(h('h3', null, `${def?.icon ?? '•'} ${def?.name ?? id}`), h('p', null, def?.description ?? '')); },
    }, h('span', { class: 'item-icon' }, def?.icon ?? '•'), h('span', { class: 'item-name' }, def?.name ?? id), q > 1 ? h('span', { class: 'item-qty' }, `x${q}`) : null);
  }));
  return h('div', { class: 'tab-pane' }, h('h2', null, 'Mochila'), grid, detail);
}

// ------------------------------------------------------------------ Pets
function renderPets(): HTMLElement {
  const st = requireState();
  const owned = st.data.pets.owned;
  const pane = h('div', { class: 'tab-pane' }, h('h2', null, 'Meus pets'));
  const rerender = () => switchTab('pets');
  if (!owned.length) {
    pane.append(h('p', { class: 'muted' }, 'Você ainda não adotou um pet. Converse com a Júlia, na praça central, ou adote por aqui.'));
  }
  const list = h('div', { class: 'pet-list' });
  for (const p of owned) {
    const b = BREED_MAP[p.breed];
    const isComp = st.data.pets.companion === p.id;
    const facts = h('div', { class: 'pet-card-facts', hidden: true }, breedCard(b));
    const due = st.petDue(p.id);
    const inHospital = st.data.player.mapId === 'hospital';
    const health = h('div', { class: 'pet-card-facts', hidden: true }, healthCard(p),
      inHospital
        ? h('button', { class: 'btn small btn-primary', onclick: () => openPetCheckup(p.id) }, '🩺 Fazer consulta preventiva agora')
        : h('p', { class: 'small muted' }, 'Leve seu pet ao Hospital Veterinário e fale com a Carla, na recepção, para a consulta preventiva.'));
    list.appendChild(h('div', { class: 'pet-card' + (isComp ? ' active' : '') },
      h('img', { src: petThumb(p.breed), class: 'pixel pet-card-img', alt: b.name }),
      h('div', { class: 'pet-card-body' },
        h('div', { class: 'pet-card-name' }, p.name, isComp ? h('span', { class: 'badge ok' }, 'Passeando com você') : null),
        h('div', { class: 'small muted' }, `${b.name} • adotado(a) em ${new Date(p.adoptedAt).toLocaleDateString('pt-BR')}`),
        h('div', { class: 'hearts', title: 'Afeição' }, ...Array.from({ length: 5 }, (_, i) => h('span', { class: i < Math.round(p.affection / 2) ? 'on' : '' }, '♥'))),
        h('div', { class: 'pet-card-actions' },
          isComp
            ? h('button', { class: 'btn small', onclick: () => { st.setCompanion(null); rerender(); } }, 'Deixar em casa')
            : h('button', { class: 'btn small btn-primary', onclick: () => { st.setCompanion(p.id); rerender(); } }, 'Levar para passear'),
          h('button', { class: 'btn small', onclick: () => { facts.hidden = !facts.hidden; } }, 'Ficha da raça'),
          h('button', { class: 'btn small', onclick: () => { health.hidden = !health.hidden; } }, due.length ? `🩺 Saúde (${due.length} pendente${due.length > 1 ? 's' : ''})` : '🩺 Saúde (em dia)'),
        ),
        health,
        facts,
      ),
    ));
  }
  pane.append(list);
  if (owned.length < MAX_PETS) pane.append(h('button', { class: 'btn btn-primary', onclick: () => openPetChooser(() => rerender()) }, owned.length ? '🐾 Adotar outro pet' : '🐾 Adotar um pet'));
  else pane.append(h('p', { class: 'muted small' }, `Limite de ${MAX_PETS} pets atingido.`));
  return pane;
}

// ------------------------------------------------------------------ Mapa
let groundCache: Record<string, string> = {};
function renderMap(): HTMLElement {
  const st = requireState();
  const regions = [
    { name: 'Universidade de Aurora', stage: 1, desc: 'Hospital Veterinário, Anatomia, Fisiologia, Microbiologia, Biblioteca, fazenda-escola e o Setor dos Institutos (Parasitologia, Farmacologia, Patologia, Cirurgia e Anestesiologia, Saúde Pública).', open: true },
    { name: 'Vila dos Animais', stage: 2, desc: 'Residências com tutores, pet shops, praças, centro de adoção e clínica de pequenos animais.', open: false },
    { name: 'Região Rural', stage: 3, desc: 'Fazendas de bovinos, ovinos, equinos e propriedades leiteiras.', open: false },
    { name: 'Reserva Ambiental', stage: 4, desc: 'Animais silvestres, centro de reabilitação e missões de conservação.', open: false },
    { name: 'Centro Veterinário Avançado', stage: 4, desc: 'Internação, diagnóstico por imagem, centro cirúrgico, UTI e análises clínicas.', open: false },
  ];
  const mapId = st.data.player.mapId;
  // dentro de um prédio, mostra o mapa externo onde fica a porta desse prédio
  const showMap = MAPS[mapId].kind === 'outdoor' ? mapId
    : Object.values(MAPS).find((om) => om.kind === 'outdoor' && om.buildings.some((b) => b.doors.some((d) => d.warp?.map === mapId)))?.id ?? 'campus';
  const m = getMap(showMap);
  if (!groundCache[showMap]) groundCache[showMap] = renderGroundCanvas(m).toDataURL();
  const scale = Math.max(4, Math.min(9, Math.floor((Math.min(window.innerWidth, 1000) - 340) / m.width))); // px por tile
  const wrap = h('div', { class: 'minimap', style: `width:${m.width * scale}px;height:${m.height * scale}px` },
    h('img', { src: groundCache[showMap], class: 'pixel', style: `width:${m.width * scale}px;height:${m.height * scale}px`, alt: `Mapa: ${m.name}` }));
  for (const b of m.buildings) {
    wrap.appendChild(h('div', { class: 'mm-building', style: `left:${b.x * scale}px;top:${b.y * scale}px;width:${b.w * scale}px;height:${b.h * scale}px;background:${b.style.roof}` }, h('span', null, b.name)));
  }
  let px = st.data.player.x, py = st.data.player.y;
  if (mapId !== showMap) {
    const b = m.buildings.find((bb) => bb.doors.some((d) => d.warp?.map === mapId));
    if (b) { px = b.x + b.doors[0].dx; py = b.y + b.h - 1; }
  }
  wrap.appendChild(h('div', { class: 'mm-player', style: `left:${px * scale - 3}px;top:${py * scale - 3}px`, title: 'Você está aqui' }));
  return h('div', { class: 'tab-pane' },
    h('h2', null, 'Mapa'),
    h('p', { class: 'muted' }, `Local atual: ${MAPS[mapId].name}`),
    h('div', { class: 'map-layout' },
      h('div', { class: 'minimap-scroll' }, wrap),
      h('div', { class: 'regions' }, h('h3', null, 'Regiões'), ...regions.map((r) => h('div', { class: 'region' + (r.open ? '' : ' locked') },
        h('div', { class: 'region-title' }, (r.open ? '🟢 ' : '🔒 ') + r.name),
        h('div', { class: 'region-desc' }, r.desc),
        !r.open ? h('div', { class: 'region-req' }, `Requer Etapa ${r.stage}: ${STAGES[r.stage - 1].title}`) : null,
      ))),
    ),
  );
}

// ------------------------------------------------------------------ VetiDex
let dexCategory = 'todas';
const imageCache: Record<string, string> = {};
function dexImage(key: string): string | null {
  if (imageCache[key]) return imageCache[key];
  const a = buildAllAnimals().find((x) => x.key === key);
  if (a) { imageCache[key] = frameCanvas(a.canvas, a.frameW, a.frameH, 0).toDataURL(); return imageCache[key]; }
  if (key === 'skeleton') { imageCache[key] = renderObject('skeleton', 1).toDataURL(); return imageCache[key]; }
  return null;
}

function renderVetiDex(selected?: string): HTMLElement {
  const st = requireState();
  const unlocked = new Set(st.data.vetidex.unlocked);
  const pane = h('div', { class: 'tab-pane dex' });
  const list = h('div', { class: 'dex-list' });
  const detail = h('div', { class: 'dex-detail' });
  const cats = h('div', { class: 'dex-cats' },
    ...[{ id: 'todas', name: 'Todas' }, ...VETIDEX_CATEGORIES].map((c) => h('button', {
      class: 'chip' + (c.id === dexCategory ? ' active' : ''),
      onclick: () => { dexCategory = c.id; const fresh = renderVetiDex(); pane.replaceWith(fresh); },
    }, c.name)));
  const entries = VETIDEX.filter((e) => dexCategory === 'todas' || e.category === dexCategory);
  const showDetail = (id: string) => {
    const e = VETIDEX_MAP[id];
    clear(detail);
    if (!unlocked.has(id)) {
      detail.append(h('h3', null, '??? — entrada bloqueada'), h('p', { class: 'muted' }, `Como desbloquear: ${e.unlockHint}`));
      return;
    }
    st.markDexSeen(id);
    const img = e.image ? dexImage(e.image) : null;
    detail.append(
      h('div', { class: 'dex-head' }, img ? h('img', { src: img, class: 'pixel dex-img', alt: e.name }) : null,
        h('div', null, h('div', { class: 'dex-cat' }, VETIDEX_CATEGORIES.find((c) => c.id === e.category)?.name ?? ''), h('h3', null, e.name))),
      h('p', null, e.summary),
      h('h4', null, 'Manifestações / dados relevantes'),
      h('ul', null, ...e.manifestations.map((m) => h('li', null, m))),
      h('div', { class: 'dex-block sci' }, h('div', { class: 'dex-label' }, '🔬 Conhecimento científico consolidado (síntese)'), h('p', null, e.science)),
      h('div', { class: 'dex-block did' }, h('div', { class: 'dex-label' }, '✏ Simplificação didática'), h('p', null, e.didactic)),
      h('div', { class: 'dex-block pro' }, h('div', { class: 'dex-label' }, '🩺 Depende de avaliação profissional'), h('p', null, e.professional)),
      h('h4', null, 'Referências para aprofundamento'),
      h('ol', { class: 'refs' }, ...e.refs.map((r) => h('li', null, REFERENCE_MAP[r]?.citation ?? r))),
      h('p', { class: 'disclaimer' }, 'Conteúdo educacional pendente de validação por médico(a)-veterinário(a).'),
    );
  };
  for (const e of entries) {
    const isOpen = unlocked.has(e.id);
    const isNew = isOpen && !st.data.vetidex.seen.includes(e.id);
    const btn = h('button', { class: 'dex-item' + (isOpen ? '' : ' locked') }, isOpen ? e.name : '???', isNew ? h('span', { class: 'badge-new' }, 'novo') : null);
    btn.addEventListener('click', () => {
      app.audio.sfx('select');
      list.querySelectorAll('.dex-item').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      btn.querySelector('.badge-new')?.remove();
      showDetail(e.id);
    });
    list.appendChild(btn);
  }
  const count = VETIDEX.filter((e) => unlocked.has(e.id)).length;
  pane.append(
    h('div', { class: 'dex-top' }, h('h2', null, 'VetiDex'), h('div', { class: 'dex-count' }, `${count}/${VETIDEX.length} entradas`), h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: `width:${(count / VETIDEX.length) * 100}%` }))),
    cats,
    h('div', { class: 'dex-layout' }, list, detail),
  );
  const first = selected ?? entries.find((e) => unlocked.has(e.id))?.id;
  if (first) showDetail(first);
  else detail.append(h('p', { class: 'muted' }, 'Conclua aulas, missões e atendimentos para desbloquear entradas.'));
  return pane;
}

export function openVetiDexEntry(id: string): void {
  dexCategory = 'todas';
  openMenu('vetidex');
  const body = current?.el.querySelector('.menu-body');
  if (body) { clear(body as HTMLElement); body.appendChild(renderVetiDex(id)); }
}

// ------------------------------------------------------------------ Diário
function renderJournal(): HTMLElement {
  const st = requireState();
  const active = QUESTS.filter((q) => st.data.quests[q.id]?.status === 'active');
  const done = QUESTS.filter((q) => st.data.quests[q.id]?.status === 'completed');
  const card = (qid: string) => {
    const q = QUEST_MAP[qid];
    const p = st.data.quests[qid];
    return h('div', { class: 'quest' + (p.status === 'completed' ? ' done' : '') },
      h('div', { class: 'quest-head' }, h('span', { class: 'quest-tag ' + q.category }, q.category === 'principal' ? 'Principal' : 'Secundária'), h('strong', null, q.title)),
      h('p', { class: 'muted' }, q.summary),
      h('ul', { class: 'objectives' }, ...q.objectives.map((o) => h('li', { class: p.objectives[o.id] ? 'ok' : '' }, (p.objectives[o.id] ? '☑ ' : '☐ ') + o.text))),
      h('div', { class: 'quest-reward' }, `Recompensa: ${q.rewards.xp} XP${q.rewards.items?.length ? ' + itens' : ''}${q.rewards.dex?.length ? ' + VetiDex' : ''} • Responsável: ${q.giver}`),
    );
  };
  return h('div', { class: 'tab-pane' },
    h('h2', null, 'Diário de missões'),
    h('h3', null, `Em andamento (${active.length})`),
    active.length ? h('div', { class: 'quest-list' }, ...active.map((q) => card(q.id))) : h('p', { class: 'muted' }, 'Nenhuma missão ativa. Converse com personagens pelo campus!'),
    h('h3', null, `Concluídas (${done.length})`),
    done.length ? h('div', { class: 'quest-list' }, ...done.map((q) => card(q.id))) : h('p', { class: 'muted' }, '—'),
  );
}

// ------------------------------------------------------------------ Desempenho
function bar(ratio: number, color = 'var(--accent)'): HTMLElement {
  return h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: `width:${Math.max(0, Math.min(1, ratio)) * 100}%;background:${color}` }));
}

function sparkline(values: number[]): HTMLElement {
  const w = 120, hgt = 32;
  if (values.length < 2) return h('span', { class: 'muted small' }, values.length ? `${values[0]} pts` : '—');
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 6) + 3},${hgt - 3 - (v / 100) * (hgt - 6)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(hgt));
  svg.setAttribute('class', 'spark');
  svg.innerHTML = `<line x1="0" x2="${w}" y1="${hgt - 3 - 0.6 * (hgt - 6)}" y2="${hgt - 3 - 0.6 * (hgt - 6)}" class="spark-pass"/><polyline points="${pts}" class="spark-line"/>` +
    values.map((v, i) => `<circle cx="${(i / (values.length - 1)) * (w - 6) + 3}" cy="${hgt - 3 - (v / 100) * (hgt - 6)}" r="2" class="spark-dot"><title>${v}</title></circle>`).join('');
  return svg as unknown as HTMLElement;
}

function renderPerformance(): HTMLElement {
  const st = requireState();
  const d = st.data;
  const p = levelProgress(d.totalXp);
  const stage = stageFor(p.level, d.flags['etapa2_liberada'] ? 2 : 1);
  const clinical = d.caseHistory.filter((r) => r.kind === 'clinical');
  const due = dueReviews(d.reviewItems, Date.now());
  const mastered = d.reviewItems.filter(isMastered).length;

  // médias por etapa do atendimento
  const sectionAvg = SECTION_ORDER.map((s) => {
    const vals = clinical.map((r) => (r.sections[s] ?? 0) / (r.sectionMax[s] || 20));
    return { s, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });

  // domínio por disciplina
  const discTotals = DISCIPLINES.map((disc) => {
    const skills = d.disciplines[disc.id] ?? {};
    const total = Object.values(skills).reduce((a, b) => a + b, 0);
    return { disc, total, skills };
  });
  const ranked = [...discTotals].filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const weakSections = sectionAvg.filter((x) => x.avg !== null && x.avg < 0.7).map((x) => SECTION_LABELS[x.s]);

  // conteúdos para revisão (do último atendimento de cada caso)
  const latest = new Map<string, (typeof clinical)[number]>();
  for (const r of clinical) latest.set(r.caseId, r);
  const topics = Array.from(new Set([...latest.values()].flatMap((r) => r.reviewTopics)));

  // evolução por caso (sequência de notas)
  const byCase = new Map<string, number[]>();
  for (const r of d.caseHistory) byCase.set(r.caseId, [...(byCase.get(r.caseId) ?? []), r.total]);

  const hours = Math.floor(d.stats.playTimeSec / 3600), mins = Math.floor((d.stats.playTimeSec % 3600) / 60);

  return h('div', { class: 'tab-pane perf' },
    h('h2', null, 'Painel de progresso acadêmico'),
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(p.level)), h('div', { class: 'stat-label' }, 'Nível')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(d.totalXp)), h('div', { class: 'stat-label' }, 'XP total')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(clinical.length)), h('div', { class: 'stat-label' }, 'Atendimentos')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, `${d.vetidex.unlocked.length}`), h('div', { class: 'stat-label' }, 'VetiDex')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, `${hours}h${String(mins).padStart(2, '0')}`), h('div', { class: 'stat-label' }, 'Tempo de estudo')),
    ),
    h('p', { class: 'muted' }, `Etapa ${stage.id}: ${stage.title}. Os níveis representam progresso no jogo, não habilitação profissional.`),

    h('div', { class: 'perf-grid' },
      h('section', { class: 'card' },
        h('h3', null, 'Desempenho por etapa do atendimento'),
        clinical.length ? h('div', null, ...sectionAvg.map((x) => h('div', { class: 'meter' },
          h('div', { class: 'meter-label' }, SECTION_LABELS[x.s], h('span', null, x.avg === null ? '—' : `${Math.round(x.avg * 100)}%`)),
          bar(x.avg ?? 0, x.avg !== null && x.avg < 0.7 ? 'var(--warn)' : 'var(--accent)')))) : h('p', { class: 'muted' }, 'Conclua um atendimento para ver estatísticas.'),
        weakSections.length ? h('p', { class: 'note' }, `Precisa de reforço: ${weakSections.join(', ')}.`) : null,
      ),
      h('section', { class: 'card' },
        h('h3', null, 'Revisão espaçada'),
        h('p', null, due.length ? `${due.length} pergunta(s) pendente(s) sobre erros anteriores.` : 'Nenhuma pergunta pendente no momento.'),
        h('p', { class: 'muted small' }, `${d.reviewItems.length} item(ns) no sistema • ${mastered} consolidado(s). Acertos aumentam o intervalo até a próxima revisão; erros reiniciam o ciclo.`),
        h('button', { class: 'btn btn-primary', disabled: due.length === 0 && clinical.length === 0, onclick: () => openReview() }, due.length ? 'Revisar agora' : 'Praticar perguntas'),
      ),
      h('section', { class: 'card' },
        h('h3', null, 'Disciplinas com melhor desempenho'),
        ranked.length ? h('ol', null, ...ranked.slice(0, 3).map((x) => h('li', null, `${x.disc.icon} ${x.disc.name} — ${masteryTier(Math.max(...Object.values(x.skills))).name}`))) : h('p', { class: 'muted' }, '—'),
        h('h3', null, 'Conteúdos para revisar'),
        topics.length ? h('ul', null, ...topics.map((t) => h('li', null, t))) : h('p', { class: 'muted' }, 'Nenhum tópico pendente. Ótimo trabalho!'),
      ),
    ),

    h('section', { class: 'card' },
      h('h3', null, 'Evolução por disciplina (árvores de habilidades)'),
      h('p', { class: 'muted small' }, `Níveis de domínio: ${MASTERY_TIERS.map((t) => t.name).join(' → ')}.`),
      h('div', { class: 'disc-grid' }, ...discTotals.map(({ disc, skills }) => h('div', { class: 'disc' },
        h('div', { class: 'disc-title', style: `border-color:${disc.color}` }, `${disc.icon} ${disc.name}`),
        ...disc.skills.map((sk) => {
          const xp = skills[sk.id] ?? 0;
          const tier = masteryTier(xp);
          return h('div', { class: 'skill' + (xp > 0 ? '' : ' dim') },
            h('div', { class: 'skill-label' }, sk.name, h('span', { class: 'tier tier-' + tier.index }, tier.name)),
            bar(tier.ratio, disc.color));
        }),
      ))),
    ),

    h('section', { class: 'card' },
      h('h3', null, 'Histórico de atendimentos e atividades'),
      d.caseHistory.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'history' },
        h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Atividade'), h('th', null, 'Tent.'), h('th', null, 'Nota'), h('th', null, 'Etapas'), h('th', null, 'XP'))),
        h('tbody', null, ...[...d.caseHistory].reverse().map((r) => h('tr', { class: r.criticalErrors.length ? 'crit' : r.total >= 60 ? 'pass' : 'fail' },
          h('td', null, new Date(r.date).toLocaleDateString('pt-BR')),
          h('td', null, r.title),
          h('td', null, String(r.attempt)),
          h('td', null, h('strong', null, String(r.total)), r.criticalErrors.length ? ' ⚠' : ''),
          h('td', { class: 'small' }, r.kind === 'clinical' ? SECTION_ORDER.map((s) => `${SECTION_LABELS[s].split(' ')[0]} ${r.sections[s] ?? 0}`).join(' · ') : Object.entries(r.sections).map(([k, v]) => `${k} ${v}%`).join(' · ')),
          h('td', null, `+${r.xpGained}`),
        ))))) : h('p', { class: 'muted' }, 'Nenhuma atividade registrada ainda.'),
      byCase.size ? h('div', { class: 'evolution' }, h('h4', null, 'Evolução das notas por atividade'), ...[...byCase.entries()].map(([id, vals]) => h('div', { class: 'evo-row' },
        h('span', null, CASES[id]?.patient ? `${CASES[id].patient.name} (${CASES[id].patient.speciesLabel.split(' ')[0]})` : 'Anatomia — Aula 1'), sparkline(vals)))) : null,
    ),
  );
}

