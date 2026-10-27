# Spec 16 — Pruebas

## Automáticas
| Requisito | Prueba |
|---|---|
| EF-02 | `src/app/sound/sfx.test.ts`: con varios efectos a la vez suena el de más prioridad; el del compañero se calla mientras suena otro |
| EF-01, EF-03 | `src/app/sound/sound-ui.test.tsx` (Web Audio simulado): registrar, deshacer, día completo, nivel y logro piden su efecto; nada suena en segundo plano, en los juegos ni con los efectos apagados |
| PS-01 a PS-04, DT-01, DT-02 | `src/app/screens/settings.test.tsx`: el reproductor (anterior, reproducir/pausa, siguiente y barra de progreso) cambia y salta de pista; el panel guarda la pista actual, los volúmenes y el timbre; «Escuchar»; el backup los incluye y uno antiguo usa los valores por defecto |
| NFR16-02 | `src/app/sound/sfx.test.ts`: sin `AudioContext` no hay errores |

## Manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M16-01 | Con música y efectos: registrar, completar el día y subir de nivel; se oye bien la mezcla | ☐ | ☐ |
| M16-02 | Cambiar el timbre y el volumen; «Escuchar» | ☐ | ☐ |
| M16-03 | Con el interruptor de silencio (iPhone) o el volumen de multimedia a cero (Android) no suena nada | ☐ | ☐ |
| M16-04 | Reproductor: anterior, siguiente, pausa y arrastrar la barra; al volver a abrir la app sigue por la misma pista | ☐ | ☐ |
