# HyperFrames render setup

HyperFrames (`github.com/heygen-com/hyperframes`) is the HTML-to-MP4 renderer
used to build the caption cards and end card for the Master Glass ad. It is
**not part of this site** and nothing in this repo depends on it — this note
exists only so the setup does not have to be rediscovered, which it has now
been twice.

It is installed **outside** the repo, at `/home/user/heygen-com/hyperframes`.
That is deliberate: it is a Bun monorepo with its own `package.json`, ~1,500
dependencies and a build step, and `CLAUDE.md` warns that a sub-folder with its
own `package.json` is what invited the second Vercel project that failed every
build. A static marketing site with no bundler should not grow a video
toolchain inside it.

**It does not survive a container recycle.** The clone persists; `node_modules`,
the built `dist/`, the PATH symlink and system packages do not.

## Rebuild from scratch

```bash
cd /home/user/heygen-com/hyperframes
git fetch origin --depth=1 && git reset --hard origin/main   # optional
bun install            # ~15s, 1489 packages
bun run build          # ~2 min, builds every workspace package
ln -sf /home/user/heygen-com/hyperframes/packages/cli/bin/hyperframes.mjs \
       /usr/local/bin/hyperframes
hyperframes --version  # 0.8.174 at the time of writing
```

Not on npm: `npm i -g @hyperframes/cli` returns 404. Source is the only path.

## Two things that are not optional here

**1. ffmpeg and ffprobe.** Not in the base image. The render reaches 90% —
every frame captured — and *then* fails on the encode step, which makes it look
like a render bug rather than a missing binary.

```bash
apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg
```

Playwright ships an ffmpeg at `/opt/pw-browsers/ffmpeg-1011`, but it is a
cut-down build with no ffprobe, so it does not satisfy this.

**2. GSAP must be vendored.** Scaffolded compositions load it from
`cdn.jsdelivr.net`, and this container's egress proxy refuses that host. The
render fails at 90% with:

```
sub_timeline_script_failure: A sub-composition timeline script failed to load
(https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js, runtime-error:
TypeError: Cannot read properties of null (reading 'timeline'))
```

A local copy is kept at `/home/user/heygen-com/vendor/gsap.min.js`
(`npm i gsap@3.14.2`). For each new project:

```bash
cp /home/user/heygen-com/vendor/gsap.min.js <project>/gsap.min.js
sed -i 's#https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js#gsap.min.js#' \
    <project>/index.html
```

Both failures surface at 90% with every frame already captured, which is the
confusing part: the capture is fine, the encode is not, and the progress bar
makes it look like the opposite.

## Using it

```bash
HYPERFRAMES_SKIP_SKILLS=1 hyperframes init <name> --non-interactive \
  --resolution landscape          # or portrait / square / 4k
cd <name>
# vendor GSAP (above), author index.html, then:
hyperframes render -o /path/out.mp4        # -o, not --out
hyperframes render --format mov            # ProRes 4444, real alpha
```

`--format webm` renders `yuv420p` and **silently discards the alpha channel** —
that was checked with `ffprobe` and an `alphaextract` pass during the ad work,
and shipping those WebMs would have put black boxes over the footage. Use MOV
when transparency matters.

Verified working 2026-10-23: a scaffolded composition rendered to
1920x1080, 30 fps, 300 frames, 10.0 s H.264, and an extracted frame showed the
composition drawn correctly.
