# Spec 08 — DARIS, compañera alternativa a ARVID

Estado: **aprobada** (D-094, 2026-10-20) · 0.8.0 desplegada · Incremento posterior al MVP
Decisiones que implementa: D-090 a D-093
Modifica:
- spec 06: AV (colores), MV (movimiento), BP-01 (burbuja), ON (onboarding), PF-03 (Ajustes → Perfil), IA-03 (instrucciones);
- spec 05: ESC-07 (el compañero en la escena) y la descripción accesible de la escena;
- spec 07: CE-01 (celebración de logros).

Prototipo de referencia: el bloque «PROTOTIPO LOCAL» que hubo en `src/app/scene/draw.ts` (retirado al implementar).

## 1. Contexto y objetivo
ARVID, el dron, es el compañero del usuario desde la spec 06. El responsable del producto quiere una **alternativa para elegir**: DARIS, un dron conejo blanco y rosa, más tierno, que va **en tierra** junto al protagonista en lugar de volar. El usuario elige uno de los dos y puede cambiarlo cuando quiera.

Principio: lo que el compañero **dice y hace** sigue las mismas reglas que ARVID (acompaña, no juzga, nunca bloquea). Solo cambian su nombre, su forma de estar en la escena y su tono.

## 2. Alcance
**Incluye:**
- Elección de compañero en el onboarding, en la presentación para usuarios existentes y en Ajustes → Perfil.
- DARIS en la escena: en tierra, con sus 4 animaciones.
- Nombre y tono propios de DARIS en los diálogos, el chat y la IA.
- 6 colores de DARIS.

**Excluye:**
- Tener los dos compañeros a la vez.
- Diálogos fijos distintos para DARIS (usa los de ARVID con su nombre; su tono propio está en la IA).
- Sonidos.

## 3. Requisitos funcionales

### 3.1 Elección (CO, D-090)
- **CO-01.** Ajuste `companion`: `'arvid'` (por defecto) o `'daris'`. Los usuarios actuales siguen con ARVID.
- **CO-02.** **Onboarding:** un paso nuevo, «Elige a tu compañero», justo después del idioma, con dos tarjetas animadas (ARVID flotando, DARIS flotando) y su nombre y una frase de cada uno. El resto del onboarding lo narra el compañero elegido, con su retrato. El paso de color pasa a ser el del compañero elegido.
- **CO-03.** **Ajustes → Perfil:** el mismo selector de compañero, encima del color. Al cambiarlo, la escena cambia en el acto y el compañero nuevo hace su entrada.
- **CO-04.** **Presentación** para usuarios existentes (PR): no incluye el paso nuevo; quien la ve ya tiene a ARVID.

### 3.2 Identidad (ID, D-091)
- **ID-01.** Los textos que hablan **del compañero** usan su nombre (`{companion}`): «Hablar con DARIS», «DARIS dice», «Color de DARIS», «DARIS habla por iniciativa propia», «DARIS con IA», la descripción de la escena y el diálogo del onboarding («Hola. Soy DARIS…»). Los textos que hablan **de la app** («Instala ARVID…», copias de seguridad, créditos, versión) no cambian.
- **ID-02.** **Género gramatical:** ARVID habla en masculino («encantado»); DARIS, en femenino («encantada»). Las frases fijas con género del compañero tienen sus dos formas.
- **ID-03.** **IA:** las instrucciones de sistema (IA-03) usan el nombre, el género y el tono del compañero. DARIS es más tierna y efusiva que ARVID, con las mismas reglas: breve, sin juzgar, sin diagnósticos. La función `/api/arvid` recibe `companion` y lo valida.

### 3.3 DARIS en la escena (DE, D-092)
- **DE-01.** **Posición:** en tierra, sobre la acera (base en la fila 171 del lienzo), 36 px por delante del protagonista. No pasea ni inspecciona los detalles de la acera (MV-02, MV-03 no aplican).
- **DE-02.** **Animaciones** (atlas de 48 × 48 px, `public/scene/daris.png`):

  | Fila | Animación | Fotogramas | Cuándo |
  |---|---|---|---|
  | 1 | Flotar | 12 | En reposo |
  | 2 | Contenta (ojos «^^» y corazones) | 11 | Mientras habla |
  | 3 | Acelerón (estela) | 10 | Entrada: llega desde la izquierda de la escena hasta su sitio (MV-01) |
  | 4 | Corazones (salto con anillo) | 15 | Al celebrar: subida de nivel, logro nuevo y día completo; una vez |

