import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// NFR-04: el dominio no depende de UI, persistencia ni APIs del navegador.
const FORBIDDEN = [/from ['"]react/, /from ['"]dexie/, /from ['"].*\/(app|data|pwa)\//, /\b(window|document|navigator|indexedDB|localStorage)\./];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('límites del dominio (NFR-04)', () => {
  it.each(files(join(__dirname)))('%s no importa capas prohibidas', (file) => {
    const source = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) expect(source).not.toMatch(pattern);
  });
});
