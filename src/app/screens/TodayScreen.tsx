import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { logCompletion, saveSetting, undoCompletion } from '../../data/repository';
import { playSfx } from '../sound/sfx';
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
import { t } from '../../i18n';
import { useArvidMoments } from '../arvid/moments';
import { Scene } from '../scene/Scene';
import { IntroSheet } from './Onboarding';
import { compareDates } from '../../domain/time/localDate';
import { celebrate, floatXp } from '../scene/engine';
import { TodayMissionsSection, useTodayMissions } from './missions/TodayMissions';
import { useCategories, useChallenges, useData, useRecords, useRests, useSettings } from '../data';
import { challengeDay } from '../../domain/challenges/challenges';
import { CategoryIcon, Panel, Segments, Sprite, XpBar, categoryColor } from '../design/components';
import {
  daysLeftText,
  levelTitle,
  logDenialText,
  sectionTitle,
  longDate,
  todaySummaryText,
  progressText,
  streakText,
  xpDeltaText,
} from '../text';
import { FlipList, useHeldOrder } from '../design/FlipList';
import { accountsEnabled } from '../account/account';

/** Tras registrar, el botón ignora toques durante este tiempo: un doble toque no duplica (LOG-06). */
const TAP_COOLDOWN_MS = 400;

/** Pantalla Hoy (HOY-01 a HOY-07). */
export function TodayScreen() {
  const today = useToday();
  const records = useRecords();
  const categories = useCategories();
  const [forgottenOpen, setForgottenOpen] = useState(false);
  const settings = useSettings();
  // Presentación de ARVID para quien hizo el onboarding sin alias, salvo que la haya pospuesto (PR-01, PR-02).
  // Se decide una vez al abrir Hoy: al guardar el alias a mitad de la presentación, esta sigue abierta.
  const [introOpen, setIntroOpen] = useState<boolean>();
  const needsIntro =
    !!settings && !settings.profile && !(settings.introSnoozedUntil && compareDates(today, settings.introSnoozedUntil as typeof today) < 0);
  if (settings && introOpen === undefined) setIntroOpen(needsIntro);
  const showIntro = introOpen === true;

  const view = useMemo(() => (records ? buildTodayView(records, today) : undefined), [records, today]);
  const forgotten = useMemo(() => (records ? forgottenYesterday(records, today) : []), [records, today]);
  const byId = useMemo(() => new Map(records?.map((r) => [r.activity.id, r])), [records]);
  const categoryById = useMemo(() => new Map(categories?.map((c) => [c.id, c])), [categories]);
  const missions = useTodayMissions();
  useArvidMoments(view, forgotten.length > 0, showIntro);

  if (!view || !missions) return null;
  // Día de descanso con cosas sin hacer: no es «día completo» (spec 12, DS-04)
  const restingLeft = view.sections.some((sec) => sec.items.some((i) => i.kind === 'day' && i.resting && !i.done));
  // «x actividades y x misiones pendientes» (D-160); día de descanso o día completo cuando no queda nada
  const activitiesLeft = view.hasDaily ? view.pendingToday : 0;
  const summary =
    view.hasDaily && view.pendingToday === 0 && restingLeft
      ? [t('rests.summary'), missions.dueCount > 0 ? todaySummaryText(0, missions.dueCount) : undefined].filter(Boolean).join(' · ')
      : activitiesLeft > 0 || missions.dueCount > 0
        ? todaySummaryText(activitiesLeft, missions.dueCount)
        : view.hasDaily
          ? t('format.dayComplete')
          : '';
  const allDone = view.pendingToday === 0 && missions.dueCount === 0 && !restingLeft;

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      {/* Escena, fecha y nivel quedan fijos arriba al hacer scroll (UB-05); la fecha va en la escena (UB-06) */}
      <header className="scene-sticky stack" style={{ gap: 'var(--s2)' }}>
        <Scene overlay={<h1 className="scene-date">{longDate(today)}</h1>} intro={longDate(today)} />
        <LevelStrip />
      </header>
      {summary && (
        // Junto al nivel, como antes de fijar la cabecera
        <p className="small" style={{ color: allDone ? 'var(--success)' : 'var(--text-muted)', marginTop: 'calc(-1 * var(--s2))' }}>
          {summary}
        </p>
      )}

      <AccountCard />

      {needsInstallForSafety() && (
        <div className="banner">
          <Sprite name="warning" color="var(--level)" />
          <p className="grow small">{t('today.installBanner')}</p>
          <Link to="/ajustes/instalar" className="btn">
            {t('common.how')}
          </Link>
        </div>
      )}

      <BackupReminder records={records ?? []} />

      <RestBanner />

      {view.isEmpty ? (
        <Panel className="stack">
          <h2>{t('today.emptyTitle')}</h2>
          <p className="muted">{t('today.emptyText')}</p>
          <Link to="/actividades/nueva" className="btn btn-primary">
            <Sprite name="plus" />
            {t('today.newActivity')}
          </Link>
        </Panel>
      ) : (
        view.sections.map((section) => (
          <section key={section.kind} className="stack" aria-labelledby={`sec-${section.kind}`}>
            <h2 id={`sec-${section.kind}`}>{sectionTitle(section.kind)}</h2>
            <TodaySectionList items={section.items} byId={byId} categoryById={categoryById} />
          </section>
        ))
      )}

      <TodayMissionsSection view={missions} categoryById={categoryById} />

      {forgotten.length > 0 && (
        <button type="button" className="btn btn-ghost" onClick={() => setForgottenOpen(true)}>
          {t('today.forgotYesterday')}
        </button>
      )}

      <Link to="/descansos" className="btn btn-ghost">
        {t('rests.plan')}
      </Link>

      {forgottenOpen && (
        <ForgottenSheet records={records ?? []} categoryById={categoryById} onClose={() => setForgottenOpen(false)} />
      )}

      {showIntro && <IntroSheet onClose={() => setIntroOpen(false)} />}
    </div>
  );
}

