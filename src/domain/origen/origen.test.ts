import { describe, expect, it } from 'vitest';
import {
  choose,
  contactDelay,
  cueAt,
  finishContact,
  needsChoice,
  needsContact,
  seenSessions,
  SESSION_1,
  setStory,
  sombraHidden,
  sombraStill,
  SOMBRA_STEP,
  SESSIONS,
  cueKey,
  fxAt,
  revealOn,
  storyOn,
  voiceFor,
  voiceSrc,
} from './origen';

describe('primer contacto (PC-01, PC-06)', () => {
  it('cae entre 6 y 55 s; si se cerró a medias, entre 3 y 8 s', () => {
    expect(contactDelay(undefined, () => 0)).toBe(6);
    expect(contactDelay(undefined, () => 1)).toBe(55);
    const started = { contactStartedAt: '2026-11-11T10:00:00.000Z' };
    expect(contactDelay(started, () => 0)).toBe(3);
    expect(contactDelay(started, () => 1)).toBe(8);
  });

  it('al terminar queda visto, con la sesión 1 y el primer tramo abierto con la XP de ese momento (RI-01)', () => {
    const at = new Date('2026-11-11T10:00:00.000Z');
    const s = finishContact({ contactStartedAt: '2026-11-11T09:59:00.000Z' }, at, 120);
    expect(needsContact(s)).toBe(false);
    expect(s.contactStartedAt).toBeUndefined();
    expect(s.periods).toEqual([{ openedAt: at.toISOString(), xpAtOpen: 120 }]);
    expect(seenSessions(s)).toEqual([{ n: 1, at: at.toISOString() }]);
    // Repetirlo (modo de desarrollo) no abre otro tramo ni cambia la fecha de la sesión
    const again = finishContact(s, new Date('2026-11-12T10:00:00.000Z'), 300);
    expect(again.periods).toEqual(s.periods);
    expect(again.sessions).toEqual(s.sessions);
  });
});

describe('la pregunta (DE)', () => {
  it('se pide tras el primer contacto hasta que se contesta', () => {
    expect(needsChoice(undefined)).toBe(false);
    const seen = finishContact(undefined, new Date(), 0);
    expect(needsChoice(seen)).toBe(true);
    expect(needsChoice(choose(seen, 'block'))).toBe(false);
  });

  it('«Investigar» enciende la historia; «Bloquear la señal» la deja apagada; Ajustes la cambia (AJ-01)', () => {
    const seen = finishContact(undefined, new Date(), 0);
    expect(storyOn(choose(seen, 'investigate'))).toBe(true);
    expect(storyOn(choose(seen, 'block'))).toBe(false);
    expect(storyOn(setStory(choose(seen, 'block'), true))).toBe(true);
    expect(storyOn(setStory(choose(seen, 'investigate'), false))).toBe(false);
  });

  it('Sombra solo se va de la calle con la historia en marcha (SO-05, SO-06)', () => {
    const seen = finishContact(undefined, new Date(), 0);
    expect(sombraHidden(choose(seen, 'investigate'))).toBe(true);
    expect(sombraHidden(choose(seen, 'block'))).toBe(false);
  });
});

describe('voz (TR-05)', () => {
  it('según idioma y género; con «Prefiero no decirlo», la de tu protagonista', () => {
    expect(voiceFor('es', 'm', 'ella')).toBe('es-m');
    expect(voiceFor('es', 'f', 'el')).toBe('es-f');
    expect(voiceFor('es', 'x', 'ella2')).toBe('es-f');
    expect(voiceFor('es', undefined, 'el2')).toBe('es-m');
    expect(voiceFor('en', 'f', 'ella')).toBe('en');
    expect(voiceSrc(1, 'es-f')).toBe('/senal/sesion-01-es-f.m4a');
  });

  it('los subtítulos entran en su marca y hay ocho en cada voz', () => {
    for (const track of Object.values(SESSION_1)) {
      expect(track.cues.map(([, key]) => key)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(track.cues.at(-1)![0]).toBeLessThan(track.end);
    }
    expect(cueAt(SESSION_1['es-m'], 0)).toBe(0);
    expect(cueAt(SESSION_1['es-m'], 8.22)).toBe(0);
    expect(cueAt(SESSION_1['es-m'], 8.23)).toBe(1);
    expect(cueAt(SESSION_1['es-m'], 99)).toBe(7);
  });
});

describe('tiempo de los textos (CA-07)', () => {
  it('días, semanas, meses o un año', async () => {
    const { elapsed } = await import('./origen');
    expect(elapsed(0)).toEqual({ unit: 'days', count: 1 });
    expect(elapsed(13)).toEqual({ unit: 'days', count: 13 });
    expect(elapsed(14)).toEqual({ unit: 'weeks', count: 2 });
    expect(elapsed(59)).toEqual({ unit: 'weeks', count: 8 });
    expect(elapsed(60)).toEqual({ unit: 'months', count: 2 });
    expect(elapsed(365)).toEqual({ unit: 'year', count: 1 });
  });
});

describe('fallos del Marco del guion (TR-04) y Sombra junto al farol (SO-01)', () => {
  it('cada sesión del acto II tiene subtítulos en orden, dentro de la voz, y sus fallos', () => {
    for (const n of [4, 5, 6]) {
      const session = SESSIONS[n]!;
      for (const track of Object.values(session.tracks)) {
        expect(track.cues).toHaveLength(session.cues);
        expect(track.cues.map(([at]) => at)).toEqual([...track.cues.map(([at]) => at)].sort((a, b) => a - b));
        expect(track.cues.at(-1)![0]).toBeLessThan(track.end);
        expect(track.fx?.length).toBeGreaterThan(0);
      }
    }
    // El corte seco es de las sesiones 5 y 6; la 4 se pierde como siempre
    expect(SESSIONS[4]!.tracks['es-m'].cut).toBeUndefined();
    expect(SESSIONS[5]!.tracks.en.cut).toBe('hard');
    expect(SESSIONS[6]!.tracks['es-f'].cut).toBe('hard');
  });

  it('en el giro 1 la frase del operador cambia con el género de la voz (CA-04)', () => {
    expect(cueKey(6, 2, 'es-f')).toBe('origen.session6.2.f');
    expect(cueKey(6, 2, 'es-m')).toBe('origen.session6.2.m');
    expect(cueKey(6, 3, 'es-f')).toBe('origen.session6.3');
  });

  it('el giro 1 enseña tu protagonista en tres parpadeos durante 0,8 s', () => {
    const fx = SESSIONS[6]!.tracks['es-m'].fx!.find((f) => f.kind === 'reveal')!;
    expect(fx.dur).toBe(0.8);
    expect(fxAt(SESSIONS[6]!.tracks['es-m'], fx.at + 0.1)).toBe(fx);
    expect(fxAt(SESSIONS[6]!.tracks['es-m'], fx.at + 0.9)).toBeUndefined();
    const samples = Array.from({ length: 80 }, (_, i) => revealOn(fx, fx.at + (i / 80) * fx.dur));
    const blinks = samples.filter((on, i) => on && !samples[i - 1]).length;
    expect(blinks).toBe(3);
  });

  it('Sombra se queda junto al farol desde el final del capítulo 10, solo si investigas', () => {
    const base = choose(finishContact(undefined, new Date('2026-11-01T10:00:00Z'), 0), 'investigate');
    expect(sombraStill(base)).toBe(false);
    const seen = { ...base, steps: { [SOMBRA_STEP]: '2026-12-31T10:00:00.000Z' } };
    expect(sombraStill(seen)).toBe(true);
    expect(sombraStill({ ...seen, enabled: false })).toBe(false);
  });
});
