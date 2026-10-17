# Spec 02 — Pruebas

Ubicación: `src/domain/progress/*.test.ts`, `src/domain/backupReminder.test.ts` (U), `src/data/backup.test.ts` (I), `src/app/screens/progress-backup.test.tsx` (C), `e2e/progress-backup.spec.ts` (E).

Tipos: **U** unitario · **I** integración (fake-indexeddb) · **C** componente · **E** E2E (Chromium + WebKit) · **M** manual.

## Trazabilidad
| Requisito | Prueba | Tipo |
|---|---|---|
| ENG-01 | Enumeración de periodos con varias versiones (diaria → semanal → mensual), desde la creación hasta hoy | U |
| ENG-02 | 1/3 de Media = 333 centésimas; 2/3 = 667; suma sin errores de coma flotante en 1 000 periodos | U |
| ENG-03 | E-6 (gracia incompleta excluida); gracia completa evaluable; reanudar a mitad de periodo → gracia | U |
| ENG-04 | Pausado o archivado el último día → no evaluable, pero con XP | U |
| ENG-05 | Abierto incompleto no evaluable; abierto completo evaluable | U |
| ENG-06 · GD-A1 | Ejemplo §6 "truncado" | U |
| PRG-01 | La XP incluye los periodos de gracia, pausa y truncados y las actividades archivadas | U |
| PRG-02 | E-9: 999 → nivel 4, Recluta; 1 000 → 5, Aprendiz; 4 500 → 10, Vigía; 0 → 1 | U |
| PRG-03 | Personaje muestra el nivel, el título, "x / y XP" y el estado vacío | C |
| PRG-04 | El indicador de Hoy enlaza a Personaje | C + E |
| PRG-05 | El feedback incluye "+2,5 XP"; al deshacer, "−2,5 XP" | C |
| PRG-06 | Ejemplo §6 "subida de nivel" | E |
| PRG-07 | Con datos previos y sin `lastCelebratedLevel` no aparece el modal | I + E |
| STR-01 | E-5 y E-7 de game-design; GD-A2; pausa larga sin romper; parcial rompe (D-034); máximo 2 comodines | U |
| STR-02 | Texto "racha 6 días" / "semanas" / "meses"; oculto con racha 0 | C |
| STR-03, STR-04 | El detalle muestra la mejor racha, los comodines y "Comodín usado" | E |
| BAK-01 | El archivo exportado cumple el esquema y contiene todas las tablas | I |
| BAK-02 | Con `canShare` simulado se usa compartir; sin él, se descarga | C + E (en E2E se fuerza la descarga: en headless la hoja de compartir no se resuelve) + M (M2-01) |
| BAK-03 | Cancelar la hoja de compartir (AbortError) no actualiza `lastBackupAt` | C |
| BAK-04 | Ejemplo §6 "versión futura"; JSON inválido; ID huérfano; tipo incorrecto → mensaje y sin cambios | I + C |
| BAK-05 | Resumen correcto; "Exportar primero" lanza la exportación | C |
| BAK-06 | Ejemplo §6 "fallo durante el reemplazo"; se conservan los ajustes del dispositivo | I |
| BAK-07 | Ejemplo §6 "recordatorio"; sin cambios desde el último backup no aparece | U + E |
| DEL-01 | Texto incorrecto → no borra; "BORRAR" → onboarding con las categorías sembradas | I + E |
| NFR2-01 | Benchmark de un año | U |
| NFR2-02 | Validar un archivo de 5 MB en < 1 s (jsdom, con margen) | I |
| NFR2-03 | Ida y vuelta: XP, nivel y rachas idénticos | I + E |

## Checklist manual
| # | Paso | iPhone | Android |
|---|---|---|---|
| M2-01 | Exportar → la hoja de compartir permite guardar en Archivos o Drive; el archivo se abre como JSON | ☐ | ☐ |
| M2-02 | Con datos de prueba: importar ese archivo en el otro dispositivo → mismos datos (y después borrar o restaurar los propios) | ☐ | ☐ |
| M2-03 | El modal de nivel se ve bien y se cierra con un toque; VoiceOver o TalkBack lo anuncian | ☐ | ☐ |
| M2-04 | Rendimiento: Hoy carga sin retardo perceptible con datos de varias semanas | ☐ | ☐ |
