#!/usr/bin/env bash
# Extract choppy, hand-drawn-feeling JPEG frames from an AI-video-interpolated
# clip, per the article's recipe. Usage:
#
#   scripts/extract-frames.sh path/to/clip.mp4 assets/character/wave
#
# Two things matter in this command:
#   - `colorlevels=...=0.96` clips the video encode's off-white background
#     (rgb(250,250,250)) to pure white — left alone it reads as a faint grey
#     box on a white page.
#   - Sampling every 3rd frame of the first 60, at ~18fps, is deliberately
#     choppy. Smooth reads as video; choppy reads as drawn.
#
# After running this, open every frame and delete the bad ones by hand
# (wobbly faces, melted hands, thickened lines) before using them — that
# culling step is what separates a drawing from AI slop.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <input-clip.mp4> <output-dir>" >&2
  exit 1
fi

INPUT="$1"
OUTDIR="$2"
mkdir -p "$OUTDIR"

ffmpeg -i "$INPUT" \
  -vf "select='lt(n\,60)*not(mod(n\,3))',scale=400:-2,colorlevels=rimax=0.96:gimax=0.96:bimax=0.96" \
  -vsync 0 -q:v 4 "$OUTDIR/f%02d.jpg"

echo "Extracted to $OUTDIR — now cull the bad frames by hand, then re-check with scripts/check-frames.py"
