// Tarjeta de propuesta del compañero (spec 12, AC-05): resumen legible de lo que entendió y Crear / Editar / Cancelar.
// Nada se crea sin pulsar «Crear» (D-120). «Editar» abre el formulario con los datos rellenados.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createGoal } from '../../data/goals';
import { createMission } from '../../data/missions';
import { createActivity, createRest, type DataContext } from '../../data/repository';
import type { Proposal } from '../../domain/arvid/actions';
import type { ActivityRecord } from '../../domain/activities/types';
import type { Category } from '../../domain/categories';
import type { LocalDate } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { useCategories, useData, useRecords } from '../data';
import { Panel } from '../design/components';
import { restRange } from '../rests/RestsScreen';
import { celebrate } from '../scene/engine';
import { categoryName, dayMonth, difficultyLabel, periodLabel } from '../text';
import { logChat } from './voice';

const when = (deadline?: string, time?: string) => (deadline ? `${dayMonth(deadline as LocalDate)}${time ? `, ${time}` : ''}` : t('actions.noDate'));

/** Actividades nombradas en un descanso → sus ids (sin distinguir mayúsculas). */
function restActivityIds(names: string[] | undefined, records: readonly ActivityRecord[]): string[] | undefined {
  if (!names?.length) return undefined;
  const ids = names
    .map((n) => records.find((r) => r.activity.name.trim().toLowerCase() === n.trim().toLowerCase())?.activity.id)
    .filter((id): id is string => !!id);
  return ids.length ? ids : undefined;
}

/** Resumen de una línea: «Misión · Pagar la luz · Dinero · Fácil · 30 oct, 18:00». */
export function proposalSummary(p: Proposal, categories: readonly Category[]): { kind: string; lines: string[] } {
  const cat = (id: string) => categoryName(categories.find((c) => c.id === id));
  switch (p.action) {
    case 'create_mission':
      return { kind: t('actions.kinds.mission'), lines: [p.args.title, `${cat(p.args.categoryId)} · ${difficultyLabel(p.args.difficulty)} · ${when(p.args.deadline, p.args.time)}`] };
    case 'create_goal':
      return {
        kind: t('actions.kinds.goal'),
        lines: [
          `${p.args.title} · ${cat(p.args.categoryId)}${p.args.targetDate ? ` · ${t('goals.target', { date: dayMonth(p.args.targetDate as LocalDate) })}` : ''}`,
          ...p.args.milestones.map((m, i) => `${i + 1}. ${m.title} · ${difficultyLabel(m.difficulty)}${m.deadline ? ` · ${when(m.deadline, m.time)}` : ''}`),
        ],
      };
    case 'create_rest':
      return {
        kind: t('actions.kinds.rest'),
        lines: [restRange({ from: p.args.from as LocalDate, to: p.args.to as LocalDate }), p.args.activities?.length ? p.args.activities.join(', ') : t('rests.allActivities'), ...(p.args.note ? [p.args.note] : [])],
      };
    case 'create_activity': {
      const r = p.args.reminders?.map((x) => (x.day ? `${x.day}@${x.time}` : x.time)).join(', ');
      return {
        kind: t('actions.kinds.activity'),
        lines: [
          p.args.name,
          `${cat(p.args.categoryId)} · ${periodLabel(p.args.period)} × ${p.args.target} · ${difficultyLabel(p.args.difficulty)}`,
          ...(r ? [t('actions.reminders', { list: r })] : []),
        ],
      };
    }
  }
}

/** Crea lo propuesto con las mismas reglas que los formularios. Devuelve el nombre de lo creado o `undefined`. */
export async function createFromProposal(ctx: DataContext, p: Proposal, records: readonly ActivityRecord[]): Promise<{ label: string; path: string } | undefined> {
  switch (p.action) {
    case 'create_mission': {
      const a = p.args;
      const r = await createMission(ctx, { title: a.title, categoryId: a.categoryId, difficulty: a.difficulty, deadline: a.deadline as LocalDate | undefined, time: a.time });
      return r.ok ? { label: t('actions.created.mission', { name: a.title }), path: `/actividades/misiones/${r.id}` } : undefined;
    }
    case 'create_goal': {
      const a = p.args;
      const r = await createGoal(ctx, {
        title: a.title,
        categoryId: a.categoryId,
        targetDate: a.targetDate as LocalDate | undefined,
        milestones: a.milestones.map((m) => ({ title: m.title, difficulty: m.difficulty, deadline: m.deadline as LocalDate | undefined, time: m.time })),
      });
      return r.ok ? { label: t('actions.created.goal', { name: a.title }), path: `/objetivos/${r.id}` } : undefined;
    }
    case 'create_rest': {
      const a = p.args;
      const r = await createRest(ctx, { from: a.from as LocalDate, to: a.to as LocalDate, activityIds: restActivityIds(a.activities, records), note: a.note });
      return r.ok ? { label: t('actions.created.rest', { name: restRange({ from: a.from as LocalDate, to: a.to as LocalDate }) }), path: '/descansos' } : undefined;
    }
    case 'create_activity': {
      const a = p.args;
      const id = await createActivity(ctx, {
        name: a.name,
        config: { period: a.period, target: a.target, difficulty: a.difficulty, categoryId: a.categoryId },
        reminders: a.reminders,
      });
      return { label: t('actions.created.activity', { name: a.name }), path: `/actividades/${id}` };
    }
  }
}

/** Formulario al que lleva «Editar» (AC-05, AC-06), con los datos en `location.state.draft`. */
export function editPath(action: Proposal['action']): string {
  return { create_mission: '/actividades/misiones/nueva', create_goal: '/objetivos/nuevo', create_rest: '/descansos', create_activity: '/actividades/nueva' }[action];
}

export function ProposalCard({ proposal, onDone }: { proposal: Proposal; onDone: () => void }) {
  const ctx = useData();
  const navigate = useNavigate();
  const categories = useCategories() ?? [];
  const records = useRecords() ?? [];
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { kind, lines } = proposalSummary(proposal, categories);

  async function create() {
    setBusy(true);
    const created = await createFromProposal(ctx, proposal, records);
    setBusy(false);
    if (!created) return setFailed(true);
    celebrate('small');
    logChat('companion', created.label);
    onDone();
    void navigate(created.path);
  }

  return (
    <Panel className="stack proposal-card" labelledBy="proposal-kind">
      <p id="proposal-kind" className="pixel" style={{ color: 'var(--level)' }}>
        {kind}
      </p>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? 'pixel' : 'small muted'}>
          {l}
        </p>
      ))}
      {failed && (
        <p role="alert" className="field-error">
          {t('actions.failed')}
        </p>
      )}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary grow" disabled={busy} onClick={() => void create()}>
          {t('actions.create')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            onDone();
            void navigate(editPath(proposal.action), { state: { draft: proposal.args } });
          }}
        >
          {t('common.edit')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {t('common.cancel')}
        </button>
      </div>
    </Panel>
  );
}
