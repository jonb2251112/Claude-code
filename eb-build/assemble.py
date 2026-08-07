#!/usr/bin/env python3
"""Assemble /workspace/index.html from ui.css, ui.html, shell.js, and engine.js."""
from pathlib import Path

ROOT = Path("/workspace")
BUILD = ROOT / "eb-build"
OUT = ROOT / "index.html"

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="theme-color" content="#6ec8f5"/>
<title>Emoji Rush</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>
"""

MID = """
</style>
</head>
<body>
"""

SCRIPT_OPEN = """
<script>
"""

SCRIPT_CLOSE = """
</script>
</body>
</html>
"""


def main() -> None:
    css = (BUILD / "ui.css").read_text(encoding="utf-8")
    ui = (BUILD / "ui.html").read_text(encoding="utf-8")
    shell = (BUILD / "shell.js").read_text(encoding="utf-8")
    engine = (BUILD / "engine.js").read_text(encoding="utf-8")

    parts = [
        HEAD,
        css,
        MID,
        ui,
        SCRIPT_OPEN,
        shell,
        "\n",
        engine,
        SCRIPT_CLOSE,
    ]
    OUT.write_text("".join(parts), encoding="utf-8")
    lines = OUT.read_text(encoding="utf-8").count("\n") + 1
    print(f"Wrote {OUT} ({lines} lines)")


if __name__ == "__main__":
    main()
