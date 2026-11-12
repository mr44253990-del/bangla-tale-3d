# Bangla Tale 3D: a free Claude skill for Bengali story films

Bengali story films (1-5 minutes, 9:16) made in full 3D on your own computer: 3D Bengali characters, a 3D village and
city, a moving camera, Bengali captions, a Bengali voice from Google's Gemini text-to-speech, and sound effects made locally.

**Layout**
- `SKILL.md`: what Claude follows
- `scripts/`: `setup.sh` (checks and font), `selftest.sh`, `new_video.sh`, `voice_google.py` (Bengali voice),
  `estimate.py` (timing without a voice), `sfx.py` (sound effects), `py` (runs Python)
- `styles/bangla-tale-3d/`: `STYLE.md` (rules and engine map), `style-sheet.png`, `example/` (a complete film that renders:
  পুকুরের সোনালি রুই, 23 lines, 6 characters, 4 sets)

**Needs:** Claude (Code or with a linked computer), Node.js 22+, ffmpeg, Google Chrome, Python 3 with numpy, and a Google API
key for the voice (`GOOGLE_API_KEY`). Without a key the film is timed by estimate and has no narration audio.

**Install:** put this folder at `~/.claude/skills/faceless-shorts/`, run `bash scripts/setup.sh` (prints "All set") and
`bash scripts/selftest.sh` (prints "SELFTEST PASSED").

**Voice:** `GOOGLE_API_KEY=... scripts/py scripts/voice_google.py <film>`. The model is set in `script.json` ("voice").

**Licences:** the code, story, characters and sound are original and free to use in your films. The Bengali font is
Noto Sans Bengali (SIL Open Font License 1.1). three.js is MIT (see `example/vendor/LICENSE-three.txt`).
