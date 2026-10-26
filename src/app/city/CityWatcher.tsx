// Ciudad viva (spec 11): pone en la escena lo que corresponde al nivel y hace que el compañero anuncie las llegadas
// cuando se cierra el aviso de subida de nivel (AN-01, AN-03). La primera vez, una frase de bienvenida (CV-04).
import { useEffect, useRef } from 'react';
import { saveSetting } from '../../data/repository';
import { arrivals } from '../../domain/scene/city';
import { t } from '../../i18n';
import { useAnalysis } from '../analysis';
import { speak } from '../arvid/voice';
import { useData, useSettings } from '../data';
import { isTalking, setCity } from '../scene/engine';
import { itemPhrase, listPhrase } from './labels';

/**
 * Habla cuando el compañero lleva 1,5 s callado, para no pisar el saludo ni otros momentos (AN-01). Devuelve cómo
 * cancelarlo: si no, seguiría esperando aunque la vigilancia ya no estuviera (y hablaría a destiempo).
 */
function speakWhenQuiet(text: string): () => void {
  let quiet = 0;
  const id = window.setInterval(() => {
    quiet = isTalking() ? 0 : quiet + 1;
    if (quiet < 3) return;
    clearInterval(id);
    void speak(text);
  }, 500);
  return () => clearInterval(id);
}

export function CityWatcher() {
  const { db } = useData();
  const settings = useSettings();
  const level = useAnalysis()?.progress.level;
  const announced = settings?.cityAnnounced;
  const celebrated = settings?.lastCelebratedLevel;
  const loaded = !!settings;
  // Con «habla por iniciativa propia» desactivado, la ciudad crece igual pero sin anuncios (DL-03)
  const talks = settings?.arvidTalks !== false;
  // Anuncio en espera: se cancela al desmontar o si deja de hablar por iniciativa propia (no al guardar el nivel
  // anunciado, que vuelve a ejecutar el efecto de abajo)
  const pending = useRef<() => void>(undefined);
  const announce = (text: string) => {
    pending.current?.();
    pending.current = speakWhenQuiet(text);
  };
  useEffect(() => () => pending.current?.(), []);
  useEffect(() => {
    if (!talks) pending.current?.();
  }, [talks]);

  useEffect(() => {
    if (level === undefined || !loaded) return;
    // Primera vez en este dispositivo: todo lo del nivel, sin anuncios uno a uno (CV-04)
    if (announced === undefined) {
      setCity(level);
      void saveSetting(db, 'cityAnnounced', level).then(() => talks && announce(t(level > 1 ? 'city.welcome' : 'city.welcomeNew')));
      return;
    }
    // Se espera a que se cierre el aviso de subida de nivel; mientras, se queda lo ya anunciado
    if (level <= announced || (celebrated ?? 0) < level) {
      setCity(Math.min(level, announced));
      if (level < announced) void saveSetting(db, 'cityAnnounced', level);
      return;
    }
    const items = arrivals(announced, level);
    setCity(level, items);
    void saveSetting(db, 'cityAnnounced', level).then(() => {
      if (items.length && talks) announce(t('city.arrived', { list: listPhrase(items.map(itemPhrase)) }));
    });
  }, [db, level, announced, celebrated, loaded, talks]);

  return null;
}
