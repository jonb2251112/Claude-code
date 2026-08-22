#!/usr/bin/env python3
"""
Bundles official Pokemon artwork used as the offline art fallback for card faces.

Source: https://github.com/PokeAPI/sprites (official-artwork renders, CC0 tooling /
publicly mirrored assets). Each image is trimmed to its alpha bounding box and
written as a small WebP so the whole set stays a few megabytes.
"""
import io, os, sys, urllib.request, concurrent.futures as cf
from PIL import Image

BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other"
ART = os.path.join(os.path.dirname(__file__), "..", "art")
SIZE = 256
QUALITY = 80

def fetch(url, timeout=45):
    req = urllib.request.Request(url, headers={"User-Agent": "pack-opener-build"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def process(dex):
    dst = os.path.join(ART, f"{dex}.webp")
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return "skip"
    raw = None
    for folder in ("official-artwork", "home"):
        try:
            raw = fetch(f"{BASE}/{folder}/{dex}.png")
            break
        except Exception:
            continue
    if not raw:
        return "fail"
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im = im.crop(bbox)
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    canvas.alpha_composite(im)
    canvas.save(dst, "WEBP", quality=QUALITY, method=6)
    return "ok"

def main():
    os.makedirs(ART, exist_ok=True)
    dex = [int(x) for x in open(sys.argv[1]).read().split()]
    tally = {"ok": 0, "skip": 0, "fail": 0}
    failed = []
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(process, d): d for d in dex}
        for i, f in enumerate(cf.as_completed(futs), 1):
            try:
                r = f.result()
            except Exception:
                r = "fail"
            tally[r] += 1
            if r == "fail":
                failed.append(futs[f])
            if i % 100 == 0:
                print(f"  {i}/{len(dex)} {tally}", flush=True)
    print("done", tally)
    if failed:
        print("failed dex:", sorted(failed))

if __name__ == "__main__":
    main()