function TodayRow({ item, record, category }: { item: TodayItem; record?: ActivityRecord; category?: Category }) {
  const ctx = useData();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  // Ref además del estado: dos toques en el mismo frame ven el mismo `busy` (LOG-06).
  const inFlight = useRef(false);
  // `text`: lo que se anuncia (lectores de pantalla); `shown`: si además se ve (un registro que no se pudo hacer).
  // La XP ganada sale flotando sobre la cabeza del protagonista, en la escena (D-158)
  const [feedback, setFeedback] = useState<{ key: number; text: string; shown?: boolean }>();

  const undoDate = record ? latestUndoableDate(record, today) : undefined;
  const streak = useAnalysis()?.byActivity.get(item.activityId)?.streak.current ?? 0;
  const loggable = record ? canLog(record, today, today).ok : false;
  // Actividad de un reto: «Reto · día 3 de 7» (spec 15, RT-09)
  const challenge = useChallenges()?.find((c) => c.activityId === item.activityId && challengeDay(c.view.challenge, today) > 0 && challengeDay(c.view.challenge, today) <= c.view.challenge.days);

  async function run(action: () => Promise<{ text: string; shown?: boolean }>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const cooldown = new Promise((r) => setTimeout(r, TAP_COOLDOWN_MS));
    try {
      setFeedback({ key: Date.now(), ...(await action()) });
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
      if (!result.ok) return { text: logDenialText(result.reason), shown: true };
      celebrate('small');
      playSfx('log');
      playSfx('xp', { delayMs: 130 });
      if (navigator.vibrate) navigator.vibrate(15);
      floatXp(xpDeltaText(delta));
      return { text: t('today.logged', { progress: progressText(item.count + 1, item.target), xp: xpDeltaText(delta) }) };
    });

  const undo = () =>
    run(async () => {
      if (!undoDate || !record) return { text: '' };
      const delta = logDeltaCents(record, undoDate, -1);
      const undone = await undoCompletion(ctx, item.activityId, undoDate);
      if (!undone) return { text: t('today.undoFailed'), shown: true };
      playSfx('undo');
      floatXp(xpDeltaText(delta));
      return { text: t('today.undone', { xp: xpDeltaText(delta) }) };
    });

  // Con varias veces por periodo caben «−» y «+» a la vez: se reserva siempre su sitio para que la barra no se mueva
  const twoSlots = item.target > 1;
  const meta = [
    progressText(item.count, item.target),
    item.kind !== 'day' ? daysLeftText(item.daysRemaining) : undefined,
    streak > 0 ? streakText(streak, item.kind) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={`panel row activity-row${item.done ? ' done' : ''}`} style={{ padding: 'var(--s3)' }} data-flip-key={item.activityId}>
      <span key={feedback?.key} className={feedback ? 'hop' : undefined}>
        <CategoryIcon category={category} />
      </span>
      <div className="grow stack" style={{ gap: 'var(--s1)' }}>
        {/* La etiqueta va junto al nombre (más alto que ella): al completar, la tarjeta no crece ni la barra se mueve */}
        <div className="row activity-head">
          <Link to={`/actividades/${item.activityId}`} className="activity-name grow">
            {item.name}
          </Link>
          {item.resting && !item.done && <span className="chip chip-muted">{t('rests.chip')}</span>}
          {challenge && <span className="chip">{t('challenges.chip', { day: challengeDay(challenge.view.challenge, today), days: challenge.view.challenge.days })}</span>}
        </div>
        <Segments count={item.count} target={item.target} color={categoryColor(category)} />
        <p className="small muted">{meta}</p>
        <p aria-live="polite" className="sr-only">
          {feedback?.text}
        </p>
        {feedback?.shown && (
          <p key={feedback.key} className="small" style={{ color: 'var(--warning)' }} aria-hidden="true">
            {feedback.text}
          </p>
        )}
      </div>
      {/* «Hecho» entre la barra y el botón (como la maqueta); entra deslizándose para que la barra no salte */}
      <span className={`chip chip-done done-chip${item.done ? ' shown' : ''}`} aria-hidden={!item.done}>
        {t('today.doneChip')}
      </span>
      {undoDate ? (
        <button
          type="button"
          className="btn btn-primary btn-icon"
          aria-label={t('today.undoLabel', { name: item.name })}
          disabled={busy}
          onClick={() => void undo()}
        >
          <Sprite name="minus" scale={1} />
        </button>
      ) : (
        twoSlots && <span className="btn-slot" aria-hidden="true" />
      )}
      {!item.done ? (
        <button
          type="button"
          className="btn btn-primary btn-icon"
          aria-label={t('today.logLabel', { name: item.name })}
          disabled={busy || !loggable}
          onClick={() => void log()}
        >
          <Sprite name="plus" scale={1} />
        </button>
      ) : (
        twoSlots && <span className="btn-slot" aria-hidden="true" />
      )}
    </li>
  );
}

