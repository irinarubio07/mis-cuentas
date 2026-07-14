#!/usr/bin/env python3
# =====================================================================
#  Generador de iconos de «Mis Cuentas» (sin dependencias externas)
#  ---------------------------------------------------------------------
#  Dibuja la marca de la app (ejes + línea ascendente, en blanco sobre
#  verde pino) y escribe los PNG que usan el manifest, el index.html y
#  el service worker:
#     icons/icon-192.png          (192x192, purpose "any")
#     icons/icon-512.png          (512x512, purpose "any")
#     icons/icon-maskable-512.png (512x512, purpose "maskable", con margen)
#
#  Uso:  python3 tools/make-icons.py     (desde la raíz del proyecto)
#
#  No forma parte de la app en ejecución: es una utilidad de desarrollo.
#  Solo usa la librería estándar (zlib + struct) — nada de Pillow ni npm.
# =====================================================================
import os
import zlib
import struct

PINE = (14, 92, 74)     # #0E5C4A  (fondo de marca de la app)
WHITE = (255, 255, 255)

# Marca de la app en un lienzo de 24x24 (idéntica al SVG de index.html):
#   ejes:  M3 3 v18 h18       -> (3,3)->(3,21)->(21,21)
#   línea: M7 15 l4-5 3 3 5-7 -> (7,15)->(11,10)->(14,13)->(19,6)
AXIS = [(3, 3), (3, 21), (21, 21)]
LINE = [(7, 15), (11, 10), (14, 13), (19, 6)]
STROKE_W_24 = 2.0        # grosor de trazo en unidades de la caja 24x24


def _segments(poly):
    return [(poly[i], poly[i + 1]) for i in range(len(poly) - 1)]


SEGS_24 = _segments(AXIS) + _segments(LINE)


def render(size, glyph_frac):
    """Devuelve bytes RGBA (size*size*4). Fondo pino a sangre + marca blanca.
    Antialias por supermuestreo (SS) y promediado por cobertura."""
    SS = 4 if size <= 192 else 3
    S = size * SS
    g = glyph_frac * S                 # lado del cuadrado que ocupa la marca
    ox = (S - g) / 2.0
    oy = (S - g) / 2.0
    sc = g / 24.0

    # Segmentos en coordenadas del lienzo supermuestreado + su caja envolvente
    P = []
    gx0 = gy0 = float("inf")
    gx1 = gy1 = float("-inf")
    for (a, b) in SEGS_24:
        ax, ay = ox + a[0] * sc, oy + a[1] * sc
        bx, by = ox + b[0] * sc, oy + b[1] * sc
        dx, dy = bx - ax, by - ay
        P.append((ax, ay, dx, dy, dx * dx + dy * dy))
        gx0, gx1 = min(gx0, ax, bx), max(gx1, ax, bx)
        gy0, gy1 = min(gy0, ay, by), max(gy1, ay, by)
    r = (STROKE_W_24 / 2.0) * sc        # radio del trazo (medio grosor)
    r2 = r * r
    gx0 -= r; gy0 -= r; gx1 += r; gy1 += r

    n = SS * SS
    buf = bytearray(size * size * 4)
    idx = 0
    for py in range(size):
        base_y = py * SS
        for px in range(size):
            base_x = px * SS
            w = 0                        # subpíxeles que caen en la marca
            for j in range(SS):
                sy = base_y + j + 0.5
                yin = gy0 <= sy <= gy1
                for i in range(SS):
                    sx = base_x + i + 0.5
                    if yin and gx0 <= sx <= gx1:
                        for (ax, ay, dx, dy, L2) in P:
                            if L2 == 0.0:
                                ex, ey = sx - ax, sy - ay
                            else:
                                t = ((sx - ax) * dx + (sy - ay) * dy) / L2
                                t = 0.0 if t < 0 else (1.0 if t > 1 else t)
                                ex, ey = sx - (ax + t * dx), sy - (ay + t * dy)
                            if ex * ex + ey * ey <= r2:
                                w += 1
                                break
            k = n - w                    # subpíxeles de fondo
            buf[idx]     = (WHITE[0] * w + PINE[0] * k) // n
            buf[idx + 1] = (WHITE[1] * w + PINE[1] * k) // n
            buf[idx + 2] = (WHITE[2] * w + PINE[2] * k) // n
            buf[idx + 3] = 255
            idx += 4
    return buf


def write_png(path, size, rgba):
    raw = bytearray()
    row = size * 4
    for y in range(size):
        raw.append(0)                    # filtro "None" por scanline
        raw.extend(rgba[y * row:(y + 1) * row])
    comp = zlib.compress(bytes(raw), 9)

    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data +
                struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", comp)
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(here, "icons")
    os.makedirs(out, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, 0.60),
        ("icon-512.png", 512, 0.60),
        ("icon-maskable-512.png", 512, 0.50),   # marca más pequeña: zona segura
    ]
    for name, size, frac in jobs:
        write_png(os.path.join(out, name), size, render(size, frac))
        print("  escrito icons/%s (%dx%d)" % (name, size, size))
    print("Iconos generados.")


if __name__ == "__main__":
    main()
