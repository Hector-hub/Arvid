// Capítulos y pruebas del programa (spec 17, RI, CA, PR): abre el capítulo siguiente cuando se cumple su tramo, por
// sorpresa (RI-06); entrega sus pasos con sus esperas (CA-02); ofrece, comprueba y resuelve las pruebas (PR).
import { useEffect, useRef, useState } from 'react';
import { saveSetting } from '../../data/repository';
import { chapterDef, deliverStep, neededNeighbors, nextStep, PUBLISHED_CHAPTER, type StepDef } from '../../domain/origen/chapters';
import { storyOn, voiceFor, type OrigenState, type VoiceId } from '../../domain/origen/origen';
import { currentChapter, openChapter, readyForNext } from '../../domain/origen/periods';
import { chooseTest, offerDay, openTest, resolveTest, restAhead, testsXp } from '../../domain/origen/programTests';
import { neighbor } from '../../domain/scene/city';
import { diffDays, toLocalDate } from '../../domain/time/localDate';
import { DEFAULT_AVATAR } from '../../domain/avatar/catalog';
import { getLocale, t, tDynamic, useLocale } from '../../i18n';
import { useAnalysis } from '../analysis';
import { logChat, speak } from '../arvid/voice';
import { useData, useMissions, useRecords, useRests, useSettings } from '../data';
import { isTalking, showPeds } from '../scene/engine';
import { loadSignalAssets, type SignalAssets } from './assets';
import { SignalOverlay } from './SignalOverlay';
import { originText, setOriginText } from './testText';

const TICK_MS = 1000;
/** Un capítulo o una prueba llegan entre 5 y 30 s de app a la vista (RI-06). */
const SURPRISE_MIN_S = 5;
const SURPRISE_MAX_S = 30;
/** Entre dos pasos seguidos, para que no se pisen. */
const STEP_GAP_S = 4;
const otherNotice = () => !!document.querySelector('.sheet-backdrop, [aria-modal="true"]');

/** Solo en desarrollo (NFR17-09): `tramo` abre el capítulo siguiente ya; `prueba` ofrece una prueba; `rapido`, sin esperas. */
function devFlag(name: 'tramo' | 'prueba' | 'rapido'): boolean {
  if (!import.meta.env.DEV) return false;
  return (new URLSearchParams(window.location.search).get('origen') ?? '').split(',').includes(name);
}

type Running = { kind: 'session'; session: number; voice: VoiceId; assets: SignalAssets; onEnd: () => void } | { kind: 'blip'; onEnd: () => void };

