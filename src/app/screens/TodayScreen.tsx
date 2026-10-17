import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { logCompletion, undoCompletion } from '../../data/repository';
import { canLog, latestUndoableDate } from '../../domain/activities/rules';
import { buildTodayView, forgottenYesterday, type TodayItem } from '../../domain/activities/today';
import type { ActivityRecord } from '../../domain/activities/types';
import type { Category } from '../../domain/categories';
import { addDays } from '../../domain/time/localDate';
import { needsInstallForSafety } from '../../pwa/platform';
import { useToday } from '../clock';
import { useCategories, useData, useRecords } from '../data';
import { CategoryIcon, Panel, Segments, Sprite, categoryColor } from '../design/components';
import {
  LOG_DENIAL_TEXT,
  SECTION_TITLE,
  daysLeftText,
  longDate,
  pendingTodayText,
  progressText,
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

  if (!view) return null;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <header className="stack" style={{ gap: 'var(--s1)' }}>
        <h1>{longDate(today)}</h1>
        {view.hasDaily && (
          <p className="pixel" style={{ color: view.pendingToday === 0 ? 'var(--success)' : 'var(--text-muted)' }}>
            {pendingTodayText(view.pendingToday)}
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

      {forgotten.length > 0 && (
        <button type="button" className="btn btn-ghost" onClick={() => setForgottenOpen(true)}>
          ¿Olvidaste algo ayer?
        </button>
      )}

      {forgottenOpen && (
        <ForgottenSheet
          records={records ?? []}
          categoryById={categoryById}
          onClose={() => setForgottenOpen(false)}
        />
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
  const loggable = record ? canLog(record, today, today).ok : false;

  async function run(action: () => Promise<string>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const [text] = await Promise.all([action(), new Promise((r) => setTimeout(r, TAP_COOLDOWN_MS))]);
      setFeedback({ key: Date.now(), text });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const log = () =>
    run(async () => {
      const result = await logCompletion(ctx, item.activityId, today);
      if (!result.ok) return LOG_DENIAL_TEXT[result.reason];
      if (navigator.vibrate) navigator.vibrate(15);
      return `+1 · ${progressText(item.count + 1, item.target)}`;
    });

  const undo = () =>
    run(async () => {
      if (!undoDate) return '';
      return (await undoCompletion(ctx, item.activityId, undoDate)) ? 'Registro deshecho' : 'No se pudo deshacer';
    });

  const meta = [progressText(item.count, item.target), item.kind !== 'day' ? daysLeftText(item.daysRemaining) : undefined]
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
                  onClick={() => void logCompletion(ctx, item.activityId, yesterday)}
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
