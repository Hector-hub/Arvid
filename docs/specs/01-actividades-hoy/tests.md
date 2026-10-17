# Spec 01 — Pruebas

Cada requisito de spec.md tiene al menos una prueba. Las pruebas verifican **comportamiento observable**, no detalles internos.

Ubicación: `src/domain/**/*.test.ts` (U), `src/data/*.test.ts` (I), `src/app/**/*.test.ts(x)` (C), `e2e/*.spec.ts` (E).

Tipos: **U** unitario (dominio) · **I** integración (datos, fake-indexeddb) · **C** componente · **E** E2E con Playwright (Chromium + WebKit) · **M** manual en dispositivo.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| R-T1–R-T5 | Periodos: día, semana ISO (incluida la semana 53 de 2026), mes, febrero bisiesto y no bisiesto; días restantes; fechas editables (hoy, periodo abierto, ayer en otro periodo, futuras rechazadas) | U |
| ACT-01 | Validación del nombre (vacío, 41 caracteres, espacios), N fuera de rango por periodo, categoría obligatoria | C |
| ACT-02 | Crear guarda la actividad, la versión con `effectiveFrom` = inicio del periodo y el evento `created` | I |
| ACT-03 | Renombrar no crea una versión | I |
| ACT-04 | Ejemplo §7 "cambiar la frecuencia a mitad de semana"; cambio de diario a semanal → `effectiveFrom` = lunes | U + I |
| ACT-05 | Pausar, reanudar, archivar y restaurar generan eventos y mueven la actividad de grupo | I + E |
| ACT-06 | Ejemplo §7 "pausada" | U + E |
| ACT-07 | Grupos y texto de frecuencia ("4 veces/semana", "1 vez/día") | C |
| ACT-08 | Subir y bajar cambia el orden en Actividades y en Hoy | E |
| CAT-01 | El seed ejecutado dos veces no duplica | I |
| CAT-02 | No se puede desactivar una categoría con actividades activas (mensaje con el número) | I + E |
| CAT-03 | Una categoría desactivada no aparece en el formulario | C |
| LOG-01 | El registro guarda `date`, `at` y `tzOffsetMin` | I |
| LOG-02 | Ejemplo §7 "límite de registros" | U + E |
| LOG-03 | Ejemplo §7 "retroactivo de ayer cruzando periodo" | U |
| LOG-04 | Deshacer elimina el más reciente; ejemplo §7 "deshacer fuera de plazo" | U + I |
| LOG-05 | Hoy se actualiza sin recargar; el feedback aparece; con movimiento reducido, sin animación | C + E |
| LOG-06 | Un doble clic rápido crea un solo registro | E |
| HOY-01 | La cabecera calcula "te quedan X" | C |
| HOY-02 | Orden de secciones e incompletas primero | C |
| HOY-03, HOY-04 | Fila completada: chip, sin registrar, con deshacer; agrupada al final | C |
| HOY-05 | Ejemplo §7 "olvido de ayer"; la hoja no aparece si no hay nada pendiente | E |
| HOY-06 | El estado vacío lleva al formulario | E |
| HOY-07 | Ejemplo §7 "medianoche" (reloj simulado de Playwright) | E |
| DET-01–03 | Tira de días: añadir y quitar en días editables; días no editables deshabilitados | E |
| ONB-01–02 | Flujo completo del primer arranque; al menos 1 categoría | E |
| ONB-03, ONB-05 | Con user-agent de iOS y sin standalone → guía y aviso en Hoy | E |
| ONB-04, SET-01 | `persist()` simulado (concedido, denegado, no soportado) → estado en Ajustes | C |
| SET-02 | Movimiento reducido "Activado" desactiva las animaciones (clase o atributo en la raíz) | C |
| PWA-01 | El manifest es válido (nombre, iconos, display) | E |
| PWA-02 | OFF-T1 y OFF-T2 (offline-strategy.md) | E en Chromium; en WebKit **M** (M-04), porque Playwright WebKit no ejecuta service workers |
| PWA-03 | Nueva versión del service worker → aparece el banner y "Actualizar" recarga | **M** (M-06): simularlo en E2E exige dos builds distintos; se verifica en el primer redespliegue |
| PWA-04 | La app funciona sin violaciones con la misma CSP que `netlify.toml` (servida por `vite preview`); cabeceras reales de Netlify | E + M |
| PWA-05 | Rutas directas y botón Atrás | E |
| UI-01, UI-03 | Contraste de los pares de tokens ≥ umbral (script); roles y etiquetas accesibles en los componentes | U + C |
| UI-04 | No hay emojis en el código fuente de la interfaz (lint o regex) | U |
| UI-05 | Enlaces de vuelta en detalle y ajustes | E |
| NFR-01 | Tamaño del build (comprobación en CI local) | U |
| NFR-03 | Sin peticiones de red durante el flujo E2E de uso diario | E |
| NFR-04 | Test de límites de `domain/` | U |

## Checklist manual en dispositivo (M)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M-01 | Abrir la URL de Netlify, completar el onboarding | ☐ | ☐ |
| M-02 | Instalar en la pantalla de inicio; abre a pantalla completa | ☐ | ☐ |
| M-03 | Ajustes muestra "Almacenamiento protegido" | ☐ | ☐ |
| M-04 | Modo avión → abrir, registrar y cerrar → reabrir: el registro sigue ahí | ☐ | ☐ |
| M-05 | Reiniciar el teléfono → los datos siguen ahí | ☐ | ☐ |
| M-06 | Desplegar una versión nueva → aparece el banner de actualización | ☐ | ☐ |
| M-07 | VoiceOver / TalkBack: registrar una actividad desde Hoy | ☐ | ☐ |
| M-08 | Botón Atrás (Android) / gesto atrás (iOS) | ☐ | ☐ |
