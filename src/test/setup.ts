import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setGlobalVars } from '../i18n';

afterEach(() => {
  cleanup();
  // Cada prueba empieza con ARVID como compañero en los textos (spec 08)
  setGlobalVars({ companion: 'ARVID', selfO: 'o' });
});

// jsdom no implementa canvas: devolver null (como un navegador sin canvas) en lugar de avisar en cada prueba
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
