# ARVID — Modelo de datos

Estado: **aprobado** (D-040, 2026-10-17) · Implementa: game-design §0 (todo se deriva del historial), D-021, D-024.

## 1. Principios
- Solo se guardan **registros fuente**. XP, nivel, atributos, Disciplina, rachas y comodines **se calculan** (game-design §0). La única excepción es la fecha de desbloqueo de los logros.
- Las fechas de calendario son texto local `YYYY-MM-DD` (`LocalDate`). Los instantes se guardan como ISO UTC (`Instant`) junto con el desfase horario en minutos.
- Los IDs se generan con `crypto.randomUUID()`.
- **Minimización:** no se guarda nombre, email, edad, peso ni ningún dato personal que no sea lo que el usuario escribe en sus actividades y misiones.

## 2. Tablas (Dexie / IndexedDB)

### `categories`
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| name | string | 1–24 caracteres |
| color | `CategoryColor` | Token de design-system §3 (`orange`, `sky`, …) |
| icon | string | ID del sprite |
| presetKey | string? | Clave de la categoría predefinida (`body`, `rest`, …) |
| active | boolean | Máximo 8 activas (MVP-06) |
| archivedAt | Instant? | Si tiene historial, se archiva en lugar de borrarse |
| order | number | |

### `activities`
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| name | string | 1–40 caracteres |
| order | number | |
| reminders | `{ day?, time: 'HH:MM' }[]`? | Recordatorios (spec 10, RA-01): como mucho uno por cada vez del periodo. `day`: 1–7 (lunes…) en las semanales, 1–31 en las mensuales. Va en el backup |

### `activityVersions` — configuración versionada (R-A1)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| activityId | string | Índice |
| effectiveFrom | LocalDate | Inicio del periodo en que entra en vigor |
| period | `'day' \| 'week' \| 'month'` | |
| target | number | `N`: día 1–10, semana 1–14, mes 1–28 |
| difficulty | `'easy' \| 'medium' \| 'hard'` | El valor en puntos lo fija `domain/config.ts` |
| categoryId | string | |

Índice compuesto: `[activityId+effectiveFrom]`.

### `activityStatusEvents` — ciclo de vida (gracia y pausa, R-A6 y R-A7)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| activityId | string | Índice |
| date | LocalDate | |
| type | `'created' \| 'paused' \| 'resumed' \| 'archived' \| 'unarchived'` | |
| at | Instant | Desempate si hay varios eventos el mismo día |

### `completions` — registros (R-A3 a R-A5)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| activityId | string | |
| date | LocalDate | Fecha a la que se imputa (hoy o una fecha editable) |
| at | Instant | Momento real en que se registró |
| tzOffsetMin | number | Desfase local en ese momento |

Índices: `[activityId+date]`, `date`.

### `missions`
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| title | string | 1–60 caracteres |
| categoryId | string | |
| difficulty | `'easy' \| 'medium' \| 'hard'` | |
| createdAt | Instant | |
| createdOn | LocalDate | Fecha local de creación (R-M10; añadido en 0.3.0, sin migración porque la tabla estaba vacía) |

### `missionEvents` — historial de la misión (el estado de game-design §8 se deriva de aquí)
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| missionId | string | Índice |
| type | `'deadlineSet' \| 'deadlineCleared' \| 'completed' \| 'uncompleted' \| 'abandoned'` | `deadlineSet` cubre crear con fecha y reprogramar |
| date | LocalDate | Fecha local del evento (para `completed`: la fecha imputada, hoy o ayer) |
| deadline | LocalDate? | Solo en `deadlineSet` |
| at | Instant | Orden total de los eventos |

Guardar eventos (y no solo el estado) permite saber **cuándo** venció la misión aunque luego se haya reprogramado (R-M4) y recalcular todo tras deshacer (R-M5).

### `rests` — descansos planificados (spec 12, DS), desde el esquema 2
| Campo | Tipo | Notas |
|---|---|---|
| id | string | PK |
| from, to | LocalDate | Ambos incluidos; `from` ≥ hoy al crearlo |
| activityIds | string[]? | Sin él, todas las actividades |
| note | string? | ≤ 40 caracteres |
| createdAt | Instant | |

### `achievements`
| Campo | Tipo | Notas |
|---|---|---|
| id | `'L-01' … 'L-11'` | PK |
| unlockedAt | Instant | Permanente (R-L1) |

