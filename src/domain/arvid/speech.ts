// Cómo habla ARVID (spec 06, BP-01 a BP-05): el texto se ajusta al ancho de la burbuja, se reparte en páginas de
// 2 líneas, cada página aparece letra a letra y pasa a la siguiente a los 5 s o al tocar. Puro: la medida del
// texto llega como función y el tiempo como `dt` en fotogramas de 60 Hz.

export const LINES_PER_PAGE = 2;
/** ~40 caracteres por segundo. */
export const CHARS_PER_FRAME = 40 / 60;
/** 5 s con la página completa antes de pasar a la siguiente. */
export const HOLD_FRAMES = 300;

/** Ajusta `text` a `maxWidth` y lo reparte en páginas de `linesPerPage` líneas. */
export function paginate(text: string, measure: (s: string) => number, maxWidth: number, linesPerPage = LINES_PER_PAGE): string[][] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Una palabra más ancha que la burbuja se corta por caracteres
      let rest = word;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
  }
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  return pages;
}

export interface Speech {
  pages: string[][];
  page: number;
  /** Caracteres visibles de la página actual. */
  shown: number;
  /** Fotogramas con la página completa. */
  hold: number;
  done: boolean;
}

export function createSpeech(pages: string[][]): Speech {
  return { pages, page: 0, shown: 0, hold: 0, done: pages.length === 0 };
}

const pageLength = (sp: Speech) => (sp.pages[sp.page] ?? []).reduce((n, l) => n + l.length, 0);

function nextPage(sp: Speech) {
  if (sp.page < sp.pages.length - 1) {
    sp.page++;
    sp.shown = 0;
    sp.hold = 0;
  } else sp.done = true;
}

/** Avanza la escritura; con `instant` (movimiento reducido) la página aparece entera. */
export function stepSpeech(sp: Speech, dt: number, instant = false): void {
  if (sp.done) return;
  const total = pageLength(sp);
  if (sp.shown < total) {
    sp.shown = instant ? total : Math.min(total, sp.shown + CHARS_PER_FRAME * dt);
    return;
  }
  sp.hold += dt;
  if (sp.hold >= HOLD_FRAMES) nextPage(sp);
}

/** Un toque completa la página; si ya está completa, pasa a la siguiente (o termina). */
export function tapSpeech(sp: Speech): void {
  if (sp.done) return;
  if (sp.shown < pageLength(sp)) sp.shown = pageLength(sp);
  else nextPage(sp);
}

/** Líneas visibles de la página actual, cortadas por la escritura. */
export function visibleLines(sp: Speech): string[] {
  let left = Math.floor(sp.shown);
  return (sp.pages[sp.page] ?? []).map((line) => {
    const part = line.slice(0, Math.max(0, left));
    left -= line.length;
    return part;
  });
}

/** La página actual está completa y hay más después (indicador ▼, BP-03). */
export function hasMore(sp: Speech): boolean {
  return !sp.done && sp.page < sp.pages.length - 1 && sp.shown >= pageLength(sp);
}

/** Texto completo de la página actual (para la región accesible, BP-04). */
export function pageText(sp: Speech): string {
  return (sp.pages[sp.page] ?? []).join(' ');
}
