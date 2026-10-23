# Spec 09 — Juegos dentro de ARVID

Estado: **aprobada** (D-099, 2026-10-23) · 0.9.0 · Incremento posterior al MVP

## 1. Objetivo
Poder jugar desde ARVID a juegos propios publicados en la web. Primer juego: **CombinaDos** (Unity WebGL, https://velvety-pasca-9a2e5c.netlify.app/).

## 2. Alcance
**Incluye:** botón de juego en la escena y una pantalla que muestra el juego desde su sitio.
**Excluye:** usar el juego sin conexión, copiar sus archivos dentro de ARVID y que juego y app se comuniquen (XP, logros, comentarios del compañero). Quedan para más adelante.

## 3. Requisitos
- **JG-01.** En la escena de Hoy, un botón con un mando pixel («Jugar»), justo **encima del botón del chat**, abre `/juego`.
- **JG-02.** `/juego` muestra «‹ Hoy» y el juego a todo el ancho, cargado desde su sitio en un marco (`iframe`, con pantalla completa permitida). La altura cabe en la pantalla sin quedar bajo la barra de navegación.
- **JG-03.** Sin conexión, en lugar del juego se muestra: «El juego necesita conexión. Vuelve a intentarlo cuando tengas internet.» Al volver la conexión, el juego aparece solo.
- **JG-04.** La política de seguridad de la app (CSP) permite cargar en un marco **solo** el sitio del juego (`frame-src`).
- **JG-06.** Botón de **pantalla completa** junto a «‹ Hoy»: el juego cubre toda la ventana (sin usar la pantalla completa del navegador: con ella el juego deja de responder, y Safari en iPhone no la permite para un marco). Se sale con el botón de esquinas hacia dentro, arriba a la derecha, o con Esc.
- **JG-07.** La **música de ARVID calla** mientras se está en `/juego` (el juego trae la suya) y vuelve al salir, sin cambiar la preferencia guardada. El sonido del juego no se puede controlar desde ARVID: se silencia con el control del propio juego.
- **JG-09.** En pantalla completa, el botón de salir se ve 3 s y se desvanece; un toque en su esquina (64 px arriba a la derecha) lo vuelve a mostrar otros 3 s. Esa esquina no llega al juego mientras el botón está oculto.
- **JG-08.** **Ajustes → Perfil → «Juegos»** (activado por defecto) muestra u oculta el botón «Jugar»; desactivado, `/juego` lleva a Hoy. Va en el backup.
- **JG-05.** Los juegos están en una lista (`src/app/games.ts`): añadir otro es añadir una línea.

## 4. Riesgos
- **R9-1 · Memoria en iPhone:** Safari puede cerrar un juego de Unity pesado. *Mitigación:* probar en el iPhone antes de publicar.
- **R9-2 · Depende de otro sitio:** si el juego cambia de dirección, hay que actualizar la lista y la CSP.

## 5. Ejemplos
- When el usuario toca «Jugar» en la escena · Then se abre `/juego` con CombinaDos.
- Given sin conexión · When abre `/juego` · Then ve el aviso y no el marco.
