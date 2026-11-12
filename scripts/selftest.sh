#!/bin/bash
# Proves the install works without a voice or a key: copies the example, times it, makes the sound effects and the mix,
# boots the page in headless Chrome and draws three frames. Prints SELFTEST PASSED or the failing step.
set -eu
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
P="$TMP/film"; cp -R "$SKILL/styles/bangla-tale-3d/example" "$P"; cd "$P"
echo "1. timing";        bash "$SKILL/scripts/py" "$SKILL/scripts/estimate.py" .
echo "2. sound effects"; bash "$SKILL/scripts/py" "$SKILL/scripts/sfx.py" .
echo "3. cues";          node tools/capture.mjs cues
echo "4. mix";           bash "$SKILL/scripts/py" tools/mix.py .
echo "5. three frames";  QS='&res=0.5&aa=0&shadow=1024' FPS=30 node tools/capture.mjs frames review/t "1.2,20,62"
n=$(ls review/t/*.jpg 2>/dev/null | wc -l); [ "$n" -ge 3 ] || { echo "frames missing"; exit 1; }
for f in review/t/*.jpg; do [ "$(wc -c < "$f")" -gt 8000 ] || { echo "blank frame: $f"; exit 1; }; done
echo "SELFTEST PASSED"
