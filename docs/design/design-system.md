# ARVID — Sistema de diseño

Estado: **aprobado** (D-040, 2026-10-17) · Implementa: D-027–D-029, D-036–D-039, C-002, C-003 · Cubre: MVP-10.

Dirección: **pixel art moderno**. Los sprites, iconos y marcos son pixel art; el texto se escribe en una fuente legible; el layout es fluido y mobile-first. En el MVP solo hay tema oscuro.

---

## 1. Paleta base — Sweetie 16 (D-037)
Autor: GrafxKid · fuente: [lospec.com/palette-list/sweetie-16](https://lospec.com/palette-list/sweetie-16).

| Nombre | Hex | Nombre | Hex |
|---|---|---|---|
| ink | `#1a1c2c` | navy | `#29366f` |
| plum | `#5d275d` | blue | `#3b5dc9` |
| red | `#b13e53` | sky | `#41a6f6` |
| orange | `#ef7d57` | cyan | `#73eff7` |
| gold | `#ffcd75` | white | `#f4f4f4` |
| lime | `#a7f070` | fog | `#94b0c2` |
| green | `#38b764` | slate | `#566c86` |
| teal | `#257179` | panel | `#333c57` |

**Regla:** la interfaz y los sprites solo usan estos 16 colores. Las únicas excepciones son las transparencias de una superficie sobre otra (p. ej. el relleno del radar al 30 %) y **la escena neón con sus protagonistas**, que usan los colores de sus packs y las gamas de sus variantes (D-050, spec 05 DIS-02).

**Neón sutil (D-050):** brillo suave (`--glow-cyan`, `--glow-gold`: `text-shadow` o `box-shadow` de 6–12 px con baja opacidad) en títulos de pantalla, nivel, borde de la escena y botón principal. Nunca sustituye al contraste: §2 se cumple sin brillo.

## 2. Tokens semánticos
Contraste calculado según WCAG 2.x (AA: texto normal ≥ 4,5:1; texto grande o elementos gráficos ≥ 3:1).

| Token | Valor | Uso | Contraste verificado |
|---|---|---|---|
| `--bg` | ink | Fondo de la app | — |
| `--surface` | panel | Tarjetas y paneles | — |
| `--surface-sunken` | navy | Pistas de las barras, inputs | — |
| `--border` | slate | Borde de paneles sobre `--bg` | 3,12 sobre ink ✔ (gráfico) |
| `--border-strong` | fog | Borde de inputs dentro de paneles | 4,80 sobre panel ✔ |
| `--text` | white | Texto principal | 15,32 ink · 9,92 panel ✔ |
| `--text-muted` | fog | Texto secundario | 7,42 ink · 4,80 panel ✔ |
| `--xp` | cyan | Barra y cifras de XP | 8,01 panel ✔ |
| `--level` | gold | Nivel, títulos, logros, foco | 7,40 panel ✔ |
| `--success` | lime | Completado, +puntos | 7,97 panel ✔ |
| `--warning` | orange | Periodo por cerrar | 4,02 panel → **solo texto grande o iconos**; 6,21 sobre ink ✔ |
| `--danger-fill` | red | Fondo del chip "Vencida" | texto white 5,18 ✔ |
| `--primary-fill` | blue | Botón principal | texto white 5,31 ✔ |
| `--focus` | gold | Anillo de foco de 2 px | 7,40 panel · 11,43 ink ✔ |

**Prohibido:** usar red, teal, plum, navy, blue o slate como color de **texto** sobre ink o panel, porque no alcanzan AA.

## 3. Colores de categoría
Cada categoría usa un color, un icono y su nombre. **Nunca se identifica solo por el color.** Todos los colores alcanzan ≥ 3:1 sobre panel como elemento gráfico, y el texto ink sobre ellos supera 6:1.

| Categoría predefinida (P-009) | Color | Contraste sobre panel |
|---|---|---|
| Cuerpo | orange | 4,02 |
| Descanso | sky | 4,16 |
| Mente | cyan | 8,01 |
| Aprendizaje | gold | 7,40 |
| Relaciones | lime | 7,97 |
| Orden | fog | 4,80 |
| Propias (adicionales) | green, white | 4,22 · 9,92 |

Hay 8 colores válidos para 8 categorías como máximo (D-017). Algunos coinciden con tokens semánticos (gold, cyan, lime); se acepta porque la categoría siempre lleva icono y nombre.

## 4. Tipografía (D-038)
| Uso | Fuente | Tamaño mínimo |
|---|---|---|
| Títulos, nivel, cifras, botones, pestañas | **Pixelify Sans** (OFL 1.1) | 16 px; cifras grandes ≥ 20 px |
| Cuerpo, descripciones, formularios, explicaciones | **Atkinson Hyperlegible Next** (OFL 1.1) | 16 px (13 px solo en metadatos) |

- Las fuentes se incluyen en la app (autoalojadas), no desde Google Fonts, para que funcionen offline (D-023).
- Los tamaños van en `rem` para respetar el tamaño de texto del sistema.
- Las cifras con decimales usan coma decimal ("+2,5").

## 5. Espaciado, bordes y forma
- **Escala de espaciado** (múltiplos de 4 px): 4 · 8 · 12 · 16 · 24 · 32 · 48.
- **Bordes:** 3 px sólidos; nunca esquinas redondeadas. Los paneles usan **esquinas recortadas de 1 "píxel"** (`clip-path`) para sugerir un marco pixel sin imágenes.
- **Sin sombras difusas ni degradados.** Para dar profundidad se usa un desplazamiento sólido de 3 px en `--bg` (sombra dura).
- Los paneles y botones se dibujan **con CSS**, no con sprites: así escalan, se pueden tematizar y no cuestan assets.

## 6. Sprites e iconos (D-036)
- **Fuente única:** [Kenney 1-Bit Pack](https://kenney.nl/assets/1-bit-pack), CC0, 1 078 sprites monocromos de 16×16.
- **Recoloreado sin procesado:** el sprite se usa como máscara (`mask-image`) y su color sale de un token (`background-color: var(--cat-cuerpo)`). Un solo PNG sirve para cualquier color.
  - *A verificar al descargar:* que el pack incluya una variante con fondo transparente. Si no, se genera una vez con un script.
- **Escalas enteras únicamente:** ×2 (32 px) para iconos de lista, ×3 (48 px) para insignias y ×4–×6 (64–96 px) para el personaje. Siempre con `image-rendering: pixelated`.
- **Personaje y escena (D-050):** ya no salen del 1-Bit Pack. Son la escena de Warped City y 4 protagonistas con 6 variantes, recoloreados en tiempo de ejecución (spec 05).
- **Inventario mínimo del MVP:** 8 iconos de categoría; ~11 insignias de logro (game-design §9); ~10 iconos de interfaz (hoy, actividades, personaje, ajustes, añadir, completar, deshacer, comodín, racha, misión). Más estados vacíos: 1 escena simple por pantalla, compuesta con los mismos sprites.
- Cada sprite usado se registra en [asset-licenses.md](asset-licenses.md).

## 7. Componentes base
| Componente | Notas |
|---|---|
| Panel / tarjeta | Fondo `--surface`, borde `--border`, esquinas recortadas |
| Botones "Bisel pixel" (spec 07, BT, D-082) | Relleno de color, contorno de 2 px casi negro, esquinas en escalera de 2 px, franja de luz de 2 px arriba y sombra de 6 px abajo; al pulsar, la sombra baja a 2 px y el botón se hunde 4 px. Variantes: principal `--primary-fill`, normal `--c-navy`, peligro `--danger-fill` (texto white), fantasma (sin relleno, cyan subrayado) y desactivado (`--c-ink` con contorno y texto `--c-slate`). Foco de teclado: contorno `--focus`. Alto mínimo de 44 px. Prototipo: `prototypes/botones/` (variante A) |
| Fila de actividad | Icono de categoría · nombre · "3 de 4 esta semana · racha 6" · botón de registrar de ≥ 44×44 px |
| Barra de progreso | Pista `--surface-sunken`, relleno por segmentos (pixel) |
| Chip de estado | "Vencida" (red + white), "Completada" (lime + ink), "Gracia" (fog + ink) |
| Medidor de Disciplina | Barra segmentada de 10 bloques + cifra |
| Radar | SVG propio; ejes con el color de cada categoría; relleno cyan al 30 %; ejes "sin datos" punteados y con una marca (C-002); alternativa en lista |
| Navegación inferior | 3 pestañas (Hoy · Actividades · Perfil) con icono y texto; Ajustes desde Perfil (B-004, D-052) |
| Escena | Bocina (música) arriba a la derecha y chat abajo a la derecha; ARVID habla con burbuja pixel ×2 dibujada en la escena y, en el onboarding, con caja de diálogo con retrato (spec 06) |
| Modal de subida de nivel | Panel central + insignia o título; se cierra con un toque |
| Logros (spec 07) | Insignia en medalla hexagonal (pendientes en gris y atenuadas); cuadrícula en Perfil con barra de progreso fina; aviso arriba con borde dorado que se cierra solo a los 5 s |

## 8. Movimiento y feedback (C-003)
- **Animaciones por pasos** (`steps()`), cortas: 100–200 ms en la interfaz y como máximo 600 ms en celebraciones.
- **Momentos animados del MVP:** registrar (el icono "salta" 2 px y aparece "+2,5"), completar un periodo (destello del borde), subir de nivel (modal) y desbloquear un logro (la insignia aparece).
- **Movimiento reducido** (`prefers-reduced-motion` o el ajuste de la app): sin desplazamientos ni destellos; el cambio de estado es instantáneo y los modales se mantienen.
- **Escena y partículas:** spec 05 (ESC, PAR). Con movimiento reducido, la escena queda estática y sin partículas.
- **Música:** opcional y desactivada por defecto (spec 05, MUS). Los efectos de sonido siguen en P1.
- **Vibración (Android):** un pulso breve al registrar, desactivable. iOS Safari no soporta la API de vibración.

## 9. Responsive
- **Mobile-first:** una columna, de 360 a 480 px.
- **≥ 768 px:** dos columnas (Hoy a la izquierda, resumen del personaje a la derecha); la navegación pasa a una barra lateral.
- Se respetan las zonas seguras del iPhone (`env(safe-area-inset-*)`).

## 10. Accesibilidad
- Texto AA (tabla §2); objetivos táctiles ≥ 44×44 px; foco visible (gold, 2 px).
- La información nunca depende solo del color.
- Los sprites decorativos llevan `aria-hidden`; los significativos, texto alternativo.
- El radar tiene una alternativa en lista con los valores, su explicación y "sin datos".
- Hay que revisar con VoiceOver (iOS) y TalkBack (Android) antes del lanzamiento.

## 11. Rendimiento
- Los sprites se agrupan en una sola hoja (atlas). Fuentes en WOFF2 con subconjunto latino.
- Sin librerías de animación ni de gráficos.
- Objetivo: 60 fps en las animaciones en un Android de gama media.

## 12. Fuera del MVP
Tema claro (P1), efectos de sonido (P1), cosméticos (P2), personaje evolutivo (P2), escenas distintas por pantalla u hora del día.
