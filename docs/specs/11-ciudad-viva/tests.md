# Spec 11 — Pruebas

## Automáticas
| Requisito | Prueba |
|---|---|
| CV-01, CV-02, AN-03, TC-02 | `src/domain/scene/city.test.ts`: ciudad en los niveles 1, 4 y 10; llegadas de varios niveles juntos; siguiente nivel con llegadas |
| CV-02, AN-02 | Mismo archivo: la escena solo genera los vehículos y peatones ganados; nivel 1 sin tráfico; el recién llegado aparece primero y brilla |
| CV-04, AN-01 | `src/app/city/city.test.tsx`: bienvenida única para usuarios actuales; anuncio de llegadas al cerrar el aviso de nivel; espera mientras está abierto |
| TC-01, TC-02 | Mismo archivo: pantalla «Tu ciudad» con avance, desbloqueados y siluetas con su nivel |
| VC-02, VC-07 | Mismo archivo: un vecino ganado dice una frase fija; ninguno más ese día; uno sin ganar no habla |
| VC-05, VC-06 | `src/app/arvid/function.test.ts`: momento `neighbor` con la personalidad del vecino, sin gastar créditos y como mucho uno al día |

## Manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M11-01 | Al actualizar, la ciudad muestra lo de tu nivel y el compañero da la bienvenida una vez | ☐ | ☐ |
| M11-02 | Al subir de nivel, tras el aviso, el compañero anuncia lo que llega y lo nuevo brilla al aparecer | ☐ | ☐ |
| M11-03 | «Tu ciudad» en Perfil se entiende: desbloqueados y siluetas con su nivel | ☐ | ☐ |
| M11-04 | Algún día un vecino dice algo; la burbuja (borde ámbar) le sigue y no coincide con el compañero | ☐ | ☐ |
