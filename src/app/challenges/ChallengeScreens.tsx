// Retos entre amigos (spec 15, fase 15b): la sección «Retos» de Objetivos (S15-03), crear un reto (RT-02), el
// detalle con el marcador (MK) y abrir un enlace de reto (IN-02 a IN-05, AM-03). Detrás de la cuenta (D-140).
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import {
  MAX_DAYS,
  MAX_PARTICIPANTS,
  MAX_START_DAYS,
  MIN_DAYS,
  QUICK_DAYS,
  challengeDay,
  endDate,
  groupGoal,
  ranking,
  type ChallengeDifficulty,
  type ChallengeMode,
  type ChallengeView,
  type LocalChallenge,
  type Participant,
} from '../../domain/challenges/challenges';
import { addDays, type LocalDate } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { AccountPanel, Confirm, errorText } from '../account/AccountPanel';
import { accountsEnabled, type DeviceAccount } from '../account/account';
import { useToday } from '../clock';
import { useCategories, useChallenges, useData, useSettings } from '../data';
import { BackLink, CategoryIcon, Panel } from '../design/components';
import { requestFriend, shareLink, iosBrowser } from '../friends/friends';
import { categoryName, dayMonth, difficultyLabel, intText } from '../text';
import { cancelChallenge, challengeLink, createChallenge, getChallenge, joinChallenge, leaveChallenge, refreshChallenge, type ChallengeInput } from './challenges';

const DIFFICULTIES: ChallengeDifficulty[] = ['easy', 'medium', 'hard'];

const dm = (d: string) => dayMonth(d as LocalDate);

/** «Reto · día 3 de 7», «Empieza el 2 nov», «Terminado». */
export function challengeStatusText(view: ChallengeView, today: string): string {
  const c = view.challenge;
  if (c.cancelled) return t('challenges.cancelled');
  const day = challengeDay(c, today);
  if (day === 0) return t('challenges.startsOn', { date: dm(c.start) });
  if (day > c.days) return t('challenges.finished');
  return t('challenges.dayOf', { day, days: c.days });
}

// ---------- Sección «Retos» en Objetivos ----------

export function ChallengesSection() {
  const settings = useSettings();
  const challenges = useChallenges();
  const today = useToday();
  if (!settings || !challenges || !accountsEnabled()) return null;
  const sorted = [...challenges].sort((a, b) => endDate(b.view.challenge).localeCompare(endDate(a.view.challenge)));
  const current = sorted.filter((l) => !l.left && !l.view.challenge.cancelled && endDate(l.view.challenge) >= today);
  return (
    <section className="stack">
      <header className="row">
        <h2 className="grow">{t('challenges.title')}</h2>
        <Link to="/retos/nuevo" className="btn btn-primary">
          {t('challenges.new')}
        </Link>
      </header>
      {current.length === 0 && <p className="muted">{t('challenges.empty')}</p>}
      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {sorted.map((l) => (
          <ChallengeRow key={l.id} local={l} today={today} />
        ))}
      </ul>
    </section>
  );
}

function ChallengeRow({ local, today }: { local: LocalChallenge; today: string }) {
  const c = local.view.challenge;
  return (
    <li>
      <Link to={`/retos/${c.id}`} className="panel row" style={{ color: 'var(--text)', textDecoration: 'none', padding: 'var(--s3)' }}>
        <span className="grow stack" style={{ gap: 'var(--s1)' }}>
          <span>{c.name}</span>
          <span className="small muted">
            {t(`challenges.mode.${c.mode}`)} · {local.left ? t('challenges.youLeft') : challengeStatusText(local.view, today)} ·{' '}
            {t('challenges.people', { count: local.view.participants.length })}
          </span>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
    </li>
  );
}

// ---------- Crear un reto (RT-02) ----------

function NeedAccount({ text }: { text: string }) {
  return (
    <>
      <p className="muted">{text}</p>
      <AccountPanel />
    </>
  );
}

