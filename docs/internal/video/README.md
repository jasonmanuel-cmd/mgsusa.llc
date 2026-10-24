# The services explainer video

Two cuts of the same 7-line script, both built from the HyperFrames
compositions in this folder.

| | landscape | vertical |
|---|---|---|
| source | `services-explainer.hyperframes.html` | `services-explainer-vertical.hyperframes.html` |
| timing | `landscape-timing.json` | `vertical-timing.json` |
| size | 1920x1080, 36.14s | 1080x1920, 29.45s |
| lives | `assets/Videos/mgs-services-explainer.mp4`, on `index.html` | **nowhere in this repo** |

The vertical MP4 is deliberately not committed. Nothing on the site requests
it — it is uploaded by hand to the Google Business Profile — and a 3.8 MB file
that ships to production and is never fetched is exactly the dead weight that
was cleared out of `assets/Videos/` on 2026-10-20. Re-render it from the source
here when it is needed again.

`.vercelignore` excludes `docs/`, so none of this folder deploys.

## The two durations are not a choice

The Google Business Profile **caps video at 30 seconds**, and the landscape cut
runs 36. So the vertical is a re-cut, not a reframe: the interiors scene is
dropped (six scenes to five), and the silence around each line is tightened
from 0.45s lead / 0.45s tail to 0.35 / 0.30. That buys 0.55s of headroom under
the cap. Lengthen a line and the vertical cut goes over — check it, because
Google rejects the upload rather than trimming it.

It is also stacked rather than rotated. The landscape layout is copy left,
photograph right; rotating that into 9:16 leaves the photograph a letterbox
strip across the middle. The vertical composition puts the photo on top and the
copy beneath, which is a different file, not a CSS media query.

## Rendering

HyperFrames setup — including the two things that are not optional here, ffmpeg
and a vendored GSAP — is in `../hyperframes-setup.md`. Once that is in place:

```bash
hyperframes render -o out.mp4        # -o, not --out
```

## Narration

Voice is **Kokoro-82M `af_heart` at speed 1.0**, run locally and offline
through `hyperframes tts`. Four voices were auditioned on the opening line:
`af_heart` 5.14s, `am_adam` 5.12s, `af_nova` 5.57s, `am_michael` 6.19s.

```bash
HYPERFRAMES_PYTHON=/usr/local/bin/python3 \
  hyperframes tts --voice af_heart --speed 1.0 -o v0.wav \
  --text "..." </dev/null
```

Two things in that command line are there for a reason:

- **`HYPERFRAMES_PYTHON`.** Without it the CLI picks an interpreter that has no
  `kokoro-onnx` and reports the package as not installed, which looks like a
  missing dependency and is not.
- **`</dev/null`.** `hyperframes tts` reads stdin. Call it inside a
  `while read` loop without this and it swallows the loop's input, so the loop
  runs exactly once and six of the seven lines are silently never generated.

### Write for the ear, caption for the eye

The script is generated from `voiceover-script.tsv`, which has a spoken column
and an optional caption column. They differ on purpose: the narrator needs
"two thousand four" to say 2004 rather than spelling out four digits, while a
caption reader wants the numeral. `tools/build_explainer_vtt.py` builds
`assets/Videos/mgs-services-explainer.vtt` from that file plus
`landscape-timing.json`, so the captions cannot drift from the voice track —
which they had, still saying "San Antonio and Boerne" after the narration
stopped saying it.

### Timing comes from measured speech, not from the storyboard

The narrator runs about **two words per second**. Scene lengths are set from the
rendered WAV of each line, not guessed and then narrated into; the first attempt
wrote a 4.2s opening scene and got 6.61s of speech.

The mix is a fixed-length silent bed plus one `adelay` per line:

```
-f lavfi -t <total> -i anullsrc=r=24000:cl=mono
[1:a]adelay=450|450[d0]; ... amix=inputs=N:duration=first:normalize=0,
loudnorm=I=-16:LRA=11:TP=-1.5,aresample=48000
```

`duration=first` against a bed of known length is what fixes the track length.
An unbounded `apad` in that position hangs ffmpeg indefinitely.

### Checking placement: look in each slot, not at the whole track

Verifying that each line landed where it was put is an energy pass over raw
PCM, **per expected slot**. Segmenting the whole track and counting runs does
not work: the narrator pauses mid-sentence, so a comma reads as a second run
unless nearby runs are merged — and in the vertical cut the gap between lines
(0.65s) is tighter than the pauses inside them, so any merge window wide enough
to join a comma also welds two lines together. That check reported 3 runs for 6
lines on a track that was perfectly fine.

## Checking the render in this container

This container's Chromium **has no H.264** —
`canPlayType('video/mp4; codecs="avc1.42E01E"')` returns `""`. A browser test
of the real page markup therefore has to swap the `<source>` for a VP9/Opus
copy of the same render before pressing play, and delete it afterwards. It is
not evidence that the MP4 is broken.

Also expect `net::ERR_ABORTED` on the poster image during such a test: with
`preload="none"` the browser cancels its own poster fetch the moment the first
frame decodes. A `HEAD` for the same URL answers 200.

## After changing either cut

- Re-run `tools/build_explainer_vtt.py --apply` if the script or timing moved.
- Bump `CACHE_NAME` **and** `ASSETS_CACHE` in `service-worker.js` — the poster
  is cached image-first, so a returning visitor otherwise keeps the old one.
- Re-run `tools/build_llms_full.py --apply` if the section's headings changed.
- Update the duration in the eyebrow and figcaption on `index.html`.
