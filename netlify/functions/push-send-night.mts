// Notificaciones de noche (D-108): cada hora en punto de 22:00 a 6:00 en Santo Domingo (UTC 02:00–10:00). El resumen
// de la noche (22:00) sale a su hora; un recordatorio nocturno puede llegar hasta 59 minutos tarde.
import { sendDuePushes } from '../lib/pushSend.mts';

export default sendDuePushes;

export const config = { schedule: '0 2-10 * * *' };
