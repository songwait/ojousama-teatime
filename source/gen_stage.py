#!/usr/bin/env python3
"""The stage for the side pane: a portrait seaside at dusk (night in dark mode) with the two of them,
animated with SMIL, which runs in a framed SVG in a pane (it does not run in the backdrop).

usage: gen_stage.py <out.js> [<preview dir>]
"""
import json
import random
import sys

import parts as G

W, H = 360, 540
TOP = -900                     # the sky runs up to here, so a tall pane shows more sky (the mod sets the viewBox)
FEET = 505
OJ_H, OJ_X = 300, 132          # 大小姐's drawn height and left edge
FY_H, FY_X = 180, 12           # 大肥鱼's
LOOP = 'repeatCount="indefinite"'


def discrete(attr, values, key_times, dur, tag="animate", extra=""):
    return (f'<{tag} attributeName="{attr}" {extra}values="{values}" keyTimes="{key_times}" dur="{dur}" '
            f'calcMode="discrete" {LOOP}/>')


def twinkle(low=".25"):
    return (f'<animate attributeName="opacity" values="{low};1;{low}" dur="{random.uniform(2.5, 5.5):.1f}s" '
            f'begin="{-random.uniform(0, 5):.1f}s" {LOOP}/>')


def sparkle(x, y, r, cls):
    k = r * 0.22
    d = (f"M{x} {y-r}C{x+k:.1f} {y-k:.1f} {x+k:.1f} {y-k:.1f} {x+r} {y}C{x+k:.1f} {y+k:.1f} {x+k:.1f} {y+k:.1f} {x} {y+r}"
         f"C{x-k:.1f} {y+k:.1f} {x-k:.1f} {y+k:.1f} {x-r} {y}C{x-k:.1f} {y-k:.1f} {x-k:.1f} {y-k:.1f} {x} {y-r}Z")
    return f'<path class="{cls}" d="{d}">{twinkle()}</path>'


def petals():
    out = []
    for _ in range(14):
        x, y = random.uniform(120, 520), random.uniform(TOP, 120)
        dur = random.uniform(14, 22)
        begin = -random.uniform(0, dur)
        s = random.uniform(.55, .95)
        out.append(
            f'<g><animateTransform attributeName="transform" type="translate" from="0 0" to="-560 1500" dur="{dur:.1f}s" begin="{begin:.1f}s" {LOOP}/>'
            f'<animate attributeName="opacity" values="0;.95;.95;0" keyTimes="0;.06;.85;1" dur="{dur:.1f}s" begin="{begin:.1f}s" {LOOP}/>'
            f'<g transform="translate({x:.0f} {y:.0f}) scale({s:.2f})"><path d="M0 -9C5 -4 5 4 0 9C-5 4 -5 -4 0 -9Z" fill="url(#petalG)">'
            f'<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="{random.uniform(3, 6):.1f}s" {LOOP}/>'
            '</path></g></g>')
    return "".join(out)


def bubble(tip_x, tip_y, w, text, begin):
    h = 34
    x0, top = tip_x - w / 2, tip_y - 10 - h
    d = (f"M{x0 + 12} {top}h{w - 24}a12 12 0 0 1 12 12v10a12 12 0 0 1 -12 12H{tip_x + 6}L{tip_x} {tip_y}"
         f"L{tip_x - 6} {top + h}H{x0 + 12}a12 12 0 0 1 -12 -12v-10a12 12 0 0 1 12 -12Z")
    return (f'<g opacity="0"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.03;0.24;0.28;1" '
            f'dur="16s" begin="{begin}s" {LOOP}/><path class="bub" d="{d}"/>'
            f'<text x="{tip_x}" y="{top + 23}" text-anchor="middle" class="say">{text}</text></g>')


