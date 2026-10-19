# Protagonistas retirados

Sprites que la app ya no usa, guardados por si se necesitan. No se publican (están fuera de `public/`).

## Drifter (Él 2), versión 1
- **Hoja:** `el2-walk-v1.png`. 8 fotogramas de 40 × 60 px, generados con sprite-ai.art (propios, D-051).
- **Sustituida el 2026-10-19 (D-087)** por la hoja nueva de 64 × 64 px, generada con IA y procesada con `scripts/build-protagonist.py`.
- **Para volver a usarla:** copiar la hoja a `public/scene/el2-walk.png` y recuperar de `git show 545fe70:src/domain/avatar/catalog.ts` y `git show 545fe70:src/domain/avatar/recolor.ts` su entrada del catálogo (frameW 40, frameH 60, anchorX 20, feetY 59) y sus reglas de recoloreado (`MALE2`).
