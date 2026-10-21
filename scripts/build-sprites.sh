#!/usr/bin/env bash
# Genera public/sprites/atlas.png (tiles de 16 px ampliados ×12 sin suavizado, para mostrarlos nítidos a 32, 48 o 64 px)
# y src/app/design/sprites.generated.ts a partir de scripts/sprites.txt.
# Requiere ImageMagick (magick) y el pack descomprimido en vendor/kenney (ver docs/design/asset-licenses.md).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=vendor/kenney/Tilesheet/monochrome-transparent_packed.png
OUT=public/sprites/atlas.png
TS=src/app/design/sprites.generated.ts
mkdir -p "$(dirname "$OUT")" "$(dirname "$TS")"
tiles=()
names=()
while read -r name col row; do
  [[ -z "${name}" || "${name}" == \#* ]] && continue
  tiles+=( "(" "$SRC" -crop "16x16+$((col * 16))+$((row * 16))" +repage ")" )
  names+=( "$name" )
done < scripts/sprites.txt
magick "${tiles[@]}" +append -filter point -resize 1200% -strip "$OUT"

# Los iconos de la app los genera scripts/build-icons.sh (desde la spec 08 se usa la imagen de ARVID).
{
  echo "// Generado por scripts/build-sprites.sh. No editar a mano."
  echo "export const SPRITE_TILE = 192;"
  echo "export const SPRITE_COUNT = ${#names[@]};"
  echo "export const SPRITES = {"
  for i in "${!names[@]}"; do echo "  '${names[$i]}': $i,"; done
  echo "} as const;"
  echo "export type SpriteName = keyof typeof SPRITES;"
} > "$TS"
echo "atlas: ${#names[@]} sprites -> $OUT"
