# source

How the pictures in `hooks/` were made, and how to make them again. The desktop app shows neither
embedded images in an SVG nor image backdrops, so every picture the mod draws is vector: the
characters are fine-pixel frames turned into one stroke path per colour.

## What is here

| Path | What it is |
| --- | --- |
| `prompts/` | The image-model prompts: the dusk and night illustrations (also used as the character reference), the two frame sheets, the empty promenade |
| `sheets/` | The generated pictures used: `ojou_sheet1.png` (大小姐, four idle frames), `feiyu_sheet1.png` (大肥鱼, four hop frames), `empty1.png` (the promenade with no one on it, the backdrop's colours) |
| `aseprite/` | Aseprite files: `*.src.aseprite` the frames split and aligned from the sheets, `*.aseprite` the fine-pixel versions (150 and 94 rows) with the head locked across frames, and their palettes |
| `pixel/` | Those fine-pixel frames exported as PNG |
| `frames/` | Full-resolution frames with the head locked: `hd_ojou_strip.png` (four frames), `ojou.png` and `feiyu3.png` (smaller strips, for the avatars) |
| `hd_lock.py` | Locks the head and props across full-resolution frames (exported from the `*.src.aseprite` files as `hd_<name>_<n>.png`) and packs a strip |
| `pixel_svg.py`, `parts.py` | Shared pieces: pixels to SVG paths, the backdrop's placement CSS, drawing helpers |
| `gen_backdrop.py` | Writes `hooks/backdrop.js`: the still backdrop (大小姐 at 200 rows, 大肥鱼 at 94) |
| `gen_stage.py` | Writes `hooks/stage.js`: the side pane's portrait stage, animated with SMIL |
| `gen_mini.py` | Writes `hooks/mini.js`: the two avatars |

## Regenerating

Python 3 with Pillow:

```bash
cd source
python3 gen_backdrop.py ../hooks/backdrop.js
python3 gen_stage.py ../hooks/stage.js
python3 gen_mini.py . ../hooks/mini.js
```

Each SVG must stay under 131,072 characters (the app's limit for one `Svg`); the scripts print the size.

## What the desktop app did (2026-11-14)

- The backdrop is drawn as a still picture: CSS and SMIL animation do not run in it, with or without
  `isInteractive`, frosted or not. Redrawing it from a timer moves it but blinks on every redraw.
- Embedded `data:` images in the SVG are dropped, in the backdrop and in panes; image backdrops
  (JPEG, PNG, animated PNG) and a Markdown picture did not show.
- Of several SVGs stacked in the backdrop only the first is drawn.
- In a side pane, a framed (`isInteractive`) SVG does run SMIL animation: that is the stage.
