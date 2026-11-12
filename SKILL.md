---
name: faceless-shorts
description: Make narrated Bengali story films (9:16 shorts or longer, 1-5 minutes) in full 3D, made entirely in code on the user's computer. 3D Bengali characters (village and city), 3D sets (পুকুর, উঠোন, মেঠো পথ, শহরের রাস্তা), a moving camera, Bengali captions, Google Gemini text-to-speech for the Bengali voice, and sound effects made locally. Use when someone wants a Bengali story video, a bangla animated story, a Bengali kids' or moral story film, or a 3D faceless short in Bengali, even from just a topic or a story idea.
---

# Bangla Tale 3D (faceless-shorts)

You make a finished Bengali story film from a story idea: script, 3D characters and sets, camera moves, Bengali captions,
Bengali voice, sound effects and music, rendered to MP4. The 3D is real: characters and places are built in code and drawn
by three.js in headless Chrome, and the frames go to ffmpeg. The voice is Google's text-to-speech; everything else is
local and free.
`SKILL` = the folder this file is in. Films live in `~/faceless-shorts/<short-name>/`.
Style: `styles/bangla-tale-3d/` (`STYLE.md` = the rules and the engine map; `example/` = a complete film that renders).
**Read `styles/bangla-tale-3d/STYLE.md` in full before you plan.**

## 0. First use on a computer
1. `bash SKILL/scripts/setup.sh` until it prints **All set**. It checks Node 22+, ffmpeg, Chrome and numpy, fetches the
   Bengali font, and says whether a Google key is set. Install what is missing the free, official way; ask before anything
   that needs a password.
2. `bash SKILL/scripts/selftest.sh` must print **SELFTEST PASSED**.
3. **The Google key:** if `GOOGLE_API_KEY` (or `GEMINI_API_KEY`, or `google_api_key` in `~/.faceless-shorts/config.json`) is
   NOT set, ask the user for the key before the voice step. If it IS set, do not ask again. Without a key, the film still
   builds with estimated timing (no narration audio); say so.

## 1. Intake (ONE message, defaults filled in)
Ask only what is unknown, all at once: the story (their idea, or "you write it" with a theme), length (default about 90
seconds; 1 to 5 minutes is the range), the Google key (step 0.3), voice (default `Kore`, or another Gemini voice), music
(bed · none), end line or handle. "Just go" means the defaults.

## 2. The plan (ONE screen, then wait)
Show: title · the characters (name, age, look in a few words) · the places (sets) · the full Bengali story, one line per cut
with its set and the camera move in a few words · any facts and their sources (if the story is factual). Ask **"Build it?"**
and wait.

**Story rules.** Write the story in Bengali, the way a grandmother tells it: short, warm sentences, one picture per line,
a turn in the middle, a lesson or a funny twist at the end. Keep it original. Lines are cuts, not paragraphs: about 8-12
words each, 2-4 seconds spoken. For 90 s, about 22-25 lines.

## 3. Build
1. `bash SKILL/scripts/new_video.sh <short-name>` copies the example into `~/faceless-shorts/<short-name>/`.
2. Write `script.json` for the story: cast (looks), lines (text, set, cast positions and acts, camera, sound cues). See STYLE.md section 5.
   Add new 3D pieces to `src/core/sets.js` and new characters to the cast when the story needs them.
3. Timing: with the key, `scripts/py scripts/voice_google.py <proj>` (Bengali voice, one request per line). Without it,
   `scripts/py scripts/estimate.py <proj>`.
4. `scripts/py scripts/sfx.py <proj>` (once), then `node tools/capture.mjs cues`, then `scripts/py tools/mix.py <proj>`.
5. Check the framing before rendering (section 4).
6. `node tools/capture.mjs video renders/<name>.mp4`. Long renders: start in the background, tell the user the time first
   (about 2-3 s per frame in software, faster with a graphics card; a 90 s film is 2700 frames).

## 4. QA: never show a frame you have not looked at
`node tools/capture.mjs sheet review/all.jpg 2 6` (a time-stamped contact sheet every 2 s) and read the whole sheet; then
full-size frames at the key moments (`node tools/capture.mjs frames review/f "t1,t2"`). For each frame ask:
- **In frame?** Is the speaker in frame and readable? Wide shots: a portrait frame is narrow, so a two-person shot needs
  a bigger `fov` or distance.
- **Does it match the narration?** The picture changes on its line; reveals land on their word.
- **Props and lines:** props in the hands; the fishing line from the rod tip to the float; nothing clipped inside a body.
- **Captions:** one or two Bengali words, spelt right, not over a face.
- **Look:** the palette and the 3D look of STYLE.md; no stray geometry in front of the camera.
Fix, re-check, and tell the user what you caught and fixed.

## 5. Deliver
Open the MP4 for the user. Also give: a share copy if over 35 MB (`ffmpeg -i in.mp4 -c:v libx264 -crf 21 -preset slow -c:a aac
-b:a 160k -movflags +faststart share.mp4`), a cover frame (`capture.mjs frames`), a Bengali title, a caption and hashtags.
Offer one round of precise changes and re-render only what changed.

## Never
Generate images or video with AI; spend the user's money or credits beyond the voice calls the user agreed to; upload
anywhere without asking; copy another creator's story, characters or frames; overwrite a user's film without asking;
ship a frame you have not looked at.
