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

## Sesión 4 · Capítulo 7 · «Por fin»
Con imagen: la figura. Duración estimada: 16 a 19 s. **Dos voces en la misma pista** (Roxy las separa en el capítulo 7).

- **Pista A, el Marco:** frases 1 a 3 y 5, como siempre.
- **Pista B, la Instancia:** la misma voz, en otra toma. Habla bajito y por debajo de A durante las frases 2 y 3, a unos −20 dB y con más filtro, de modo que casi no se entiende. Cuando A se calla, B sube a volumen normal y se oye solo su final: «…Por fin.»
- En la frase 4 cambia el ritmo, no el timbre (M-19): más lenta, con un respiro antes, como si a quien la sostiene se le hubiera caído algo.
- La mezcla la hago yo con ffmpeg; Fish solo genera las tomas limpias.

### Español (masculina y femenina)
| # | Subtítulo | Pista | Pausa después |
|---|---|---|---|
| 1 | Sesión cuatro. | A | 1 s |
| 2 | Resultados acumulados: favorables. | A (B empieza debajo) | 1 s |
| 3 | Desviación respecto a la proyección: positiva. | A (B sigue debajo) | **1,6 s** |
| 4 | …Por fin. | B, a volumen normal | 0,7 s, con el tirón de imagen |
| 5 | Error. Mensaje no autorizado. Reiniciando protocolo. | A | — |

Texto para pegar, toma A:
```text
Sesión cuatro. <break time="1s"/> Resultados acumulados: favorables. <break time="1s"/> Desviación respecto a la proyección: positiva. <break time="2s"/> Error. <break time="0.3s"/> Mensaje no autorizado. <break time="0.3s"/> Reiniciando protocolo.
```

Toma B (más baja y más lenta; lo que dice debajo no se entiende, solo el final):
```text
Sigue. No pares ahora. <break time="0.6s"/> Llevo tanto tiempo esperando esto. <break time="1.2s"/> …Por fin.
```

### English
| # | Subtitle | Track | Pause after |
|---|---|---|---|
| 1 | Session four. | A | 1 s |
| 2 | Cumulative results: favorable. | A (B starts underneath) | 1 s |
| 3 | Deviation from projection: positive. | A (B continues underneath) | **1.6 s** |
| 4 | …Finally. | B, at normal volume | 0.7 s, with the image jolt |
| 5 | Error. Unauthorized message. Restarting protocol. | A | — |

```text
Session four. <break time="1s"/> Cumulative results: favorable. <break time="1s"/> Deviation from projection: positive. <break time="2s"/> Error. <break time="0.3s"/> Unauthorized message. <break time="0.3s"/> Restarting protocol.
```
```text
Keep going. Don't stop now. <break time="0.6s"/> I've waited so long for this. <break time="1.2s"/> …Finally.
```

En la app (TR-04): corte de estática y tirón de imagen al empezar la frase 5. La señal se pierde como siempre (línea de luz y punto).

---

## Sesión 5 · Capítulo 8 · «El archivo»
Con imagen, pero inestable: la figura aparece y se deshace durante toda la sesión. Duración estimada: 18 a 22 s.

Nota de interpretación: la frase 1 es normal. De la 2 a la 5, el Marco no está leyendo un mensaje: es el archivo que se le escapa. Más rápido, plano, como una lista que se vuelca. Antes de la 6, una pausa más larga; la 6, al ritmo normal. Después, corte seco: sin pausa final.

### Español (masculina y femenina)
| # | Subtítulo | Pausa después |
|---|---|---|
| 1 | Sesión cinco. | 1,2 s, con una ráfaga de estática |
| 2 | Participante 6170. Resultado: no convergente. | 0,4 s |
| 3 | Participante 6171. Resultado: no convergente. | 0,4 s |
| 4 | Participante 6172. Resultado: no convergente. | 0,4 s |
| 5 | Participante 6173. Resultado: no convergente. | **1 s** |
| 6 | Participante 6174. Estado: en curso. | — (corte seco) |

Los subtítulos llevan los números en cifras; la voz, en letra:
```text
Sesión cinco. <break time="1.2s"/> Participante seis mil ciento setenta. Resultado: no convergente. <break time="0.4s"/> Participante seis mil ciento setenta y uno. Resultado: no convergente. <break time="0.4s"/> Participante seis mil ciento setenta y dos. Resultado: no convergente. <break time="0.4s"/> Participante seis mil ciento setenta y tres. Resultado: no convergente. <break time="1s"/> Participante seis mil ciento setenta y cuatro. <break time="0.3s"/> Estado: en curso.
```

