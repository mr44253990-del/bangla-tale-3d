#!/bin/bash
# One-time setup on the user's computer. Checks what the film needs, makes the sound-and-voice helpers ready, and
# fetches the Bengali font. Prints "All set" when everything the film needs is present.
#   bash SKILL/scripts/setup.sh
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
FH="${FACELESS_HOME:-$HOME/.faceless-shorts}"; mkdir -p "$FH"
ok=1
say() { printf '%s\n' "$*"; }
need() { say "  missing: $1 ($2)"; ok=0; }

say "checking the tools"
node -e "process.exit(+process.versions.node.split('.')[0] >= 22 ? 0 : 1)" 2>/dev/null && say "  node $(node -v) ok" || need "Node.js 22 or newer" "https://nodejs.org"
command -v ffmpeg >/dev/null && say "  ffmpeg ok" || need "ffmpeg" "https://ffmpeg.org/download.html"
CH="${CHROME:-}"; [ -z "$CH" ] && for p in "/usr/bin/google-chrome" "/usr/bin/google-chrome-stable" "/usr/bin/chromium" "/usr/bin/chromium-browser" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/c/Program Files/Google/Chrome/Application/chrome.exe"; do [ -x "$p" ] && CH="$p" && break; done
[ -n "$CH" ] && say "  Chrome ok ($CH)" || need "Google Chrome" "https://www.google.com/chrome (set CHROME=... if it is elsewhere)"
if bash "$SKILL/scripts/py" -c "import numpy" 2>/dev/null; then say "  python + numpy ok"
else
  say "  installing numpy for the sound helpers"
  python3 -m pip install --user --quiet numpy 2>/dev/null || python3 -m pip install --user --quiet --break-system-packages numpy 2>/dev/null
  bash "$SKILL/scripts/py" -c "import numpy" 2>/dev/null && say "  python + numpy ok" || need "python3 with numpy" "pip install numpy"
fi

say "checking the Bengali font"
PROJ_FONT="$SKILL/styles/bangla-tale-3d/example/fonts/NotoSansBengali-Black.ttf"
if [ ! -s "$PROJ_FONT" ]; then
  for u in "https://raw.githubusercontent.com/notofonts/bengali/main/fonts/NotoSansBengali/full/ttf/NotoSansBengali-Black.ttf" \
           "https://github.com/google/fonts/raw/main/ofl/notosansbengali/NotoSansBengali%5Bwdth%2Cwght%5D.ttf"; do
    curl -fsSL "$u" -o "$PROJ_FONT.part" 2>/dev/null && [ -s "$PROJ_FONT.part" ] && mv "$PROJ_FONT.part" "$PROJ_FONT" && break
    rm -f "$PROJ_FONT.part"
  done
fi
[ -s "$PROJ_FONT" ] && say "  Noto Sans Bengali ok" || say "  Noto Sans Bengali not downloaded: put NotoSansBengali-Black.ttf in $(dirname "$PROJ_FONT")"

say "checking the Google voice key"
if [ -n "${GOOGLE_API_KEY:-${GEMINI_API_KEY:-}}" ] || grep -q google_api_key "$FH/config.json" 2>/dev/null; then say "  Google key found"
else say "  no Google key yet: the film can be timed without a voice (estimate.py). For the Bengali voice, set GOOGLE_API_KEY"; fi

if [ $ok = 1 ]; then say "All set"; else say "Fix the missing items above, then run setup again."; exit 1; fi
