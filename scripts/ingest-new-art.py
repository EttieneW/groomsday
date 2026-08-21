#!/usr/bin/env python3
"""Ingest newly generated art: chroma-key JPEG magenta, pack 2x2 sheets, crop props."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ART = Path("/workspace/artifacts/imagine_images")
SPR = Path("/workspace/public/game/sprites")
PROPS = Path("/workspace/public/game/props")
PORTS = Path("/workspace/public/game/portraits")


def magenta_mask(arr: np.ndarray, loose: bool = True) -> np.ndarray:
    r = arr[..., 0].astype(np.float32)
    g = arr[..., 1].astype(np.float32)
    b = arr[..., 2].astype(np.float32)
    a = arr[..., 3].astype(np.float32) if arr.shape[2] == 4 else np.full(r.shape, 255.0)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 1, (mx - mn) / mx, 0)
    d = np.maximum(mx - mn, 1e-6)
    hue = np.zeros_like(mx)
    mask_r = mx == r
    mask_g = (mx == g) & ~mask_r
    mask_b = ~mask_r & ~mask_g
    hue[mask_r] = ((g[mask_r] - b[mask_r]) / d[mask_r]) % 6
    hue[mask_g] = (b[mask_g] - r[mask_g]) / d[mask_g] + 2
    hue[mask_b] = (r[mask_b] - g[mask_b]) / d[mask_b] + 4
    hue *= 60
    mag_hue = (hue >= 265) | (hue <= 18)
    mag = (sat > 0.18) & (mx > 35) & mag_hue
    classic = (r > 70) & (g < r * 0.62) & (b > 45) & ((r - g) > 22) & (b > g * 0.7)
    # JPEG fringe: bright pink
    pink = (r > 160) & (g < 120) & (b > 80) & ((r - g) > 40)
    kill = mag | classic | pink
    if loose:
        # near-magenta with mid sat (jpeg ringing)
        kill = kill | ((sat > 0.12) & (mx > 60) & mag_hue & ((r - g) > 12))
    return kill & (a > 0)


def key(im: Image.Image, loose: bool = True) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    kill = magenta_mask(arr, loose=loose)
    arr[..., 3] = np.where(kill, 0, arr[..., 3])
    # harden: any remaining almost-magenta with low green
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    extra = (a > 0) & (r > 90) & (g < 80) & (b > 70) & ((r.astype(int) - g.astype(int)) > 30)
    arr[..., 3] = np.where(extra, 0, arr[..., 3])
    return Image.fromarray(arr, "RGBA")


def trim(im: Image.Image, pad: int = 2) -> Image.Image:
    arr = np.array(im)
    ys, xs = np.where(arr[..., 3] > 18)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, int(xs.min()) - pad), min(im.width, int(xs.max()) + 1 + pad)
    y0, y1 = max(0, int(ys.min()) - pad), min(im.height, int(ys.max()) + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def pack_sheet(src: Path, dest: Path, feet: bool = True, cell: int = 256) -> None:
    im = key(Image.open(src), loose=True)
    w, h = im.size
    cols, rows = 2, 2
    cw, ch = w // cols, h // rows
    cells = []
    boxes = []
    for r in range(rows):
        for c in range(cols):
            part = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            cells.append(part)
            arr = np.array(part)
            ys, xs = np.where(arr[..., 3] > 18)
            if len(xs) == 0:
                boxes.append(None)
            else:
                boxes.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    heights = [b[3] - b[1] for b in boxes if b]
    target = int(np.percentile(heights, 45)) if heights else int(cell * 0.72)
    target = max(88, min(target, int(cell * 0.84)))
    out = Image.new("RGBA", (cell * cols, cell * rows), (0, 0, 0, 0))
    i = 0
    for r in range(rows):
        for c in range(cols):
            canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
            b = boxes[i]
            if b:
                cropped = cells[i].crop(b)
                cw2, ch2 = cropped.size
                scale = target / max(1, ch2)
                nw, nh = max(1, int(cw2 * scale)), max(1, int(ch2 * scale))
                if nw > cell * 0.9:
                    s2 = (cell * 0.9) / nw
                    nw, nh = max(1, int(nw * s2)), max(1, int(nh * s2))
                resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
                x = (cell - nw) // 2
                y = (cell - nh - 6) if feet else (cell - nh) // 2
                y = max(4, min(y, cell - nh - 4))
                canvas.paste(resized, (x, y), resized)
            out.paste(canvas, (c * cell, r * cell))
            i += 1
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest)
    print(f"sheet {dest.name} {out.size} target={target}")


def crop_prop(src: Path, dest: Path) -> None:
    im = trim(key(Image.open(src), loose=True), pad=1)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)
    print(f"prop {dest.name} {im.size}")


def portrait_from_idle(sheet: Path, out: Path) -> None:
    im = Image.open(sheet).convert("RGBA")
    cell = im.crop((0, 0, min(256, im.width), min(256, im.height)))
    cell = trim(cell, pad=8)
    w, h = cell.size
    side = max(w, int(h * 0.72), 1)
    canvas = Image.new("RGBA", (side, h), (0, 0, 0, 0))
    canvas.paste(cell, ((side - w) // 2, 0), cell)
    canvas.save(out)
    print(f"portrait {out.name} {canvas.size} alpha_min={np.array(canvas)[...,3].min()}")


def restab_existing(path: Path, feet: bool = True) -> None:
    im = key(Image.open(path), loose=False)
    w, h = im.size
    # already 512 or 768
    if w >= 700:
        cols, rows = 3, 2
    else:
        cols, rows = 2, 2
    cw, ch = w // cols, h // rows
    cells, boxes = [], []
    for r in range(rows):
        for c in range(cols):
            part = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            cells.append(part)
            arr = np.array(part)
            ys, xs = np.where(arr[..., 3] > 16)
            boxes.append(None if len(xs) == 0 else (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    heights = [b[3] - b[1] for b in boxes if b]
    if not heights:
        im.save(path)
        return
    target = int(np.percentile(heights, 40))
    target = max(90, min(target, int(ch * 0.82)))
    cell = 256
    out = Image.new("RGBA", (cell * cols, cell * rows), (0, 0, 0, 0))
    i = 0
    for r in range(rows):
        for c in range(cols):
            canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
            b = boxes[i]
            if b:
                cropped = cells[i].crop(b)
                cw2, ch2 = cropped.size
                scale = target / max(1, ch2)
                nw, nh = max(1, int(cw2 * scale)), max(1, int(ch2 * scale))
                if nw > cell * 0.9:
                    s2 = (cell * 0.9) / nw
                    nw, nh = max(1, int(nw * s2)), max(1, int(nh * s2))
                resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
                x = (cell - nw) // 2
                y = (cell - nh - 6) if feet else (cell - nh) // 2
                y = max(4, min(y, cell - nh - 4))
                canvas.paste(resized, (x, y), resized)
            out.paste(canvas, (c * cell, r * cell))
            i += 1
    out.save(path)
    print(f"restab {path.name} {out.size} target={target}")


def main() -> None:
    pack_sheet(ART / "bb9636c7-c2fe-4507-bd7f-9447c89b7e52.jpg", SPR / "bear-crouch.png", feet=True)
    pack_sheet(ART / "5dd477f8-1dce-4b3a-a761-9120cf630147.jpg", SPR / "goldie-crouch.png", feet=True)
    pack_sheet(ART / "bb840cb9-2345-4cd7-a220-8c01f46ed05d.jpg", SPR / "lens-crouch.png", feet=True)
    pack_sheet(ART / "9b543771-b89e-4e2f-99fe-56e35bd40379.jpg", SPR / "stache-crouch.png", feet=True)
    pack_sheet(ART / "5ab51f42-4f4a-4f4f-a89b-21f809e9a622.jpg", SPR / "bat.png", feet=False)
    pack_sheet(ART / "ea0e585d-eb8c-4ca8-8ca1-5681b00621f6.jpg", SPR / "skeleton.png", feet=True)
    crop_prop(ART / "13a10114-406e-4f30-bd4c-f7e8969bf2ff.jpg", PROPS / "platform.png")
    crop_prop(ART / "3f62179c-83e4-46ad-9b1f-c3408e283502.jpg", PROPS / "ground.png")

    for hero in ("bear", "goldie", "lens", "stache"):
        portrait_from_idle(SPR / f"{hero}-idle.png", PORTS / f"{hero}.png")

    # leftover magenta on old props
    for name in ("checkpoint.png", "spikes.png", "flag.png", "crate.png", "coffin.png"):
        p = PROPS / name
        if p.exists():
            im = trim(key(Image.open(p), loose=True), pad=1)
            im.save(p)
            print(f"rekey {name} {im.size}")

    for name, feet in (
        ("skeleton-shoot.png", True),
        ("ghost.png", False),
        ("ghost-shoot.png", False),
        ("coin.png", False),
        ("explode.png", False),
        ("enemy-shot.png", False),
        ("muzzle.png", False),
        ("bullet.png", False),
    ):
        p = SPR / name
        if p.exists():
            restab_existing(p, feet=feet)

    print("ingest done")


if __name__ == "__main__":
    main()