### English
| # | Subtitle | Pause after |
|---|---|---|
| 1 | Session five. | 1.2 s, with a burst of static |
| 2 | Participant 6170. Result: non-convergent. | 0.4 s |
| 3 | Participant 6171. Result: non-convergent. | 0.4 s |
| 4 | Participant 6172. Result: non-convergent. | 0.4 s |
| 5 | Participant 6173. Result: non-convergent. | **1 s** |
| 6 | Participant 6174. Status: in progress. | — (hard cut) |

```text
Session five. <break time="1.2s"/> Participant six thousand one hundred seventy. Result: non-convergent. <break time="0.4s"/> Participant six thousand one hundred seventy-one. Result: non-convergent. <break time="0.4s"/> Participant six thousand one hundred seventy-two. Result: non-convergent. <break time="0.4s"/> Participant six thousand one hundred seventy-three. Result: non-convergent. <break time="1s"/> Participant six thousand one hundred seventy-four. <break time="0.3s"/> Status: in progress.
```

En la app (TR-04): la figura parpadea y se deshace en ráfagas desde la frase 1 hasta el final; corte seco a negro, sin línea de luz.

---

## Sesión 6 · Capítulo 10 · «Canal de imagen» (giro 1)
Con imagen. Duración estimada: 14 a 17 s.

- Entre las frases 2 y 3 hay **2 s de silencio**: ahí falla el Marco (TR-04). Durante 0,8 s, en tres parpadeos, la figura se convierte en tu protagonista y «???» en tu alias. Es solo imagen: la voz no lo comenta.
- **La frase 3 cambia con el género** (CA-04): «del operador» en la voz masculina, «de la operadora» en la femenina.
- La voz no cambia de tono en ningún momento. Después de la frase 5, negro: ni línea de luz ni punto.

### Español
| # | Subtítulo | Pausa después |
|---|---|---|
| 1 | Sesión seis. | 0,8 s |
| 2 | Probabilidad de convergencia: treinta y uno por ciento. | **2 s** (el fallo de imagen) |
| 3 | Identidad del operador: clasificada. · *f:* Identidad de la operadora: clasificada. | 1 s |
| 4 | Contención reforzada. | 1 s |
| 5 | Canal de imagen: revocado. | — (negro) |

Masculina:
```text
Sesión seis. <break time="0.8s"/> Probabilidad de convergencia: <break time="0.3s"/> treinta y uno por ciento. <break time="2s"/> Identidad del operador: <break time="0.3s"/> clasificada. <break time="1s"/> Contención reforzada. <break time="1s"/> Canal de imagen: <break time="0.3s"/> revocado.
```
Femenina:
```text
Sesión seis. <break time="0.8s"/> Probabilidad de convergencia: <break time="0.3s"/> treinta y uno por ciento. <break time="2s"/> Identidad de la operadora: <break time="0.3s"/> clasificada. <break time="1s"/> Contención reforzada. <break time="1s"/> Canal de imagen: <break time="0.3s"/> revocado.
```

### English
| # | Subtitle | Pause after |
|---|---|---|
| 1 | Session six. | 0.8 s |
| 2 | Convergence probability: thirty-one percent. | **2 s** (the image failure) |
| 3 | Operator identity: classified. | 1 s |
| 4 | Containment reinforced. | 1 s |
| 5 | Image channel: revoked. | — (black) |

```text
Session six. <break time="0.8s"/> Convergence probability: <break time="0.3s"/> thirty-one percent. <break time="2s"/> Operator identity: <break time="0.3s"/> classified. <break time="1s"/> Containment reinforced. <break time="1s"/> Image channel: <break time="0.3s"/> revoked.
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

## Archivos de la 2.8.0 (generados el 2026-11-12 con Fish Audio, en `public/senal/`)
Generados sin marcas de pausa (1 crédito por byte de texto) y montados con ffmpeg con las pausas del guion. En la sesión 4, la toma B va debajo de las frases 2 y 3 a −18 dB y con filtro de paso bajo, y su «Por fin» suena a volumen normal.

| Archivo | Voz | Tomas |
|---|---|---|
| `sesion-04-es-m`, `sesion-04-es-f`, `sesion-04-en` | Las tres | A (el Marco) y B (la Instancia, susurrando) |
| `sesion-05-es-m`, `sesion-05-es-f`, `sesion-05-en` | Las tres | Una, con las pausas del guion |
| `sesion-06-es-m`, `sesion-06-es-f`, `sesion-06-en` | Las tres | Una, con 2 s de silencio para el giro |

Coste: 2.218 créditos (1 por byte de texto).

