import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { logCompletion, saveSetting, undoCompletion } from '../../data/repository';
import { logDeltaCents } from '../../domain/activities/periods';
import { shouldRemindBackup } from '../../domain/backupReminder';
import { canLog, latestUndoableDate } from '../../domain/activities/rules';
import { buildTodayView, forgottenYesterday, type TodayItem } from '../../domain/activities/today';
import type { ActivityRecord } from '../../domain/activities/types';
import type { Category } from '../../domain/categories';
import { addDays } from '../../domain/time/localDate';
import { needsInstallForSafety } from '../../pwa/platform';
import { useToday } from '../clock';
import { useAnalysis } from '../analysis';
import { exportData } from '../backupActions';
import { MusicButton } from '../music/MusicProvider';
import { Scene } from '../scene/Scene';
import { celebrate } from '../scene/engine';
import { TodayMissionsSection, useTodayMissions } from './missions/TodayMissions';
import { useCategories, useData, useRecords, useSettings } from '../data';
import { CategoryIcon, Panel, Segments, Sprite, XpBar, categoryColor } from '../design/components';
import {
  LOG_DENIAL_TEXT,
  SECTION_TITLE,
  daysLeftText,
  longDate,
  missionsDueText,
  pendingTodayText,
  progressText,
  streakText,
  xpDeltaText,
} from '../text';

/** Tras registrar, el botón ignora toques durante este tiempo: un doble toque no duplica (LOG-06). */
const TAP_COOLDOWN_MS = 400;

