// Detecta los logros nuevos, los guarda y los celebra (spec 07, LO-02, LO-03, LO-05 y CE).
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { saveSetting, unlockAchievements, type Settings } from '../../data/repository';
import { detectAchievements, type AchievementId } from '../../domain/achievements/achievements';
import { pickLine } from '../../domain/arvid/arvid';
import { t } from '../../i18n';
import { useAnalysis } from '../analysis';
import { momentLine } from '../arvid/brain';
import { line, lineCount } from '../arvid/lines';
import { useArvidContext } from '../arvid/useArvidContext';
import { speak } from '../arvid/voice';
import { useAchievements, useData, useSettings } from '../data';
import { celebrate, isTalking } from '../scene/engine';
import { joinList } from '../text';
import { Badge } from './Badge';
import { achievementName, useAchievementStatuses } from './useAchievements';
import { playSfx } from '../sound/sfx';

/** El aviso se cierra solo a los 5 s (CE-01). */
export const TOAST_MS = 5_000;

/** ARVID habla cuando termina lo que esté diciendo (no interrumpe). */
async function speakWhenFree(text: string) {
  for (let i = 0; i < 120 && isTalking(); i++) await new Promise((r) => setTimeout(r, 500));
  await speak(text);
}

export function AchievementsWatcher() {
  const { db } = useData();
  const settings = useSettings();
  const rows = useAchievements();
  const analysis = useAnalysis();
  const statuses = useAchievementStatuses();
  const [pending, setPending] = useState<AchievementId[]>([]);
  /** Ya tratados en esta sesión: la lectura reactiva de la tabla puede llegar después de guardar. */
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!settings || !rows || !statuses) return;
    for (const r of rows) handled.current.add(r.id);
    const fresh = detectAchievements(statuses, handled.current);
    const ready = settings.achievementsReady === true;
    if (ready && fresh.length === 0) return;
    for (const id of fresh) handled.current.add(id);
    void (async () => {
      await unlockAchievements(db, fresh, new Date().toISOString());
      if (ready) {
        setPending((p) => [...p, ...fresh]);
        return;
      }
      // Primera evaluación en el dispositivo o tras importar: en silencio, con un solo comentario de ARVID (LO-05)
      await saveSetting(db, 'achievementsReady', true);
      if (fresh.length > 0 && settings.arvidTalks)
        await speakWhenFree(t('arvid.achievementsFound', { count: fresh.length }));
    })();
  }, [db, settings, rows, statuses]);

  // El aviso de nivel va primero (CE-04)
  const levelUpPending =
    analysis !== undefined &&
    settings?.lastCelebratedLevel !== undefined &&
    analysis.progress.level > settings.lastCelebratedLevel;
  if (pending.length === 0 || levelUpPending || !settings) return null;
  return <AchievementToast key={pending.join()} ids={pending} settings={settings} onDone={() => setPending([])} />;
}

/** Partículas, ARVID y aviso de 5 s que no bloquea (CE-01 a CE-03, CE-05). */
function AchievementToast({ ids, settings, onDone }: { ids: AchievementId[]; settings: Settings; onDone: () => void }) {
  const context = useArvidContext();
  const navigate = useNavigate();
  const names = ids.map(achievementName);
  const announced = useRef(false);

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    celebrate('big');
    playSfx('achievement');
    if (!settings.arvidTalks) return;
    const alias = settings.profile?.alias ?? '';
    const fixed = line(
      'lines.achievement',
      pickLine(lineCount('lines.achievement'), undefined, Math.random),
      settings.profile?.gender,
      {
        name: joinList(names),
        alias,
      },
    );
    void momentLine('achievement', fixed, {
      aiEnabled: settings.arvidAi,
      context: () => ({ ...context(), unlockedAchievements: names }),
    }).then(speakWhenFree);
  }, [settings, names, context]);

  // El padre se vuelve a dibujar a menudo: el temporizador no se reinicia por eso
  const done = useEffectEvent(onDone);
  useEffect(() => {
    const timer = setTimeout(() => done(), TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  const text =
    ids.length === 1
      ? t('achievements.toast', { name: names[0]! })
      : t('achievements.toastMany', { count: ids.length, names: joinList(names) });
  return (
    <div className="achievement-toast" role="status">
      <button
        type="button"
        className="achievement-toast-body"
        onClick={() => {
          onDone();
          void navigate('/perfil', { state: { achievement: ids[0] } });
        }}
      >
        <Badge id={ids[0]!} earned size={48} />
        <span className="pixel">{text}</span>
      </button>
    </div>
  );
}
