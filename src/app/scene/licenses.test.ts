import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// LIC-01: todo asset publicado de la escena y la música figura en el registro de licencias.
const root = join(__dirname, '../../..');
const registry = readFileSync(join(root, 'docs/design/asset-licenses.md'), 'utf8');

describe('licencias de los assets publicados (LIC-01)', () => {
  const files = ['scene', 'music'].flatMap((dir) => readdirSync(join(root, 'public', dir)).map((f) => `${dir}/${f}`));
  it.each(files)('%s está en asset-licenses.md', (file) => {
    expect(registry).toContain(file.split('/')[1]);
  });
});
