# Spec 08 — Pruebas

Ubicación: `src/domain/arvid/companion.test.ts` y `src/domain/arvid/ai.test.ts` (U); `src/app/arvid/arvid.test.tsx` (C); `e2e/daris.spec.ts` (E).

Tipos: **U** unitario · **C** componente · **E** E2E (Chromium + WebKit) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| CO-01 | Ajustes desconocidos se normalizan a `arvid` y `rosa` | U |
| CO-02 | Onboarding: paso del compañero tras el idioma; con DARIS, el diálogo y el color son los suyos | C + E |
| CO-03 | En Ajustes → Perfil, cambiar a DARIS cambia la escena, la descripción y el chat | E |
| ID-01/02 | `{companion}` y `{selfO}` en los textos: «Soy DARIS, tu compañera de ruta» | C |
| ID-03 | Instrucciones de sistema con el nombre, el género y el tono de cada compañero; la función acepta `companion` | U |
| DE-01/02 | DARIS se dibuja en tierra con la animación de cada momento (revisión visual) | M |
| DC-01 | Recoloreado: cada material cambia a su gama; el contorno no cambia; `rosa` deja el atlas igual | U |
| DC-02 | El color de DARIS no cambia el de ARVID | C |
| NFR8-01 | `public/scene/daris.png` ≤ 60 KB | U |

## Checklist manual (M8)
| # | Paso | iPhone | Android |
|---|---|---|---|
| M8-01 | DARIS entra con el acelerón, se ve en la acera y su burbuja sale de ella | ☐ | ☐ |
| M8-02 | Al completar el día o subir de nivel, DARIS hace su salto de corazones | ☐ | ☐ |
| M8-03 | Los 6 colores de DARIS se ven bien en la escena y en el selector | ☐ | ☐ |
