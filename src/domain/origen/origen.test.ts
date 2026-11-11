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
