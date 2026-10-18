# Spec 06 — Tareas

Derivadas de spec.md (aprobada, D-066).

**Estado (2026-10-18):** 0.6.0 con T01–T13 hechas; T14 pendiente de desplegar y de la checklist M6. Decisiones menores tomadas al implementar:
- **Diálogos:** la tercera frase de bienvenida pasa a "Antes de empezar, quiero conocerte un poco" (y en la presentación, "Antes de nada, me gustaría conocerte un poco") para no preguntar el alias dos veces seguidas. "Saltar" deja a la vista la última frase entera.
- **Presentación:** no repite la escena (ya está detrás, en Hoy) y se decide al abrir Hoy, así que no se cierra al guardar el alias a mitad.
- **Carrusel:** los `radio` de personaje están ocultos a la vista (teclado y lectores de pantalla); la tarjeta se maneja con el dedo y con ‹ ›.
- **Burbuja:** deja libre la esquina de la bocina.
- **Conversación:** si el usuario habla con ARVID antes del saludo, no hay saludo; un momento automático espera a que ARVID termine de hablar.
- **Movimiento reducido:** la escena solo se redibuja (4 veces por segundo) mientras ARVID habla.
- **E2E:** usan movimiento reducido por defecto (las de animación lo desactivan), porque muchas escenas animadas en paralelo saturan la CPU en WebKit.

## 0.6.0
| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T01 | Registrar S6-01 a S6-16; enmendar spec 05, design-system (navegación, bocina, burbuja), security-privacy (§5) e implementation-plan | §10 | Documentos actualizados |
| T02 | `src/i18n`: `es.json` y `en.json`, `t()` con interpolación y plurales, fechas y números con `Intl`, cambio en vivo y `<html lang>` | I18N-01 a I18N-03 | Test de claves y variables iguales en los dos idiomas |
| T03 | Pasar todos los textos de la interfaz (incluido `app/text.ts`) a las claves; categorías predefinidas traducidas | I18N-01, I18N-04 | E2E en español sin cambios de comportamiento; revisión en inglés |
| T04 | `domain/avatar`: estilos, descripciones y orden por género | PJ | Tests unitarios |
| T05 | `domain/arvid`: colores (recoloreado de acentos), frases fijas por momento con sus formas de género, selección de momento (prioridad, una vez al día, sin repetir) y saludo por hora | AV-01, LG-01, DL-01, DL-02 | Tests unitarios |
| T06 | `domain/scene`: ARVID con estado propio (entrada por 3 vías, paseos, detalles de la acera, volver a su sitio, escanear, salto) | MV-01 a MV-06, AV-02 | Tests unitarios con semilla |
| T07 | Burbuja ×2 en el lienzo: ajuste de líneas, páginas de 2 líneas, escritura, 5 s o toque, ▼, región oculta accesible | BP-01 a BP-04 | Tests unitarios (paginación) + de componente |
| T08 | Caja de diálogo del onboarding con la misma paginación | BP-05, ON-03 | Tests de componente |
| T09 | Carrusel de personajes | CR | Tests de componente |
| T10 | Onboarding de 10 pasos y presentación para usuarios existentes | ON, PR | Tests de componente + E2E |
| T11 | Perfil, redirección y Ajustes → Perfil | PF | Tests de componente + E2E |
| T12 | Chat (despliegue del campo, Enviar, Esc, límites) con respuestas fijas; bocina | CH-01 a CH-05, MU | Tests de componente + E2E |
| T13 | Momentos por iniciativa propia en Hoy y Perfil; ARVID en el aviso de nivel | DL-01, DL-03 | Tests de componente + E2E |
| T14 | Cierre de la 0.6.0: versión, documentación, despliegue y checklist M6 (sin IA) | — | Definición de terminado |

## 0.6.1
| # | Tarea | Requisitos | Hecho cuando |
|---|---|---|---|
| T15 | **Responsable del producto:** guardar la clave en Netlify como `MISTRAL_API_KEY` (y en `.env.local` para probar en local) | IA-01, §5 | Variable creada |
| T16 | Función `netlify/functions/arvid.mts`: validación con Zod y límite de tamaño, instrucciones de sistema, llamada a Mistral, tiempos de espera, paso del 429 y saneado de la respuesta | IA-01 a IA-03, IA-07, IA-08 | Tests unitarios de la función con Mistral simulado |
| T17 | Contexto en el dispositivo (`domain/arvid/context`) | IA-04 | Tests unitarios: sin identificadores ni horas exactas |
| T18 | Cliente: permiso, IA en momentos y chat, respaldo con frases fijas | IA-05, IA-06, CH | Tests de componente + E2E con la función simulada |
| T19 | Cierre de la 0.6.1: despliegue con funciones, prueba real con Mistral y checklist M6-IA | — | Definición de terminado |
