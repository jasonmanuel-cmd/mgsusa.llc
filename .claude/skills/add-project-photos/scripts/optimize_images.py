#!/usr/bin/env python3
"""Encode site photos to a byte budget, reducing dimensions before quality.

Why this order matters: on detailed photos (foliage, glass reflections, stone)
quality-only compression has to fall to q44 or lower before it hits a sensible
size, and it looks it -- visible banding and mush. Capping the long edge first
gets most of the way there and leaves quality high enough to look clean.

Writes NAME.webp (full) and NAME-sm.webp (thumbnail) into assets/.

Usage:
    optimize_images.py SRC DEST_BASENAME [--assets DIR]
    optimize_images.py --check [--assets DIR]      # report anything over budget

Requires: cwebp, dwebp, ImageMagick (`convert`, `identify`).
"""

import argparse
import os
import subprocess
import sys
import tempfile

FULL_MAX_EDGE = 1400
FULL_BUDGET_KB = 180
SM_MAX_EDGE = 800
SM_BUDGET_KB = 80
QUALITY_LADDER = [72, 66, 60, 54]


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def identify(path):
    out = run(["identify", "-format", "%w %h", path]).stdout.split()
    return (int(out[0]), int(out[1])) if len(out) == 2 else (0, 0)


def to_png(src, dest):
    """Decode to PNG so we re-encode from pixels, not from a lossy source."""
    if src.lower().endswith(".webp"):
        return run(["dwebp", "-quiet", src, "-o", dest]).returncode == 0
    return run(["convert", src, "-strip", dest]).returncode == 0


def encode(src_png, out_path, max_edge, budget_kb):
    budget = budget_kb * 1024
    with tempfile.TemporaryDirectory() as tmp:
        fitted = os.path.join(tmp, "fitted.png")
        if run(["convert", src_png, "-resize", f"{max_edge}x{max_edge}>",
                "-strip", fitted]).returncode != 0:
            return None
        chosen = None
        for q in QUALITY_LADDER:
            candidate = os.path.join(tmp, f"q{q}.webp")
            if run(["cwebp", "-quiet", "-q", str(q), "-m", "6",
                    fitted, "-o", candidate]).returncode != 0:
                continue
            chosen = (candidate, q)
            if os.path.getsize(candidate) <= budget:
                break
        if not chosen:
            return None
        with open(chosen[0], "rb") as fh:
            data = fh.read()
        with open(out_path, "wb") as fh:
            fh.write(data)
        return {"quality": chosen[1], "bytes": len(data),
                "dims": "%dx%d" % identify(out_path)}


def build(src, basename, assets):
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, "src.png")
        if not to_png(src, png):
            print(f"  !! could not decode {src}", file=sys.stderr)
            return False
        full = encode(png, os.path.join(assets, f"{basename}.webp"),
                      FULL_MAX_EDGE, FULL_BUDGET_KB)
        small = encode(png, os.path.join(assets, f"{basename}-sm.webp"),
                       SM_MAX_EDGE, SM_BUDGET_KB)
    if not full or not small:
        return False
    print(f"  {basename:24} {full['dims']:>11} {full['bytes']//1024:>4} KB q{full['quality']}"
          f"   |  -sm {small['dims']:>9} {small['bytes']//1024:>3} KB q{small['quality']}")
    return True


def check(assets):
    over = []
    for name in sorted(os.listdir(assets)):
        if not name.endswith(".webp"):
            continue
        path = os.path.join(assets, name)
        size_kb = os.path.getsize(path) // 1024
        limit = SM_BUDGET_KB if name.endswith("-sm.webp") else FULL_BUDGET_KB
        edge = SM_MAX_EDGE if name.endswith("-sm.webp") else FULL_MAX_EDGE
        w, h = identify(path)
        if size_kb > limit or max(w, h) > edge:
            over.append(f"  {name:28} {w}x{h} {size_kb} KB (limit {edge}px / {limit} KB)")
    if over:
        print("over budget:")
        print("\n".join(over))
    else:
        print("all assets within budget")
    return 0 if not over else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?")
    ap.add_argument("basename", nargs="?")
    ap.add_argument("--assets", default="assets")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    if args.check:
        return check(args.assets)
    if not args.src or not args.basename:
        ap.error("need SRC and DEST_BASENAME (or --check)")
    return 0 if build(args.src, args.basename, args.assets) else 1


if __name__ == "__main__":
    sys.exit(main())
