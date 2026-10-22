// Consejo diario de IA sobre la Disciplina (D-097): se pide una vez al día, al abrir la app, y se guarda en el
// dispositivo. Sin IA, sin conexión o si falla, no hay consejo y la pantalla de Disciplina queda como siempre.
import { useEffect, useRef } from 'react';
import { saveSetting } from '../../data/repository';
import { getLocale, useLocale } from '../../i18n';
import { useAnalysis } from '../analysis';
import { useToday } from '../clock';
import { useData, useSettings } from '../data';
import { momentLine } from './brain';
import { useArvidContext } from './useArvidContext';

export function DisciplineTipWatcher() {
  const { db } = useData();
  const settings = useSettings();
  const analysis = useAnalysis();
  const today = useToday();
  const locale = useLocale();
  const context = useArvidContext();
  const asked = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!settings?.arvidAi || !analysis || analysis.byActivity.size + analysis.byMission.size === 0) return;
    const companion = settings.companion;
    const tip = settings.disciplineTip;
    if (tip && tip.date === today && tip.locale === locale && tip.companion === companion) return;
    const key = `${today}:${locale}:${companion}`;
    if (asked.current === key) return;
    asked.current = key;
    void momentLine('discipline', '', { aiEnabled: true, context }).then((text) => {
      if (text) void saveSetting(db, 'disciplineTip', { date: today, locale: getLocale(), companion, text });
    });
  }, [db, settings, analysis, today, locale, context]);

  return null;
}
