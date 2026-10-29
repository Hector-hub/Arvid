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
  challengeResult,
  countedDays,
  endDate,
  fulfilled,
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
import { loadFriends, type FriendCard } from '../friends/friends';
import { categoryName, dayMonth, difficultyLabel, intText } from '../text';
import { cancelChallenge, createChallenge, declineInvite, inviteFriend, joinChallenge, leaveChallenge, refreshChallenge, type ChallengeInput, type ChallengeInvite } from './challenges';

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

/** El resultado en una frase (FN-01 a FN-03), o `undefined` mientras dura. */
export function resultText(view: ChallengeView, me: string, today: string): string | undefined {
  const r = challengeResult(view, me, today);
  if (r.state === 'running') return undefined;
  if (r.state === 'pending') return t('challenges.resultPending', { date: dm(r.resultOn) });
  if (r.state === 'coop') return r.success ? t('challenges.coopWon') : t('challenges.coopLost', { percent: r.percent });
  const head =
    r.winners.length === 0
      ? t('challenges.noWinner')
      : r.winners.length > 1
        ? t('challenges.tie', { names: r.winners.map((w) => w.alias).join(', ') })
        : t('challenges.won', { alias: r.winners[0]!.alias });
  return r.place ? `${head} ${t('challenges.yourPlace', { place: r.place })}` : head;
}

// ---------- Retos cumplidos en el Perfil (FN-04) ----------

