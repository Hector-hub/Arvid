// Cuándo habla ARVID por iniciativa propia en Hoy (spec 06, DL-01 a DL-03): elige el momento de mayor prioridad que
// no se haya dicho hoy, una frase sin repetir la anterior, la dice en la burbuja y lo anota.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { saveSetting } from '../../data/repository';
import { chooseMoment, helloFor, markSaid, pickLine, type Moment } from '../../domain/arvid/arvid';
import type { TodayView } from '../../domain/activities/today';
import { t } from '../../i18n';
import { useToday } from '../clock';
import { useData, useSettings } from '../data';
import { cheer, hasUserChatted, isTalking, onArvidReady } from '../scene/engine';
import { momentLine } from './brain';
import { line, lineCount } from './lines';
import { useArvidContext } from './useArvidContext';
import { speak } from './voice';

/** "Primera actividad": lo marca el formulario al crearla y se dice al volver a Hoy. */
let firstActivityPending = false;
export function flagFirstActivity(): void {
  firstActivityPending = true;
}

/**
 * Momentos de Hoy. `comeback` indica que ayer quedaron actividades diarias sin completar; `paused` retrasa la
 * decisión (p. ej. mientras está abierta la presentación de ARVID).
 */
export function useArvidMoments(view: TodayView | undefined, comeback: boolean, paused: boolean): void {
  const ctx = useData();
  const settings = useSettings();
  const today = useToday();
  const prevPending = useRef<number | undefined>(undefined);
  const context = useArvidContext();

  const decide = useEffectEvent(async (candidates: Moment[]) => {
    if (!settings || !view || !settings.arvidTalks) return;
    const moment = chooseMoment(candidates, settings.arvidSeen, today);
    if (!moment) return;
    const index = pickLine(lineCount(`lines.${moment}`), settings.arvidSeen?.lastLine?.[moment], Math.random);
    const alias = settings.profile?.alias ?? '';
    let text = line(`lines.${moment}`, index, settings.profile?.gender, { alias });
    if (moment === 'greeting') {
      const hello = `${t(`arvid.hello.${helloFor(new Date().getHours())}`)}${alias ? `, ${alias}` : ''}.`;
      const status = !view.hasDaily
        ? t('arvid.status.none')
        : view.pendingToday > 0
          ? t('arvid.status.pending', { count: view.pendingToday })
          : t('arvid.status.done');
      text = `${hello} ${status} ${text}`;
    }
    await saveSetting(ctx.db, 'arvidSeen', markSaid(settings.arvidSeen, moment, index, today));
    // Con IA, la frase se genera con el contexto; si no hay IA o falla, la fija (IA-05)
    if (moment !== 'levelUp') text = await momentLine(moment, text, { aiEnabled: settings.arvidAi, context });
    // No interrumpe: espera a que ARVID termine lo que esté diciendo (p. ej. una respuesta del chat)
    for (let i = 0; i < 120 && isTalking(); i++) await new Promise((r) => setTimeout(r, 500));
    await speak(text);
  });

  /** Al abrir Hoy: cuando ARVID ha llegado a su sitio, saludo, retomar o primera actividad (DL-01). */
  const tryOpening = useEffectEvent((): boolean => {
    if (!settings || !view || paused) return false;
    // Si el usuario ya empezó a conversar, no hay saludo
    if (hasUserChatted()) return true;
    const candidates: Moment[] = ['greeting'];
    if (comeback) candidates.push('comeback');
    if (firstActivityPending) {
      firstActivityPending = false;
      candidates.push('firstActivity');
    }
    void decide(candidates);
    return true;
  });

  // Sin consultas periódicas: el motor avisa cuando ARVID llega; después se reintenta si aún faltan datos
  const [ready, setReady] = useState(false);
  const opened = useRef(false);
  useEffect(() => onArvidReady(() => setReady(true)), []);
  useEffect(() => {
    if (ready && !opened.current && tryOpening()) opened.current = true;
  }, [ready, settings, view, paused]);

  // Día completo: lo último pendiente del día acaba de registrarse
  const pending = view?.pendingToday;
  const hasDaily = view?.hasDaily;
  useEffect(() => {
    const prev = prevPending.current;
    prevPending.current = pending;
    if (pending === 0 && prev !== undefined && prev > 0 && hasDaily) {
      // DARIS celebra el día completo con su salto de corazones (spec 08, DE-02), hable o no
      cheer();
      void decide(['dayComplete']);
    }
  }, [pending, hasDaily]);
}
