#!/usr/bin/env bash
# Genera public/scene/sky.png (drones del cielo, ESC-13) y src/app/scene/sky.generated.ts a partir del Free Drones Pack
# de CraftPix descomprimido en vendor/drones (carpeta "1 Drones" del ZIP; ver docs/design/asset-licenses.md).
# Su licencia no permite publicar los PNG originales: aquí se recortan, se reducen y se tiñen del color del cielo según
# la distancia, en un atlas propio. Una fila por modelo y distancia; los fotogramas de cada fila tienen el mismo tamaño.
# Requiere ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=vendor/drones
OUT=public/scene/sky.png
TS=src/app/scene/sky.generated.ts
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Modelo: hoja, tamaño del fotograma, fotogramas que se usan y ancho (px) del dron cerca; lejos y en medio, más pequeño.
MODELS=(
  "3/Forward.png 48 4 26"
  "4/Walk.png 96 4 44"
  "5_2/Walk.png 48 4 24"
  "6/Walk.png 48 4 20"
  "2/Drop.png 96 1 38"
)
# Distancia: fracción del ancho cerca y cuánto se funde con el color del cielo.
DEPTHS=(
  "far 0.5 60"
  "mid 0.7 40"
  "near 1 18"
)
SKY="#1b1447"

rows=()
entries=()
y=0
for depth in "${DEPTHS[@]}"; do
  read -r dname dscale dtint <<<"$depth"
  for model in "${MODELS[@]}"; do
    read -r sheet size frames width <<<"$model"
    # Caja común a todos los fotogramas, para que la animación no tiemble
    box=$(magick "$SRC/$sheet" -crop "${size}x${size}" +repage -background none -flatten -trim -format '%w %h %X %Y' info:)
    read -r bw bh bx by <<<"$box"
    bx=${bx#+}
    by=${by#+}
    w=$(awk -v a="$width" -v s="$dscale" 'BEGIN { printf "%d", a * s + 0.5 }')
    h=$(awk -v w="$w" -v bw="$bw" -v bh="$bh" 'BEGIN { v = int(w * bh / bw + 0.5); print (v < 1 ? 1 : v) }')
    cells=()
    for ((f = 0; f < frames; f++)); do
      cells+=( "(" "$SRC/$sheet" -crop "${bw}x${bh}+$((f * size + bx))+${by}" +repage -filter point -resize "${w}x${h}!" ")" )
    done
    row="$TMP/row-${#rows[@]}.png"
    magick "${cells[@]}" +append -fill "$SKY" -colorize "$dtint%" "$row"
    rows+=( "$row" )
    entries+=( "{ depth: '$dname', model: '${sheet%%/*}', y: $y, w: $w, h: $h, frames: $frames }" )
    y=$((y + h))
  done
done
magick "${rows[@]}" -background none -append -strip "$OUT"
{
  echo "// Generado por scripts/build-sky.sh. No editar a mano."
  echo "export const SKY_SPRITES = ["
  for e in "${entries[@]}"; do echo "  $e,"; done
  echo "] as const;"
} > "$TS"
echo "sky: ${#entries[@]} filas -> $OUT ($(magick identify -format '%wx%h' "$OUT"))"