export function ChapterWatcher() {
  useLocale();
  const { db } = useData();
  const settings = useSettings();
  const analysis = useAnalysis();
  const records = useRecords();
  const missions = useMissions();
  const rests = useRests();
  const [running, setRunning] = useState<Running>();
  const origen = settings?.origen;
  const on = storyOn(origen);
  const voice: VoiceId | undefined = settings ? voiceFor(getLocale(), settings.profile?.gender, (settings.avatar ?? DEFAULT_AVATAR).cast) : undefined;

  // Lo último, para leerlo desde el reloj sin reiniciarlo
  const live = useRef({ origen, analysis, records, missions, rests, voice, talks: settings?.arvidTalks !== false, running });
  useEffect(() => {
    live.current = { origen, analysis, records, missions, rests, voice, talks: settings?.arvidTalks !== false, running };
  });

  // Variables de los textos ({tiempo}, {segundos}) y vecinos que la historia ya necesita en la calle (RI-09)
  useEffect(() => {
    if (voice) setOriginText(origen, voice);
    showPeds(on ? neededNeighbors(origen).map((id) => neighbor(id).ped) : []);
  }, [origen, voice, on]);

  useEffect(() => {
    if (!on) return;
    const forceOpen = { current: devFlag('tramo') };
    const forceTest = { current: devFlag('prueba') };
    const noWaits = devFlag('rapido');
    let visible = 0;
    let surpriseAt: number | undefined;
    let surpriseFor: 'chapter' | 'test' | undefined;
    let lastStepAt = -Infinity;
    let busy = false;

    const save = (next: OrigenState) => saveSetting(db, 'origen', next);
    const say = (text: string) => {
      if (live.current.talks) void speak(text);
      else logChat('companion', text);
    };

    async function deliver(state: OrigenState, step: StepDef) {
      const now = new Date();
      if (step.kind === 'session') {
        const v = live.current.voice!;
        const assets = await loadSignalAssets(step.session, v);
        // Sin la voz descargada, el capítulo espera a la siguiente apertura con conexión (TR-06); en desarrollo, en silencio
        if (!assets.voice && !import.meta.env.DEV) return false;
        await new Promise<void>((resolve) =>
          setRunning({
            kind: 'session',
            session: step.session,
            voice: v,
            assets,
            onEnd: () => {
              const at = new Date().toISOString();
              const latest = live.current.origen ?? state;
              void save({ ...deliverStep(latest, step.id, new Date(at)), sessions: { ...latest.sessions, [String(step.session)]: at } });
              resolve();
            },
          }),
        );
        return true;
      }
      if (step.kind === 'test') {
        const offered = await offer(state, true);
        await save(deliverStep(offered, step.id, now));
        return true;
      }
      await save(deliverStep(state, step.id, now));
      if (step.kind === 'say') say(tDynamic(step.key, originText()));
      else say(t('origen.wrote', { name: neighbor(step.chat).name }));
      return true;
    }

    /** Ofrece una prueba y devuelve el estado guardado, para que lo siguiente no lo pise. */
    async function offer(state: OrigenState, first = false): Promise<OrigenState> {
      const { analysis: a, records: r, missions: m } = live.current;
      if (!a || !r || !m) return state;
      const tests = state.tests ?? [];
      const test = chooseTest({
        n: tests.length + 1,
        period: currentChapter(state) - 1,
        chapter: currentChapter(state),
        records: r,
        missions: m,
        analysis: a,
        today: toLocalDate(new Date()),
        now: new Date(),
        lastType: tests.at(-1)?.type,
      });
      const next = { ...state, tests: [...tests, test] };
      await save(next);
      if (!first) say(t('origen.test.arrived'));
      return next;
    }

    async function openNext(state: OrigenState, baseXp: number) {
      const chapter = currentChapter(state) + 1;
      const first = chapterDef(chapter)?.steps[0];
      // Con sesión, la voz tiene que estar lista antes de abrir (TR-06)
      if (first?.kind === 'session') {
        const assets = await loadSignalAssets(first.session, live.current.voice!);
        if (!assets.voice && !import.meta.env.DEV) return;
      }
      const opened = openChapter(state, new Date(), baseXp);
      await save(opened);
      // Prepara la voz de la próxima sesión (TR-06)
      const nextSession = chapterDef(chapter + 1)?.steps.find((s) => s.kind === 'session');
      if (nextSession?.kind === 'session') void loadSignalAssets(nextSession.session, live.current.voice!);
      if (first?.kind !== 'session') await new Promise<void>((resolve) => setRunning({ kind: 'blip', onEnd: resolve }));
    }

    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || busy) return;
      visible += TICK_MS / 1000;
      const { origen: state, analysis: a, records: r, rests: rs, running: run } = live.current;
      if (!state || !a || !r || run || otherNotice()) return;
      const now = new Date();
      const today = toLocalDate(now);
      const baseXp = a.progress.xp - testsXp(state.tests);

      // 1. Pruebas: se comprueban solas; la superada avisa y deja su fragmento (PR-08, PR-10)
      const open = openTest(state.tests);
      if (open) {
        const resolved = resolveTest(open, r, a, today, now);
        if (resolved !== open) {
          busy = true;
          void save({ ...state, tests: (state.tests ?? []).map((x) => (x.n === open.n ? resolved : x)) })
            .then(() => resolved.result === 'passed' && say(t('origen.test.fragment')))
            .finally(() => (busy = false));
          return;
        }
      }

      // 2. Pasos pendientes del capítulo (CA-02), uno cada pocos segundos y con el compañero callado
      const due = nextStep(state, now, { noWaits });
      if (due && visible - lastStepAt >= STEP_GAP_S && !isTalking()) {
        busy = true;
        lastStepAt = visible;
        void deliver(state, due.step).finally(() => (busy = false));
        return;
      }
      if (due) return;

      // 3. Capítulo siguiente o prueba nueva, por sorpresa (RI-06, PR-01)
      const chapter = currentChapter(state);
      const period = state.periods?.at(-1);
      const daysIn = period ? diffDays(toLocalDate(new Date(period.openedAt)), today) : 0;
      const lastOffer = state.tests?.at(-1);
      const testDue =
        forceTest.current ||
        (chapter >= 3 &&
          !open &&
          !restAhead(rs ?? [], today) &&
          daysIn >= offerDay(chapter - 1) &&
          (!lastOffer || (lastOffer.period < chapter - 1 ? true : diffDays(lastOffer.offeredOn, today) >= 7)));
      const want = (forceOpen.current && chapter < PUBLISHED_CHAPTER) || readyForNext(state, now, baseXp, PUBLISHED_CHAPTER) ? 'chapter' : testDue ? 'test' : undefined;
      if (!want) {
        surpriseAt = undefined;
        return;
      }
      if (surpriseFor !== want || surpriseAt === undefined) {
        surpriseFor = want;
        surpriseAt = visible + (forceOpen.current || forceTest.current ? 2 : SURPRISE_MIN_S + Math.random() * (SURPRISE_MAX_S - SURPRISE_MIN_S));
      }
      if (visible < surpriseAt) return;
      surpriseAt = undefined;
      busy = true;
      if (want === 'chapter') {
        forceOpen.current = false;
        void openNext(state, baseXp).finally(() => (busy = false));
      } else {
        forceTest.current = false;
        void new Promise<void>((resolve) => setRunning({ kind: 'blip', onEnd: resolve }))
          .then(() => offer(live.current.origen ?? state))
          .finally(() => (busy = false));
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [db, on]);

  if (!running) return null;
  return (
    <SignalOverlay
      mode={running.kind === 'blip' ? 'blip' : 'chapter'}
      session={running.kind === 'session' ? running.session : 1}
      voice={running.kind === 'session' ? running.voice : (voice ?? 'es-m')}
      assets={running.kind === 'session' ? running.assets : { figure: new Image() }}
      onDone={() => {
        const end = running.onEnd;
        setRunning(undefined);
        end();
      }}
    />
  );
}
