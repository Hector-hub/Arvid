# ARVID — Seguridad y privacidad

Estado: **aprobado** (D-040, 2026-10-17) · Implementa: D-004, D-023, D-024.

## 1. Datos que trata ARVID
| Dato | Sensibilidad | Dónde vive |
|---|---|---|
| Nombres de actividades, misiones y categorías | Puede ser sensible (p. ej. "terapia", "dejar de fumar") | IndexedDB del dispositivo |
| Fechas y horas de cumplimiento | Patrones de comportamiento | IndexedDB |
| Preferencias | Baja | IndexedDB |

**No se recogen:** identidad, email, ubicación, datos biométricos ni datos de salud estructurados. Tampoco se incluyen analíticas, telemetría ni servicios de terceros.

## 2. Principios
1. **Minimización:** solo se guarda lo necesario para las reglas del juego (data-model.md).
2. **Local por defecto:** ningún dato sale del dispositivo salvo en un backup exportado por el usuario.
3. **Sin peticiones a terceros:** fuentes y sprites autoalojados, sin CDN ni analíticas. Se impone con una política CSP estricta (`default-src 'self'`).
4. **Control del usuario:** exportar todo y borrar todo ("Eliminar todos mis datos", con confirmación escrita) desde Ajustes.

## 3. Amenazas y mitigaciones
| Amenaza | Mitigación en el MVP | Futuro |
|---|---|---|
| Otra persona usa el teléfono desbloqueado | Ninguna (depende del bloqueo del dispositivo) | Bloqueo con PIN o biometría (P2, requiere estudio de WebAuthn) |
| Fuga del archivo de backup | Aviso al exportar: "El archivo contiene tus actividades en texto legible; guárdalo en un lugar privado" | Backup cifrado con contraseña (P1/P2) |
| XSS mediante nombres de actividades o un backup manipulado | React escapa el texto; nunca se usa `dangerouslySetInnerHTML`; el import se valida con Zod; CSP | — |
| Compromiso del hosting o de la cadena de suministro | Pocas dependencias, lockfile, versiones fijadas, revisión de las actualizaciones | SRI / auditorías periódicas |
| Datos en reposo en el dispositivo | IndexedDB no se cifra por la app; se confía en el cifrado del sistema operativo (iOS y Android cifran el almacenamiento con el bloqueo activo) | — |

## 4. Dos usuarios, dos dispositivos
Cada instalación es independiente (D-005). No hay ningún mecanismo para compartir datos entre el usuario y su hermano, por diseño.

## 5. Cuando llegue el push (P1)
El micro-servidor solo guardará la suscripción push y la hora del aviso. El contenido será genérico y no incluirá datos de actividades. Esto deberá revisarse en `notifications.md` antes de implementarlo.