DEFS = '''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e7cc6"/><stop offset=".5" stop-color="#b897cf"/><stop offset=".8" stop-color="#e8a3bd"/><stop offset="1" stop-color="#f7a98a"/></linearGradient>
<linearGradient id="skyN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0e22"/><stop offset=".6" stop-color="#151831"/><stop offset=".85" stop-color="#2a2850"/><stop offset="1" stop-color="#3b3360"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d59bb4"/><stop offset="1" stop-color="#8d77a8"/></linearGradient>
<linearGradient id="seaN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a86"/><stop offset="1" stop-color="#121a48"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98692"/><stop offset="1" stop-color="#7a5864"/></linearGradient>
<linearGradient id="floorN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3656"/><stop offset="1" stop-color="#1b1a2e"/></linearGradient>
<radialGradient id="sunG"><stop offset="0" stop-color="#fff1d6" stop-opacity=".9"/><stop offset=".35" stop-color="#ffc79a" stop-opacity=".4"/><stop offset="1" stop-color="#ffb08a" stop-opacity="0"/></radialGradient>
<radialGradient id="moonG"><stop offset="0" stop-color="#fff3e6" stop-opacity=".75"/><stop offset=".4" stop-color="#ffd8bd" stop-opacity=".2"/><stop offset="1" stop-color="#ffd8bd" stop-opacity="0"/></radialGradient>
<radialGradient id="cloud"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="shadowG"><stop offset="0" stop-color="#3a1f24" stop-opacity=".35"/><stop offset="1" stop-color="#3a1f24" stop-opacity="0"/></radialGradient>
<linearGradient id="petalG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb25e"/><stop offset="1" stop-color="#e8682a"/></linearGradient>
</defs>'''

STYLE = '''<style>
.night{display:none}
.glint{fill:#fff4dc}.sp{fill:#ffe1a0}.tw{fill:#fff6ea}.seam{stroke:#6f4e58;stroke-opacity:.35}
.bub{fill:#fffaf4;stroke:#a55a36;stroke-width:1.6;stroke-linejoin:round}
.say{font:700 15px "PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif;fill:#a55a36}
@media (prefers-color-scheme:dark){.day{display:none}.night{display:inline}.bub{fill:#2a2a44;stroke:#ffb08a}.say{fill:#ffc2a0}.glint{fill:#e8eeff}.seam{stroke:#8a86b0}}
</style>'''


