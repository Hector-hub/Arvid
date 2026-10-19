# Spec 07 — Tareas

Derivadas de spec.md (aprobada, D-083).

**Estado (2026-10-18):** 0.7.0 desplegada (T01–T09). 0.7.1 con T10–T13 hechas: axe en `e2e/a11y.spec.ts` (sin infracciones tras corregir el nombre de la franja de nivel), un año de datos en `domain/testing/yearData.ts` con `src/domain/perf.test.ts` y `e2e/perf.spec.ts`, y Lighthouse en producción (resultados en tests.md). Falta T14 (despliegue). Pendiente del responsable: desactivar la insignia de Netlify, cuyo script choca con la CSP. Decisiones menores tomadas al implementar:
- **Ligaduras:** Pixelify dibujaba "fi" y "fl" como otro carácter ("PerAl"); se desactivan las ligaduras en toda la interfaz y, en la burbuja del lienzo, se separan con un carácter invisible.
- **Progreso:** la barra va justo debajo de la insignia, para que los nombres de una y dos líneas queden alineados.
- **Aviso:** tocarlo lleva a Perfil con la hoja del logro abierta.
- **Sesión:** un logro ya tratado en la sesión no se vuelve a celebrar aunque la lectura de la tabla llegue tarde.

## 0.7.0
| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Registrar S7-01 a S7-10; actualizar game-design §9 (nombres y aclaraciones), design-system §7 (botones), data-model (`achievementsReady`) e implementation-plan | §9 | Documentos actualizados |
| T02 | **Responsable del producto:** generar la hoja de insignias con el prompt común y dejarla en Descargas | IN-01 | Archivo disponible |
| T03 | `scripts/build-badges.sh` y atlas `public/achievements/badges.png` (o el provisional de IN-05); registro de licencia | IN-02, IN-04, IN-05 | Atlas generado; test de tamaño |
| T04 | `domain/achievements`: condiciones, `detectAchievements` y progreso | LO-01, LO-02, LO-04 | Tests unitarios por logro |
| T05 | Persistencia y evaluación: tras cada cambio y al abrir; desbloqueo en silencio la primera vez y al importar | LO-03, LO-05 | Tests de componente |
| T06 | Sección de logros en Perfil y hoja de detalle | LP | Tests de componente + E2E |
| T07 | Celebración: partículas, momento `achievement` de ARVID (frases fijas por género y con IA), aviso y orden con el nivel | CE | Tests de componente + E2E |
| T08 | Botones "Bisel pixel" en `styles.css` y repaso de todas las pantallas | BT | Tests de estilo y contraste; revisión visual en el navegador |
| T09 | Cierre de la 0.7.0: versión, documentación, despliegue | — | Definición de terminado |

## 0.7.1
| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T10 | `@axe-core/playwright` y `e2e/a11y.spec.ts` con todas las pantallas de AC-01 en los dos idiomas | AC-01 | Prueba escrita |
| T11 | Corregir lo que salga en T10 | AC-02, AC-03 | axe sin infracciones serias ni críticas |
| T12 | Generador de un año de datos, prueba de tiempo del dominio y E2E de Hoy con esos datos | RE-02 | Pruebas en verde |
| T13 | Lighthouse en producción y correcciones | RE-01, RE-03 | Resultados anotados en tests.md |
| T14 | Cierre de la 0.7.1: versión, documentación, despliegue | — | Definición de terminado |
