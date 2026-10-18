# Spec 05 — Pruebas

Ubicación: `src/domain/avatar/avatar.test.ts`, `src/domain/scene/scene.test.ts` y `src/domain/music/playlist.test.ts` (U), `src/app/scene/scene.test.tsx` (C) y `src/app/scene/licenses.test.ts` (U), `e2e/scene.spec.ts` (E).

**Sin prueba automática en la 0.5.0** (se cubren en la checklist manual): ESC-10 y NFR5-06 (pausa con la app oculta; verificado a mano en el navegador del entorno de desarrollo), ESC-12 (fallo de carga), UB-04 (continuidad entre pestañas), MUS-05 y MUS-07 (pausa y música sin conexión: M5-02 y M5-05), PRO-04 por componente (la caché está en `app/scene/assets.ts`) y NFR5-04 (Lighthouse).

Tipos: **U** unitario · **I** integración · **C** componente · **E** E2E (Chromium + WebKit) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| ESC-09 | Simular 10 s a 60, 120 y 144 Hz → mismo desplazamiento (±2 %) y mismos fotogramas del protagonista | U |
| ESC-05 | Con la semilla fija: los vehículos alternan sentido (≤ 20 % de repeticiones) y nunca coinciden dos en el mismo carril | U |
| ESC-06 | Con 10 min simulados, aparecen entre 24 y 40 peatones en ambos sentidos | U |
| ESC-07 | El dron sigue la posición del protagonista y escanea de vez en cuando | U |
| PAR-01/02 | Registrar → ráfaga pequeña; subir de nivel → ráfaga grande + aviso | U + E |
| PAR-03 | Ráfaga pendiente: visible al volver antes de 10 s, descartada después | U |
| PAR-04 | Deshacer, editar, pausar, archivar y abandonar no generan ráfagas | C |
| ESC-10 · NFR5-06 | Con la pestaña oculta o el lienzo fuera de la pantalla no se dibujan fotogramas | C + E |
| ESC-11 | Con movimiento reducido, la escena queda estática y sin partículas; el cambio se aplica en vivo | C + E |
| ESC-12 | Un asset que falla → panel de respaldo; Hoy sigue funcionando | C |
| ESC-13 | En 10 min simulados cruzan drones a las 3 distancias y en ambos sentidos, como mucho 3 a la vez; cada uno avanza en su sentido y desaparece al salir; con movimiento reducido no hay | U |
| ESC-08 · UB-01/02 | Hoy: escena + fecha en texto; Personaje: escena + "Nv N · Título" en texto | C + E |
| UB-04 | Al cambiar de Hoy a Personaje, la escena continúa (mismo desplazamiento) | E |
| UB-05 | Al hacer scroll en Hoy, la escena, la fecha y el nivel siguen en el mismo sitio arriba | E |
| PRO-01 · §5 | Catálogo de 4 × 6; un `cast` o una `variant` desconocidos se normalizan al valor por defecto | U |
| PRO-02/03 | El onboarding guarda la elección; Ajustes la cambia y se ve al instante y tras recargar | C + E |
| PRO-04 · NFR5-03 | El recoloreado se cachea por variante y tarda < 50 ms (mejor de 7) | C |
| §5 · backup | Importar un backup de la 0.4.0 sin `avatar` ni `music` → valores por defecto | I |
| MUS-01 | Desactivada por defecto; no suena nada sin un gesto | C |
| MUS-02 | Barajado: 7 pistas distintas por ronda y sin repetir la última al cambiar de ronda (1 000 rondas con semilla) | U |
| MUS-05 | Al ocultar la app, la música se pausa; al volver, se reanuda | C |
| MUS-06 | Botón ♪ con `aria-pressed`; volumen y "Siguiente" en Ajustes | C |
| MUS-07 | Sin conexión, solo se eligen pistas en caché; sin ninguna, se muestra el aviso | E |
| MUS-08 | Al empezar una pista se ve su nombre y a los 5 s ya no; al volver a montar la escena después, no reaparece | C |
| DIS-01 | Contraste de los tokens de texto sin brillo (script de contraste) | U |
| LIC-01 | Script: todo archivo de `public/scene` y `public/music` figura en `asset-licenses.md` | U |
| LIC-02 | Créditos con autor, recurso y licencia de cada asset incluido | C |
| NFR5-04 | La primera pintura de Hoy no empeora más de 100 ms respecto a la 0.4.0 (Lighthouse, mismo equipo) | M |

## Checklist manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M5-01 | La escena va fluida y no calienta el teléfono tras 5 min en Hoy | ☐ | ☐ |
| M5-02 | Al bloquear el teléfono y volver, la escena y la música continúan sin saltos | ☐ | ☐ |
| M5-03 | Movimiento reducido del sistema → escena quieta | ☐ | ☐ |
| M5-04 | La música suena con el interruptor de silencio en ambas posiciones (iPhone) y respeta el volumen del sistema | ☐ | ☐ |
| M5-05 | Una pista escuchada vuelve a sonar en modo avión | ☐ | ☐ |
| M5-06 | Los 4 protagonistas y sus 6 variantes se ven bien en la escena a 320 px y a 720 px | ☐ | ☐ |
| M5-07 | VoiceOver o TalkBack leen la descripción de la escena, el nivel, la fecha y el botón ♪ | ☐ | ☐ |
