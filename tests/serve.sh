#!/bin/bash
# Serve the repo so it appears at /dad-page/ as it does on GitHub Pages. Usage: bash tests/serve.sh <repo root> <port>
ROOT=$(cd "$1" && pwd); PORT=${2:-8812}; W="${TMPDIR:-/tmp}/dad-page-www-$PORT"
mkdir -p "$W"; ln -sfn "$ROOT" "$W/dad-page"
cd "$W" && exec python3 -m http.server "$PORT" --bind 127.0.0.1
