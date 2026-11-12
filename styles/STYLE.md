# Bangla Tale 3D: Bengali story films, 9:16, 3D people in a 3D Bengal

Warm, sunny, a little magical. Real 3D people (built in code from primitives, lathe bodies, posed every frame) living in a
3D village (পুকুর, উঠোন, মেঠো পথ) or a 3D city street (শহর, দোকান, রিকশা, বাস). The camera moves in almost every shot,
the captions come one or two Bengali words at a time, and every beat has a sound.
Example: `example/` = **পুকুরের সোনালি রুই** (The Golden Rui of the Pond): 23 lines, about 81 s, 6 characters, 4 sets.
Sheet: `style-sheet.png`. The example renders as-is (its timing is estimated until you run the voice).

## 1. Rules
- **People are 3D.** Every character is a `Human` (`src/core/human.js`): a skeleton of 3D parts, posed by `pose()`, with a
  face made of 3D eyes, brows and mouth driven by `face()`. Never a 2D cut-out, never an image.
- **The world is 3D.** Each set is built from `src/core/sets.js`. The sky is a dome, the sun casts real shadows, the fog
  goes with the place.
- **One line = one cut.** The narration line decides the picture: its set, its camera move, who is on screen and what they do.
  A cut every 2-4 s. Lines are read one at a time, so the picture always lands on the words.
- **The camera never sits still.** Every line has a camera move (`cam`): an orbit, a push-in, a crane, a pan. The focus
  follows the target, so the background goes soft (depth of field) on close shots.
- **Faces and bodies do the acting.** Moods: `neutral happy proud laugh shock worried angry sad smug tired`. Acts:
  `idle walk talk point wave shock laugh cast pull sit jump cheer bow sad carry proud think`.
- **Captions are Bengali.** One or two words, white Bengali type with a black edge, centred at y 1340. Written as the
  narration says them (no English, no transliteration).
- **Sound is on the beat.** Sound effects are cued by line (`sfx`), ambience follows the place (village birds and wind,
  city hum), and a soft music bed sits underneath. All sound is made in code (`scripts/sfx.py`).
- **True to a Bengali story.** Original writing in Bengali: plain, warm, one idea per line. Village and family life, town
  life, a simple lesson at the end. Read it aloud in your head: if it does not sound like a grandmother telling it, rewrite it.

## 2. Palette (the only colours on screen, plus their shades)
| role | colour | where |
|---|---|---|
| sky | `#8FD3F2` to `#F7E7C4` | day sky dome (sunset: `#F4A46B` to `#FFE3B0`) |
| paddy green | `#7DBE58` · `#3F8A3E` | grass, trees, paddy |
| mud courtyard | `#C4A46C` · `#B98A5E` | yard, dirt road |
| pond water | `#2F8FA8` | pond, with `#7A5A3A` banks and `#B35A3C` brick ghat steps |
| saree red | `#B3261E` · `#D62839` | mother's saree, the float, signs, ribbons |
| shirt blue | `#2E7DD7` | Rahim's shirt |
| turmeric | `#F7C948` · `#FFD43B` | Bablu's tee, rickshaw canopy |
| rui gold | `#E9B23B` | the golden fish |
| night street | `#3B3F4F` · `#2B3442` | city road, dark windows, `#FFE49A` lit windows |

## 3. Characters (`script.json` → "cast")
Each entry is a `Human` look: `sex` (m/f), `age` (child/adult/elder), `h` (height factor), `skin`, `hair`, `top`, `bottom`,
`hairStyle` (short / long / bun / bald), and optional `beard` (colour), `mustache`, `glasses`, `topi` (cap colour), `gamcha`
([c1, c2] checked towel over the shoulder), `lungi` ([c1, c2] checked sarong), `saree` ([c1, c2]), `dress` (frock), `ribbon`,
`legs` (skin colour for shorts). Characters keep the same look all video.
The example cast: রহিম (boy, 11), দাদু (grandfather with topi and beard), মা (saree), বাবলু (little brother), সোনালি
(sister, frock and ribbon), মিজান চাচা (rickshaw-puller). Add a character by adding a cast entry; nothing else changes.

## 4. Sets (`src/core/sets.js`)
| set id | what it is |
|---|---|
| `village_pond` | পুকুর with ghat steps, a paddy field, bamboo, a banyan, a tube well, ducks, the float and the fishing line |
| `village_yard` | উঠোন with a mud house (কাঁচা ঘর), a tin-roof house, a tulsi platform (তুলসী মঞ্চ), a tree |
| `village_road` | মেঠো পথ between trees and fields, sunset sky |
| `city_street` | শহরের রাস্তা: shop fronts with Bengali signs (চায়ের দোকান, ওষুধের দোকান, বইঘর …), tall flats with lit windows, rickshaws, a bus, lamps |
To add a set: build a group with `mk(id, [skyTop, skyBottom], fog, sunTarget)` in `buildWorld`, add pieces, and give it a
set id. Lines then use `"set": "<id>"`. Big places (a whole village, a market, a city block) are made the same way: many
pieces in one group, each piece a few lines of code.

