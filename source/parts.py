"""Shared pieces for the generators: pixel frames as vector paths, the backdrop's placement CSS, and a
few drawing helpers. Every picture the mod shows is vector: the desktop app drops embedded images.
"""
import os
import random
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

SRC = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SRC)
from pixel_svg import _load, layer  # noqa: E402

# Where the pair stands in the backdrop: --m = left edge as a share of the window's width, --s = height as a
# share of the window's height. The mod rewrites exactly this text with /ojou move and /ojou size.
CAST_VARS = "--m:.22;--s:.2"

# The cast box in the backdrop (0..447 x 0..513): 大肥鱼 on the left, 大小姐 beside her.
OJ_X, OJ_Y, OJ_H = 100, 3, 510
FY_H = 308

SNAP = 100          # a later frame's pixel this close to frame 1's colour takes frame 1's colour


def f(x):
    return f"{x:.2f}".rstrip("0").rstrip(".")


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def near(a, b, snap=SNAP):
    return sum((x - y) ** 2 for x, y in zip(rgb(a), rgb(b))) ** .5 < snap


def frames(paths, snap=SNAP):
    """Pixel frames -> (shared layer, [each frame's own layer], size): pixels the same in every frame are
    drawn once; later frames' colours close to frame 1's take frame 1's, so frames do not shimmer."""
    fr = [_load(p)[0] for p in paths]
    size = _load(paths[0])[1]
    base = fr[0]
    snapped = [base] + [{k: (base[k] if k in base and near(base[k], v, snap) else v) for k, v in g.items()} for g in fr[1:]]
    shared = {k: v for k, v in base.items() if all(p.get(k) == v for p in snapped[1:])}
    per = [{k: v for k, v in p.items() if shared.get(k) != v} for p in snapped]
    return layer(shared), [layer(p) for p in per], size


def pixel_group(x, y, h_units, size, inner):
    """Pixel strokes (one unit per pixel) placed at x, y and scaled to h_units tall."""
    s = h_units / size[1]
    return (f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})"><g transform="translate(0 .5)" fill="none" '
            f'stroke-width="1.08" shape-rendering="crispEdges">{inner}</g></g>')


def cast_css():
    """Per window shape (aspect buckets), the visible part of the 1600x900 canvas under 'slice', so the
    pair can be placed in window terms: x0/vw across, y0/vh down, in canvas units."""
    def vis(a):
        if a <= 16 / 9:
            return 800 - 450 * a, 900 * a, 0, 900
        vh = 1600 / a
        return 0, 1600, (900 - vh) / 2, vh
    bounds = [(1, 2), (3, 5), (7, 10), (4, 5), (9, 10), (1, 1), (11, 10), (6, 5), (13, 10), (7, 5), (3, 2),
              (8, 5), (17, 10), (16, 9), (19, 10), (2, 1), (11, 5), (12, 5), (13, 5)]
    out = []
    for i, (n, d) in enumerate(bounds):
        lo = n / d
        hi = bounds[i + 1][0] / bounds[i + 1][1] if i + 1 < len(bounds) else lo * 1.08
        x0, vw, y0, vh = vis((lo + hi) / 2)
        rule = f"--x0:{x0:.0f};--vw:{vw:.0f};--y0:{y0:.0f};--vh:{vh:.0f}"
        out.append(f":root{{{rule}}}" if i == 0 else f"@media (min-aspect-ratio:{n}/{d}){{:root{{{rule}}}}}")
    k = "(var(--s) * var(--vh) / 513)"          # canvas units per cast-box unit
    left = "(var(--x0) + var(--m) * var(--vw))"
    top = "(var(--y0) + (.92 - var(--s)) * var(--vh))"
    out.append(f".castg{{transform:translate(calc({left} * 1px),calc({top} * 1px)) scale(calc{k})}}")
    return "".join(out)


def night_grade(im):
    """A day picture graded to night: darker, bluer, with a moon where the sun was."""
    n = ImageEnhance.Brightness(im).enhance(0.42)
    n = ImageEnhance.Color(n).enhance(0.55)
    n = Image.blend(n, Image.new("RGB", n.size, (30, 44, 110)), 0.38)
    W, H = n.size
    moon = Image.new("L", n.size, 0)
    ImageDraw.Draw(moon).ellipse((int(W * .125), int(H * .5), int(W * .182), int(H * .6)), fill=255)
    n.paste((255, 238, 220), (0, 0), moon.filter(ImageFilter.GaussianBlur(W / 300)))
    return n


