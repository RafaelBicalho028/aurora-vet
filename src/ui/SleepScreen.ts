/** Dormir em casa: passa para a manhã seguinte e mostra o resumo do novo dia. */
import { app, requireState } from '../core/context';
import { bus, Events } from '../core/EventBus';
import { h } from './dom';
import { ui } from './UIManager';
import { PERIODS } from '../systems/days/calendar';

const PLACE = { hospital: 'Hospital Veterinário (campus)', clinica_vila: 'Clínica Veterinária da Vila' } as const;

export function openSleep(): void {
  const st = requireState();
  const report = st.sleep();
  // pets em casa ficam felizes com o tutor por perto
  for (const p of st.data.pets.owned) st.petAffection(p.id);
  st.save();
  app.audio.sfx('success');
  const altas = report.discharged;
  const novos = report.arrived;
  const el = h('div', { class: 'overlay sleep-overlay' }, h('div', { class: 'menu panel narrow sleep', role: 'dialog', 'aria-label': 'Novo dia' },
    h('div', { class: 'sleep-sun', 'aria-hidden': 'true' }, '☀'),
    h('h2', null, `Dia ${report.day} • ${PERIODS[0]}`),
    h('p', { class: 'muted' }, st.interpolate('Você dormiu bem e acordou pronto(a) para mais um dia de vivência.')),
    h('h3', null, '🏥 Altas'),
    altas.length
      ? h('ul', null, ...altas.map((a) => h('li', null, `${a.name} recebeu alta e voltou para casa.`)))
      : h('p', { class: 'muted small' }, 'Nenhum paciente recebeu alta hoje.'),
    h('h3', null, '🐾 Novos pacientes'),
    novos.length
      ? h('ul', null, ...novos.map((p) => h('li', null, `${p.name}, com ${p.tutorName}, aguarda na sala de espera — ${PLACE[p.location]}.`)))
      : h('p', { class: 'muted small' }, st.data.caseHistory.some((r) => r.kind === 'clinical' && r.total >= 60)
        ? 'As salas de espera já estão cheias: atenda quem está aguardando.'
        : 'Ainda não há pacientes extras: eles começam a chegar depois que você concluir o primeiro atendimento da história.'),
    h('p', { class: 'small muted' }, 'Cada atendimento ocupa um período do dia (manhã, tarde, noite). Volte para casa e durma para que o tempo passe.'),
    h('div', { class: 'menu-footer' }, h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(m) }, 'Começar o dia ▶')),
  ));
  const m = ui().open({ el, onClose: () => { bus.emit(Events.WorldRefresh); bus.emit(Events.StateChanged); } });
  (el.querySelector('.btn-primary') as HTMLButtonElement).focus();
}
