#!/usr/bin/env bash
# Genera public/sprites/atlas.png (tiles de 16 px ampliados ×12 sin suavizado, para mostrarlos nítidos a 32, 48 o 64 px)
# y los iconos de la PWA en public/icons, y src/app/design/sprites.generated.ts a partir de scripts/sprites.txt.
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

# Iconos de la app: el personaje en dorado sobre ink.
ICONS=public/icons
mkdir -p "$ICONS"
hero=( "$SRC" -crop "16x16+$((28 * 16))+$((4 * 16))" +repage -fill "#ffcd75" -colorize 100 )
magick "${hero[@]}" -filter point -resize 800% -background "#1a1c2c" -gravity center -extent 192x192 "$ICONS/icon-192.png"
magick "${hero[@]}" -filter point -resize 2000% -background "#1a1c2c" -gravity center -extent 512x512 "$ICONS/icon-512.png"
magick "${hero[@]}" -filter point -resize 1600% -background "#1a1c2c" -gravity center -extent 512x512 "$ICONS/icon-maskable-512.png"
magick "${hero[@]}" -filter point -resize 700% -background "#1a1c2c" -gravity center -extent 180x180 "$ICONS/apple-touch-icon.png"
magick "${hero[@]}" -filter point -resize 200% -background "#1a1c2c" -gravity center -extent 32x32 "$ICONS/favicon-32.png"
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
