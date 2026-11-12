"""Bengali narration with Google's Gemini text-to-speech, one call per line. Needs a Google API key.

  export GOOGLE_API_KEY=...                  (or GEMINI_API_KEY; or ~/.faceless-shorts/config.json: {"google_api_key": "..."})
  scripts/py scripts/voice_google.py <project> [--line N] [--voice Kore] [--model gemini-3.8-flash-tts] [--style "..."]

  data/narration.wav   every line, placed on one timeline (24 kHz, mono)
  data/lines.json      exact start/end of each line in the narration    data/words.json   word times inside each line
  data/tts-cache/      one WAV per line; the cache key is text+voice+model+style, so unchanged lines are not sent again

script.json "voice": { "name": "Kore", "model": "...", "style": "how it should be read" } sets the defaults.
The model name is read from TTS_MODEL / --model / script.json, in that order. If Google says the model does not
exist (404), pick one your key can use and pass --model.
"""
import argparse, base64, hashlib, json, os, re, sys, time, urllib.error, urllib.request, wave
from pathlib import Path

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from estimate import write_timing  # noqa: E402

SR = 24000
DEFAULT_MODEL = 'gemini-3.8-flash-tts'
DEFAULT_VOICE = 'Kore'
DEFAULT_STYLE = ('Read this Bengali text aloud as a warm, expressive storyteller. Speak clearly, at a natural, '
                 'unhurried pace, with a little drama on the surprises.')


def api_key():
    k = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
    if not k:
        cfg = Path.home() / '.faceless-shorts' / 'config.json'
        if cfg.exists(): k = json.loads(cfg.read_text()).get('google_api_key')
    if not k:
        print('NO API KEY: set GOOGLE_API_KEY (Google AI Studio gives one free), or put google_api_key in '
              '~/.faceless-shorts/config.json. Without it the Bengali voice cannot be made.', file=sys.stderr)
        sys.exit(3)
    return k


def tts_line(text, voice, model, style, key):
    """one line → (mono int16 PCM array, sample rate). Retries on rate limits and server errors."""
    prompt = f'{style}\n\n{text}' if style else text
    body = {'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'responseModalities': ['AUDIO'],
                                 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    base = os.environ.get('TTS_BASE_URL', 'https://generativelanguage.googleapis.com')   # override only for tests
    url = f'{base}/v1beta/models/{model}:generateContent'
    for attempt in range(5):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.load(r)
            part = resp['candidates'][0]['content']['parts'][0]['inlineData']
            rate = int(re.search(r'rate=(\d+)', part.get('mimeType', '')).group(1)) if 'rate=' in part.get('mimeType', '') else SR
            pcm = np.frombuffer(base64.b64decode(part['data']), dtype='<i2')
            return pcm, rate
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf8', 'replace')[:400]
            if e.code == 404:
                sys.exit(f'Google does not know the model "{model}" for this key (404). Pass --model with a TTS model '
                         f'your key can use, or set TTS_MODEL.\n{msg}')
            if e.code in (400, 401, 403): sys.exit(f'Google refused the request ({e.code}): {msg}')
            if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2 ** attempt + 1); continue
            sys.exit(f'Google error {e.code}: {msg}')
        except (urllib.error.URLError, KeyError, IndexError) as e:
            if attempt < 4: time.sleep(2 ** attempt + 1); continue
            sys.exit(f'no audio came back for "{text[:30]}…": {e}')


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr * 32767)[0]
    if not len(idx): return x
    a = max(0, idx[0] - int(0.02 * SR)); b = min(len(x), idx[-1] + int(0.05 * SR))
    return x[a:b]


def resample(x, rate):
    if rate == SR: return x
    n = int(round(len(x) * SR / rate)); return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float64)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project'); ap.add_argument('--line', type=int); ap.add_argument('--voice'); ap.add_argument('--model'); ap.add_argument('--style')
    a = ap.parse_args()
    project = Path(a.project).resolve()
    script = json.loads((project / 'script.json').read_text())
    vc = script.get('voice', {})
    voice = a.voice or vc.get('name', DEFAULT_VOICE)
    model = a.model or os.environ.get('TTS_MODEL') or vc.get('model', DEFAULT_MODEL)
    style = a.style if a.style is not None else vc.get('style', DEFAULT_STYLE)
    key = api_key()
    cache = project / 'data' / 'tts-cache'; cache.mkdir(parents=True, exist_ok=True)
    lead, gap, outro = script.get('lead', 0.5), script.get('gap', 0.32), script.get('outro', 1.2)

    pieces, sent = [], 0
    for i, ln in enumerate(script['lines']):
        text = ln['text'].strip()
        h = hashlib.sha1(f'{text}|{voice}|{model}|{style}'.encode('utf8')).hexdigest()[:16]
        f = cache / f'{i:03d}-{h}.wav'
        if not f.exists() or a.line == i:          # --line N re-makes just that line
            pcm, rate = tts_line(text, voice, model, style, key); sent += 1
            with wave.open(str(f), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes())
        with wave.open(str(f), 'rb') as w:
            rate = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64)
        x = resample(trim(x), rate)
        pieces.append((text, x, ln.get('gap', gap + (0.2 if text.endswith(('।', '?', '!')) else 0))))
        print(f'  line {i:2d}: {len(x) / SR:5.2f} s  {text[:40]}', flush=True)
    if sent: print(f'sent {sent} line(s) to Google, the rest came from the cache')

    t = lead; out = [np.zeros(int(lead * SR))]; timed = []
    for text, x, g in pieces:
        timed.append((text, t, t + len(x) / SR)); out.append(x); t += len(x) / SR
        out.append(np.zeros(int(g * SR))); t += g
    out.append(np.zeros(int(outro * SR)))
    audio = np.concatenate(out); duration = len(audio) / SR
    peak = np.abs(audio).max() or 1
    audio = (audio / peak * 0.9 * 32767).astype('<i2')
    (project / 'data').mkdir(exist_ok=True)
    with wave.open(str(project / 'data' / 'narration.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(audio.tobytes())
    write_timing(project, timed, duration)
    print(f'data/narration.wav: {duration:.1f} s. Next: node tools/capture.mjs cues  →  scripts/py tools/mix.py .')


if __name__ == '__main__':
    main()
