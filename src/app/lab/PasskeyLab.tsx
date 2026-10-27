// Prototipo de passkeys (spec 14, fase 14a, R14-3): página oculta en /lab/passkey para comprobar en los teléfonos
// reales, con la app instalada, si se puede crear una passkey, entrar con ella y si la extensión PRF da un secreto
// estable. Solo en el navegador: no hay servidor ni se guarda nada de la cuenta. Textos sin traducir: es temporal.
import { useState } from 'react';

const SALT = new TextEncoder().encode('arvid-prf-lab-v1');
const STORAGE_KEY = 'arvid-lab-passkey';

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Huella corta del secreto PRF: si coincide entre «Crear» y «Entrar» (y entre días), el secreto es estable. */
async function fingerprint(secret: ArrayBuffer): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', secret)).slice(0, 16);
}

type PrfResults = { results?: { first?: ArrayBuffer } };

function readLab(): { id?: string; prf?: string } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { id?: string; prf?: string };
  } catch {
    return {};
  }
}

export function PasskeyLab() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()} ${line}`]);

  async function environment() {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    add(`Navegador: ${navigator.userAgent}`);
    add(`App instalada (standalone): ${standalone ? 'sí' : 'no'}`);
    add(`WebAuthn: ${'PublicKeyCredential' in window ? 'sí' : 'no'}`);
    if (!('PublicKeyCredential' in window)) return;
    const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
    add(`Face ID / huella disponible: ${platform ? 'sí' : 'no'}`);
    const pkc = PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> };
    if (pkc.getClientCapabilities) {
      const caps = await pkc.getClientCapabilities().catch(() => ({}) as Record<string, boolean>);
      add(`Capacidades: ${JSON.stringify(caps)}`);
    } else add('Capacidades: el navegador no las informa');
    const lab = readLab();
    add(lab.id ? `Passkey de prueba guardada: ${lab.id.slice(0, 12)}… (PRF al crear: ${lab.prf ?? 'no'})` : 'Aún no hay passkey de prueba');
  }

  async function create() {
    try {
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'ARVID', id: location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'arvid-prueba', displayName: 'ARVID (prueba)' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
          extensions: { prf: { eval: { first: SALT } } } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return add('Crear: cancelado');
      const ext = cred.getClientExtensionResults() as { prf?: PrfResults & { enabled?: boolean } };
      const first = ext.prf?.results?.first;
      const prf = first ? await fingerprint(first) : undefined;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: cred.id, prf }));
      add(`Crear: OK · id ${cred.id.slice(0, 12)}…`);
      add(`PRF al crear: ${ext.prf?.enabled === undefined ? 'sin respuesta' : ext.prf.enabled ? 'activado' : 'NO activado'}${prf ? ` · secreto ${prf}` : ''}`);
    } catch (e) {
      add(`Crear: error ${(e as Error).name}: ${(e as Error).message}`);
    }
  }

  async function signIn() {
    try {
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: location.hostname,
          userVerification: 'required',
          // Sin lista: el sistema ofrece las passkeys del dominio (como al entrar en un teléfono nuevo)
          extensions: { prf: { eval: { first: SALT } } } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return add('Entrar: cancelado');
      const ext = cred.getClientExtensionResults() as { prf?: PrfResults };
      const first = ext.prf?.results?.first;
      const prf = first ? await fingerprint(first) : undefined;
      const lab = readLab();
      add(`Entrar: OK · id ${cred.id.slice(0, 12)}…${lab.id ? (lab.id === cred.id ? ' (la de prueba)' : ' (otra passkey)') : ''}`);
      add(`PRF al entrar: ${prf ? `secreto ${prf}` : 'NO disponible'}`);
      if (prf && lab.prf) add(prf === lab.prf ? 'PRF estable: coincide con el de crear ✓' : 'PRF distinto al de crear ✗');
      add(`userHandle: ${(cred.response as AuthenticatorAssertionResponse).userHandle ? b64url((cred.response as AuthenticatorAssertionResponse).userHandle!) : 'no'}`);
    } catch (e) {
      add(`Entrar: error ${(e as Error).name}: ${(e as Error).message}`);
    }
  }

  return (
    <main className="stack" style={{ padding: 'var(--s4)' }}>
      <h1>Prueba de passkeys</h1>
      <p className="small muted">
        Página oculta (spec 14, fase 14a). Crea una passkey de prueba «ARVID (prueba)», entra con ella y copia el resultado.
        Luego puedes borrarla del llavero o del gestor de contraseñas.
      </p>
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        <button type="button" className="btn" onClick={() => void environment()}>
          1. Ver el entorno
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void create()}>
          2. Crear passkey
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void signIn()}>
          3. Entrar con passkey
        </button>
        <button type="button" className="btn" disabled={!log.length} onClick={() => void navigator.clipboard?.writeText(log.join('\n'))}>
          Copiar resultado
        </button>
      </div>
      <pre className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} aria-live="polite">
        {log.join('\n')}
      </pre>
    </main>
  );
}
