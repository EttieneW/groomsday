#!/usr/bin/env python3
"""Re-key leftover magenta, crop props, rebuild portraits, stabilize enemy frames."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace/public/game")
SPR = ROOT / "sprites"
PROPS = ROOT / "props"
PORTS = ROOT / "portraits"


def is_magenta(r: np.ndarray, g: np.ndarray, b: np.ndarray, a: np.ndarray) -> np.ndarray:
    mx = np.maximum(np.maximum(r, g), b).astype(np.float32)
    mn = np.minimum(np.minimum(r, g), b).astype(np.float32)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    # hue in [0, 360)
    r_f, g_f, b_f = r.astype(np.float32), g.astype(np.float32), b.astype(np.float32)
    d = np.maximum(mx - mn, 1e-6)
    hue = np.zeros_like(mx)
    mask_r = (mx == r_f) & (mx > mn)
    mask_g = (mx == g_f) & (mx > mn)
    mask_b = (mx == b_f) & (mx > mn)
    hue[mask_r] = ((g_f[mask_r] - b_f[mask_r]) / d[mask_r]) % 6
    hue[mask_g] = (b_f[mask_g] - r_f[mask_g]) / d[mask_g] + 2
    hue[mask_b] = (r_f[mask_b] - g_f[mask_b]) / d[mask_b] + 4
    hue = hue * 60
    mag_hue = ((hue >= 270) & (hue <= 340)) | ((hue >= 300) & (hue <= 360)) | (hue <= 10)
    mag = (sat > 0.22) & (mx > 40) & mag_hue
    # classic chroma: high R, low G, decent B
    classic = (r_f > 80) & (g_f < r_f * 0.58) & (b_f > g_f * 0.75) & ((r_f - g_f) > 28) & (b_f > 50)
    pink = (r_f > 140) & (g_f < 90) & (b_f > 50) & ((r_f - g_f) > 50)
    return (a > 0) & (mag | classic | pink)


def key_image(im: Image.Image, flood_edges: bool = False) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    kill = is_magenta(r, g, b, a)
    arr[..., 3] = np.where(kill, 0, a)
    # despill remaining fringe
    a2 = arr[..., 3]
    fringe = (a2 > 0) & (a2 < 255)
    if fringe.any():
        # pull green up slightly on leftover pink edges
        arr[..., 1] = np.where(fringe & (r > g + 20), np.minimum(255, g + 18), arr[..., 1])
    if flood_edges:
        arr = flood_transparent(arr)
    return Image.fromarray(arr, "RGBA")


def flood_transparent(arr: np.ndarray, tol: int = 28) -> np.ndarray:
    h, w = arr.shape[:2]
    seen = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))
    # seed only if pixel is already transparent or dark-magenta-ish
    seeds = []
    for y, x in stack:
        r, g, b, a = arr[y, x]
        if a < 40:
            seeds.append((y, x))
        elif r > 40 and abs(int(r) - int(b)) < 18 and g < r + 8 and (int(r) - int(g)) >= 0:
            seeds.append((y, x))
        elif r > 50 and g < 70 and b > 50 and (int(r) - int(g)) > 12:
            seeds.append((y, x))
    from collections import deque

    q = deque(seeds)
    for y, x in seeds:
        seen[y, x] = True
        arr[y, x, 3] = 0
    while q:
        y, x = q.popleft()
        r0, g0, b0, _ = arr[y, x] if False else (0, 0, 0, 0)
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or nx < 0 or ny >= h or nx >= w or seen[ny, nx]:
                continue
            r, g, b, a = arr[ny, nx]
            if a < 40:
                seen[ny, nx] = True
                arr[ny, nx, 3] = 0
                q.append((ny, nx))
                continue
            # similar to magenta / dark purple bg
            mag = (int(r) > 40 and int(g) < int(r) * 0.7 and int(b) > 35 and abs(int(r) - int(b)) < 40) or (
                int(r) > 50 and abs(int(r) - int(b)) < 16 and int(g) <= int(r) + 6 and (int(r) - int(g)) >= 8
            )
            if mag:
                seen[ny, nx] = True
                arr[ny, nx, 3] = 0
                q.append((ny, nx))
    return arr


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    arr = np.array(im)
    a = arr[..., 3]
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def portrait_from_idle(sheet: Path, out: Path) -> None:
    im = key_image(Image.open(sheet), flood_edges=False)
    cell = im.crop((0, 0, min(256, im.width), min(256, im.height)))
    cell = trim(cell, pad=6)
    # square-ish canvas, keep transparency
    w, h = cell.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cell, ((side - w) // 2, side - h), cell)
    canvas.save(out)
    print(f"portrait {out.name} {canvas.size}")


def crop_prop(path: Path, flood: bool = True) -> None:
    im = key_image(Image.open(path), flood_edges=flood)
    im = trim(im, pad=2)
    im.save(path)
    print(f"prop {path.name} {im.size}")


def split_cells(im: Image.Image, fw: int, fh: int) -> list[Image.Image]:
    w, h = im.size
    cols, rows = w // fw, h // fh
    out = []
    for r in range(rows):
        for c in range(cols):
            out.append(im.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)))
    return out


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    arr = np.array(im)
    ys, xs = np.where(arr[..., 3] > 16)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def restabilize_sheet(path: Path, fw: int = 256, fh: int = 256, feet: bool = True) -> None:
    raw = key_image(Image.open(path), flood_edges=False)
    # infer grid
    w, h = raw.size
    cols = max(1, round(w / fw))
    rows = max(1, round(h / fh))
    fw = w // cols
    fh = h // rows
    cells = split_cells(raw, fw, fh)
    boxes = [content_bbox(c) for c in cells]
    heights = []
    for b in boxes:
        if b:
            heights.append(b[3] - b[1])
    if not heights:
        raw.save(path)
        return
    target_h = int(np.median(heights))
    # don't let one giant frame (bat f0) dominate — clamp
    target_h = int(np.percentile(heights, 40))
    target_h = max(90, min(target_h, int(fh * 0.82)))
    out_cells = []
    for cell, b in zip(cells, boxes):
        canvas = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        if not b:
            out_cells.append(canvas)
            continue
        cropped = cell.crop(b)
        cw, ch = cropped.size
        scale = target_h / max(1, ch)
        nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
        # keep inside cell
        if nw > fw * 0.88:
            s2 = (fw * 0.88) / nw
            nw, nh = max(1, int(nw * s2)), max(1, int(nh * s2))
        resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
        x = (fw - nw) // 2
        y = (fh - nh - 8) if feet else (fh - nh) // 2
        y = max(4, min(y, fh - nh - 4))
        canvas.paste(resized, (x, y), resized)
        out_cells.append(canvas)
    sheet = Image.new("RGBA", (fw * cols, fh * rows), (0, 0, 0, 0))
    i = 0
    for r in range(rows):
        for c in range(cols):
            sheet.paste(out_cells[i], (c * fw, r * fh))
            i += 1
    sheet.save(path)
    print(f"sheet {path.name} {cols}x{rows} target_h={target_h}")


def main() -> None:
    # portraits from idle (already keyed)
    for hero in ("bear", "goldie", "lens", "stache"):
        portrait_from_idle(SPR / f"{hero}-idle.png", PORTS / f"{hero}.png")

    # props: key leftover magenta and crop to content
    for name, flood in (
        ("platform.png", True),
        ("checkpoint.png", True),
        ("spikes.png", True),
        ("flag.png", True),
        ("crate.png", True),
        ("coffin.png", True),
    ):
        p = PROPS / name
        if p.exists():
            crop_prop(p, flood=flood)

    # restabilize character + enemy sheets
    for name in (
        "skeleton.png",
        "skeleton-shoot.png",
        "ghost.png",
        "ghost-shoot.png",
        "bat.png",
        "coin.png",
        "explode.png",
        "bullet.png",
        "enemy-shot.png",
        "muzzle.png",
    ):
        p = SPR / name
        if p.exists():
            restabilize_sheet(p, feet=name not in ("bat.png", "ghost.png", "ghost-shoot.png", "coin.png", "explode.png", "bullet.png", "enemy-shot.png", "muzzle.png"))

    for hero in ("bear", "goldie", "lens", "stache"):
        for action in ("idle", "run", "jump"):
            p = SPR / f"{hero}-{action}.png"
            if p.exists():
                restabilize_sheet(p, feet=True)

    print("done")


if __name__ == "__main__":
    main()
