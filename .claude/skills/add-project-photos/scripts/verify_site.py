#!/usr/bin/env python3
"""Check the things that have actually broken on this site before.

Each check exists because it shipped as a real bug at least once:

  refs        A tile pointed at a file that was never generated.
  webp        Files named .webp that were really JPEGs, so <source
              type="image/webp"> advertised a format the bytes weren't.
  srcset      Width descriptors written before the images were re-encoded,
              so they lied and the browser picked a 233 KB file for a phone.
  bare-source <source> inside <picture> carrying a srcset with no descriptors
              and no sizes -- it beats the <img>'s candidates outright, so
              every visitor got the full-size hero.
  sw          Service worker cache version not bumped after a CSS or JS
              change. It serves assets cache-first, so returning visitors got
              new HTML with a stale stylesheet and the page fell apart.

Usage:  verify_site.py [--root .] [--since GIT_REF]
Exit code is non-zero if any check fails.
"""

import argparse
import glob
import os
import re
import subprocess
import sys

ASSET_RE = re.compile(r'assets/[A-Za-z0-9_./-]+\.(?:webp|jpg|jpeg|png|mp4)')
SRCSET_RE = re.compile(r'srcset="([^"]+)"')
CANDIDATE_RE = re.compile(r'(\S+)\s+(\d+)w')
BARE_SOURCE_RE = re.compile(r'<source[^>]*srcset="[^"]*"[^>]*>')


def width_of(path):
    out = subprocess.run(["identify", "-format", "%w", path],
                         capture_output=True, text=True).stdout.strip()
    return int(out) if out.isdigit() else None


def check_refs(pages):
    missing = {}
    total = 0
    for page in pages:
        for m in ASSET_RE.finditer(open(page).read()):
            total += 1
            if not os.path.exists(m.group(0)):
                missing.setdefault(m.group(0), set()).add(os.path.basename(page))
    return total, missing


def check_webp(assets_dir):
    bad = []
    for path in sorted(glob.glob(os.path.join(assets_dir, "*.webp"))):
        with open(path, "rb") as fh:
            if fh.read(4) != b"RIFF":
                bad.append(path)
    return bad


def check_srcset(pages):
    wrong = []
    for page in pages:
        for m in SRCSET_RE.finditer(open(page).read()):
            for path, declared in CANDIDATE_RE.findall(m.group(1)):
                if not os.path.exists(path):
                    continue
                real = width_of(path)
                if real is not None and real != int(declared):
                    wrong.append((os.path.basename(page), path, declared, real))
    return wrong


def check_bare_sources(pages):
    """A <source> must decide which file to use somehow.

    Either width descriptors plus sizes, or a media query that picks a single
    file per breakpoint -- art direction, which is deterministic and fine. A
    source with neither carries one bare URL, beats the <img>'s candidates,
    and pins the full-size file for every visitor.
    """
    bare = []
    for page in pages:
        for m in BARE_SOURCE_RE.finditer(open(page).read()):
            tag = m.group(0)
            responsive = "w," in tag and "sizes=" in tag
            art_directed = "media=" in tag
            if not responsive and not art_directed:
                bare.append((os.path.basename(page), tag[:90]))
    return bare


def check_sw(root, since):
    """If CSS or JS moved since `since`, the cache version has to move too."""
    if not since:
        return None
    diff = subprocess.run(["git", "diff", "--name-only", f"{since}..HEAD"],
                          capture_output=True, text=True, cwd=root).stdout.split()
    assets_changed = [f for f in diff if f.endswith((".css", ".js"))
                      and not f.startswith(".claude/")]
    if not assets_changed:
        return None
    sw_changed = any(f.endswith("service-worker.js") for f in diff)
    return None if sw_changed else assets_changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--since", help="git ref to compare against for the SW check")
    args = ap.parse_args()
    os.chdir(args.root)

    pages = sorted(glob.glob("*.html"))
    failed = False

    total, missing = check_refs(pages)
    if missing:
        failed = True
        print(f"FAIL refs        {len(missing)} broken of {total}")
        for path, where in list(missing.items())[:8]:
            print(f"                 {path} <- {sorted(where)}")
    else:
        print(f"ok   refs        {total} asset references across {len(pages)} pages")

    bad = check_webp("assets")
    if bad:
        failed = True
        print(f"FAIL webp        {len(bad)} files named .webp are not WebP")
        for p in bad[:8]:
            print(f"                 {p}")
    else:
        print("ok   webp        every .webp is genuinely WebP")

    wrong = check_srcset(pages)
    if wrong:
        failed = True
        print(f"FAIL srcset      {len(wrong)} width descriptors do not match the file")
        for page, path, declared, real in wrong[:8]:
            print(f"                 {page}: {path} says {declared}w, is {real}w")
    else:
        print("ok   srcset      every width descriptor matches its file")

    bare = check_bare_sources(pages)
    if bare:
        failed = True
        print(f"FAIL bare-source {len(bare)} <source> tags have no descriptors or sizes")
        for page, tag in bare[:5]:
            print(f"                 {page}: {tag}")
    else:
        print("ok   bare-source every <source> carries candidates and sizes")

    stale = check_sw(".", args.since)
    if stale:
        failed = True
        print(f"FAIL sw          CSS/JS changed but service-worker.js did not:")
        for f in stale[:6]:
            print(f"                 {f}")
        print("                 bump CACHE_NAME and ASSETS_CACHE, or returning")
        print("                 visitors keep the old files")
    elif args.since:
        print("ok   sw          cache version consistent with asset changes")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