export function FinishedChallenges() {
  const settings = useSettings();
  const challenges = useChallenges();
  const today = useToday();
  const me = settings?.account?.id;
  if (!me || !challenges || !accountsEnabled()) return null;
  const finished = challenges
    .filter((l) => {
      const r = challengeResult(l.view, me, today);
      return r.state === 'coop' || r.state === 'versus';
    })
    .sort((a, b) => endDate(b.view.challenge).localeCompare(endDate(a.view.challenge)));
  if (finished.length === 0) return null;
  const count = finished.filter((l) => fulfilled(l.view, me, today)).length;
  return (
    <Panel className="stack">
      <h2>{t('challenges.fulfilledTitle', { count })}</h2>
      <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {finished.map((l) => {
          const c = l.view.challenge;
          const mine = l.view.participants.find((p) => p.id === me);
          const days = mine ? countedDays(c, mine).length : 0;
          const ok = fulfilled(l.view, me, today);
          return (
            <li key={c.id}>
              <Link to={`/retos/${c.id}`} className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
                <span aria-hidden="true" style={{ color: ok ? 'var(--c-cyan)' : 'var(--text-muted, inherit)', width: '1.2em' }}>
                  {ok ? '✓' : '·'}
                </span>
                <span className="grow stack" style={{ gap: 0 }}>
                  <span>
                    {c.name}
                    <span className="sr-only">{ok ? ` · ${t('challenges.fulfilled')}` : ''}</span>
                  </span>
                  <span className="small muted">
                    {t('challenges.range', { from: dm(c.start), to: dm(endDate(c)) })} · {t(`challenges.mode.${c.mode}`)} · {resultText(l.view, me, today)} ·{' '}
                    {t('challenges.yourDays', { days, total: c.days })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
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
      <Invitations title />
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
  const [invitees, setInvitees] = useState<string[]>([]);
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
      // IN-11: las invitaciones salen al crearlo; si alguna falla, se puede repetir desde el detalle
      for (const friendId of invitees) await inviteFriend(ctx, account, id, friendId).catch(() => undefined);
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
          <fieldset className="field">
            <legend>{t('challenges.inviteFriends')}</legend>
            <FriendPicker account={account} exclude={[]} selected={invitees} onChange={setInvitees} />
            <p className="small muted">{t('challenges.inviteFormHint')}</p>
          </fieldset>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
            {invitees.length ? t('challenges.createInvite', { count: invitees.length }) : t('challenges.create')}
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
  const account = settings?.account;

  useEffect(() => {
    if (!account || !accountsEnabled()) return;
    refreshChallenge(ctx, account, id).catch(() => undefined);
  }, [ctx, account, id]);

  if (!settings) return null;
  if (!accountsEnabled()) return <Navigate to="/objetivos" replace />;
  if (!local) return <Navigate to="/objetivos" replace />;
  const view = local.view;
  const c = view.challenge;
  const me = account?.id ?? '';
  const started = today >= c.start;
  const ended = endDate(c) < today;
  const result = resultText(view, me, today);
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
      {result && (
        <Panel className="stack">
          <h2>{result}</h2>
        </Panel>
      )}
      {canInvite && account && <InviteFriendsPanel account={account} local={local} />}
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
            void act((a) => (kind === 'leave' ? leaveChallenge : cancelChallenge)(ctx, a, c.id)).then(() => navigate('/objetivos'));
          }}
        />
      )}
    </div>
  );
}

// ---------- Invitar amigos (IN-11, IN-12) ----------

/** Casillas con tus amigos (menos los que ya están en el reto); `selected` y `onChange` los controla quien la usa. */
function FriendPicker({ account, exclude, selected, onChange }: { account: DeviceAccount; exclude: string[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [friends, setFriends] = useState<FriendCard[] | 'error'>();
  useEffect(() => {
    let live = true;
    loadFriends(account).then(
      (l) => live && setFriends(l.friends),
      () => live && setFriends('error'),
    );
    return () => {
      live = false;
    };
  }, [account]);
  if (!friends) return <p className="small muted">{t('friends.loading')}</p>;
  if (friends === 'error') return <p className="small muted">{t('challenges.friendsOffline')}</p>;
  const options = friends.filter((f) => !exclude.includes(f.id));
  if (options.length === 0)
    return (
      <p className="small muted">
        {t('challenges.noFriends')} <Link to="/perfil/amigos">{t('friends.title')}</Link>
      </p>
    );
  return (
    <div className="stack" style={{ gap: 'var(--s1)' }}>
      {options.map((f) => (
        <label key={f.id} className="choice">
          <input
            type="checkbox"
            checked={selected.includes(f.id)}
            onChange={(e) => onChange(e.target.checked ? [...selected, f.id] : selected.filter((x) => x !== f.id))}
          />
          <span className="grow">{f.alias}</span>
          <span className="small muted">{t('friends.level', { level: intText(f.level) })}</span>
        </label>
      ))}
    </div>
  );
}

/** «Invitar amigos» en el detalle del reto, hasta el día de inicio (IN-12). */
function InviteFriendsPanel({ account, local }: { account: DeviceAccount; local: LocalChallenge }) {
  const ctx = useData();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const c = local.view.challenge;
  if (!open)
    return (
      <Panel className="stack">
        <p className="small">{t('challenges.inviteHint', { date: dm(c.start) })}</p>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          {t('challenges.inviteFriends')}
        </button>
        {sent.length > 0 && (
          <p className="small" role="status">
            {t('challenges.invitesSent', { count: sent.length })}
          </p>
        )}
      </Panel>
    );
  return (
    <Panel className="stack">
      <h2>{t('challenges.inviteFriends')}</h2>
      <FriendPicker account={account} exclude={[...local.view.participants.map((p) => p.id), ...sent]} selected={selected} onChange={setSelected} />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="row">
        <button type="button" className="btn grow" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={selected.length === 0}
          onClick={async () => {
            try {
              for (const id of selected) await inviteFriend(ctx, account, c.id, id);
              setSent((s) => [...s, ...selected]);
              setSelected([]);
              setOpen(false);
            } catch (e) {
              setError(challengeError(e));
            }
          }}
        >
          {t('challenges.sendInvites', { count: selected.length })}
        </button>
      </div>
    </Panel>
  );
}

// ---------- Invitaciones recibidas (IN-14) ----------

/** Tarjeta de una invitación: Aceptar pide el área (RT-02) y crea la actividad (RT-07); Rechazar no avisa. */
export function InvitationCard({ invite }: { invite: ChallengeInvite }) {
  const ctx = useData();
  const settings = useSettings();
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string>();
  const account = settings?.account;
  const c = invite.challenge;
  if (!account) return null;
  return (
    <section className="panel stack invite-card" aria-label={t('challenges.invites', { alias: invite.from.alias })}>
      <p className="small muted">{t('challenges.inviteKicker')}</p>
      <h2>{t('challenges.invitesTo', { alias: invite.from.alias, name: c.name })}</h2>
      <p className="small muted">
        {t(`challenges.mode.${c.mode}`)} · {t('challenges.days', { count: c.days })} · {t('challenges.range', { from: dm(c.start), to: dm(endDate(c)) })} ·{' '}
        {t('challenges.people', { count: invite.people })}
      </p>
      {choosing && <CategoryChoice value={categoryId} onChange={setCategoryId} />}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="row">
        <button
          type="button"
          className="btn grow"
          onClick={() => (choosing ? setChoosing(false) : void declineInvite(ctx, account, c.id).catch((e) => setError(challengeError(e))))}
        >
          {choosing ? t('common.cancel') : t('friends.reject')}
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          disabled={choosing && !categoryId}
          onClick={async () => {
            if (!choosing) return setChoosing(true);
            try {
              await joinChallenge(ctx, account, c.id, categoryId);
              navigate(`/retos/${c.id}`);
            } catch (e) {
              setError(challengeError(e));
            }
          }}
        >
          {choosing ? t('challenges.join') : t('friends.accept')}
        </button>
      </div>
    </section>
  );
}

/** Las invitaciones pendientes (Hoy y Objetivos). */
export function Invitations({ title = false }: { title?: boolean }) {
  const settings = useSettings();
  const invites = settings?.challengeInvites ?? [];
  if (!settings?.account || !accountsEnabled() || invites.length === 0) return null;
  return (
    <div className="stack">
      {title && <h3>{t('challenges.invitationsTitle')}</h3>}
      {invites.map((i) => (
        <InvitationCard key={i.challenge.id} invite={i} />
      ))}
    </div>
  );
}