def smooth_bg(img, cls, gid, glows):
    """A picture as a smooth ground with no filter: a vertical gradient of its row colours and a few soft
    radial glows for what varies across it."""
    small = img.resize((32, 36), Image.BOX).filter(ImageFilter.GaussianBlur(1.5))
    px = small.load()
    stops = []
    for i in range(13):
        y = round(i * 35 / 12)
        r = sum(px[x, y][0] for x in range(8, 24)) // 16
        g = sum(px[x, y][1] for x in range(8, 24)) // 16
        b = sum(px[x, y][2] for x in range(8, 24)) // 16
        stops.append(f'<stop offset="{i / 12:.3f}" stop-color="#{r:02x}{g:02x}{b:02x}"/>')
    defs = f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">{"".join(stops)}</linearGradient>'
    glow_defs, glow_shapes = [], []
    for j, (cx, cy, rad, colour, op) in enumerate(glows):
        glow_defs.append(f'<radialGradient id="{gid}g{j}"><stop offset="0" stop-color="{colour}" stop-opacity="{op}"/>'
                         f'<stop offset="1" stop-color="{colour}" stop-opacity="0"/></radialGradient>')
        glow_shapes.append(f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="url(#{gid}g{j})"/>')
    return (f'<g class="{cls}"><defs>{defs}{"".join(glow_defs)}</defs>'
            f'<rect width="1600" height="900" fill="url(#{gid})"/>{"".join(glow_shapes)}</g>')


def sparkle(cx, cy, r, cls):
    k = r * 0.22
    d = (f"M{f(cx)} {f(cy-r)}C{f(cx+k)} {f(cy-k)} {f(cx+k)} {f(cy-k)} {f(cx+r)} {f(cy)}"
         f"C{f(cx+k)} {f(cy+k)} {f(cx+k)} {f(cy+k)} {f(cx)} {f(cy+r)}"
         f"C{f(cx-k)} {f(cy+k)} {f(cx-k)} {f(cy+k)} {f(cx-r)} {f(cy)}"
         f"C{f(cx-k)} {f(cy-k)} {f(cx-k)} {f(cy-k)} {f(cx)} {f(cy-r)}Z")
    return f'<path class="{cls}" d="{d}"/>'


def glints():
    out = []
    for i in range(14):
        y = 552 + i * 15 + random.uniform(-4, 4)
        w = max(10, 64 - i * 3.2 + random.uniform(-10, 10))
        x = 258 - w / 2 + random.uniform(-22, 22)
        out.append(f'<rect class="glint" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="2.6" rx="1.3" opacity="{random.uniform(.25, .85):.2f}"/>')
    return "".join(out)


def stars():
    out = []
    for _ in range(46):
        x, y = random.uniform(10, 1590), random.uniform(10, 470)
        if (x - 250) ** 2 + (y - 495) ** 2 < 110 ** 2:
            continue
        out.append(f'<circle class="tw" cx="{f(x)}" cy="{f(y)}" r="{random.choice([1.1, 1.4, 1.8, 2.2])}" opacity="{random.uniform(.3, 1):.2f}"/>')
    return "".join(out)


DEFS = '''<defs>
<radialGradient id="sunG"><stop offset="0" stop-color="#fff1d6" stop-opacity=".85"/><stop offset=".35" stop-color="#ffc79a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb08a" stop-opacity="0"/></radialGradient>
<radialGradient id="moonG"><stop offset="0" stop-color="#fff3e6" stop-opacity=".7"/><stop offset=".4" stop-color="#ffd8bd" stop-opacity=".18"/><stop offset="1" stop-color="#ffd8bd" stop-opacity="0"/></radialGradient>
<radialGradient id="shadowG"><stop offset="0" stop-color="#3a1f24" stop-opacity=".32"/><stop offset="1" stop-color="#3a1f24" stop-opacity="0"/></radialGradient>
<linearGradient id="petalG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb25e"/><stop offset="1" stop-color="#e8682a"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#2a1424" stop-opacity="0"/><stop offset="1" stop-color="#2a1424" stop-opacity=".22"/></radialGradient>
</defs>'''
