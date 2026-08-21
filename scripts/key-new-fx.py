#!/usr/bin/env python3
"""Chroma-key magenta JPEG sources into PNGs for Phaser."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPR = ROOT / "public" / "game" / "sprites"


def magenta_mask(arr: np.ndarray) -> np.ndarray:
    r = arr[..., 0].astype(np.float32)
    g = arr[..., 1].astype(np.float32)
    b = arr[..., 2].astype(np.float32)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 1, (mx - mn) / mx, 0)
    d = np.maximum(mx - mn, 1e-6)
    hue = np.zeros_like(mx)
    mask_r = mx == r
    mask_g = (mx == g) & ~mask_r
    hue[mask_r] = ((g[mask_r] - b[mask_r]) / d[mask_r]) % 6
    hue[mask_g] = (b[mask_g] - r[mask_g]) / d[mask_g] + 2
    hue[~mask_r & ~mask_g] = (r[~mask_r & ~mask_g] - g[~mask_r & ~mask_g]) / d[~mask_r & ~mask_g] + 4
    hue *= 60
    mag_hue = (hue >= 260) | (hue <= 20)
    mag = (sat > 0.16) & (mx > 40) & mag_hue
    classic = (r > 70) & (g < r * 0.62) & (b > 45) & ((r - g) > 22) & (b > g * 0.7)
    pink = (r > 150) & (g < 130) & (b > 80) & ((r - g) > 35)
    return mag | classic | pink


def flood_from_edges(arr: np.ndarray) -> np.ndarray:
    """Keep interior magenta (hearse windows) — only punch bg connected to edges."""
    h, w = arr.shape[:2]
    kill = magenta_mask(arr)
    from collections import deque

    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))
    out = np.zeros((h, w), dtype=bool)
    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w or seen[y, x]:
            continue
        seen[y, x] = True
        if not kill[y, x]:
            continue
        out[y, x] = True
        q.append((y - 1, x))
        q.append((y + 1, x))
        q.append((y, x - 1))
        q.append((y, x + 1))
    return out


def key(path: Path, flood: bool = False) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    kill = flood_from_edges(arr) if flood else magenta_mask(arr)
    arr[..., 3] = np.where(kill, 0, arr[..., 3])
    return Image.fromarray(arr, "RGBA")


def pack_2x2(im: Image.Image, cell: int = 256) -> Image.Image:
    w, h = im.size
    cw, ch = w // 2, h // 2
    out = Image.new("RGBA", (cell * 2, cell * 2), (0, 0, 0, 0))
    for r in range(2):
        for c in range(2):
            part = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            part = part.resize((cell, cell), Image.Resampling.LANCZOS)
            out.paste(part, (c * cell, r * cell), part)
    return out


def center_cell(im: Image.Image, cell: int = 256) -> Image.Image:
    im = im.copy()
    # trim transparent
    arr = np.array(im)
    ys, xs = np.where(arr[..., 3] > 18)
    if len(xs) == 0:
        return Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    cropped = im.crop(box)
    cropped.thumbnail((cell - 16, cell - 16), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    x = (cell - cropped.width) // 2
    y = (cell - cropped.height) // 2
    out.paste(cropped, (x, y), cropped)
    return out


def main() -> None:
    laser = key(SPR / "laser-src.jpg")
    pack_2x2(laser).save(SPR / "laser.png")
    print("laser.png")

    grenade = key(SPR / "grenade-src.jpg")
    pack_2x2(grenade).save(SPR / "grenade.png")
    print("grenade.png")

    rocket = key(SPR / "rocket-src.jpg")
    # 4 identical frames so Phaser spritesheet play works
    cell = center_cell(rocket, 256)
    sheet = Image.new("RGBA", (256 * 2, 256 * 2), (0, 0, 0, 0))
    for r in range(2):
        for c in range(2):
            sheet.paste(cell, (c * 256, r * 256), cell)
    sheet.save(SPR / "rocket.png")
    print("rocket.png")

    slash = key(SPR / "slash-src.jpg")
    cell = center_cell(slash, 256)
    sheet = Image.new("RGBA", (256 * 2, 256 * 2), (0, 0, 0, 0))
    for i, (r, c) in enumerate(((0, 0), (0, 1), (1, 0), (1, 1))):
        sheet.paste(cell, (c * 256, r * 256), cell)
    sheet.save(SPR / "slash.png")
    print("slash.png")

    lych = key(SPR / "lychwing-src.jpg", flood=True)
    lych.save(SPR / "lychwing.png")
    print("lychwing.png", lych.size)

    hearse = key(SPR / "hearse-src.jpg", flood=True)
    hearse.save(SPR / "hearse.png")
    print("hearse.png", hearse.size)


if __name__ == "__main__":
    main()
