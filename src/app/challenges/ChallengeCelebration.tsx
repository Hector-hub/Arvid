// El compañero celebra el resultado de un reto al abrir la app (spec 15, FN-05): sin IA con una frase fija y con IA
// como los otros momentos. Cada reto se celebra una vez por dispositivo.
import { useEffect, useRef } from 'react';
import { saveSetting } from '../../data/repository';
import { challengeResult } from '../../domain/challenges/challenges';
import { pickLine } from '../../domain/arvid/arvid';
import { accountsEnabled } from '../account/account';
import { momentLine } from '../arvid/brain';
import { line, lineCount } from '../arvid/lines';
import { useArvidContext } from '../arvid/useArvidContext';
import { speak } from '../arvid/voice';
import { useToday } from '../clock';
import { useChallenges, useData, useSettings } from '../data';
import { celebrate, isTalking } from '../scene/engine';
import { playSfx } from '../sound/sfx';
import { resultText } from './ChallengeScreens';

export function ChallengeCelebration({ paused }: { paused: boolean }) {
  const { db } = useData();
  const settings = useSettings();
  const challenges = useChallenges();
  const today = useToday();
  const context = useArvidContext();
  const done = useRef(false);

  useEffect(() => {
    const me = settings?.account?.id;
    if (done.current || paused || !settings || !challenges || !me || !accountsEnabled()) return;
    const seen = new Set(settings.challengesCelebrated ?? []);
    const local = challenges.find((l) => {
      const r = challengeResult(l.view, me, today);
      return !seen.has(l.id) && (r.state === 'coop' || r.state === 'versus');
    });
    if (!local) return;
    done.current = true;
    const r = challengeResult(local.view, me, today);
    const good = (r.state === 'coop' && r.success) || (r.state === 'versus' && r.place === 1);
    const group = good ? 'lines.challengeWon' : 'lines.challengeLost';
    const result = resultText(local.view, me, today) ?? '';
    void (async () => {
      await saveSetting(db, 'challengesCelebrated', [...seen, local.id]);
      if (good) {
        celebrate('big');
        playSfx('achievement');
      }
      if (!settings.arvidTalks) return;
      const fixed = line(group, pickLine(lineCount(group), undefined, Math.random), settings.profile?.gender, {
        name: local.view.challenge.name,
        result,
        alias: settings.profile?.alias ?? '',
      });
      const text = await momentLine('challengeEnd', fixed, {
        aiEnabled: settings.arvidAi,
        context: () => ({ ...context(), challengeResult: { name: local.view.challenge.name, mode: local.view.challenge.mode, result } }),
      });
      for (let i = 0; i < 120 && isTalking(); i++) await new Promise((res) => setTimeout(res, 500));
      await speak(text);
    })();
  }, [settings, challenges, today, paused, db, context]);

  return null;
}
