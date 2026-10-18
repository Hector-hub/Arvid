# Spec 06 — Pruebas

Ubicación: `src/domain/arvid/ai.test.ts` (instrucciones, saneado y contexto), `src/app/arvid/function.test.ts` (función con Mistral simulado), `src/i18n/i18n.test.ts`, `src/domain/arvid/*.test.ts`, `src/domain/scene/arvid.test.ts` (U); `src/app/arvid/arvid.test.tsx` y `src/app/scene/scene.test.tsx` (C); `e2e/arvid.spec.ts` y el resto de E2E con el onboarding nuevo (E).

**Sin prueba automática en la 0.6.0** (checklist manual): CR-02 deslizar con el dedo (M6-02), MV-02/MV-03 a la vista (M6-04; la lógica está en U), la burbuja ×2 a 360 px (M6-03) y DL-01 "día completo" y "retomar" por componente (están en U con `chooseMoment`).

Tipos: **U** unitario · **I** integración · **C** componente · **E** E2E (Chromium + WebKit, con `/api/arvid` simulado) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| I18N-01/05 | `es.json` y `en.json` tienen las mismas claves y las mismas variables; ningún componente tiene texto literal (lint o búsqueda) | U |
| I18N-02 | Plurales (1 / 2) y fechas en los dos idiomas | U |
| I18N-03 | Idioma por defecto según el navegador; cambio en vivo y `<html lang>` | C + E |
| I18N-04 | Las categorías predefinidas se traducen; las renombradas y los nombres del usuario no | C |
| PJ | Estilos, descripciones y orden por género | U + C |
| AV-01 | Recoloreado de ARVID: solo cambian los 4 acentos | U |
| MV-01 | Con 300 entradas simuladas aparecen las 3 vías; la entrada termina en su sitio | U |
| MV-02/03 | Los paseos y las visitas a detalles empiezan y terminan en su sitio, sin salir de la escena | U |
| MV-04 | Pedir que hable a mitad de un paseo: vuelve antes de hablar | U |
| MV-05 | Con movimiento reducido no hay entrada, paseo ni salto | U |
| BP-01/02 | Paginación: el texto se parte en páginas de 2 líneas que caben en la burbuja; avance a los 5 s o al tocar | U + C |
| BP-04 | La página visible está en la región `role="status"` | C |
| CR | Flechas, teclado, puntos, colores y radios con nombre | C |
| ON | Onboarding de 10 pasos (9 sin instalar) con Atrás y Saltar | C + E |
| PR | Presentación para usuarios sin alias; "Más tarde" la pospone | C + E |
| PF | `/personaje` → `/perfil`; encabezado alias · estilo | C + E |
| CH-01 a CH-04 | Despliegue del campo, botón Enviar, Esc, 280 caracteres, "…" mientras espera | C + E |
| CH-05 | Sin conexión, sin IA o con 429: frase fija explicativa | C + E |
| DL-01/02 | Prioridad, una vez al día, sin repetir la frase, saludo por hora | U |
| DL-03 | Con el ajuste desactivado, sin momentos 2 a 5 | C |
| MU | Bocina con `aria-pressed`, tachada si está apagada | C |
| IA-02/03 | La función envía el modelo, los parámetros y las instrucciones de sistema | U (función) |
| IA-04 | El contexto no incluye identificadores internos ni horas exactas | U |
| IA-05 | Tiempo de espera o error → frase fija | U + C |
| IA-06 | Sin permiso no hay ninguna petición a `/api/arvid` | C + E |
| IA-07 | Cuerpo de más de 24 KB → 413; un 429 de Mistral se devuelve como 429 | U (función) |
| IA-08 | Markdown y HTML de la respuesta se quedan en texto plano; recorte a 1 200 caracteres | U |

## Checklist manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M6-01 | El onboarding se entiende y no se hace largo; "Saltar" funciona | ☐ | ☐ |
| M6-02 | El carrusel se desliza bien con el dedo | ☐ | ☐ |
| M6-03 | La burbuja ×2 se lee bien y no tapa nada importante | ☐ | ☐ |
| M6-04 | La entrada y los paseos de ARVID se ven naturales, no distraen | ☐ | ☐ |
| M6-05 | El chat se despliega bien con el teclado del móvil abierto | ☐ | ☐ |
| M6-06 | VoiceOver o TalkBack leen los diálogos, el chat y el carrusel | ☐ | ☐ |
| M6-07 | La app en inglés no tiene textos en español (salvo lo que escribe el usuario) | ☐ | ☐ |
| M6-IA-01 | Las respuestas de ARVID son útiles, breves y en el idioma correcto | ☐ | ☐ |
| M6-IA-02 | Sin conexión, ARVID responde con frases fijas | ☐ | ☐ |
