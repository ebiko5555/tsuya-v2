#!/usr/bin/env python3
"""Convert artwork MP4 files into autoplay-policy-free animated WebP images."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


FPS = 8
MAX_EDGE = 640
QUALITY = 52


def convert(source: Path, destination: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="tsuya-webp-") as temp_dir:
        frame_pattern = str(Path(temp_dir) / "%05d.jpg")
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source),
                "-vf",
                f"fps={FPS},scale='if(gt(iw,ih),min({MAX_EDGE},iw),-2)':'if(gt(iw,ih),-2,min({MAX_EDGE},ih))'",
                "-q:v",
                "3",
                frame_pattern,
            ],
            check=True,
        )
        frame_paths = sorted(Path(temp_dir).glob("*.jpg"))
        if not frame_paths:
            raise RuntimeError(f"No frames extracted from {source}")
        frames = []
        for frame_path in frame_paths:
            with Image.open(frame_path) as image:
                frames.append(image.convert("RGB"))
        destination.parent.mkdir(parents=True, exist_ok=True)
        frames[0].save(
            destination,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=round(1000 / FPS),
            loop=0,
            quality=QUALITY,
            method=4,
            minimize_size=True,
        )
        for frame in frames:
            frame.close()


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: encode_artwork_webp.py SOURCE_DIR DESTINATION_DIR", file=sys.stderr)
        return 2
    source_dir = Path(sys.argv[1])
    destination_dir = Path(sys.argv[2])
    names = (
        "color-pattern",
        "surface-gold",
        "sculpt-wire",
        "light-mandala",
        "hand-drawing",
        "trace-dust",
        "space-hand",
        "thinking-hand",
        "nail-white-orb",
        "frame-0001-0240",
    )
    for name in names:
        source = source_dir / f"{name}.mp4"
        destination = destination_dir / f"{name}.webp"
        if destination.exists() and destination.stat().st_size > 0:
            print(f"{destination.name}: already encoded", flush=True)
            continue
        print(f"{source.name} -> {destination.name}", flush=True)
        convert(source, destination)
        print(f"  {destination.stat().st_size / 1024 / 1024:.2f} MB", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
