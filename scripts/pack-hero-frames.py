#!/usr/bin/env python3
"""Pack single-character magenta frames into Phaser 256px sheets. Key magenta only — never dark faces.

After packing, open http://localhost:8080/sprites and run `npm run test:sprites`.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

CELL = 256
IMG = Path(r"C:\Users\User\.grok\sessions\C%3A%5Cprojects%5Cgroomsday\01a0241a-b2b3-7931-a1eb-66e431293e4d\images")
SPR = Path(r"C:\projects\groomsday\public\game\sprites")
POR = Path(r"C:\projects\groomsday\public\game\portraits")


def key_magenta(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    r = arr[..., 0].astype(np.float32)
    g = arr[..., 1].astype(np.float32)
    b = arr[..., 2].astype(np.float32)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1), 0)
    d = np.maximum(mx - mn, 1e-6)
    hue = np.zeros_like(mx)
    mask_r = mx == r
    mask_g = (mx == g) & ~mask_r
    hue[mask_r] = ((g[mask_r] - b[mask_r]) / d[mask_r]) % 6
    hue[mask_g] = (b[mask_g] - r[mask_g]) / d[mask_g] + 2
    hue[~mask_r & ~mask_g] = (r[~mask_r & ~mask_g] - g[~mask_r & ~mask_g]) / d[~mask_r & ~mask_g] + 4
    hue *= 60
    mag_hue = (hue >= 270) | (hue <= 20)
    # Only punch loud magenta, never dark suit / hair / face
    mag = (sat > 0.35) & (mx > 140) & mag_hue & (g < 90)
    arr[..., 3] = np.where(mag, 0, arr[..., 3])
    return Image.fromarray(arr, "RGBA")


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    arr = np.array(im)
    ys, xs = np.where(arr[..., 3] > 16)
    if len(xs) == 0:
        return im
    box = (
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(im.width, int(xs.max()) + 1 + pad),
        min(im.height, int(ys.max()) + 1 + pad),
    )
    return im.crop(box)


def to_cell(im: Image.Image, feet_y: int = 246, dy: int = 0) -> Image.Image:
    im = key_magenta(im)
    im = trim(im)
    max_h = 228
    max_w = 230
    scale = min(max_w / im.width, max_h / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    x = (CELL - nw) // 2
    y = feet_y - nh + dy
    y = max(4, min(y, CELL - nh - 2))
    cell.paste(im, (x, y), im)
    return cell


def sheet(cells: list[Image.Image], cols: int, rows: int) -> Image.Image:
    out = Image.new("RGBA", (CELL * cols, CELL * rows), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        r, col = divmod(i, cols)
        out.paste(c, (col * CELL, r * CELL), c)
    return out


def load(n: int) -> Image.Image:
    return Image.open(IMG / f"{n}.jpg")


def pack_hero(name: str, idle: int, run_r: int, run_pass: int, run_l: int, jump: int, crouch: int) -> None:
    idle_c = to_cell(load(idle), dy=0)
    idle_b = to_cell(load(idle), dy=-3)
    r = to_cell(load(run_r))
    p = to_cell(load(run_pass))
    l = to_cell(load(run_l))
    j = to_cell(load(jump), feet_y=238)
    c = to_cell(load(crouch), feet_y=248)

    sheet([idle_c, idle_b, idle_c, idle_b], 2, 2).save(SPR / f"{name}-idle.png")
    sheet([r, p, l, r, p, l], 3, 2).save(SPR / f"{name}-run.png")
    sheet([j, j, j, j], 2, 2).save(SPR / f"{name}-jump.png")
    sheet([c, c, c, c], 2, 2).save(SPR / f"{name}-crouch.png")
    # portrait: idle on transparent, a bit larger crop
    idle_c.resize((256, 256), Image.Resampling.LANCZOS).save(POR / f"{name}.png")
    print("packed", name)


def main() -> None:
    pack_hero("stache", idle=18, run_r=22, run_pass=40, run_l=28, jump=32, crouch=30)
    pack_hero("goldie", idle=20, run_r=23, run_pass=42, run_l=25, jump=29, crouch=31)
    pack_hero("lens", idle=19, run_r=21, run_pass=37, run_l=26, jump=34, crouch=33)
    pack_hero("bear", idle=15, run_r=24, run_pass=39, run_l=27, jump=35, crouch=36)

    a = to_cell(load(13))
    b = to_cell(load(38))
    s = to_cell(load(41))
    sheet([a, b, a, b], 2, 2).save(SPR / "skeleton.png")
    sheet([s, s, s, s], 2, 2).save(SPR / "skeleton-shoot.png")
    print("packed skeleton")


if __name__ == "__main__":
    main()