function CategoryChoice({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const categories = useCategories();
  const options = (categories ?? []).filter((c) => c.active && !c.archivedAt);
  useEffect(() => {
    if (!value && options[0]) onChange(options[0].id);
  });
  return (
    <fieldset className="field">
      <legend>{t('challenges.area')}</legend>
      <div className="choice-group">
        {options.map((c) => (
          <label key={c.id} className="choice">
            <input type="radio" name="challenge-area" checked={value === c.id} onChange={() => onChange(c.id)} />
            <CategoryIcon category={c} />
            {categoryName(c)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ChallengeFormScreen() {
  const settings = useSettings();
  const ctx = useData();
  const today = useToday();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');
  const [days, setDays] = useState(7);
  const [start, setStart] = useState<string>(today);
  const [mode, setMode] = useState<ChallengeMode>('coop');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (!settings) return null;
  if (!accountsEnabled()) return <Navigate to="/objetivos" replace />;
  const account = settings.account;
  const maxStart = addDays(today, MAX_START_DAYS);
  const valid = name.trim().length > 0 && days >= MIN_DAYS && days <= MAX_DAYS && start >= today && start <= maxStart && !!categoryId;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!account || !valid) return;
    setBusy(true);
    try {
      const input: ChallengeInput = { name: name.trim(), difficulty, days, start, mode };
      const id = await createChallenge(ctx, account, input, categoryId);
      navigate(`/retos/${id}`, { replace: true });
    } catch (err) {
      setError(challengeError(err));
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/objetivos" label={t('goals.title')} />
      <h1>{t('challenges.newTitle')}</h1>
      {!account ? (
        <NeedAccount text={t('friends.needAccount')} />
      ) : (
        <form className="stack" style={{ gap: 'var(--s5)' }} onSubmit={(e) => void submit(e)} noValidate>
          <div className="field">
            <label htmlFor="challenge-name">{t('challenges.name')}</label>
            <input id="challenge-name" type="text" value={name} maxLength={40} placeholder={t('challenges.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
          </div>
          <CategoryChoice value={categoryId} onChange={setCategoryId} />
          <fieldset className="field">
            <legend>{t('challenges.difficulty')}</legend>
            <div className="choice-group">
              {DIFFICULTIES.map((d) => (
                <label key={d} className="choice">
                  <input type="radio" name="challenge-difficulty" checked={difficulty === d} onChange={() => setDifficulty(d)} />
                  {difficultyLabel(d)}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend>{t('challenges.duration')}</legend>
            <div className="choice-group">
              {QUICK_DAYS.map((d) => (
                <label key={d} className="choice">
                  <input type="radio" name="challenge-days" checked={days === d} onChange={() => setDays(d)} />
                  {t('challenges.days', { count: d })}
                </label>
              ))}
            </div>
            <label className="row small">
              <span>{t('challenges.otherDays')}</span>
              <input
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ maxWidth: 90 }}
                aria-label={t('challenges.otherDaysLabel', { min: MIN_DAYS, max: MAX_DAYS })}
              />
            </label>
          </fieldset>
          <div className="field">
            <label htmlFor="challenge-start">{t('challenges.start')}</label>
            <input id="challenge-start" type="date" min={today} max={maxStart} value={start} onChange={(e) => setStart(e.target.value)} style={{ maxWidth: 220 }} />
            <p className="small muted">{t('challenges.until', { date: dm(endDate({ start, days: Math.max(1, days || 1) })) })}</p>
          </div>
          <fieldset className="field">
            <legend>{t('challenges.modeLabel')}</legend>
            <div className="choice-group">
              {(['coop', 'versus'] as const).map((m) => (
                <label key={m} className="choice">
                  <input type="radio" name="challenge-mode" checked={mode === m} onChange={() => setMode(m)} />
                  <span className="stack" style={{ gap: 0 }}>
                    {t(`challenges.mode.${m}`)}
                    <span className="small muted">{t(`challenges.modeHint.${m}`)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
            {t('challenges.create')}
          </button>
        </form>
      )}
    </div>
  );
}

function challengeError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === 'too-many' || code === 'started' || code === 'full' || code === 'unavailable') return t(`challenges.errors.${code}`);
  return errorText(e);
}

// ---------- El marcador (MK) ----------

function Crown() {
  return (
    <svg width="14" height="12" viewBox="0 0 7 6" shapeRendering="crispEdges" aria-hidden="true" style={{ color: 'var(--xp)' }}>
      <path fill="currentColor" d="M0 1h1v1h1v1h1V0h1v3h1V2h1V1h1v5H0z" />
    </svg>
  );
}

/** Tira de días: cumplido, no cumplido o por llegar (MK-01). */
function DayStrip({ view, participant, today }: { view: ChallengeView; participant: Participant; today: string }) {
  const c = view.challenge;
  const done = new Set(participant.done);
  const dates = Array.from({ length: c.days }, (_, i) => addDays(c.start as LocalDate, i) as string);
  return (
    <span style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }} aria-hidden="true">
      {dates.map((d) => {
        const counted = done.has(d) && (!participant.left || d < participant.left);
        const future = d >= today || (participant.left && d >= participant.left);
        return (
          <span
            key={d}
            title={d}
            style={{
              display: 'inline-block',
              flex: 'none',
              width: 10,
              height: 10,
              background: counted ? 'var(--c-cyan)' : 'transparent',
              border: `1px solid ${counted ? 'var(--c-cyan)' : future ? 'var(--border)' : 'var(--c-red)'}`,
              opacity: future && !counted ? 0.5 : 1,
            }}
          />
        );
      })}
    </span>
  );
}

function Scoreboard({ view, me, today }: { view: ChallengeView; me: string; today: string }) {
  const c = view.challenge;
  const rows = ranking(view);
  const goal = groupGoal(view);
  const leader = c.mode === 'versus' && rows[0] && rows[0].days > 0 ? rows[0].days : undefined;
  return (
    <Panel className="stack">
      {c.mode === 'coop' && (
        <div className="stack" style={{ gap: 'var(--s1)' }}>
          <div className="xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={goal.goal} aria-valuenow={goal.done} aria-label={t('challenges.groupGoal')} style={{ height: 10 }}>
            <span style={{ width: `${Math.min(100, goal.goal ? (goal.done / goal.goal) * 100 : 0)}%` }} />
          </div>
          <p className="small">{t('challenges.groupProgress', { done: intText(goal.done), goal: intText(goal.goal) })}</p>
        </div>
      )}
      <ol className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map(({ participant: p, days, place }) => {
          const todayDone = p.done.includes(today) && !p.left;
          const status = p.left ? t('challenges.left') : todayDone ? t('challenges.todayDone') : '';
          return (
            <li key={p.id} className="stack" style={{ gap: 'var(--s1)' }}>
              <span className="row small">
                {c.mode === 'versus' && <span className="pixel">{place}.</span>}
                {leader !== undefined && days === leader && <Crown />}
                <span className="grow">
                  {p.alias}
                  {p.id === me ? ` (${t('challenges.you')})` : ''}
                </span>
                <span className="muted">{t('challenges.daysDone', { count: days })}</span>
                {status && <span className={p.left ? 'muted' : ''}>{status}</span>}
              </span>
              <DayStrip view={view} participant={p} today={today} />
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ---------- Detalle del reto ----------

export function ChallengeScreen() {
  const { id = '' } = useParams();
  const settings = useSettings();
  const ctx = useData();
  const today = useToday();
  const navigate = useNavigate();
  const local = useChallenges()?.find((l) => l.id === id);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<'leave' | 'cancel'>();
  const [copied, setCopied] = useState(false);
  const account = settings?.account;

  useEffect(() => {
    if (!account || !accountsEnabled()) return;
    refreshChallenge(ctx, account, id).catch(() => undefined);
  }, [ctx, account, id]);

  if (!settings) return null;
  if (!accountsEnabled()) return <Navigate to="/objetivos" replace />;
  if (!local) return <Navigate to={`/r/${id}`} replace />;
  const view = local.view;
  const c = view.challenge;
  const me = account?.id ?? '';
  const started = today >= c.start;
  const ended = endDate(c) < today;
  const canInvite = !c.cancelled && !local.left && today <= c.start && view.participants.length < MAX_PARTICIPANTS;

  const act = async (fn: (a: DeviceAccount) => Promise<unknown>) => {
    if (!account) return;
    try {
      await fn(account);
    } catch (e) {
      setError(challengeError(e));
    }
  };

  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/objetivos" label={t('goals.title')} />
      <header className="stack" style={{ gap: 'var(--s1)' }}>
        <h1>{c.name}</h1>
        <p className="small muted">
          {t(`challenges.mode.${c.mode}`)} · {local.left ? t('challenges.youLeft') : challengeStatusText(view, today)} ·{' '}
          {t('challenges.range', { from: dm(c.start), to: dm(endDate(c)) })}
        </p>
        <p className="small muted">{t('challenges.updated', { time: new Date(local.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</p>
      </header>
      {canInvite && (
        <Panel className="stack">
          <p className="small">{t('challenges.inviteHint', { date: dm(c.start) })}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => setCopied((await shareLink(challengeLink(c.id), t('challenges.shareText', { name: c.name }))) === 'copied')}
          >
            {t('challenges.invite')}
          </button>
          {copied && (
            <p className="small" role="status">
              {t('friends.copied')}
            </p>
          )}
        </Panel>
      )}
      <Scoreboard view={view} me={me} today={today} />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {!local.left && !c.cancelled && !ended && (
        <div className="row">
          {c.owner === me && !started && (
            <button type="button" className="btn grow" onClick={() => setConfirm('cancel')}>
              {t('challenges.cancel')}
            </button>
          )}
          <button type="button" className="btn btn-danger grow" onClick={() => setConfirm('leave')}>
            {t('challenges.leave')}
          </button>
        </div>
      )}
      {confirm && (
        <Confirm
          title={t(confirm === 'leave' ? 'challenges.leaveTitle' : 'challenges.cancelTitle')}
          text={t(confirm === 'leave' ? 'challenges.leaveText' : 'challenges.cancelText')}
          yes={t(confirm === 'leave' ? 'challenges.leave' : 'challenges.cancel')}
          danger
          onCancel={() => setConfirm(undefined)}
          onYes={() => {
            const kind = confirm;
            setConfirm(undefined);
            void act((a) => (kind === 'leave' ? leaveChallenge : cancelChallenge)(ctx, a, c.id)).then(() => kind === 'cancel' && navigate('/objetivos'));
          }}
        />
      )}
    </div>
  );
}

// ---------- Abrir un enlace de reto (IN-02) ----------

export function ChallengeLinkScreen() {
  const { id = '' } = useParams();
  const settings = useSettings();
  if (!settings) return null;
  if (!accountsEnabled()) return <Navigate to="/hoy" replace />;
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      {iosBrowser() && (
        <Panel className="stack">
          <p className="small">{t('friends.openInApp')}</p>
          <button type="button" className="btn" onClick={() => void navigator.clipboard.writeText(location.href)}>
            {t('friends.copyLink')}
          </button>
        </Panel>
      )}
      {settings.account ? <ChallengeInvitation account={settings.account} id={id} /> : <NeedAccount text={t('challenges.linkNeedAccount')} />}
    </div>
  );
}

function ChallengeInvitation({ account, id }: { account: DeviceAccount; id: string }) {
  const ctx = useData();
  const today = useToday();
  const navigate = useNavigate();
  const local = useChallenges()?.find((l) => l.id === id);
  const [view, setView] = useState<ChallengeView | 'unavailable'>();
  const [error, setError] = useState<string>();
  const [categoryId, setCategoryId] = useState('');
  const [joined, setJoined] = useState<ChallengeView>();
  const [requested, setRequested] = useState(false);
  // Al aceptar, la copia local aparece antes de la respuesta: no se salta todavía al detalle
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let live = true;
    getChallenge(account, id).then(
      (v) => live && setView(v),
      (e) => live && (e?.status === 404 ? setView('unavailable') : setError(errorText(e))),
    );
    return () => {
      live = false;
    };
  }, [account, id]);

  if (local && !joined && !accepting) return <Navigate to={`/retos/${id}`} replace />;
  if (error) return <p role="alert">{error}</p>;
  if (!view) return <p className="muted">{t('friends.loading')}</p>;
  if (view === 'unavailable' || view.challenge.cancelled)
    return (
      <Panel className="stack">
        <h1>{t('friends.unavailable')}</h1>
        <Link to="/objetivos" className="btn">
          {t('goals.title')}
        </Link>
      </Panel>
    );

  const c = view.challenge;
  const owner = view.participants.find((p) => p.id === c.owner);
  const ownerAlias = owner?.alias ?? '—';

  // Tras aceptar: si quien invitó no es tu amigo, se ofrece añadirlo (AM-03)
  if (joined)
    return (
      <Panel className="stack">
        <h1>{t('challenges.joined', { name: c.name })}</h1>
        {!joined.ownerFriend && c.owner !== account.id && (
          <button
            type="button"
            className="btn"
            disabled={requested}
            onClick={async () => {
              try {
                await requestFriend(account, c.owner);
                setRequested(true);
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            {requested ? t('challenges.requestSent') : t('challenges.addFriend', { alias: ownerAlias })}
          </button>
        )}
        <Link to={`/retos/${c.id}`} className="btn btn-primary">
          {t('challenges.see')}
        </Link>
      </Panel>
    );

  const closed = today > c.start;
  const full = view.participants.length >= MAX_PARTICIPANTS;
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <Panel className="stack">
        <h1>{t('challenges.invites', { alias: ownerAlias })}</h1>
        <p>
          <strong>{c.name}</strong>
        </p>
        <p className="small muted">
          {t(`challenges.mode.${c.mode}`)} · {t('challenges.days', { count: c.days })} · {t('challenges.range', { from: dm(c.start), to: dm(endDate(c)) })} ·{' '}
          {difficultyLabel(c.difficulty)}
        </p>
        <p className="small">{view.participants.map((p) => p.alias).join(', ')}</p>
        {closed ? (
          <p role="alert">{t('challenges.errors.started')}</p>
        ) : full ? (
          <p role="alert">{t('challenges.errors.full')}</p>
        ) : null}
      </Panel>
      {!closed && !full && (
        <>
          <CategoryChoice value={categoryId} onChange={setCategoryId} />
          <div className="row">
            <button type="button" className="btn grow" onClick={() => navigate('/objetivos')}>
              {t('friends.reject')}
            </button>
            <button
              type="button"
              className="btn btn-primary grow"
              disabled={!categoryId}
              onClick={async () => {
                setAccepting(true);
                try {
                  setJoined(await joinChallenge(ctx, account, c.id, categoryId));
                } catch (e) {
                  setError(challengeError(e));
                  setAccepting(false);
                }
              }}
            >
              {t('friends.accept')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
