# Spec 18 — Retratos de los protagonistas

**Estado:** aprobada (2026-11-12, D-251) · **Versión:** 2.8.0.

## 1. Objetivo
Cada protagonista tiene un retrato de busto con caras que cambian: parpadea, habla y reacciona. Da cara a quien juega
en los sitios donde hoy solo hay un sprite de cuerpo entero visto de perfil, y en el giro 1 de la historia.

## 2. Material
- Cuatro hojas, una por protagonista (Ella, Ella 2, Él, Él 2), de 4 × 4 caras de **64 × 64 px** con fondo transparente:
  `public/avatar/<cast>-caras.png`.
- Generadas por el responsable con IA a partir del sprite de cada protagonista; limpiadas, alineadas y vueltas a pixelar
  con una paleta fija por personaje (`material/perfil/`). Se registran en `asset-licenses.md`.
- Orden de las caras:

  | Fila | Caras |
  |---|---|
  | 1 · Reposo | normal · ojos a medias · ojos cerrados · normal |
  | 2 · Hablar | boca cerrada · entreabierta · abierta · entreabierta |
  | 3 · Alegría | sonrisa · sonrisa grande · risa con los ojos cerrados · sonrisa |
  | 4 · Otras | sorpresa · determinación · pensativa · cansancio |

## 3. Requisitos

### 3.1 El retrato (RT)
- **RT-01. Componente único** `Portrait`: tu protagonista, en tu variante de color, a un tamaño entero (×1, ×2, ×3…),
  sin suavizado.
- **RT-02. Parpadea solo** cada 3 a 6 s (ojos a medias, cerrados, a medias: 60, 90 y 60 ms).
- **RT-03. Expresiones:** `normal`, `alegría`, `sorpresa`, `determinación`, `pensativa`, `cansancio`, y `hablar`, que
  alterna la boca cada 110 ms.
- **RT-04. Con «Reducir movimiento»**, sin parpadeo ni boca: solo la cara que toque, fija.
- **RT-05. Variantes de color** (PRO-01): se recolorea como el sprite. Cada color de la paleta del retrato tiene asignado
  un papel (pelo, ropa, piel, detalle o fijo: contorno, ojos, dientes) y se lleva a la gama de la variante por orden de
  luminosidad, con las mismas gamas que el sprite. Se revisa a ojo con las 6 variantes de los 4 protagonistas antes de
  publicar.
- **RT-06.** Sin hoja cargada (sin conexión la primera vez), se ve el sprite de hoy.

### 3.2 Dónde sale (RD)
- **RD-01. Perfil:** en la cabecera, a ×2 (128 px, para que quepa junto al alias en el móvil), con el anillo de nivel como insignia en su esquina y con parpadeo. Al entrar a la pantalla, una sonrisa breve (1 s) y vuelve a la
  cara normal. Al tocarlo, una cara de la fila 3 o 4 al azar durante 1 s.
- **RD-02. Onboarding**, al elegir protagonista: cada opción enseña su retrato con parpadeo, junto al sprite que camina; al elegirla, sonríe. Al
  cambiar de variante, el retrato cambia de color.
- **RD-03. Giro 1 (sesión 6, TR-04):** durante los tres parpadeos, en lugar de la figura sale **el retrato de base**
  (fila 1, cara 1), quieto, en tu variante, al tamaño de la figura. Sustituye al sprite de cuerpo entero de la 2.8.0.

## 4. Fuera de alcance
- Retratos de los vecinos, del compañero o de Sombra.
- Usar el retrato en los chats, en las subidas de nivel o en los logros (se puede añadir después con el mismo componente).

## 5. Pruebas (resumen)
- Cada hoja existe, mide 256 × 256 y tiene sus 16 caras con contenido.
- El recoloreado cambia pelo, ropa y piel y deja igual el contorno y los ojos, en las 6 variantes.
- El parpadeo y la boca no corren con «Reducir movimiento».
- Perfil, Onboarding y sesión 6 enseñan el retrato; sin hoja, el sprite.
