import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { completeMission, uncompleteMission } from '../../../data/missions';
import type { Category } from '../../../domain/categories';
import { DIFFICULTY_POINTS } from '../../../domain/config';
import { selectTodayMissions, type MissionItem, type TodayMissions } from '../../../domain/missions/today';
import type { LocalDate } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { celebrate, floatXp } from '../../scene/engine';
import { useToday } from '../../clock';
import { useData, useMissions } from '../../data';
import { xpDeltaText } from '../../text';
import { MISSION_STATE_CHIP, MissionSummary } from './MissionRow';
import { Sprite } from '../../design/components';
import { CheckIcon } from '../../design/icons';
import { t } from '../../../i18n';
import { playSfx } from '../../sound/sfx';

const TAP_COOLDOWN_MS = 400;

/** Misiones relevantes de hoy (MHOY-01 a MHOY-03). */
export function useTodayMissions(): TodayMissions | undefined {
  const today = useToday();
  const missions = useMissions();
  const analysis = useAnalysis();
  return useMemo(() => {
    if (!missions || !analysis) return undefined;
    const items: MissionItem[] = missions.flatMap((record) => {
      const a = analysis.byMission.get(record.mission.id);
      return a ? [{ record, analysis: a }] : [];
    });
    return selectTodayMissions(items, today);
  }, [missions, analysis, today]);
}

export function TodayMissionsSection({
  view,
  categoryById,
}: {
  view: TodayMissions;
  categoryById: Map<string, Category>;
}) {
  const today = useToday();
  if (view.items.length === 0 && view.completedToday.length === 0) return null;
  return (
    <section className="stack" aria-labelledby="sec-missions">
      <h2 id="sec-missions">{t('missions.title')}</h2>
      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {[...view.items, ...view.completedToday].map((item) => (
          <MissionTodayRow
            key={item.record.mission.id}
            item={item}
            category={categoryById.get(item.record.mission.categoryId)}
            today={today}
          />
        ))}
      </ul>
      {view.openCount > view.items.length && (
        <Link to="/actividades/misiones" className="btn btn-ghost">
          {t('missions.seeAll', { count: view.openCount })}
        </Link>
      )}
    </section>
  );
}

function MissionTodayRow({ item, category, today }: { item: MissionItem; category?: Category; today: LocalDate }) {
  const ctx = useData();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  // `text` se anuncia a los lectores de pantalla; `shown`, si además se ve (algo que no se pudo hacer). La XP sale
  // flotando sobre el protagonista, en la escena (D-158)
  const [feedback, setFeedback] = useState<{ text: string; shown?: boolean }>();
  const { record, analysis } = item;
  const open = analysis.state === 'pending' || analysis.state === 'expired';
  const title = record.mission.title;
  const chip = MISSION_STATE_CHIP[analysis.state];

  async function run(action: () => Promise<{ text: string; shown?: boolean }>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const cooldown = new Promise((r) => setTimeout(r, TAP_COOLDOWN_MS));
    try {
      setFeedback(await action());
      await cooldown;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const complete = () =>
    run(async () => {
      const wasExpired = analysis.state === 'expired';
      if (!(await completeMission(ctx, record.mission.id, today))) return { text: t('missions.completeFailed'), shown: true };
      celebrate('small');
      playSfx('mission');
      floatXp(xpDeltaText(valueCents(item)));
      return { text: t(wasExpired ? 'missions.recovered' : 'missions.accomplished', { xp: xpDeltaText(valueCents(item)) }) };
    });

  const undo = () =>
    run(async () => {
      if (!(await uncompleteMission(ctx, record.mission.id))) return { text: t('today.undoFailed'), shown: true };
      playSfx('undo');
      floatXp(xpDeltaText(-valueCents(item)));
      return { text: t('missions.unmarked', { xp: xpDeltaText(-valueCents(item)) }) };
    });

  // Misma estructura que la tarjeta de actividad (D-160): contenido, etiqueta de estado en su columna y botón cuadrado
  return (
    <li className={`panel row activity-row${open ? '' : ' done'}`} style={{ padding: 'var(--s3)' }}>
      <MissionSummary
        record={record}
        analysis={analysis}
        category={category}
        today={today}
        chipAside
        note={feedback?.shown ? feedback.text : undefined}
      />
      <p aria-live="polite" className="sr-only">
        {feedback?.text}
      </p>
      <span className={`chip ${chip?.className ?? 'chip-done'} done-chip${chip ? ' shown' : ''}`} aria-hidden={!chip}>
        {chip?.label()}
      </span>
      {open ? (
        <button
          type="button"
          className="btn btn-primary btn-icon"
          disabled={busy}
          aria-label={t('missions.completeLabel', { title })}
          title={t('missions.complete')}
          onClick={() => void complete()}
        >
          <CheckIcon />
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-icon"
          disabled={busy}
          aria-label={t('missions.undoLabel', { title })}
          title={t('missions.undo')}
          onClick={() => void undo()}
        >
          <Sprite name="minus" scale={1} />
        </button>
      )}
    </li>
  );
}

function valueCents(item: MissionItem): number {
  return DIFFICULTY_POINTS[item.record.mission.difficulty] * 100;
}