## 5. The script (`script.json`)
```
{ "title", "voice": {"name": "Kore", "model": "gemini-3.8-flash-tts", "style": "..."},
  "lead", "gap", "outro", "music": "bed" | "none",
  "cast": { "rahim": { ...look... } },
  "lines": [ { "text": "এক গ্রামে ছিল রহিম …",
               "set": "village_pond", "speaker": "rahim", "amb": "village",
               "cast": [ { "id": "rahim", "at": [-6, 6], "to": [-1.5, 3.2], "face": [0, 0], "act": "walk",
                           "hold": "rod", "hand": "R", "mood": "sad", "nod": true, "line": true } ],
               "cam": { "target": "rahim" | [x, y, z], "look": 1.2, "from": {"d": 5, "yaw": -30, "h": 1.6, "fov": 36},
                        "to": {"d": 4.6, "yaw": -22, "h": 1.7, "fov": 36}, "aperture": 0.0015 },
               "sfx": [["plop", 0.1]], "fx": [{"kind": "fish", "from": [..], "to": [..], "h": 1.2, "t0": 0.5, "t1": 2.4}],
               "caps": "রহিম | মাছ ধরল" (optional) } ] }
```
- `at` / `to` / `face` are `[x, z]` on the ground (metres). `face` can be a point, a number of degrees or `"cam"`.
- `act` as listed in section 1. `speaker` is the character whose mouth moves.
- `hold` puts a prop in a hand: `rod basket stick lota bag tiffin umbrella book lantern`.
- `line: true` draws the fishing line from the rod tip to the float.
- `fx` `kind: "fish"` flies the golden fish from `from` to `to` in an arc between `t0` and `t1` (seconds from the line's start).
- `sfx` names: `ding ting plop splash whoosh pop thud bell bird door tick`.
- `amb` is `village` or `city` (default from the set).
- **Camera:** `fov` is the VERTICAL lens angle and the frame is 9:16, so the sideways view is narrow. Two people side by
  side need `d` about 10-12 with `fov` 40. A single talking character works at `d` 4-5 with `fov` 34-36. Check every wide
  shot with `capture.mjs sheet` (section 7) before you trust it.

## 6. Timing and voice
- **No API key yet:** `scripts/estimate.py` times each line from its letters. The film renders and the captions run.
- **With the key:** `scripts/voice_google.py` sends one request per line to Google's Gemini text-to-speech (Bengali), keeps
  every line as a WAV in `data/tts-cache/`, places them on one timeline and writes the exact `data/lines.json` and
  `data/words.json`. Re-running costs nothing for lines that did not change; `--line N` re-makes one line.
- The voice model is `gemini-3.8-flash-tts` by default (as set in `script.json`). If Google does not know the model for a
  key, it says so (404): pass `--model` with a TTS model the key can use. The voice name (`Kore` by default) and the style
  sentence are in `script.json` "voice".

## 7. Build and check (in the project folder)
1. `scripts/py scripts/voice_google.py .` (or `estimate.py .` with no key)
2. `scripts/py scripts/sfx.py .` (once; makes `data/sfx/`)
3. `node tools/capture.mjs cues` → `data/cues.json`
4. `scripts/py tools/mix.py .` → `data/mix.wav`
5. Look before you render: `node tools/capture.mjs sheet review/all.jpg 2 6` (a time-stamped contact sheet, a frame every
   2 s) and `node tools/capture.mjs frames review/f "t1,t2,t3"` (full-size JPEGs). Look at the wide shots first: is each
   character in frame, is the camera blocked by a prop or a wall, is the caption over a face?
6. `node tools/capture.mjs check` (lists shots, captions, errors) → `node tools/capture.mjs video renders/out.mp4`

Rendering takes time: about 0.2 s per frame on a graphics card, 2-3 s per frame in software (`SOFTWARE_GL=1`). 60 s at
30 fps is 1800 frames; 5 min is 9000. Start the render in the background and tell the user the time before you start.
Use `QS='&res=0.6&aa=0&shadow=1024'` for review passes.

## 8. QA: never show a frame you have not looked at
- Is every character who is speaking in frame, facing the camera or the right way?
- Are props in the hands (rod, basket, stick)? Does the fishing line run from the rod tip to the float?
- Does the picture change on the line (a new set, a new camera)? Does the golden fish fly on its beat?
- Captions: one or two Bengali words, spelt right, not on a face.
- Sound: narration clear over the bed; effects soft.
Fix, re-check, and say what you fixed.

## 9. Pitfalls
- Portrait frame: the sides are narrow (see section 5). Most "where is he?" problems are the camera, not the character.
- A prop can block the camera (a rickshaw in front of a talking character). Move the prop or the camera.
- Characters are positioned in metres. Feet are at y = 0; sitting uses a 0.45 m bench.
- `Human` keeps a material cache: give a colour as a string, never a texture, in the look.
- Bengali text needs the Noto Sans Bengali font in `fonts/` (see the skill's setup). Without it the captions fall back to
  a system font, which may not have every Bengali letter.
