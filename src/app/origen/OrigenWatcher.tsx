// Programa ORIGEN (spec 17): lanza el primer contacto en su momento (PC-01), guarda que se vio (PC-06), pregunta qué
// hacer (DE) y aplica lo que toca en la calle (SO-05).
import { useEffect, useRef, useState } from 'react';
import { saveSetting } from '../../data/repository';
import {
  choose,
  contactDelay,
  finishContact,
  needsChoice,
  needsContact,
  sombraHidden,
  storyOn,
  voiceFor,
  type OrigenChoice,
  type VoiceId,
} from '../../domain/origen/origen';
import { neighbor } from '../../domain/scene/city';
import { toLocalDate } from '../../domain/time/localDate';
import { DEFAULT_AVATAR } from '../../domain/avatar/catalog';
import { getLocale, t, useLocale } from '../../i18n';
import { useAnalysis } from '../analysis';
import { speak } from '../arvid/voice';
import { useData, useSettings } from '../data';
import { hidePeds, isTalking } from '../scene/engine';
import { loadSignalAssets, type SignalAssets } from './assets';
import { OrigenDecision } from './OrigenDecision';
import { SignalOverlay } from './SignalOverlay';

/** Otro aviso abierto (subida de nivel, novedades, logro…): la señal espera a que se cierre y 2 s más (PC-01). */
const otherNotice = () => !!document.querySelector('.sheet-backdrop, [aria-modal="true"]:not(.signal)');
const AFTER_NOTICE_S = 2;
const TICK_MS = 250;

/** `?origen=contacto` (solo en desarrollo, NFR17-09): el primer contacto a los 2 s, aunque ya se viera. */
const devContact = () => import.meta.env.DEV && new URLSearchParams(window.location.search).get('origen') === 'contacto';

export function OrigenWatcher() {
  useLocale();
  const { db } = useData();
  const settings = useSettings();
  const analysis = useAnalysis();
  const origen = settings?.origen;
  const [forced] = useState(devContact);
  const [running, setRunning] = useState<{ voice: VoiceId; assets: SignalAssets }>();
  const [asking, setAsking] = useState(false);
  const xp = useRef(0);
  const latest = useRef(origen);
  const currentXp = analysis?.progress.xp ?? 0;
  useEffect(() => {
    xp.current = currentXp;
    latest.current = origen;
  }, [currentXp, origen]);

  const voice = settings ? voiceFor(getLocale(), settings.profile?.gender, (settings.avatar ?? DEFAULT_AVATAR).cast) : undefined;
  const wantsContact = !!settings && (needsContact(origen) || forced) && !running;

  // ---------- Primer contacto: reloj de app a la vista, primer toque y ningún otro aviso ----------
  useEffect(() => {
    if (!wantsContact || !voice) return;
    let cancelled = false;
    let assets: SignalAssets | undefined;
    void loadSignalAssets(1, voice).then((a) => (assets = a));
    const target = forced ? 2 : contactDelay(latest.current, Math.random);
    let visible = 0;
    let touched = false;
    let quietSince = 0;
    const touch = () => (touched = true);
    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch);
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      visible += TICK_MS / 1000;
      if (otherNotice()) quietSince = visible;
      if (visible < target || !touched || !assets || visible - quietSince < AFTER_NOTICE_S && quietSince > 0) return;
      window.clearInterval(id);
      if (cancelled) return;
      // Empezó: si se cierra la app a medias, se repite en la siguiente apertura (PC-06)
      if (!forced) void saveSetting(db, 'origen', { ...latest.current, contactStartedAt: new Date().toISOString() });
      setRunning({ voice, assets });
    }, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, [db, wantsContact, voice, forced]);

  // ---------- La pregunta (DE-05): si quedó sin contestar, vuelve a salir ----------
  const pendingChoice = needsChoice(origen) && !running;
  useEffect(() => {
    if (!pendingChoice) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || otherNotice()) return;
      window.clearInterval(id);
      setAsking(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [pendingChoice]);

  // ---------- Sombra se va de la calle mientras investigas (SO-05) ----------
  const hidden = sombraHidden(origen);
  useEffect(() => hidePeds(hidden ? [neighbor('sombra').ped] : []), [hidden]);

  // Quien ya lo tenía en su calle: al día siguiente, el compañero lo nota (SO-05)
  const level = analysis?.progress.level ?? 0;
  const talks = settings?.arvidTalks !== false;
  const noticeSombra =
    storyOn(origen) && !origen?.sombraNoticed && level >= 10 && talks && !!origen?.contactAt && toLocalDate(new Date()) > toLocalDate(new Date(origen.contactAt));
  useEffect(() => {
    if (!noticeSombra) return;
    let quiet = 0;
    const id = window.setInterval(() => {
      quiet = isTalking() ? 0 : quiet + 1;
      if (quiet < 6) return;
      window.clearInterval(id);
      void saveSetting(db, 'origen', { ...latest.current, sombraNoticed: true });
      void speak(t('origen.sombraGone'));
    }, 500);
    return () => window.clearInterval(id);
  }, [db, noticeSombra]);

  const decide = (choice: OrigenChoice) => void saveSetting(db, 'origen', choose(latest.current, choice));

  return (
    <>
      {running && (
        <SignalOverlay
          mode="first"
          voice={running.voice}
          assets={running.assets}
          onVoiceEnd={() => {
            if (!forced || needsContact(latest.current)) void saveSetting(db, 'origen', finishContact(latest.current, new Date(), xp.current));
          }}
          onDone={() => {
            setRunning(undefined);
            if (forced) setAsking(true);
          }}
        />
      )}
      {asking && !running && (
        <OrigenDecision
          onChoose={decide}
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
}
