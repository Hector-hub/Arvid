// Ajustes → Notificaciones (spec 10, NT-01, NT-03, NT-04, RS-03, BG-03).
import { useState } from 'react';
import { Link } from 'react-router';
import { saveSetting, type NotificationSettings } from '../../data/repository';
import { t } from '../../i18n';
import { useData, useSettings } from '../data';
import { Panel } from '../design/components';
import { currentNotifications, disablePush, enablePush, pushSupport } from './push';

export function NotificationsPanel() {
  const { db } = useData();
  const settings = currentNotifications(useSettings()?.notifications);
  const support = pushSupport();
  const [status, setStatus] = useState<'denied' | 'error' | undefined>();
  const [busy, setBusy] = useState(false);

  const save = (patch: Partial<NotificationSettings>) => void saveSetting(db, 'notifications', { ...settings, ...patch });

  async function toggle(on: boolean) {
    setBusy(true);
    setStatus(undefined);
    if (on) {
      const result = await enablePush(db);
      if (result !== 'ok') setStatus(result);
    } else await disablePush(db);
    setBusy(false);
  }

  return (
    <Panel className="stack">
      <h2>{t('settings.notifications.title')}</h2>
      {support === 'unsupported' && <p className="small muted">{t('settings.notifications.unsupported')}</p>}
      {support === 'install' && (
        <>
          <p className="small muted">{t('settings.notifications.install')}</p>
          <Link to="/ajustes/instalar" className="btn">
            {t('settings.installIphone')}
          </Link>
        </>
      )}
      {support === 'ok' && (
        <>
          <label className="choice">
            <input type="checkbox" checked={settings.enabled} disabled={busy} onChange={(e) => void toggle(e.target.checked)} />
            <span className="grow">
              {t('settings.notifications.enable')}
              <span className="small muted" style={{ display: 'block' }}>
                {t('settings.notifications.help')}
              </span>
            </span>
          </label>
          {status && (
            <p role="alert" className="small field-error">
              {t(status === 'denied' ? 'settings.notifications.denied' : 'settings.notifications.error')}
            </p>
          )}
          {settings.enabled && (
            <>
              <SummaryTime
                label={t('settings.notifications.morning')}
                value={settings.morning}
                fallback="07:00"
                onChange={(morning) => save({ morning })}
              />
              <SummaryTime label={t('settings.notifications.night')} value={settings.night} fallback="22:00" onChange={(night) => save({ night })} />
              <label className="choice">
                <input type="checkbox" checked={settings.badge} onChange={(e) => save({ badge: e.target.checked })} />
                <span className="grow">{t('settings.notifications.badge')}</span>
              </label>
              <p className="small muted">{t('settings.notifications.remindersHint')}</p>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

/** Un resumen: activado o no y su hora (RS-03). */
function SummaryTime({ label, value, fallback, onChange }: { label: string; value: string | null; fallback: string; onChange: (v: string | null) => void }) {
  return (
    <div className="row">
      <label className="choice grow">
        <input type="checkbox" checked={value !== null} onChange={(e) => onChange(e.target.checked ? fallback : null)} />
        <span className="grow">{label}</span>
      </label>
      {value !== null && (
        <input
          type="time"
          className="time-input"
          aria-label={label}
          value={value}
          required
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      )}
    </div>
  );
}
