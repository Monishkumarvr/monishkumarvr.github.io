#!/usr/bin/env python3
"""Check an extracted frame sequence with numbers instead of eyeballing it
at 180px (per the article's "check the motion with numbers" section).

Two failure modes this catches:
  1. Dead/static clips: sums "ink" (dark pixels) in the region that's
     supposed to move, across every frame. Under ~5% variation means
     nothing is actually moving -- regenerate the clip.
  2. Silent colorization: samples a region (default: upper-center, where a
     face usually sits) and checks max(r,g,b) - min(r,g,b). Above ~8 means
     the model quietly colourised what should be a black-and-white drawing.

Usage:
  python3 scripts/check-frames.py assets/character/wave
  python3 scripts/check-frames.py assets/character/wave --region 40,60,160,120
  python3 scripts/check-frames.py assets/character/wave --face-region 86,44,68,68
"""
import argparse
import glob
import os
import sys

from PIL import Image


def to_box(x, y, w, h):
    return (x, y, x + w, y + h)


def ink_fraction(img, box):
    crop = img.crop(box).convert("L")
    pixels = crop.load()
    w, h = crop.size
    dark = sum(1 for y in range(h) for x in range(w) if pixels[x, y] < 128)
    return dark / float(w * h)


def color_spread(img, box):
    crop = img.crop(box).convert("RGB")
    pixels = list(crop.getdata())
    spreads = [max(p) - min(p) for p in pixels]
    return sum(spreads) / float(len(spreads))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir", help="Directory of frame JPEGs (f00.jpg, f01.jpg, ...)")
    ap.add_argument("--region", default=None, help="x,y,w,h box that should show motion (default: whole image)")
    ap.add_argument("--face-region", default=None, help="x,y,w,h box to check for unwanted colorization")
    args = ap.parse_args()

    frames = sorted(glob.glob(os.path.join(args.dir, "*.jpg")))
    if not frames:
        print("No .jpg frames found in %s" % args.dir, file=sys.stderr)
        sys.exit(1)

    images = [Image.open(f) for f in frames]
    w, h = images[0].size

    motion_box = to_box(*(int(v) for v in args.region.split(","))) if args.region else (0, 0, w, h)
    face_box = to_box(*(int(v) for v in args.face_region.split(","))) if args.face_region else to_box(
        int(w * 0.25), 0, int(w * 0.5), int(h * 0.4)
    )

    ink_values = [ink_fraction(img, motion_box) for img in images]
    lo, hi = min(ink_values), max(ink_values)
    mean = sum(ink_values) / len(ink_values)
    variation_pct = ((hi - lo) / mean * 100) if mean else 0.0

    spreads = [color_spread(img, face_box) for img in images]
    max_spread = max(spreads)

    print("%s: %d frames" % (args.dir, len(frames)))
    print("  ink variation across motion region: %.1f%% (%s)" % (
        variation_pct, "OK" if variation_pct >= 5 else "STATIC -- regenerate"
    ))
    print("  max colour spread in face region:   %.1f (%s)" % (
        max_spread, "OK" if max_spread <= 8 else "COLOURIZED -- regenerate"
    ))


if __name__ == "__main__":
    main()
