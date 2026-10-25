// Vecinos que hablan (spec 11, VC): la primera vez que un vecino entra en pantalla cada día tiene un 10 % de decir
// algo; como mucho uno al día (VC-02), nunca a la vez que el compañero (VC-03). Con IA, Mistral escribe la frase
// sin gastar créditos (VC-05, VC-06); sin IA, una de sus frases fijas (VC-07). No va a la conversación (VC-08).
import { useEffect, useRef } from 'react';
import { saveSetting } from '../../data/repository';
import { cityAt, neighborByPed } from '../../domain/scene/city';
import { toLocalDate } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { useAnalysis } from '../analysis';
import { neighborLine } from '../arvid/brain';
import { useArvidContext } from '../arvid/useArvidContext';
import { BUBBLE_FONT, BUBBLE_TEXT_W } from '../scene/bubble';
import { useData, useSettings } from '../data';
import { isTalking, neighborSay, onNeighborSeen } from '../scene/engine';
import { measure, noLigatures } from '../arvid/voice';
import { paginate } from '../../domain/arvid/speech';

export const NEIGHBOR_CHANCE = 0.1;
const LINES = 3;

export function NeighborTalk() {
  const { db } = useData();
  const settings = useSettings();
  const level = useAnalysis()?.progress.level;
  const context = useArvidContext();
  // Lo último, sin volver a suscribirse en cada cambio
  const latest = useRef({ settings, level, context });
  useEffect(() => {
    latest.current = { settings, level, context };
  });
  // Se marca en el acto: el ajuste guardado tarda en volver y otro vecino podría colarse (VC-02)
  const spoke = useRef<string>(undefined);

  useEffect(
    () =>
      onNeighborSeen((type) => {
        const { settings: s, level: lv, context: ctx } = latest.current;
        const today = toLocalDate(new Date());
        const who = neighborByPed(type);
        if (!s || lv === undefined || !who || !cityAt(lv).peds.includes(type)) return;
        if (s.neighborSpoke === today || spoke.current === today || isTalking() || Math.random() >= NEIGHBOR_CHANCE) return;
        spoke.current = today;
        void saveSetting(db, 'neighborSpoke', today);
        const fallback = t(`city.neighbors.${who.id}.lines.${Math.floor(Math.random() * LINES)}` as never);
        void neighborLine(who.id, fallback, { aiEnabled: s.arvidAi, context: ctx }).then(async (text) => {
          await document.fonts?.load(BUBBLE_FONT).catch(() => undefined);
          neighborSay(type, paginate(noLigatures(`${who.name}: ${text}`), measure, BUBBLE_TEXT_W));
        });
      }),
    [db],
  );
  return null;
}