def build():
    random.seed(5)
    oj_shared, oj_layers, oj_size = G.frames([f"{G.SRC}/pixel/ojou_{i}.png" for i in (1, 2, 3, 4)], snap=130)
    fy_shared, (fy_s, fy_q), fy_size = G.frames([f"{G.SRC}/pixel/feiyu_{i}.png" for i in (1, 2)])

    kt = "0;0.25;0.5;0.75"
    pattern = ["1;0;0;0", "0;1;0;0", "0;0;1;0", "0;0;0;1"]
    oj = "".join(f'<g opacity="{1 if i == 0 else 0}">{discrete("opacity", pattern[i], kt, "1.6s")}{layer}</g>'
                 for i, layer in enumerate(oj_layers))
    hkt = "0;0.047;0.094;0.141;0.188;0.235"
    hop = discrete("transform", "0 0;0 -16;0 0;0 -16;0 0;0 0", hkt, "3.2s", tag="animateTransform", extra='type="translate" ')
    stand = '<g opacity="1">' + discrete("opacity", "0;1;0;1;0;1", hkt, "3.2s") + fy_s + '</g>'
    squash = '<g opacity="0">' + discrete("opacity", "1;0;1;0;1;0", hkt, "3.2s") + fy_q + '</g>'

    oj_w = oj_size[0] * OJ_H / oj_size[1]
    fy_w = fy_size[0] * FY_H / fy_size[1]
    seams = "".join(f'<path class="seam" d="M{x0} 392L{x1} {H}" stroke-width="1"/>'
                    for x0, x1 in [(40, -60), (110, 60), (180, 180), (250, 300), (320, 420)])
    seams += "".join(f'<path class="seam" d="M0 {y}H{W}" stroke-width="1"/>' for y in (420, 458, 505))
    glints = "".join(f'<rect class="glint" x="{random.uniform(60, 110) - w / 2:.0f}" y="{y}" width="{w:.0f}" height="1.6" rx=".8">{twinkle(".15")}</rect>'
                     for y, w in [(328, 30), (336, 24), (344, 20), (352, 16), (360, 12), (368, 9)])
    stars = "".join(f'<circle class="tw" cx="{random.uniform(8, W - 8):.0f}" cy="{random.uniform(TOP + 10, 250):.0f}" r="{random.choice([.8, 1, 1.3])}">{twinkle(".2")}</circle>'
                    for _ in range(60))
    sparkles = "".join(sparkle(x, y, r, "sp day") for x, y, r in [(250, 60, 6), (60, 150, 5), (320, 210, 4), (170, 110, 4), (300, -120, 5),
                                                                   (70, -260, 6), (220, -430, 4), (110, -620, 5), (310, -800, 4)])

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax meet" style="overflow:hidden">',
        DEFS.replace("</defs>", f'<clipPath id="frame"><rect y="{TOP}" width="{W}" height="{H - TOP}"/></clipPath></defs>'), STYLE,
        '<g clip-path="url(#frame)">',
        # sky, sun or moon, clouds, stars
        f'<rect class="day" y="{TOP}" width="{W}" height="{330 - TOP}" fill="url(#sky)"/><rect class="night" y="{TOP}" width="{W}" height="{330 - TOP}" fill="url(#skyN)"/>',
        '<circle class="day" cx="78" cy="318" r="120" fill="url(#sunG)"/><circle class="day" cx="78" cy="320" r="26" fill="#ffe7cf"/>',
        '<circle class="night" cx="78" cy="300" r="100" fill="url(#moonG)"/><circle class="night" cx="78" cy="300" r="18" fill="#fff0e0"/>',
        '<g class="day"><ellipse cx="250" cy="120" rx="110" ry="22" fill="url(#cloud)"/><ellipse cx="90" cy="200" rx="90" ry="16" fill="url(#cloud)"/>'
        '<ellipse cx="300" cy="250" rx="70" ry="12" fill="url(#cloud)"/>'
        '<ellipse cx="120" cy="-60" rx="120" ry="20" fill="url(#cloud)"/><ellipse cx="290" cy="-210" rx="100" ry="18" fill="url(#cloud)"/>'
        '<ellipse cx="80" cy="-380" rx="110" ry="18" fill="url(#cloud)"/><ellipse cx="260" cy="-560" rx="130" ry="22" fill="url(#cloud)"/>'
        '<ellipse cx="140" cy="-760" rx="100" ry="16" fill="url(#cloud)"/></g>',
        f'<g class="night">{stars}</g>',
        # sea, wall, promenade
        f'<rect class="day" y="320" width="{W}" height="60" fill="url(#sea)"/><rect class="night" y="320" width="{W}" height="60" fill="url(#seaN)"/>',
        f'<rect y="319" width="{W}" height="2" fill="#fff" opacity=".35"/>',
        glints,
        f'<rect class="day" y="378" width="{W}" height="{H - 378}" fill="url(#floor)"/><rect class="night" y="378" width="{W}" height="{H - 378}" fill="url(#floorN)"/>',
        f'<rect y="376" width="{W}" height="16" fill="#000" opacity=".12"/>',
        seams, sparkles,
        # the two of them
        f'<ellipse cx="{OJ_X + oj_w / 2:.0f}" cy="{FEET - 4}" rx="70" ry="10" fill="url(#shadowG)"/>',
        f'<ellipse cx="{FY_X + fy_w / 2 + 4:.0f}" cy="{FEET - 4}" rx="48" ry="8" fill="url(#shadowG)"/>',
        G.pixel_group(OJ_X, FEET - OJ_H, OJ_H, oj_size, oj_shared + oj),
        '<g>' + hop + G.pixel_group(FY_X, FEET - FY_H, FY_H, fy_size, fy_shared + stand + squash) + '</g>',
        petals(),
        bubble(FY_X + fy_w / 2 + 8, FEET - FY_H - 2, 150, "大小姐，吃饭啦！", 3),
        bubble(OJ_X + oj_w / 2 + 6, FEET - OJ_H + 8, 112, "……就一口。", 11),
        '</g>',
        '</svg>',
    ]
    return "".join(parts)


def main():
    svg = build()
    print(len(svg), "chars (limit 131072)", "OVER" if len(svg) > 131072 else "")
    open(sys.argv[1], "w").write(
        "// Generated by source/gen_stage.py: the side pane's stage, animated with SMIL.\n"
        f"export const STAGE = {json.dumps(svg, ensure_ascii=False)}\n")
    open(sys.argv[1].replace(".js", ".d.ts"), "w").write("/** The side pane's stage, an SVG document. */\nexport declare const STAGE: string\n")
    if len(sys.argv) > 2:
        open(f"{sys.argv[2]}/stage.svg", "w").write(svg)


if __name__ == "__main__":
    main()