/** Pantalla Hoy (HOY-01 a HOY-07). */
export function TodayScreen() {
  const today = useToday();
  const records = useRecords();
  const categories = useCategories();
  const [forgottenOpen, setForgottenOpen] = useState(false);

  const view = useMemo(() => (records ? buildTodayView(records, today) : undefined), [records, today]);
  const forgotten = useMemo(() => (records ? forgottenYesterday(records, today) : []), [records, today]);
  const byId = useMemo(() => new Map(records?.map((r) => [r.activity.id, r])), [records]);
  const categoryById = useMemo(() => new Map(categories?.map((c) => [c.id, c])), [categories]);
  const missions = useTodayMissions();

  if (!view || !missions) return null;
  const summary = [
    view.hasDaily ? pendingTodayText(view.pendingToday) : undefined,
    missions.dueCount > 0 ? missionsDueText(missions.dueCount) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const allDone = view.pendingToday === 0 && missions.dueCount === 0;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="stack" style={{ gap: 'var(--s2)' }}>
        <Scene corner={<MusicButton />} />
        <h1>{longDate(today)}</h1>
        <LevelStrip />
        {summary && (
          <p className="pixel" style={{ color: allDone ? 'var(--success)' : 'var(--text-muted)' }}>
            {summary}
          </p>
        )}
      </header>

      {needsInstallForSafety() && (
        <div className="banner">
          <Sprite name="warning" color="var(--level)" />
          <p className="grow small">Instala ARVID en tu pantalla de inicio para proteger tus datos.</p>
          <Link to="/ajustes/instalar" className="btn">
            Cómo
          </Link>
        </div>
      )}

      <BackupReminder records={records ?? []} />

      {view.isEmpty ? (
        <Panel className="stack">
          <h2>Crea tu primera actividad</h2>
          <p className="muted">Algo que quieras hacer cada día, semana o mes. Empieza por una pequeña.</p>
          <Link to="/actividades/nueva" className="btn btn-primary">
            <Sprite name="plus" />
            Nueva actividad
          </Link>
        </Panel>
      ) : (
        view.sections.map((section) => (
          <section key={section.kind} className="stack" aria-labelledby={`sec-${section.kind}`}>
            <h2 id={`sec-${section.kind}`}>{SECTION_TITLE[section.kind]}</h2>
            <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {section.items.map((item) => (
                <TodayRow
                  key={item.activityId}
                  item={item}
                  record={byId.get(item.activityId)}
                  category={categoryById.get(item.categoryId)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <TodayMissionsSection view={missions} categoryById={categoryById} />

      {forgotten.length > 0 && (
        <button type="button" className="btn btn-ghost" onClick={() => setForgottenOpen(true)}>
          ¿Olvidaste algo ayer?
        </button>
      )}

      {forgottenOpen && (
        <ForgottenSheet records={records ?? []} categoryById={categoryById} onClose={() => setForgottenOpen(false)} />
      )}
    </div>
  );
}

function TodayRow({ item, record, category }: { item: TodayItem; record?: ActivityRecord; category?: Category }) {
  const ctx = useData();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  // Ref además del estado: dos toques en el mismo frame ven el mismo `busy` (LOG-06).
  const inFlight = useRef(false);
  const [feedback, setFeedback] = useState<{ key: number; text: string }>();

  const undoDate = record ? latestUndoableDate(record, today) : undefined;
  const streak = useAnalysis()?.byActivity.get(item.activityId)?.streak.current ?? 0;
  const loggable = record ? canLog(record, today, today).ok : false;

  async function run(action: () => Promise<string>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const cooldown = new Promise((r) => setTimeout(r, TAP_COOLDOWN_MS));
    try {
      setFeedback({ key: Date.now(), text: await action() });
      await cooldown;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const log = () =>
    run(async () => {
      const delta = record ? logDeltaCents(record, today, 1) : 0;
      const result = await logCompletion(ctx, item.activityId, today);
      if (!result.ok) return LOG_DENIAL_TEXT[result.reason];
      celebrate('small');
      if (navigator.vibrate) navigator.vibrate(15);
      return `+1 · ${progressText(item.count + 1, item.target)} · ${xpDeltaText(delta)}`;
    });

  const undo = () =>
    run(async () => {
      if (!undoDate || !record) return '';
      const delta = logDeltaCents(record, undoDate, -1);
      return (await undoCompletion(ctx, item.activityId, undoDate))
        ? `Registro deshecho · ${xpDeltaText(delta)}`
        : 'No se pudo deshacer';
    });

  const meta = [
    progressText(item.count, item.target),
    item.kind !== 'day' ? daysLeftText(item.daysRemaining) : undefined,
    streak > 0 ? streakText(streak, item.kind) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="panel row" style={{ padding: 'var(--s3)' }}>
      <span key={feedback?.key} className={feedback ? 'hop' : undefined}>
        <CategoryIcon category={category} />
      </span>
      <div className="grow stack" style={{ gap: 'var(--s1)' }}>
        <Link to={`/actividades/${item.activityId}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
          {item.name}
        </Link>
        <div className="row" style={{ gap: 'var(--s2)' }}>
          <Segments count={item.count} target={item.target} color={categoryColor(category)} />
          {item.done && <span className="chip chip-done">Completada</span>}
        </div>
        <p className="small muted">{meta}</p>
        <p aria-live="polite" className="small pixel" style={{ color: 'var(--success)', minHeight: '1.2em' }}>
          {feedback && (
            <span key={feedback.key} className="toast-pop">
              {feedback.text}
            </span>
          )}
        </p>
      </div>
      {undoDate && (
        <button
          type="button"
          className="btn btn-icon"
          aria-label={`Deshacer ${item.name}`}
          disabled={busy}
          onClick={() => void undo()}
        >
          <Sprite name="minus" />
        </button>
      )}
      {!item.done && (
        <button
          type="button"
          className="btn btn-primary btn-icon"
          aria-label={`Registrar ${item.name}`}
          disabled={busy || !loggable}
          onClick={() => void log()}
        >
          <Sprite name="plus" />
        </button>
      )}
    </li>
  );
}

/** HOY-05: registrar con fecha de ayer lo que quedó pendiente en un periodo ya cerrado. */
function ForgottenSheet({
  records,
  categoryById,
  onClose,
}: {
  records: ActivityRecord[];
  categoryById: Map<string, Category>;
  onClose: () => void;
}) {
  const ctx = useData();
  const today = useToday();
  const yesterday = addDays(today, -1);
  const items = forgottenYesterday(records, today);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="panel sheet stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgotten-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="row">
          <h2 id="forgotten-title" className="grow">
            Ayer, {longDate(yesterday).toLowerCase()}
          </h2>
          <button type="button" className="btn btn-icon btn-ghost" aria-label="Cerrar" onClick={onClose} autoFocus>
            <Sprite name="close" />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="muted">No queda nada pendiente de ayer.</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((item) => (
              <li key={item.activityId} className="row">
                <CategoryIcon category={categoryById.get(item.categoryId)} />
                <div className="grow">
                  <p>{item.name}</p>
                  <p className="small muted">{progressText(item.count, item.target)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-icon"
                  aria-label={`Registrar ${item.name} ayer`}
                  onClick={() =>
                    void logCompletion(ctx, item.activityId, yesterday).then((r) => r.ok && celebrate('small'))
                  }
                >
                  <Sprite name="plus" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Indicador compacto de nivel en Hoy; lleva a Personaje (PRG-04). */
function LevelStrip() {
  const progress = useAnalysis()?.progress;
  if (!progress) return null;
  return (
    <Link
      to="/personaje"
      className="level-strip"
      aria-label={`Nivel ${progress.level}, ${progress.title}. Ver personaje`}
    >
      <span className="pixel small" style={{ color: 'var(--level)', whiteSpace: 'nowrap' }}>
        Nv {progress.level} · {progress.title}
      </span>
      <XpBar xp={progress.xp} start={progress.levelStartXp} next={progress.nextLevelXp} compact />
    </Link>
  );
}

/** Aviso de backup (BAK-07). */
function BackupReminder({ records }: { records: ActivityRecord[] }) {
  const ctx = useData();
  const settings = useSettings();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  if (!settings) return null;
  const show = shouldRemindBackup({
    records,
    now: ctx.now(),
    today,
    lastBackupAt: settings.lastBackupAt,
    snoozedUntil: settings.backupReminderSnoozedUntil,
  });
  if (!show) return null;
  return (
    <div className="banner" role="region" aria-label="Copia de seguridad">
      <Sprite name="info" color="var(--level)" />
      <p className="grow small">Hace tiempo que no guardas una copia de tus datos.</p>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void exportData(ctx).finally(() => setBusy(false));
        }}
      >
        Exportar
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void saveSetting(ctx.db, 'backupReminderSnoozedUntil', addDays(today, 1))}
      >
        Más tarde
      </button>
    </div>
  );
}
