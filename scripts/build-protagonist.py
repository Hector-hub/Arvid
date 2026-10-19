#!/usr/bin/env python3
"""Convierte hojas de caminar generadas con IA (filas de 8 fotogramas sobre fondo transparente) en hojas de pixel art
para la escena: una por etapa, celdas de CELL px, todos los fotogramas a la misma escala, alineados por la cabeza
(horizontal) y por los pies (vertical), alfa sin semitransparencias y paleta común reducida.

Uso: build-protagonist.py <nombre> <salida_dir> <hoja1.png> [hoja2.png ...]
Las filas de las hojas, en orden, son las etapas 1, 2, 3...
Requiere ImageMagick (magick)."""
import os, subprocess, sys, tempfile

CELL = 64          # celda de salida (px)
HEIGHT = 58        # altura del personaje en la celda (px), pies a 2 px del borde inferior
COLORS = 48        # paleta común de todas las etapas
FRAMES = 8

def size(f):
    return tuple(map(int, subprocess.check_output(['magick', 'identify', '-format', '%w %h', f]).split()))

def offset(d):
    """Desplazamiento de `-extent` para colocar la imagen `d` px a la derecha o abajo dentro del lienzo."""
    return f'-{d}' if d >= 0 else f'+{-d}'

def runs(vals, minlen):
    out, start = [], None
    for i, v in enumerate(list(vals) + [False]):
        if v and start is None: start = i
        if not v and start is not None:
            if i - start >= minlen: out.append((start, i))
            start = None
    return out

def boxes(f):
    """Cajas (x0, y0, x1, y1) de cada fotograma, fila a fila."""
    W, H = size(f)
    a = subprocess.check_output(['magick', f, '-alpha', 'extract', '-depth', '8', 'gray:-'])
    op = lambda x, y: a[y * W + x] > 128
    result = []
    for (y0, y1) in runs([any(op(x, y) for x in range(0, W, 2)) for y in range(H)], 20):
        cols = runs([any(op(x, y) for y in range(y0, y1, 2)) for x in range(W)], 10)
        assert len(cols) == FRAMES, f'{f}: fila con {len(cols)} fotogramas'
        row = []
        for (x0, x1) in cols:
            ys = [y for y in range(y0, y1) if any(op(x, y) for x in range(x0, x1))]
            top, bottom = ys[0], ys[-1] + 1
            # Centro de la cabeza: media de las columnas opacas en el 20 % superior
            head = [x for y in range(top, top + (bottom - top) // 5) for x in range(x0, x1) if op(x, y)]
            row.append((x0, top, x1, bottom, sum(head) / len(head)))
        result.append(row)
    return result

def main():
    name, out, sheets = sys.argv[1], sys.argv[2], sys.argv[3:]
    stages = [(f, row) for f in sheets for row in boxes(f)]
    tallest = max(b[3] - b[1] for _, row in stages for b in row)
    scale = HEIGHT / tallest
    src_cell = CELL / scale
    tmp = tempfile.mkdtemp()
    rows = []
    for s, (f, row) in enumerate(stages):
        cells = []
        for i, (x0, top, x1, bottom, cx) in enumerate(row):
            # Recorte del tamaño de una celda en la escala original: cabeza centrada y pies a 2 px del borde
            left = round(cx - src_cell / 2)
            up = round(bottom + 2 / scale - src_cell)
            cell = os.path.join(tmp, f's{s}-{i}.png')
            # Solo los píxeles de este fotograma (los vecinos pueden entrar en la celda), colocados en la celda
            size_ = round(src_cell)
            subprocess.check_call(['magick', f, '-crop', f'{x1 - x0}x{bottom - top}+{x0}+{top}', '+repage',
                                   '-background', 'none', '-extent', f'{size_}x{size_}{offset(x0 - left)}{offset(top - up)}',
                                   '-filter', 'Box',
                                   '-resize', f'{CELL}x{CELL}!', '-channel', 'A', '-threshold', '50%', '+channel', cell])
            cells.append(cell)
        row_file = os.path.join(tmp, f'row{s}.png')
        subprocess.check_call(['magick', *cells, '+append', row_file])
        rows.append(row_file)
    # Paleta común a todas las etapas (el recoloreado de variantes trabaja sobre colores exactos)
    allrows = os.path.join(tmp, 'all.png')
    subprocess.check_call(['magick', *rows, '-append', '-dither', 'None', '-colors', str(COLORS), allrows])
    os.makedirs(out, exist_ok=True)
    for s in range(len(rows)):
        dest = os.path.join(out, f'{name}-walk-{s + 1}.png')
        subprocess.check_call(['magick', allrows, '-crop', f'{CELL * FRAMES}x{CELL}+0+{s * CELL}', '+repage', '-strip', f'PNG8:{dest}'])
        print(dest)

main()
