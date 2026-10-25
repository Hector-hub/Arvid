// Notificaciones de día (D-108): cada minuto de 7:00 a 21:59 en Santo Domingo (UTC−4, sin cambio de hora), para que
// lleguen como mucho 1 minuto tarde. Netlify programa en UTC: 11:00–01:59.
import { sendDuePushes } from '../lib/pushSend.mts';

export default sendDuePushes;

export const config = { schedule: '* 11-23,0-1 * * *' };
