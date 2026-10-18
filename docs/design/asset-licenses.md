# ARVID — Registro de licencias de assets

Todo recurso de terceros incluido en la app debe figurar aquí **antes** de añadirlo al repositorio (D-028, R-005).

| Recurso | Autor | Fuente | Licencia | Uso en ARVID | Verificado |
|---|---|---|---|---|---|
| 1-Bit Pack v1.2 (2021) | Kenney | https://kenney.nl/assets/1-bit-pack | CC0 1.0 | 30 sprites (22 en 0.1.0 + 8 iconos de categorías propias en 0.4.0) de `Tilesheet/monochrome-transparent_packed.png` (lista en `scripts/sprites.txt`): personaje, 14 iconos de categoría, iconos de interfaz. Ampliados ×12 sin suavizado y recoloreados en tiempo de ejecución con máscara CSS. Iconos de la app derivados del personaje | `License.txt` del ZIP verificado el 2026-10-17 (CC0; atribución opcional) |
| Pixelify Sans | Stefie Justprince | https://fontsource.org/fonts/pixelify-sans/about | OFL 1.1 | Títulos, cifras, botones | 2026-10-17 (fontsource) |
| Atkinson Hyperlegible Next | Braille Institute / Applied Design | https://fontsource.org/fonts/atkinson-hyperlegible-next/about | OFL 1.1 | Cuerpo de texto | 2026-10-17 (fontsource) |
| Warped City | Luis Zuno (Ansimuz) | https://ansimuz.itch.io/warped-city | Dominio público ("public to use on whatever you want"); atribución opcional | `public/scene/`: `bg-1.png`, `bg-2.png`, `bg-3.png` (parallax), `v-red.png`, `v-yellow.png`, `v-police.png` (vehículos, en espejo según el sentido), `ella-walk.png` y `ella-idle.png` (protagonista Ella, recoloreada en tiempo de ejecución), `prop-control-box-1.png` y `prop-control-box-2.png` (detalles de la acera que ARVID inspecciona, spec 06 MV-03) | `public-license.txt` del ZIP, 2026-10-18 |
| Streets of Fight (Brawler Girl) | Luis Zuno (Ansimuz) | https://ansimuz.itch.io/streets-of-fight | CC0 | `public/scene/ella2-walk.png` y `ella2-idle.png` (protagonista Ella 2, recoloreada en tiempo de ejecución) | `public-license.pdf` del ZIP, 2026-10-18 |
| Free Townspeople Cyberpunk Pixel Art | CraftPix.net | https://craftpix.net/freebies/free-townspeople-cyberpunk-pixel-art/ | Licencia gratuita de CraftPix (https://craftpix.net/file-licenses/): uso comercial sin atribución; prohíbe redistribuir los archivos originales o dejarlos utilizables para otros | 10 animaciones de caminar combinadas en el atlas propio `public/scene/extras.png` (filas 0–9); los PNG originales no se publican | Página de licencia, 2026-10-18 |
| Free Drones Pack | CraftPix.net (free-game-assets) | https://free-game-assets.itch.io/free-drones-pack-pixel-art | La misma licencia de CraftPix (el `license.txt` del ZIP enlaza a ella) | Animaciones Walk y Scan del dron 1 en `public/scene/extras.png` (filas 10–11), dibujadas al 75 % | `license.txt` del ZIP y página de licencia, 2026-10-18 |
| Protagonistas Él y Él 2 | Responsable del producto (generados con sprite-ai.art) | — | Propios (declaración del responsable, 2026-10-18) | `public/scene/el-walk.png` (8 fotogramas de 64×64; el arma se borra en tiempo de ejecución) y `el2-walk.png` (8 fotogramas reducidos a su rejilla real de 40×60, sin halo), recoloreados en tiempo de ejecución | 2026-10-18 |
| Música: Midnight Sector Drive, Glass Tower Horizon y Black Chrome Horizon | Responsable del producto (generadas con Gemini) | — | Propias (declaración del responsable, 2026-10-18) | `public/music/midnight-sector-drive.m4a`, `glass-tower-horizon.m4a` y `black-chrome-horizon.m4a` (de MP3 a AAC de 128 kbps); fuera del precache | 2026-10-18 |
| Paleta Sweetie 16 | GrafxKid | https://lospec.com/palette-list/sweetie-16 | Sin licencia explícita; una paleta de colores no es una obra protegible y su uso libre está extendido (p. ej. es la paleta por defecto de TIC-80) | Paleta base | 2026-10-17 |

## Reglas
- Solo se admiten licencias CC0, OFL o equivalentes compatibles con la distribución de la app, o recursos propios.
- Si una licencia prohíbe publicar los archivos originales (CraftPix), se combinan en un atlas propio.
- `src/app/scene/licenses.test.ts` comprueba que cada archivo de `public/scene` y `public/music` figura aquí.
- Las fuentes OFL deben incluir su archivo de licencia junto a los archivos de fuente.
- Los assets modificados (recoloreados o recortados) se anotan en la columna "Uso".

## Descartados o pendientes
| Recurso | Motivo |
|---|---|
| 5 pistas del proyecto CombinaDos (Ascension, Curiosity, Descent, Fallen, Taurus) | Origen y licencia desconocidos: no se incluyen hasta verificarlos (spec 05, LIC-01) |
| Retratos de perfil generados con IA | Descartados en la exploración (spec 05 §2) |
