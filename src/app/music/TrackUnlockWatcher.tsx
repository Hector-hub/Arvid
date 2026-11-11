// Aviso de canción nueva (spec 17, MU-06): cuando el avance desbloquea una canción, sale su portada pasando de gris a
// color y su nombre. La primera vez solo se anota lo que ya había, sin avisos.
import { useEffect } from 'react';
import { saveSetting } from '../../data/repository';
import { unlockedTracks } from '../../domain/origen/music';
import { t } from '../../i18n';
import { useData, useSettings } from '../data';
import { trackCover, TRACKS } from './tracks';

const SHOW_MS = 6000;

export function TrackUnlockWatcher() {
  const { db } = useData();
  const settings = useSettings();
  const origen = settings?.origen;
  const count = settings ? unlockedTracks(origen, TRACKS.length) : undefined;
  const announced = origen?.tracksAnnounced;
  // La canción nueva se ve mientras no se anote como anunciada
  const fresh = count !== undefined && announced !== undefined && count > announced ? TRACKS[count - 1] : undefined;
  const done = () => void saveSetting(db, 'origen', { ...origen, tracksAnnounced: count });

  useEffect(() => {
    if (count === undefined || announced === count) return;
    // Primera vez, o canciones que se vuelven a bloquear (al restaurar una copia): se anota sin aviso
    if (announced === undefined || count < announced) return void saveSetting(db, 'origen', { ...origen, tracksAnnounced: count });
    const id = window.setTimeout(() => void saveSetting(db, 'origen', { ...origen, tracksAnnounced: count }), SHOW_MS);
    return () => window.clearTimeout(id);
  }, [db, origen, count, announced]);

  if (!fresh) return null;
  return (
    <div className="track-unlock" role="status" onClick={done}>
      <img src={trackCover(fresh, 96)} alt="" />
      <p>{t('sound.newTrack', { name: fresh.name })}</p>
    </div>
  );
}