### `settings` (clave–valor)
| Clave | Tipo | Notas |
|---|---|---|
| onboardingCompletedAt | Instant? | |
| lastBackupAt | Instant? | Aviso a los 7 días (D-024) |
| reducedMotion | `'system' \| 'on' \| 'off'` | C-003 |
| vibration | boolean | Solo Android |
| radarWindow | `7 \| 30 \| 90` | Último valor elegido (D-026) |
| persistGranted | boolean? | Último resultado de `navigator.storage.persisted()` |
| avatar | `{ cast, variant }` | Protagonista y variante (spec 05 §5). Por defecto `{ cast: 'ella', variant: 'original' }`; un valor desconocido se normaliza al cargar |
| music | `{ enabled: boolean, volume: number }` | Música opcional (spec 05, MUS). Por defecto `{ enabled: false, volume: 0.4 }` |
| locale | `'es' \| 'en'` | Idioma (spec 06, I18N-03); sin él, el del navegador |
| profile | `{ alias, gender: 'm' \| 'f' \| 'x' }` | Alias y género (spec 06 §4); sin él se muestra la presentación de ARVID |
| arvidColor | `'original' \| 'cian' \| 'magenta' \| 'lima' \| 'oro' \| 'violeta'` | Color de ARVID; por defecto `cian` |
| companion | `'arvid' \| 'daris'` | Compañero elegido (spec 08); por defecto `arvid` |
| disciplineTip | `{ date, locale, companion, text }`? | Consejo de IA sobre la Disciplina del día (D-097). Del dispositivo: no va en el backup |
| darisColor | `'rosa' \| 'cian' \| 'lima' \| 'ambar' \| 'rojo' \| 'violeta'` | Color de DARIS, independiente del de ARVID; por defecto `rosa` |
| arvidTalks | boolean | ARVID habla por iniciativa propia; por defecto `true` |
| arvidAi | boolean | ARVID con IA (spec 06, IA-06); desactivado hasta que el usuario lo acepta |
| arvidSeen | `{ said, lastLine }` | Momentos dichos hoy y última frase de cada uno. Del dispositivo: no va en el backup |
| introSnoozedUntil | LocalDate? | Presentación pospuesta. Del dispositivo: no va en el backup |
| notifications | `{ enabled, morning, night, badge, deviceId }`? | Notificaciones de este dispositivo (spec 10): horas `HH:MM` o `null` si ese resumen está desactivado; `deviceId` aleatorio para el servidor. No va en el backup |
| cityAnnounced | number? | Último nivel cuyas llegadas a la ciudad se anunciaron (spec 11, AN-01, CV-04). Del dispositivo: no va en el backup |
| neighborSpoke | LocalDate? | Día en que habló un vecino (spec 11, VC-02). Del dispositivo: no va en el backup |
| aiCode | string? | Código de acceso a la IA (D-100). No va en el backup |
| achievementsReady | boolean? | Los logros ya se evaluaron una vez en este dispositivo (spec 07, LO-05). No va en el backup y un import lo borra, para que los logros importados se ganen en silencio |

## 3. Estado derivado (no se guarda)
| Valor | Función del dominio | Entradas |
|---|---|---|
| Periodos y su `c`, `r`, `E`, `P` y evaluabilidad | `evaluateActivityPeriods` | versiones, eventos de estado, registros, `today` |
| XP total, nivel, título | `computeProgress` | periodos + misiones |
| Atributos por categoría y ventana | `computeAttributes` | periodos + misiones, `today`, `W` |
| Disciplina | `computeDiscipline` | ídem |
| Rachas y comodines por actividad | `computeStreaks` | periodos |
| Estado de cada misión | `deriveMissionState` | eventos, `today` |
| Estado y progreso de los logros | `evaluateAchievements` | registros, análisis y atributos y Disciplina en 30 días (spec 07, LO-01, LO-04) |
| Logros nuevos a desbloquear | `detectAchievements` | estado de los logros + logros ya desbloqueados |

## 4. Formato de backup (MVP-09)
```json
{
  "format": "arvid-backup",
  "formatVersion": 1,
  "appVersion": "0.1.0",
  "schemaVersion": 1,
  "exportedAt": "2026-10-17T18:00:00.000Z",
  "data": {
    "categories": [], "activities": [], "activityVersions": [],
    "activityStatusEvents": [], "completions": [],
    "missions": [], "missionEvents": [], "achievements": [], "settings": []
  }
}
```
- **Import:** se valida con Zod antes de tocar nada → resumen ("12 actividades, 840 registros, exportado el …") → confirmación → **reemplazo completo** en una sola transacción. Si algo falla, no se modifica nada.
- **Versiones antiguas:** se migran con las mismas funciones de migración del esquema. Un backup de una versión **más nueva** que la app se rechaza y se pide actualizar.
- **Integridad referencial:** todos los IDs referenciados deben existir; si no, el import se rechaza indicando el motivo.

## 5. Cambios de reglas y datos históricos
Si se cambia un parámetro de `domain/config.ts` (p. ej. Fácil = 5 → 6), **todo el historial se recalcula** con el nuevo valor, porque nada derivado se guarda. Es coherente, pero cambia las cifras pasadas. Por eso esos cambios se documentan en el registro de decisiones.
