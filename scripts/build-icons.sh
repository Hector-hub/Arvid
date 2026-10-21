#!/usr/bin/env bash
# Genera los iconos de la app (PWA, iPhone y favicon) desde assets-src/app-icon.png: ARVID con su cono de escaneo
# sobre la ciudad (imagen de 1254 × 1254 generada con IA por el responsable del producto: «Neon Drone Over Cyber City»).
# - icon-192 / icon-512 y apple-touch-icon: la imagen completa (iOS redondea las esquinas por su cuenta).
# - icon-maskable-512: reducida al 78 % con margen del color del fondo, para que el recorte circular de Android no
#   corte las puntas del anillo (zona segura del 80 %).
# - favicon-32: reducida directamente.
# Requiere ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets-src/app-icon.png
OUT=public/icons
BG="#091032"
mkdir -p "$OUT"
# Paleta de 256 colores: la diferencia apenas se ve y pesan 3-4 veces menos (van en el precache)
icon() { magick "$SRC" -filter Lanczos -resize "${1}x${1}" -colors 256 -strip "PNG8:$OUT/$2"; }
icon 192 icon-192.png
icon 512 icon-512.png
icon 180 apple-touch-icon.png
icon 32 favicon-32.png
magick "$SRC" -filter Lanczos -resize 400x400 -background "$BG" -gravity center -extent 512x512 -colors 256 -strip "PNG8:$OUT/icon-maskable-512.png"
ls -la "$OUT"
