# Illustrated character — swapping in real frames

The frames in `wave/`, `typing/`, and `404-turn/` right now are **placeholders**:
simple procedurally-drawn shapes (PIL, flat plate background), not the real
illustrated-photo technique. They exist so the playback engine
(`character.js`) is demonstrable end to end. Replace them with real frames
whenever you've generated them — same filenames, same directories, engine
doesn't change.

## The recipe (condensed)

1. **Get one good base illustration from a photo.** Iterate until you like
   it — everything else is generated from this one image, never the photo
   again.
   - Ask for solid filled shapes, varied line weight — not thin outline
     "line art."
   - Ban grey explicitly: pure black / pure white + **one** accent colour.
   - Simplify the face (large eyes, tiny nose, small smile, no realistic
     detail) or it lands in the uncanny valley.
   - One accent colour only.

2. **Generate each pose from the base illustration, not the photo.** Prompt
   shape: *"Recreate the EXACT same illustration with only ONE change: [new
   pose]. Everything else identical — same hair, same shirt, same desk, same
   line weight, same framing."*

3. **Animate between two approved poses** with a video model that takes a
   start image and an end image.
   - Both ends pinned to the *same* frame → barely moves. Use forceful
     motion language and keep both start+end images to prevent color drift.
   - Explicitly say "do NOT add colour — stays pure black/white with the one
     accent colour."
   - For a loop where the two ends genuinely differ, don't fight the model —
     ping-pong the frames in code (play forward, then backward).

4. **Extract frames** — see `scripts/extract-frames.sh`. The `colorlevels`
   step isn't optional: video encodes leave the background around
   `rgb(250,250,250)`, which reads as a faint grey box on a white page.

5. **Cull the bad frames by hand.** Wobbly faces, melted hands, thickened
   lines — throw them out. This step is what separates a drawing from AI
   slop, and it's the one everybody skips.

6. **Check the motion with numbers**, don't eyeball it at 180px — see
   `scripts/check-frames.py`. Under ~5% ink variation across frames means a
   clip is effectively static; a face-region colour spread above ~8 means the
   model quietly colourised a black-and-white clip.

## File / naming convention this repo expects

```
assets/character/
  wave/f00.jpg … f0N.jpg        — one wave swing; the engine plays it x2 and holds f00
  typing/f00.jpg … f0N.jpg      — loops while scrolled down on the Personal tab
  404-turn/f00.jpg … f0N.jpg    — plays once on the 404 page, holds the last frame
```

Frame count and exact timing are controlled entirely by `script.js` /
`404.html` (which just list the filenames and playback mode) — add/remove
frames freely, just update those lists to match.

Real frames will have a baked-in background from the video encode (per the
article, clipped to white via `colorlevels`). The current placeholder frames
use a fixed warm-cream plate baked into every frame for the same reason —
`.character-frame` doesn't try to theme the image itself. If you want the
real frames to adapt between light/dark mode, either bake two frame sets (one
per theme) or export with a transparent background instead of a flat one.