- **DE-03.** **Burbuja:** sale de DARIS, a su altura (BP-01).
- **DE-04.** **Movimiento reducido:** sin entrada ni animaciones; primer fotograma de «Flotar», y la cara contenta fija mientras habla.
- **DE-05.** El cono de escaneo (D-070) es solo de ARVID.

### 3.4 Colores (DC, D-093)
- **DC-01.** 6 colores: **Rosa** (por defecto), Cian, Lima, Ámbar, Rojo y negro, Violeta. Se recolorea en tiempo real por material (energía, carcasa, placas y detalles) a partir del atlas rosa, como ARVID.
- **DC-02.** Ajuste `darisColor`, independiente de `arvidColor`: al volver a ARVID se recupera su color.

## 4. Datos
| Clave | Tipo | Por defecto | En el backup |
|---|---|---|---|
| companion | `'arvid' \| 'daris'` | `'arvid'` | Sí |
| darisColor | `'rosa' \| 'cian' \| 'lima' \| 'ambar' \| 'rojo' \| 'violeta'` | `'rosa'` | Sí |

Los valores desconocidos se normalizan al cargar. Sin migración.

## 5. Requisitos no funcionales
- **NFR8-01.** El atlas de DARIS pesa ≤ 60 KB y se precachea (offline).
- **NFR8-02.** Todos los textos nuevos o con `{companion}` están en `es.json` y `en.json` (I18N-05).
- **NFR8-03.** Cambiar de compañero no recarga la app ni borra nada.

## 6. Ejemplos (Given/When/Then)
**CO-02 · Onboarding**
- When el usuario elige DARIS en el paso del compañero
- Then el siguiente diálogo dice «Hola. Soy DARIS…» con su retrato, y al terminar DARIS llega a la escena de Hoy con el acelerón

**DE-02 · Celebración**
- Given DARIS como compañera
- When el usuario completa lo último del día
- Then DARIS hace su salto de corazones una vez y dice la frase de «día completo»

**DC-02 · Colores independientes**
- Given ARVID magenta y DARIS lima
- When el usuario cambia a ARVID y luego vuelve a DARIS
- Then ARVID aparece magenta y DARIS lima

## 7. Dependencias y riesgos
- **Dependencias:** la hoja de DARIS generada por el responsable (`vendor/protagonists/bunny.png`), ya procesada en el prototipo; arte propio generado con IA (licencias).
- **Riesgos:**
  - **R8-1 · Textos con el nombre del compañero.** Hay que repasar unos 14 textos y sus formas de género. *Mitigación:* variable `{companion}` y prueba de claves (I18N-05).
  - **R8-2 · Coste de mantener dos compañeros** en futuras funciones. *Mitigación:* todo lo que depende del compañero pasa por un único módulo (`app/companion`).

## 8. Plan de entrega
- **0.8.0:** todo lo anterior.

## 9. Decisiones de esta spec (aprobadas, D-094)
| ID | Propuesta |
|---|---|
| S8-01 | Elección en onboarding (tras el idioma), presentación sin cambios y Ajustes → Perfil; ARVID por defecto (CO) |
| S8-02 | DARIS es un personaje distinto: nombre propio, femenino en español, tono más tierno y efusivo; mismas reglas (ID) |
| S8-03 | Las frases fijas son las mismas para los dos, con `{companion}` y formas de género; el tono propio de DARIS está en la IA |
| S8-04 | DARIS en tierra, por delante del protagonista; entrada con acelerón, cara contenta al hablar, salto de corazones al celebrar; sin paseos ni escaneo (DE) |
| S8-05 | 6 colores de DARIS con su propio ajuste (DC) |
| S8-06 | Entrega en 0.8.0 |
