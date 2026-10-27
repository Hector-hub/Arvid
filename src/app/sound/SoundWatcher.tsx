// Efectos de sonido (spec 16): aplica los ajustes, desbloquea el audio con el primer gesto y pone el «toque» a los
// botones de las hojas y los diálogos (EF-01, S16-03). Los demás efectos los piden sus propios vigilantes.
import { useEffect } from 'react';
import { DEFAULT_SOUND } from '../../data/repository';
import { useSettings } from '../data';
import { unlockAudioOnGesture } from './audio';
import { configureSfx, playSfx } from './sfx';

/** Botones con «toque»: los de las hojas y los diálogos, no la navegación ni las pestañas (S16-03). */
const TAP_TARGETS = '.sheet-backdrop .btn, [role="dialog"] .btn, [role="alertdialog"] .btn';

export function SoundWatcher() {
  const sound = useSettings()?.sound ?? DEFAULT_SOUND;

  useEffect(() => configureSfx({ enabled: sound.effects, volume: sound.volume, timbre: sound.timbre }), [sound.effects, sound.volume, sound.timbre]);

  useEffect(() => unlockAudioOnGesture(), []);

  useEffect(() => {
    const tap = (e: MouseEvent) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>(TAP_TARGETS) : null;
      if (button && !button.disabled) playSfx('tap');
    };
    document.addEventListener('click', tap);
    return () => document.removeEventListener('click', tap);
  }, []);

  return null;
}
