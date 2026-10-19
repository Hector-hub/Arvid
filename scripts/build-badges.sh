#!/usr/bin/env bash
# Genera public/achievements/badges.png (spec 07, IN-02): las 11 insignias de logro en una fila de celdas de 64 px.
# Fuente: la hoja generada con IA por el responsable del producto (4 × 3 insignias sobre fondo transparente), guardada
# en vendor/badges/sheet.png. Cada insignia se recorta centrada, se reduce con filtro de caja y se limita a 96 colores
# para que el atlas pese poco (NFR7-02). La celda 12 (marco vacío) no se usa.
# Requiere ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=vendor/badges/sheet.png
OUT=public/achievements/badges.png
SIZE=64
# Extremos de las columnas y filas de insignias en la hoja (medidos con el canal alfa)
XS=(47 409 770 1132)
XE=(316 678 1039 1401)
YS=(72 396 727)
YE=(363 688 1019)
CROP=296

mkdir -p "$(dirname "$OUT")"
cells=()
for i in $(seq 0 10); do
  c=$((i % 4))
  r=$((i / 4))
  cx=$(((XS[c] + XE[c]) / 2))
  cy=$(((YS[r] + YE[r]) / 2))
  cells+=( "(" "$SRC" -crop "${CROP}x${CROP}+$((cx - CROP / 2))+$((cy - CROP / 2))" +repage -filter Box -resize "${SIZE}x${SIZE}" ")" )
done
magick "${cells[@]}" +append -dither None -colors 96 -strip "PNG8:$OUT"
echo "badges: 11 x ${SIZE}px -> $OUT ($(stat -f %z "$OUT" 2>/dev/null || stat -c %s "$OUT") bytes)"