/**
 * Las tarjetas de una sección (D-162): al completar una, se queda en su sitio mientras se ve su animación y luego baja
 * deslizándose entre las demás.
 */
function TodaySectionList({
  items,
  byId,
  categoryById,
}: {
  items: TodayItem[];
  byId: Map<string, ActivityRecord>;
  categoryById: Map<string, Category>;
}) {
  const shown = useHeldOrder(items, (i) => i.activityId, (i) => i.done);
  return (
    <FlipList className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {shown.map((item) => (
        <TodayRow key={item.activityId} item={item} record={byId.get(item.activityId)} category={categoryById.get(item.categoryId)} />
      ))}
    </FlipList>
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
            {t('today.yesterdayTitle', { date: longDate(yesterday).toLowerCase() })}
          </h2>
          <button type="button" className="btn btn-icon btn-ghost" aria-label={t('common.close')} onClick={onClose} autoFocus>
            <Sprite name="close" />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="muted">{t('today.nothingYesterday')}</p>
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
                  aria-label={t('today.logYesterdayLabel', { name: item.name })}
                  onClick={() =>
                    void logCompletion(ctx, item.activityId, yesterday).then((r) => {
                      if (!r.ok) return;
                      celebrate('small');
                      playSfx('log');
                      playSfx('xp', { delayMs: 130 });
                    })
                  }
                >
                  <Sprite name="plus" scale={1} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** «Hoy descansas» (spec 12, DS-04): con la nota del descanso que cubre todo el día, o del primero que afecte a algo. */
function RestBanner() {
  const today = useToday();
  const rests = useRests();
  const rest = rests
    ?.filter((r) => compareDates(r.from, today) <= 0 && compareDates(today, r.to) <= 0)
    .sort((a, b) => Number(!!a.activityIds) - Number(!!b.activityIds))[0];
  if (!rest) return null;
  return (
    <div className="banner" role="status">
      <Sprite name="info" color="var(--success)" />
      <p className="grow small">{rest.note ? t('rests.todayNote', { note: rest.note }) : t('rests.today')}</p>
      <Link to="/descansos" className="btn">
        {t('common.edit')}
      </Link>
    </div>
  );
}

/** Indicador compacto de nivel en Hoy; lleva a Personaje (PRG-04). */
function LevelStrip() {
  const progress = useAnalysis()?.progress;
  if (!progress) return null;
  return (
    <Link
      to="/perfil"
      className="level-strip"
      aria-label={t('level.stripLabel', { level: progress.level, title: levelTitle(progress.level) })}
    >
      <span className="pixel small" style={{ color: 'var(--level)', whiteSpace: 'nowrap' }}>
        {t('level.short', { level: progress.level, title: levelTitle(progress.level) })}
      </span>
      <XpBar xp={progress.xp} start={progress.levelStartXp} next={progress.nextLevelXp} compact />
    </Link>
  );
}

/** A quien ya usaba la app se le ofrece una vez guardar su progreso en la nube (spec 14, CU-01). */
function AccountCard() {
  const ctx = useData();
  const settings = useSettings();
  if (!accountsEnabled() || !settings?.onboardingCompletedAt || settings.account || settings.accountOffered) return null;
  const dismiss = () => void saveSetting(ctx.db, 'accountOffered', true);
  return (
    <div className="banner" role="region" aria-label={t('account.saveTitle')}>
      <p className="grow small">{t('account.cardText')}</p>
      <Link to="/ajustes" className="btn btn-primary" onClick={dismiss}>
        {t('account.cardGo')}
      </Link>
      <button type="button" className="btn btn-ghost" onClick={dismiss}>
        {t('account.notNow')}
      </button>
    </div>
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
    <div className="banner" role="region" aria-label={t('today.backupRegion')}>
      <Sprite name="info" color="var(--level)" />
      <p className="grow small">{t('today.backupReminder')}</p>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void exportData(ctx).finally(() => setBusy(false));
        }}
      >
        {t('common.export')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void saveSetting(ctx.db, 'backupReminderSnoozedUntil', addDays(today, 1))}
      >
        {t('common.later')}
      </button>
    </div>
  );
}
