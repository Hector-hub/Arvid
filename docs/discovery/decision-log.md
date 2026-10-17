# ARVID — Registro de decisiones

Fuente de verdad de las decisiones de producto y técnicas. Cada spec debe referenciar los IDs que implementa.

**Tipos:** A = decidida por el responsable del producto · B = recomendación pendiente de aprobación · C = decisión técnica reversible · D = bloqueante, requiere respuesta · E = hipótesis pendiente de validar.

Última actualización: 2026-10-17.

## Decisiones

| ID | Decisión | Tipo | Fecha |
|---|---|---|---|
| D-001 | Usuario principal del MVP: el propio responsable del producto, con uso diario personal. Apertura a otros usuarios más adelante | A | 2026-10-17 |
| D-002 | Problema prioritario: abandono de rutinas. ARVID debe favorecer la constancia y facilitar retomar tras fallar | A | 2026-10-17 |
| D-003 | Plataformas a soportar: iPhone, Android y escritorio | A | 2026-10-17 |
| D-004 | Sin sincronización multi-dispositivo | A | 2026-10-17 |
| D-005 | Usuarios reales del MVP: responsable (iPhone) y su hermano (Android), cada uno con sus datos de forma independiente | A | 2026-10-17 |
| D-006 | Núcleo: actividades recurrentes definidas por el usuario, con frecuencia diaria, semanal o mensual y N veces por periodo | A | 2026-10-17 |
| D-007 | Cada actividad pertenece a una categoría (aspecto de vida) y tiene un valor en puntos que alimenta el perfil | A | 2026-10-17 |
| D-008 | ~~Incumplir resta el mismo valor (±)~~ → **sustituida por D-011** | — | 2026-10-17 |
| D-009 | Rachas con comodines | A | 2026-10-17 |
| D-010 | Sin límite de actividades activas | A | 2026-10-17 |
| D-011 | Dos sistemas separados: Nivel/XP que solo sube (historial) y atributos 0–100 calculados sobre una ventana reciente (ganado / posible), que suben y bajan | A | 2026-10-17 |
| D-012 | Cumplimiento parcial proporcional (3 de 4 → 75 % del valor) | A | 2026-10-17 |
| D-013 | Valor por dificultad: Fácil / Media / Difícil (provisional 5 / 10 / 20) | A | 2026-10-17 |
| D-014 | Los comodines se ganan: 1 por cada 7 periodos cumplidos seguidos, máximo 2 guardados (números provisionales) | A | 2026-10-17 |
| D-015 | Progreso representado por un personaje pixel art con "hoja de personaje" (nivel + radar). Sin refugio ni mundo en el MVP | A | 2026-10-17 |
| D-016 | Subir de nivel otorga títulos; existen logros e insignias por hitos. Sin cosméticos desbloqueables en el MVP | A | 2026-10-17 |
| D-017 | ~6 categorías predefinidas activables + categorías propias; radar con 3–8 ejes | A | 2026-10-17 |
| D-018 | El MVP incluye misiones únicas (tareas no recurrentes con categoría, dificultad y fecha límite opcional) | A | 2026-10-17 |
| D-019 | Recordatorios deseados: resumen diario a hora fija + estado dentro de la app. Sin recordatorios por actividad | A | 2026-10-17 |
| D-020 | Una misión vencida penaliza su valor una sola vez; si se reprograma y se completa, recupera lo perdido sin ganancia neta | A | 2026-10-17 |
| D-020b | Concreción de D-020: misión a tiempo → XP + suma a su categoría. Vencida → penaliza el atributo **Disciplina** (no la categoría). Completada tarde → anula el fallo en Disciplina (y da XP, D-032). Sin fecha límite → nunca penaliza | A | 2026-10-17 |
| D-021 | Registro retroactivo permitido para el periodo en curso y el día anterior | A | 2026-10-17 |
| D-022 | Sin tipo "hábito a reducir"; se expresan como actividad positiva ("día sin X") | A | 2026-10-17 |
| D-023 | MVP = PWA 100 % offline sin servidor. Recordatorio = estado dentro de la app. Resumen diario push → P1, con un micro-servidor que solo guarda la hora y la suscripción | A | 2026-10-17 |
| D-024 | Exportar e importar el backup en archivo es P0, con aviso en la app si han pasado más de 7 días desde el último (antes B-001, aprobada con el plan de MVP) | A | 2026-10-17 |
| D-025 | Disciplina = % de cumplimiento global del periodo (actividades + misiones con fecha límite); se muestra como medidor aparte, no como eje del radar | A | 2026-10-17 |
| D-026 | Radar: periodo por defecto de 30 días, selector 7/90 y superposición del periodo anterior para ver la tendencia | A | 2026-10-17 |
| D-027 | Estilo pixel art moderno: sprites, iconos y marcos en pixel art; el texto en una fuente legible; layout fluido | A | 2026-10-17 |
| D-028 | Assets desde packs CC0 o de licencia libre, verificando la licencia de cada pack | A | 2026-10-17 |
| D-029 | Personaje fijo: no cambia de aspecto; el progreso se ve en la hoja de personaje | A | 2026-10-17 |
| D-030 | El badge en el icono pasa a P1 junto al push (en iOS requiere permiso de notificaciones). Ajusta D-023 (antes B-002, aprobada con el plan de MVP) | A | 2026-10-17 |
| D-031 | Alcance del MVP aprobado según `docs/product/mvp-scope.md` | A | 2026-10-17 |
| D-032 | Completar tarde una misión vencida **sí da XP** (+v); en Disciplina solo anula el fallo (antes P-003) | A | 2026-10-17 |
| D-033 | Abandonar una misión con fecha límite **antes** de vencer penaliza **la mitad** en Disciplina (E = 0, P = v/2); abandonar es definitivo (antes P-004) | A | 2026-10-17 |
| D-034 | La racha exige completar el periodo al 100 %; un periodo parcial no la mantiene (antes P-005) | A | 2026-10-17 |
| D-035 | `docs/design/game-design.md` aprobado, incluidos los títulos y logros propuestos (antes P-006) y los umbrales de "sin datos" = 3 y tendencia = ±5, revisables tras 4 semanas de uso (P-008) | A | 2026-10-17 |
| D-036 | Assets: Kenney 1-Bit Pack (CC0) recoloreado con la paleta; paneles y botones dibujados con CSS (antes P-007) | A | 2026-10-17 |
| D-037 | Paleta Sweetie 16 (antes P-007) | A | 2026-10-17 |
| D-038 | Tipografía: Pixelify Sans en títulos, cifras y botones; Atkinson Hyperlegible Next en el resto; ambas autoalojadas | A | 2026-10-17 |
| D-039 | Solo tema oscuro en el MVP; tema claro en P1 | A | 2026-10-17 |
| D-040 | Aprobados `design-system.md`, `asset-licenses.md`, `architecture.md` (incluido el stack: Vite + React + TS + pnpm, Dexie, vite-plugin-pwa, Zod, React Router, Fontsource, Vitest, Testing Library, fake-indexeddb, Playwright; antes B-003), `data-model.md`, `offline-strategy.md` y `security-privacy.md`, incluida la navegación de 3 pestañas (Hoy · Actividades · Personaje; Ajustes desde Personaje; antes B-004) | A | 2026-10-17 |
| D-041 | Hosting estático en Netlify, plan gratuito (antes P-010) | A | 2026-10-17 |
| D-042 | Spec 01 (Actividades + Hoy + PWA offline) aprobada con S1-01 a S1-04; categorías predefinidas: Cuerpo, Descanso, Mente, Aprendizaje, Relaciones y Orden (antes P-009). Permiso para instalar dependencias y descargar el 1-Bit Pack | A | 2026-10-17 |
| C-004 | TypeScript 6.0.3 en lugar de 7: `typescript-eslint` 8.71 solo admite `<6.1`. Reversible cuando lo soporte | C | 2026-10-17 |
| C-005 | Sprites elegidos del 1-Bit Pack (`scripts/sprites.txt`); personaje = tile (28, 4). Atlas ampliado ×12 para mostrarse nítido a 32/48/64 px | C | 2026-10-17 |
| C-006 | Tras registrar, el botón ignora toques durante 400 ms para evitar duplicados por doble toque (LOG-06) | C | 2026-10-17 |
| C-007 | Enlaces de vuelta explícitos en pantallas secundarias: la PWA instalada en iPhone no tiene botón Atrás (UI-05) | C | 2026-10-17 |
| D-043 | Sitio de Netlify `arvid-app` (https://arvid-app.netlify.app) en el equipo Hecrey (`hector-hub`), con despliegue manual desde la CLI (`netlify deploy --prod`) | A | 2026-10-17 |
| C-001 | El onboarding guía la instalación en la pantalla de inicio y solicita `navigator.storage.persist()` | C | 2026-10-17 |
| C-002 | Una categoría sin datos suficientes se muestra como "sin datos", nunca como 0. El radar tiene una alternativa accesible en forma de lista | C | 2026-10-17 |
| C-003 | Sonidos opcionales y desactivados por defecto; se respeta `prefers-reduced-motion` | C | 2026-10-17 |

## Decisiones pendientes

| ID | Pregunta | Dónde se resuelve |
|---|---|---|

## Riesgos

| ID | Riesgo | Mitigación |
|---|---|---|
| R-001 | Sin sync ni backup, perder el dispositivo o que se purgue el almacenamiento implica perder todos los datos | Backup P0 (D-024) + `persist()` (C-001) |
| R-002 | iPhone es la plataforma principal: sin instalar la app, Safari purga los datos en 7 días; las notificaciones exigen la app instalada y un servidor | Instalación guiada en el onboarding; push en P1 |
| R-003 | Sin límite de actividades + rachas → sobrecarga y desánimo | Rachas por actividad; los atributos por ventana se recuperan solos; comodines; logro "Regreso" |
| R-004 | Los puntos acumulados miden volumen, no el estado actual | Resuelto con D-011 (atributos por ventana y por ratio) |
| R-005 | Packs CC0 de distintos autores → estilo incoherente | Una familia principal de un solo autor, recolorear a la paleta propia, `asset-licenses.md` |

## Hipótesis

| ID | Hipótesis | Cómo validarla |
|---|---|---|
| H-001 | Para el MVP basta con local-first, sin cuenta ni servidor | Uso real durante 4 semanas por los dos usuarios |
| H-002 | Separar XP (que solo sube) de los atributos (que fluctúan) reduce el abandono tras una mala semana | Observar si se retoma la app tras periodos con baja Disciplina |

## Excluido del MVP

Monedas, tienda, inventario, equipamiento, competición o ranking social, generación de misiones con IA, sincronización y cuentas, cosméticos, personaje evolutivo, refugio o mundo, tipo "hábito a reducir", app nativa (Capacitor), notificaciones push y badge (P1).

## Cambios de alcance

| Fecha | Cambio | Motivo |
|---|---|---|
| 2026-10-17 | D-008 (±simétrico) sustituida por D-011 | Riesgo de espiral de abandono (R-003) y de medir volumen en lugar del estado actual (R-004) |
| 2026-10-17 | Badge del icono de P0 a P1 (D-030) | En iOS requiere permiso de notificaciones, que no se justifica sin push |
