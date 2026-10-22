# Protagonistas retirados

Sprites que la app ya no usa, guardados por si se necesitan. No se publican (están fuera de `public/`).

## Drifter (Él 2), versión 1
- **Hoja:** `el2-walk-v1.png`. 8 fotogramas de 40 × 60 px, generados con sprite-ai.art (propios, D-051).
- **Sustituida el 2026-10-19 (D-087)** por la hoja nueva de 64 × 64 px, generada con IA y procesada con `scripts/build-protagonist.py`.
- **Para volver a usarla:** copiar la hoja a `public/scene/el2-walk.png` y recuperar de `git show 545fe70:src/domain/avatar/catalog.ts` y `git show 545fe70:src/domain/avatar/recolor.ts` su entrada del catálogo (frameW 40, frameH 60, anchorX 20, feetY 59) y sus reglas de recoloreado (`MALE2`).

## Ghost (Él), versión 1
- **Hoja:** `el-walk-v1.png`. 8 fotogramas de 64 × 64, generados con sprite-ai.art (propios); el arma se borraba en tiempo de ejecución.
- **Sustituida el 2026-10-21 (D-096)** por el ninja de 35 fotogramas extraídos de un vídeo generado con IA.
- **Para volver a usarla:** copiar la hoja a `public/scene/el-walk.png` y recuperar de `git show c108d7d:src/domain/avatar/catalog.ts` y `git show c108d7d:src/domain/avatar/recolor.ts` su entrada del catálogo (8 fotogramas, ticks 7.5, anchorX 29, feetY 64, scale 0.8, flip) y su recoloreado (`recolorEl`, que borra el arma).
