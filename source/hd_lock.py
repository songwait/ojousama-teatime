#!/usr/bin/env python3
"""Lock regions on full-resolution frames: a region (the head, the cup) is taken from frame 1, found again
in each later frame and pasted over it with a feathered edge, so it stays the same in every frame. Then
the frames are scaled to the display height and packed into a horizontal strip.

usage: hd_lock.py <dir> <name> <target_h> <rects>   rects = "x,y,w,h,ex,ey;..." (ex,ey: per-frame
offset guesses are searched around 0 and around the baked offsets passed as hints)
"""
import sys
from PIL import Image, ImageChops, ImageStat, ImageDraw, ImageFilter

d, name, target_h = sys.argv[1], sys.argv[2], int(sys.argv[3])
rects = [tuple(int(v) for v in r.split(",")[:4]) for r in sys.argv[4].split(";")]
hints = [[tuple(int(v) for v in h.split("/")) for h in r.split(",")[4:]] for r in sys.argv[4].split(";")]
frames = [Image.open(f"{d}/hd_{name}_{i}.png").convert("RGBA") for i in range(1, 5)]
W, H = frames[0].size


def cost(a, b):
    diff = ImageChops.difference(a, b)
    return sum(ImageStat.Stat(diff).mean)


def feather_mask(w, h, edge):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rectangle([edge, edge, w - 1 - edge, h - 1 - edge], fill=255)
    return m.filter(ImageFilter.GaussianBlur(edge / 2))


for (x, y, w, h), hint in zip(rects, hints):
    block = frames[0].crop((x, y, x + w, y + h))
    mask = feather_mask(w, h, 10)
    for k in range(1, 4):
        hx, hy = hint[k - 1] if hint else (0, 0)
        best = None
        for cx, cy in {(0, 0), (hx, hy)}:
            for dy in range(-10, 11, 2):
                for dx in range(-10, 11, 2):
                    ox, oy = cx + dx, cy + dy
                    if x + ox < 0 or y + oy < 0 or x + ox + w > W or y + oy + h > H:
                        continue
                    c = cost(block, frames[k].crop((x + ox, y + oy, x + ox + w, y + oy + h)))
                    if best is None or c < best[0]:
                        best = (c, ox, oy)
        c, ox, oy = best
        for dy in range(-1, 2):           # refine to the pixel
            for dx in range(-1, 2):
                if x + ox + dx < 0 or y + oy + dy < 0 or x + ox + dx + w > W or y + oy + dy + h > H:
                    continue
                c2 = cost(block, frames[k].crop((x + ox + dx, y + oy + dy, x + ox + dx + w, y + oy + dy + h)))
                if c2 < c:
                    c, best = c2, (c2, ox + dx, oy + dy)
        _, ox, oy = best
        region = frames[k].crop((x + ox, y + oy, x + ox + w, y + oy + h))
        frames[k].paste(Image.composite(block, region, mask), (x + ox, y + oy))
        print(f"  {name} rect {x},{y},{w},{h} frame {k+1} offset {ox},{oy} cost {c:.1f}")

scale = target_h / H
tw = round(W * scale)
strip = Image.new("RGBA", (tw * 4, target_h), (0, 0, 0, 0))
for i, f in enumerate(frames):
    strip.paste(f.resize((tw, target_h), Image.LANCZOS), (i * tw, 0))
strip.save(f"{d}/hd_{name}_strip.png")
print(f"strip {tw}x{target_h} x4 -> {d}/hd_{name}_strip.png")
