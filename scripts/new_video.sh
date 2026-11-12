#!/bin/bash
# Start a new film from the Bangla Tale 3D example (engine, characters, sets, script), so it renders straight away.
#   bash new_video.sh <short-name> [--dir <parent>]      → ~/faceless-shorts/<short-name>/
set -eu
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
USAGE="usage: new_video.sh <short-name> [--dir <parent>]"
NAME="${1:?$USAGE}"; shift
PARENT="$HOME/faceless-shorts"
while [ $# -gt 0 ]; do case "$1" in --dir) PARENT="${2:?}"; shift 2 ;; *) echo "unknown option $1" >&2; exit 2 ;; esac; done
SRC="$SKILL/styles/bangla-tale-3d/example"
[ -d "$SRC" ] || { echo "no example at $SRC" >&2; exit 2; }
DST="$PARENT/$NAME"
[ -e "$DST" ] && { echo "$DST already exists: pick another name" >&2; exit 2; }
mkdir -p "$PARENT"; cp -R "$SRC" "$DST"; rm -rf "$DST/data/tts-cache" "$DST/data/narration.wav" "$DST/data/mix.wav" "$DST/review"
mkdir -p "$DST/renders" "$DST/review"
echo "$DST"
echo "Read $SKILL/styles/bangla-tale-3d/STYLE.md, then write script.json (story, cast, lines) for the new film."
