// Lo que hace el service worker al recibir un aviso (spec 10, PV-02, PV-03, BG-02): lee los datos del dispositivo,
// escribe el texto en la voz del compañero y calcula el número del icono.
import { loadMissions } from '../../data/missions';
import { loadRecords, loadSettings } from '../../data/repository';
import type { ArvidDB } from '../../data/db';
import { COMPANION_NAME, COMPANION_SELF_O } from '../../domain/arvid/companion';
import { buildDigest, type PushKind } from '../../domain/notifications/digest';
import { detectLocale, setGlobalVars, setLocale, t } from '../../i18n';

/** Un aviso que llega más de 2 h tarde (p. ej. el móvil estaba apagado) ya no dice lo de su hora. */
export const LATE_MS = 2 * 60 * 60 * 1000;

export interface PushData {
  kind: PushKind;
  ref?: string;
  at?: string;
}

export interface PushNotice {
  title: string;
  body: string;
  /** Número del icono, o `undefined` si el usuario lo desactivó (BG-03). */
  badge: number | undefined;
}

export async function noticeFor(db: ArvidDB, data: PushData, now: Date): Promise<PushNotice> {
  const [records, missions, settings] = await Promise.all([loadRecords(db), loadMissions(db), loadSettings(db)]);
  setLocale(settings.locale ?? detectLocale());
  setGlobalVars({ companion: COMPANION_NAME[settings.companion], selfO: COMPANION_SELF_O[settings.companion] });
  const digest = buildDigest({ records, missions, now, kind: data.kind, ref: data.ref });
  const late = data.at !== undefined && now.getTime() - new Date(data.at).getTime() > LATE_MS;
  return {
    title: COMPANION_NAME[settings.companion],
    body: late ? t('notifications.calm') : digest.body,
    badge: settings.notifications?.badge === false ? undefined : digest.badge,
  };
}
