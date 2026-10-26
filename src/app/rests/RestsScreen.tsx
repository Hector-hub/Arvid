// Descansos planificados (spec 12, DS-01 a DS-03): formulario y lista de los próximos y en curso.
import { useState, type FormEvent } from 'react';
import { cancelRest, createRest, updateRest, type RestInput } from '../../data/repository';
import { REST_NOTE_MAX, upcomingRests, type RestError } from '../../domain/activities/rests';
import { statusAt } from '../../domain/activities/rules';
import type { Rest } from '../../domain/activities/types';
import { asLocalDate, compareDates, isLocalDate, type LocalDate } from '../../domain/time/localDate';
import { t, useLocale } from '../../i18n';
import { useToday } from '../clock';
import { useData, useRecords, useRests } from '../data';
import { BackLink, Panel } from '../design/components';
import { dayMonth, longDate } from '../text';

export function RestsScreen() {
  useLocale();
  const today = useToday();
  const rests = useRests();
  const [editing, setEditing] = useState<Rest | 'new'>('new');
  if (!rests) return null;
  const upcoming = upcomingRests(rests, today);

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }}>
      <BackLink to="/hoy" label={t('nav.today')} />
      <h1>{t('rests.title')}</h1>
      <p className="muted">{t('rests.intro')}</p>
      <RestForm key={editing === 'new' ? 'new' : editing.id} rest={editing === 'new' ? undefined : editing} onDone={() => setEditing('new')} />
      <Panel className="stack">
        <h2>{t('rests.upcoming')}</h2>
        {upcoming.length === 0 ? (
          <p className="muted">{t('rests.none')}</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 'var(--s2)' }}>
            {upcoming.map((r) => (
              <RestRow key={r.id} rest={r} today={today} onEdit={() => setEditing(r)} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function restRange(r: { from: LocalDate; to: LocalDate }): string {
  return r.from === r.to ? longDate(r.from) : t('rests.range', { from: dayMonth(r.from), to: dayMonth(r.to) });
}

function RestRow({ rest, today, onEdit }: { rest: Rest; today: LocalDate; onEdit: () => void }) {
  const ctx = useData();
  const records = useRecords();
  const [confirm, setConfirm] = useState(false);
  const names = rest.activityIds?.map((id) => records?.find((r) => r.activity.id === id)?.activity.name).filter(Boolean);
  const ongoing = compareDates(rest.from, today) <= 0;
  return (
    <li className="stack panel" style={{ padding: 'var(--s3)', gap: 'var(--s1)' }}>
      <p className="pixel">
        {restRange(rest)}
        {ongoing && <span className="chip chip-done" style={{ marginLeft: 'var(--s2)' }}>{t('rests.ongoing')}</span>}
      </p>
      <p className="small muted">
        {names ? names.join(', ') : t('rests.allActivities')}
        {rest.note ? ` · ${rest.note}` : ''}
      </p>
      {confirm ? (
        <div className="row" role="alertdialog" aria-label={t('rests.cancel')}>
          <p className="grow small">{ongoing ? t('rests.cancelOngoing') : t('rests.cancelConfirm')}</p>
          <button type="button" className="btn btn-danger" onClick={() => void cancelRest(ctx, rest.id)}>
            {t('rests.cancelYes')}
          </button>
          <button type="button" className="btn" onClick={() => setConfirm(false)}>
            {t('common.back')}
          </button>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onEdit}>
            {t('common.edit')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(true)}>
            {t('rests.cancel')}
          </button>
        </div>
      )}
    </li>
  );
}

function RestForm({ rest, onDone }: { rest?: Rest; onDone: () => void }) {
  const ctx = useData();
  const today = useToday();
  const records = useRecords();
  const started = !!rest && compareDates(rest.from, today) < 0;
  const [from, setFrom] = useState<string>(rest?.from ?? today);
  const [to, setTo] = useState<string>(rest?.to ?? today);
  const [some, setSome] = useState(!!rest?.activityIds);
  const [chosen, setChosen] = useState<Set<string>>(new Set(rest?.activityIds ?? []));
  const [note, setNote] = useState(rest?.note ?? '');
  const [error, setError] = useState<RestError | 'invalid-date'>();
  const [saved, setSaved] = useState(false);
  const active = (records ?? []).filter((r) => statusAt(r.events, today) === 'active');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isLocalDate(from) || !isLocalDate(to)) return setError('invalid-date');
    const input: RestInput = { from: asLocalDate(from), to: asLocalDate(to), activityIds: some ? [...chosen] : undefined, note };
    const result = rest ? await updateRest(ctx, rest.id, input) : await createRest(ctx, input);
    if (!result.ok) return setError(result.error);
    setError(undefined);
    setSaved(true);
    if (!rest) {
      setNote('');
      setChosen(new Set());
      setSome(false);
    }
    onDone();
  }

  return (
    <Panel className="stack">
      <h2>{rest ? t('rests.editTitle') : t('rests.newTitle')}</h2>
      <form className="stack" onSubmit={(e) => void submit(e)} noValidate>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--s3)' }}>
          <div className="field">
            <label htmlFor="rest-from">{t('rests.from')}</label>
            <input id="rest-from" type="date" min={today} value={from} disabled={started} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rest-to">{t('rests.to')}</label>
            <input id="rest-to" type="date" min={started ? today : from} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <fieldset className="field">
          <legend>{t('rests.scope')}</legend>
          <label className="choice">
            <input type="radio" name="rest-scope" checked={!some} onChange={() => setSome(false)} />
            {t('rests.allActivities')}
          </label>
          <label className="choice">
            <input type="radio" name="rest-scope" checked={some} onChange={() => setSome(true)} />
            {t('rests.someActivities')}
          </label>
          {some && (
            <div className="stack" style={{ paddingLeft: 'var(--s4)', gap: 'var(--s1)' }}>
              {active.map((r) => (
                <label key={r.activity.id} className="choice">
                  <input
                    type="checkbox"
                    checked={chosen.has(r.activity.id)}
                    onChange={(e) =>
                      setChosen((c) => {
                        const next = new Set(c);
                        if (e.target.checked) next.add(r.activity.id);
                        else next.delete(r.activity.id);
                        return next;
                      })
                    }
                  />
                  {r.activity.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div className="field">
          <label htmlFor="rest-note">{t('rests.note')}</label>
          <input id="rest-note" type="text" maxLength={REST_NOTE_MAX} value={note} placeholder={t('rests.notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="small muted">{t('rests.rule')}</p>
        {error && (
          <p role="alert" className="field-error">
            {t(`rests.errors.${error}`)}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="small" style={{ color: 'var(--success)' }}>
            {t('rests.saved')}
          </p>
        )}
        <div className="row">
          {rest && (
            <button type="button" className="btn btn-ghost" onClick={onDone}>
              {t('common.cancel')}
            </button>
          )}
          <button type="submit" className="btn btn-primary grow">
            {rest ? t('common.save') : t('rests.create')}
          </button>
        </div>
      </form>
    </Panel>
  );
}
