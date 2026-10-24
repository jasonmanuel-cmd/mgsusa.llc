#!/usr/bin/env python3
"""Write the explainer video's WebVTT captions from the narration script.

The captions and the voice track come from one file so they cannot drift:
`docs/internal/video/voiceover-script.tsv` holds the spoken line and the cue
timings come from `landscape-timing.json`, which is the same file the audio mix
was built from. Hand-writing the cues is how the old captions ended up still
saying "San Antonio and Boerne" after the narration stopped saying it.

Two things the script handles that a straight copy does not:

**Spoken text is not caption text.** The TTS needs "two thousand four" to say
2004 rather than spelling four digits; a caption reader wants the numeral. Any
line with a third column uses that column for the caption and the second for
speech.

**A 100-character line is not a caption.** Cues are wrapped onto at most two
lines of ~42 characters, which is what players lay out without clipping. Lines
longer than that are split into consecutive cues, sharing the line's duration
in proportion to their length, so a long sentence scrolls with the voice
instead of sitting on screen as a wall of text.

Usage: build_explainer_vtt.py [--apply]
"""

import io
import json
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(HERE, 'docs/internal/video/voiceover-script.tsv')
TIMING = os.path.join(HERE, 'docs/internal/video/landscape-timing.json')
OUT = os.path.join(HERE, 'assets/Videos/mgs-services-explainer.vtt')

MAX_LINE = 46      # characters per caption line
CUE_LINES = 2      # display lines per cue; a third line crowds the picture
TAIL = 0.14        # pull each cue's end in slightly so it clears the next


def read_script():
    lines = []
    for raw in io.open(SCRIPT, encoding='utf-8'):
        raw = raw.rstrip('\n')
        if not raw or raw.startswith('#'):
            continue
        parts = raw.split('\t')
        spoken = parts[1].strip()
        caption = parts[2].strip() if len(parts) > 2 and parts[2].strip() else spoken
        lines.append(caption)
    return lines


def balance(words, k):
    """Split words into k runs, minimising the longest run.

    Greedy wrapping is what every earlier attempt here used, and it is wrong
    for captions twice over. It overruns: an 83-character sentence does not
    fit two 42-character lines at any word boundary, so a greedy pass that
    insists on 42 emits a third line holding the single word "2004." -- a
    0.3-second flash nobody can read. And it is lopsided even when it fits,
    filling line one to the brim and leaving line two half empty.

    Balancing on the longest run instead gives even lines and the fewest of
    them. Small enough input that the obvious DP is instant.
    """
    n = len(words)
    w = [len(x) for x in words]
    # best[i][j] = minimal possible longest run splitting words[i:] into j runs
    INF = float('inf')
    best = [[INF] * (k + 1) for _ in range(n + 1)]
    cut = [[0] * (k + 1) for _ in range(n + 1)]
    best[n][0] = 0
    for i in range(n - 1, -1, -1):
        for j in range(1, k + 1):
            length = -1
            for m in range(i, n):
                length += w[m] + 1          # +1 for the joining space
                rest = best[m + 1][j - 1]
                if rest is INF:
                    continue
                score = max(length, rest)
                if score < best[i][j]:
                    best[i][j] = score
                    cut[i][j] = m + 1
    runs, i = [], 0
    for j in range(k, 0, -1):
        m = cut[i][j]
        runs.append(' '.join(words[i:m]))
        i = m
    return runs


def chunks(text):
    """Break one spoken line into cues of at most CUE_LINES lines of MAX_LINE."""
    words = text.split()
    n_lines = max(1, -(-len(text) // MAX_LINE))
    while True:
        n_cues = max(1, -(-n_lines // CUE_LINES))
        cues = balance(words, min(n_cues, len(words)))
        laid = []
        for c in cues:
            k = max(1, -(-len(c) // MAX_LINE))
            laid.append('\n'.join(balance(c.split(), min(k, len(c.split())))))
        if all(len(l) <= MAX_LINE for c in laid for l in c.split('\n')) and \
           all(len(c.split('\n')) <= CUE_LINES for c in laid):
            return laid
        n_lines += 1            # give it one more line and lay it out again


def stamp(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f'{int(h):02d}:{int(m):02d}:{s:06.3f}'


def build():
    captions = read_script()
    timing = json.load(io.open(TIMING, encoding='utf-8'))
    scenes = timing['scenes']
    if len(scenes) != len(captions):
        raise SystemExit(f'{len(scenes)} timed scenes but {len(captions)} '
                         f'script lines -- they must correspond one to one')

    cues = []
    for cap, sc in zip(captions, scenes):
        parts = chunks(cap)
        span = sc['speech'] - TAIL
        total = sum(len(p) for p in parts)
        at = sc['audio_at']
        for p in parts:
            dur = span * len(p) / total
            cues.append((at, at + dur, p))
            at += dur

    body = 'WEBVTT\n\n' + '\n\n'.join(
        f'{stamp(a)} --> {stamp(b)}\n{t}' for a, b, t in cues) + '\n'
    return body, cues, timing['total']


def main():
    body, cues, total = build()
    bad = 0

    for i, (a, b, t) in enumerate(cues):
        longest = max(len(l) for l in t.split('\n'))
        if longest > MAX_LINE:
            print(f'  ERROR cue {i} has a {longest}-char display line'); bad += 1
        if len(t.split('\n')) > 2:
            print(f'  ERROR cue {i} wraps to more than two lines'); bad += 1
        if b > total + 0.01:
            print(f'  ERROR cue {i} ends at {b:.2f}, past the {total:.2f}s video')
            bad += 1
        if i and a < cues[i - 1][1] - 0.001:
            print(f'  ERROR cue {i} starts before cue {i-1} ends'); bad += 1

    print(f'  cues: {len(cues)}  last ends {cues[-1][1]:.2f}s of {total:.2f}s')
    if bad:
        print('\nVERIFY FAILED')
        return 1

    if '--apply' in sys.argv:
        io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
        print(f'\nWrote {os.path.relpath(OUT, HERE)}')
        return 0

    print('\n' + body)
    print('DRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
