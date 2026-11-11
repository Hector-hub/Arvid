# Spec 17 — Guiones de las transmisiones

Textos listos para generar la voz de cada sesión, en sus tres versiones. Salen de `historia.md`; si algo no coincide, manda `historia.md`.

## Cómo grabar (todas las sesiones)
- **La misma voz y los mismos ajustes que en la sesión 1**, en cada una de las tres versiones: es masculina, es femenina e inglesa. El español de la app es el latino (D-244): acento latino neutro, el mismo de la sesión 1.
- **Voces de Fish Audio, las mismas de la sesión 1** (ya traen su filtro analógico):

  | Versión | Modelo | Id |
  |---|---|---|
  | Español masculina | Terror analogic | `610a5884a3c046be9a4f031291531a68` |
  | Español femenina | — | `48b01a5f698a4ef8ae41add88adc8f77` |
  | Inglesa | Analog horror teller | `22eabd36a14647319a4f088d4282e8bf` |

- **Sin música ni efectos, y sin otro filtro aparte del de la voz.** La app añade encima el filtro de radio AM, el zumbido y la estática, igual que con la sesión 1 en el prototipo aprobado (TR-05).
- **Entrega:** un archivo por sesión y voz, mono, 44,1 o 48 kHz, en `wav` o `m4a`, con medio segundo de silencio al principio y al final.
- **Nombres:** `sesion-02-es-m`, `sesion-02-es-f`, `sesion-02-en` (y así con cada sesión).
- **Pausas:** las de la tabla son orientativas. Lo importante es que haya un silencio claro entre frases: cada subtítulo entra en la pausa donde empieza su frase, y las marcas exactas las saco yo del audio.
- **Números siempre en letra**, como aquí. Así no hay dudas de pronunciación.
- **Dirección de voz** (para pegar como instrucción de estilo si la herramienta la admite):
  - es: *Voz sintética, fría y controlada. Ritmo lento y regular. Sin emoción, sin énfasis, como un sistema que lee un informe. Pausas largas entre frases.*
  - en: *Synthetic, cold, controlled voice. Slow, even pace. No emotion, no emphasis, like a system reading a report. Long pauses between sentences.*
- **Las voces masculina y femenina dicen lo mismo** salvo donde se indica. En las sesiones 2 y 3 no hay ninguna palabra con género, así que el texto es idéntico; solo cambia la voz.

---

## Sesión 2 · Capítulo 3 · «Primera prueba»
Con imagen: la figura, sin buscador. Duración estimada: 12 a 14 s.

### Español (masculina y femenina)
| # | Subtítulo | Pausa después |
|---|---|---|
| 1 | Sesión dos. Fase de evaluación. | 1,2 s (con 0,5 s entre «dos» y «Fase») |
| 2 | Se ha emitido la primera prueba. | 1,2 s |
| 3 | La aceptación es voluntaria. | 0,8 s |
| 4 | El rechazo también será registrado. | — |

Nota de interpretación: la frase 4, un poco más despacio que el resto. Sigue siendo fría: no es una amenaza, es un dato.

Texto para pegar:
```text
Sesión dos.

Fase de evaluación.

Se ha emitido la primera prueba.

La aceptación es voluntaria.

El rechazo también será registrado.
```

Con marcas de pausa, para herramientas que las admiten:
```text
Sesión dos. <break time="0.5s"/> Fase de evaluación. <break time="1.2s"/> Se ha emitido la primera prueba. <break time="1.2s"/> La aceptación es voluntaria. <break time="0.8s"/> El rechazo también será registrado.
```

### English
| # | Subtitle | Pause after |
|---|---|---|
| 1 | Session two. Evaluation phase. | 1.2 s (0.5 s between "two" and "Evaluation") |
| 2 | The first test has been issued. | 1.2 s |
| 3 | Acceptance is voluntary. | 0.8 s |
| 4 | Refusal will also be recorded. | — |

```text
Session two.

Evaluation phase.

The first test has been issued.

Acceptance is voluntary.

Refusal will also be recorded.
```

```text
Session two. <break time="0.5s"/> Evaluation phase. <break time="1.2s"/> The first test has been issued. <break time="1.2s"/> Acceptance is voluntary. <break time="0.8s"/> Refusal will also be recorded.
```

---

## Sesión 3 · Capítulo 5 · «La tercera semana»
Con imagen: la figura, sin buscador. Duración estimada: 16 a 19 s.

### Español (masculina y femenina)
| # | Subtítulo | Pausa después |
|---|---|---|
| 1 | Sesión tres. | 1 s |
| 2 | Probabilidad de convergencia: doce por ciento. | 1 s (0,4 s tras «convergencia») |
| 3 | Rendimiento dentro de parámetros. | 1,2 s |
| 4 | Nota del registro: históricamente, el participante abandona en la tercera semana. | **1,8 s** |
| 5 | Esta vez no lo ha hecho. | — |

Nota de interpretación: la pausa antes de la frase 5 es la más larga de la sesión. La frase 5, un poco más lenta y un punto más baja, sin emoción. Es lo único que el Marco dice de ti y no de un dato, y en el capítulo 7 se entiende por qué.

Texto para pegar:
```text
Sesión tres.

Probabilidad de convergencia: doce por ciento.

Rendimiento dentro de parámetros.

Nota del registro: históricamente, el participante abandona en la tercera semana.

Esta vez no lo ha hecho.
```

Con marcas de pausa:
```text
Sesión tres. <break time="1s"/> Probabilidad de convergencia: <break time="0.4s"/> doce por ciento. <break time="1s"/> Rendimiento dentro de parámetros. <break time="1.2s"/> Nota del registro: <break time="0.3s"/> históricamente, el participante abandona en la tercera semana. <break time="1.8s"/> Esta vez no lo ha hecho.
```

### English
| # | Subtitle | Pause after |
|---|---|---|
| 1 | Session three. | 1 s |
| 2 | Convergence probability: twelve percent. | 1 s (0.4 s after "probability") |
| 3 | Performance within parameters. | 1.2 s |
| 4 | Log note: historically, the participant quits in the third week. | **1.8 s** |
| 5 | This time, they have not. | — |

```text
Session three.

Convergence probability: twelve percent.

Performance within parameters.

Log note: historically, the participant quits in the third week.

This time, they have not.
```

```text
Session three. <break time="1s"/> Convergence probability: <break time="0.4s"/> twelve percent. <break time="1s"/> Performance within parameters. <break time="1.2s"/> Log note: <break time="0.3s"/> historically, the participant quits in the third week. <break time="1.8s"/> This time, they have not.
```

---

## Archivos de la 2.5.0 (generados el 2026-11-11 con Fish Audio, en `public/senal/`)
| Archivo | Voz |
|---|---|
| `sesion-02-es-m` | Española masculina |
| `sesion-02-es-f` | Española femenina |
| `sesion-02-en` | Inglesa |
| `sesion-03-es-m` | Española masculina |
| `sesion-03-es-f` | Española femenina |
| `sesion-03-en` | Inglesa |
