#!/usr/bin/env bash
# Genera public/scene/water.png (río con reflejos de la ciudad, D-125): los 24 fotogramas de 616×26 del pack propio
# (vendor/water, ver docs/design/asset-licenses.md) reducidos sin suavizado a la escala de la escena (÷1,7135, la de
# la captura de 658 px sobre la que se diseñó) y apilados en vertical.
# Requiere ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=vendor/water/city_water_reflection_616x26_spritesheet.png
OUT=public/scene/water.png
frames=()
for i in $(seq 0 23); do
  frames+=( "(" "$SRC" -crop "616x26+$(( (i % 4) * 616 ))+$(( (i / 4) * 26 ))" +repage -filter point -resize 360x15! ")" )
done
magick "${frames[@]}" -append -dither None -colors 64 -strip "PNG8:$OUT"
magick identify "$OUT"
