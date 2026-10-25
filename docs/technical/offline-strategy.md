# ARVID — Estrategia offline y persistencia

Estado: **aprobado** (D-040, 2026-10-17) · Implementa: D-023, D-024, C-001 · Cubre: MVP-08, MVP-09 · Riesgos: R-001, R-002.

## 1. Qué funciona sin conexión
**Todo el MVP**: consultar, registrar, crear y editar, ver el perfil, exportar e importar. La app no hace ninguna petición de red tras la primera carga, salvo para buscar actualizaciones.

## 2. Capas
| Capa | Tecnología | Contenido | ¿Puede perderse? |
|---|---|---|---|
| Código y recursos | Service worker + Cache Storage (precarga de Workbox) | HTML, JS, CSS, fuentes, atlas de sprites, iconos de la app | Sí, pero se recupera al volver a cargar la URL con conexión |
| Datos del usuario | IndexedDB (Dexie) | Todas las tablas de data-model.md | **Sí**, por purga del sistema → mitigación en §4 |
| Copia externa | Archivo JSON exportado | Backup completo | No, si el usuario lo guarda fuera del navegador |

**La caché del service worker no guarda datos del usuario.**

Desde la 1.1.0 (spec 10) el service worker es propio (`src/sw.ts`, estrategia `injectManifest` de vite-plugin-pwa): hace la misma precarga y la misma caché de música que antes, y además recibe las notificaciones Web Push. Al recibir una, **lee** IndexedDB para escribir el texto y el número del icono; nunca la modifica.

## 3. Matriz de capacidades
Investigación del 2026-10-17; detalle y fuentes en decision-log.md.

| Capacidad | iPhone (PWA instalada) | Android Chrome | Escritorio | Clasificación |
|---|---|---|---|---|
| Uso offline | ✔ | ✔ | ✔ | Garantizado |
| Exención de la purga de 7 días de ITP | Solo si está instalada | N/A | N/A | Condicionado |
| `storage.persist()` concedido | Por heurística (estar instalada cuenta) | Normalmente, si está instalada | Variable | Condicionado |
| Purga por falta de espacio | Posible | Posible si no es persistente | Posible | No garantizable |

## 4. Protección contra la pérdida de datos
1. **Onboarding de instalación (iPhone):** si la app se abre en Safari y no está instalada (no cumple `display-mode: standalone` ni `navigator.standalone`), se muestra una guía ilustrada: Compartir → "Añadir a pantalla de inicio". Se puede posponer, pero se recuerda en "Hoy" mientras no esté instalada. En Android y escritorio se usa el evento `beforeinstallprompt` si está disponible.
2. **`navigator.storage.persist()`:** se solicita al terminar el onboarding y en cada arranque mientras no se haya concedido. El resultado se muestra en Ajustes ("Almacenamiento protegido: sí/no").
3. **Recordatorio de backup:** si han pasado más de 7 días desde `lastBackupAt` y hay datos nuevos, aparece un aviso no bloqueante en "Hoy".
4. **Export:** en iOS y Android se intenta `navigator.share({ files })` para guardarlo en Archivos, Drive, etc.; si no está disponible, se descarga un archivo `arvid-backup-YYYY-MM-DD.json`. *Hay que comprobar el comportamiento en un dispositivo real.*
5. **Espacio:** `navigator.storage.estimate()` en Ajustes, solo informativo; el volumen previsto es de pocos MB.
6. **Antes de cada migración del esquema:** se guarda en memoria una copia de los datos crudos; si la migración falla, se ofrece descargarla.

## 5. Actualización de la app
- La precarga es versionada por hash; una versión nueva se descarga en segundo plano.
- Se muestra "Nueva versión disponible · Actualizar"; al aceptar, se activa el nuevo service worker y se recarga.
- Las migraciones de IndexedDB se ejecutan al abrir la base de datos en la nueva versión.

## 6. Pruebas
| ID | Prueba | Tipo |
|---|---|---|
| OFF-T1 | Tras la primera carga, con `setOffline(true)` y recarga, la app abre y muestra los datos | E2E (Chromium + WebKit) |
| OFF-T2 | Registrar sin conexión, cerrar el contexto, reabrir → el registro persiste | E2E |
| OFF-T3 | Backup de ida y vuelta: exportar → borrar → importar → estado derivado idéntico | Integración |
| OFF-T4 | Import de un archivo corrupto, de otro formato o de una versión futura → rechazado sin cambios | Integración |
| OFF-T5 | La migración v1→v2 conserva los datos | Integración |
| OFF-T6 | Instalación en iPhone, `persist()` concedido, uso en modo avión, reinicio del teléfono → datos intactos | Manual |
| OFF-T7 | Lo mismo en Android | Manual |
