// Crea el código de acceso a la IA de una persona (D-100).
// Uso: node scripts/new-ai-code.mts <nombre>
// El secreto (el mismo que en Netlify) se lee de ARVID_CODE_SECRET en `.env.local` o `.env` (ignorados por git).
import { existsSync } from 'node:fs';
import { createCode, DAILY_CREDITS } from '../netlify/lib/accessCode.mts';

for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile(file);

const secret = process.env.ARVID_CODE_SECRET;
const name = process.argv[2];
if (!secret || !name) {
  console.error('Uso: node scripts/new-ai-code.mts <nombre>  (con ARVID_CODE_SECRET=… en .env)');
  process.exit(1);
}
console.log(createCode(name.toLowerCase(), secret));
console.log(`(${DAILY_CREDITS} mensajes con IA al día)`);
