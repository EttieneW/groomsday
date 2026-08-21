#!/usr/bin/env python3
"""Validate sprite sheets: size, empty cells, magenta leftover, missing faces.

Discovers hero sheets from public/game/sprites/{id}-{idle,run,jump,crouch}.png
and known enemy sheets. Add a new groomsman by dropping files with those names.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPR = ROOT / "public" / "game" / "sprites"
CELL = 256

HERO_SHEETS = {
    "idle": (2, 2, 4, True),
    "run": (3, 2, 6, True),
    "jump": (2, 2, 4, True),
    "crouch": (2, 2, 4, True),
}
ENEMIES = {
    "skeleton": [( "skeleton.png", 2, 2, 4, False), ("skeleton-shoot.png", 2, 2, 4, False)],
    "ghost": [("ghost.png", 2, 2, 4, False), ("ghost-shoot.png", 2, 2, 4, False)],
    "bat": [("bat.png", 2, 2, 4, False)],
}


def heroes() -> list[str]:
    found = []
    for p in sorted(SPR.glob("*-idle.png")):
        hid = p.name[: -len("-idle.png")]
        if hid in ("skeleton", "ghost", "bat"):
            continue
        found.append(hid)
    return found


def inspect_cell(arr: np.ndarray, face: bool) -> dict:
    a = arr[..., 3]
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    opaque = a >= 24
    n = int(opaque.sum())
    mag = opaque & (r > 170) & (g < 90) & (b > 150)
    nm = int(mag.sum())
    empty = n < 120
    magenta_leak = nm > max(40, n * 0.02)
    missing_face = False
    if face and not empty:
        ys, xs = np.where(opaque)
        y0, y1 = int(ys.min()), int(ys.max())
        face_cut = y0 + max(1, int((y1 - y0) * 0.32))
        face_mask = opaque.copy()
        face_mask[face_cut:, :] = False
        missing_face = int(face_mask.sum()) < n * 0.08
    return {
        "opaque": n,
        "magenta": nm,
        "empty": empty,
        "magentaLeak": magenta_leak,
        "missingFace": missing_face,
        "ok": not (empty or magenta_leak or missing_face),
    }


def inspect_sheet(path: Path, cols: int, rows: int, frames: int, face: bool) -> dict:
    if not path.exists():
        return {"file": str(path.relative_to(ROOT)), "ok": False, "error": "missing"}
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    want_w, want_h = cols * CELL, rows * CELL
    size_wrong = w != want_w or h != want_h
    arr = np.array(im)
    cells = []
    for i in range(frames):
        col, row = i % cols, i // cols
        x0, y0 = col * CELL, row * CELL
        if x0 + CELL > w or y0 + CELL > h:
            cells.append({"i": i, "ok": False, "empty": True, "magentaLeak": False, "missingFace": False, "opaque": 0, "magenta": 0})
            continue
        cell = arr[y0 : y0 + CELL, x0 : x0 + CELL]
        info = inspect_cell(cell, face)
        info["i"] = i
        cells.append(info)
    ok = (not size_wrong) and all(c["ok"] for c in cells)
    return {
        "file": str(path.relative_to(ROOT)).replace("\\", "/"),
        "ok": ok,
        "sizeWrong": size_wrong,
        "got": [w, h],
        "want": [want_w, want_h],
        "cells": cells,
    }


def main() -> int:
    reports = []
    for hid in heroes():
        for move, (cols, rows, frames, face) in HERO_SHEETS.items():
            reports.append(inspect_sheet(SPR / f"{hid}-{move}.png", cols, rows, frames, face))
    for _kind, sheets in ENEMIES.items():
        for name, cols, rows, frames, face in sheets:
            reports.append(inspect_sheet(SPR / name, cols, rows, frames, face))

    failed = [r for r in reports if not r["ok"]]
    print(json.dumps({"ok": not failed, "checked": len(reports), "failed": len(failed), "reports": reports}, indent=2))
    if failed:
        print("\nFAIL:", file=sys.stderr)
        for r in failed:
            why = r.get("error") or (
                "size" if r.get("sizeWrong") else
                "cells " + ",".join(
                    f"f{c['i']}" + (" empty" if c.get("empty") else "") + (" magenta" if c.get("magentaLeak") else "") + (" face" if c.get("missingFace") else "")
                    for c in r.get("cells", []) if not c.get("ok")
                )
            )
            print(f"  {r['file']}: {why}", file=sys.stderr)
        return 1
    print(f"\nPASS {len(reports)} sheets", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
