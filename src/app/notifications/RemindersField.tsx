// Recordatorios de una actividad (spec 10, RA-01, RA-02): tantos huecos como veces del periodo, todos opcionales.
// Diaria: hora; semanal: día de la semana + hora; mensual: día del mes + hora.
import type { Reminder } from '../../domain/activities/types';
import type { PeriodKind } from '../../domain/time/period';
import { getLocale, t } from '../../i18n';

/** Un hueco vacío tiene la hora en blanco. */
export type ReminderSlot = { day?: number; time: string };

const weekdayName = (day: number) =>
  // 2024-01-01 fue lunes
  new Date(2024, 0, day).toLocaleDateString(getLocale(), { weekday: 'long' });

export function RemindersField({
  period,
  target,
  value,
  onChange,
}: {
  period: PeriodKind;
  target: number;
  value: ReminderSlot[];
  onChange: (slots: ReminderSlot[]) => void;
}) {
  const count = Number.isFinite(target) && target > 0 ? target : 0;
  const slots = Array.from({ length: count }, (_, i) => value[i] ?? { time: '' });
  const dropped = value.slice(count).filter((s) => s.time).length;
  const update = (i: number, patch: Partial<ReminderSlot>) => onChange(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const days = period === 'week' ? 7 : 31;

  return (
    <fieldset className="field">
      <legend>{t('activityForm.reminders')}</legend>
      <p className="small muted">{t('activityForm.remindersHint')}</p>
      {slots.map((slot, i) => {
        const label = t('activityForm.reminderN', { n: i + 1 });
        return (
          <div key={i} className="row" role="group" aria-label={label}>
            {period !== 'day' && (
              <select
                className="time-input"
                aria-label={`${label} · ${t(period === 'week' ? 'activityForm.reminderWeekday' : 'activityForm.reminderMonthDay')}`}
                value={slot.day ?? ''}
                onChange={(e) => update(i, { day: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">—</option>
                {Array.from({ length: days }, (_, d) => d + 1).map((d) => (
                  <option key={d} value={d}>
                    {period === 'week' ? weekdayName(d) : t('activityForm.reminderDayOfMonth', { day: d })}
                  </option>
                ))}
              </select>
            )}
            <input
              type="time"
              className="time-input"
              aria-label={`${label} · ${t('activityForm.reminderTime')}`}
              value={slot.time}
              onChange={(e) => update(i, { time: e.target.value })}
            />
            {(slot.time || slot.day) && (
              <button type="button" className="btn btn-ghost" onClick={() => update(i, { time: '', day: undefined })}>
                {t('activityForm.reminderClear')}
              </button>
            )}
          </div>
        );
      })}
      {dropped > 0 && (
        <p role="status" className="small field-error">
          {t('activityForm.remindersDropped', { count: dropped })}
        </p>
      )}
    </fieldset>
  );
}

/** Los huecos rellenos y completos para la frecuencia, listos para guardar. */
export function toReminders(slots: readonly ReminderSlot[], period: PeriodKind, target: number): Reminder[] {
  return slots
    .slice(0, target)
    .filter((s) => s.time && (period === 'day' || s.day))
    .map((s) => (period === 'day' ? { time: s.time } : { day: s.day!, time: s.time }));
}
