import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { completeMission, uncompleteMission } from '../../../data/missions';
import type { Category } from '../../../domain/categories';
import { DIFFICULTY_POINTS } from '../../../domain/config';
import { selectTodayMissions, type MissionItem, type TodayMissions } from '../../../domain/missions/today';
import type { LocalDate } from '../../../domain/time/localDate';
import { useAnalysis } from '../../analysis';
import { useToday } from '../../clock';
import { useData, useMissions } from '../../data';
import { xpDeltaText } from '../../text';
import { MissionSummary } from './MissionRow';

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
      <h2 id="sec-missions">Misiones</h2>
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
          Ver todas ({view.openCount})
        </Link>
      )}
    </section>
  );
}

function MissionTodayRow({ item, category, today }: { item: MissionItem; category?: Category; today: LocalDate }) {
  const ctx = useData();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const { record, analysis } = item;
  const open = analysis.state === 'pending' || analysis.state === 'expired';
  const title = record.mission.title;

  async function run(action: () => Promise<string>) {
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
      if (!(await completeMission(ctx, record.mission.id, today))) return 'No se pudo completar';
      return `${wasExpired ? 'Misión recuperada' : 'Misión cumplida'} · ${xpDeltaText(valueCents(item))}`;
    });

  const undo = () =>
    run(async () =>
      (await uncompleteMission(ctx, record.mission.id))
        ? `Misión desmarcada · ${xpDeltaText(-valueCents(item))}`
        : 'No se pudo deshacer',
    );

  return (
    <li className="panel row" style={{ padding: 'var(--s3)' }}>
      <MissionSummary record={record} analysis={analysis} category={category} today={today} />
      <p aria-live="polite" className="small pixel" style={{ color: 'var(--success)', maxWidth: 120 }}>
        {feedback}
      </p>
      {open ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          aria-label={`Completar ${title}`}
          onClick={() => void complete()}
        >
          Completar
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          disabled={busy}
          aria-label={`Deshacer ${title}`}
          onClick={() => void undo()}
        >
          Deshacer
        </button>
      )}
    </li>
  );
}

function valueCents(item: MissionItem): number {
  return DIFFICULTY_POINTS[item.record.mission.difficulty] * 100;
}
