#!/usr/bin/env python3
"""Pixel frames -> SVG paths, so a scene needs no embedded pictures (the desktop app blocks them).

Each pixel row is drawn as horizontal 1-unit strokes, one <path> per colour.

    from pixel_svg import layer, _load
"""
from PIL import Image


def _runs(pixels):
    """pixels: {(x, y): '#rrggbb'} -> {colour: [(y, x, n), ...]} sorted."""
    by_colour = {}
    for (x, y), c in pixels.items():
        by_colour.setdefault(c, set()).add((y, x))
    out = {}
    for c, pts in by_colour.items():
        runs = []
        for y, x in sorted(pts):
            if runs and runs[-1][0] == y and runs[-1][1] + runs[-1][2] == x:
                runs[-1] = (y, runs[-1][1], runs[-1][2] + 1)
            else:
                runs.append((y, x, 1))
        out[c] = runs
    return out


def _path(runs):
    d = []
    px = py = None
    for y, x, n in runs:
        if px is None:
            d.append(f"M{x} {y}")
        else:
            rel = f"m{x - px} {y - py}"
            ab = f"M{x} {y}"
            d.append(rel if len(rel) <= len(ab) else ab)
        d.append(f"h{n}")
        px, py = x + n, y
    return "".join(d)


def layer(pixels):
    runs = _runs(pixels)
    # biggest colours first, so overlap order is stable
    return "".join(f'<path stroke="{c}" d="{_path(r)}"/>' for c, r in sorted(runs.items(), key=lambda kv: -len(kv[1])))


def _load(path, alpha_min=128):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    W, H = im.size
    pix = {}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a >= alpha_min:
                pix[(x, y)] = f"#{r:02x}{g:02x}{b:02x}"
    return pix, (W, H)
