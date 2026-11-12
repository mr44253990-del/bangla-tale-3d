"""The soundtrack of a film: the narration (data/narration.wav), sound effects from data/cues.json, the places' ambience
(amb-village / amb-city loops) and a quiet procedural music bed (script.json "music": "bed", or "none").
Writes data/mix.wav, which the page preview and `capture.mjs video` use.

  node tools/capture.mjs cues          first: writes data/cues.json from the script
  scripts/py tools/mix.py .            needs data/sfx/ (scripts/sfx.py makes it)
"""
import json, sys, wave
from pathlib import Path

import numpy as np

SR = 24000


def read(p):
    with wave.open(str(p), 'rb') as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float64) / 32767


def write(p, x):
    x = x / (np.abs(x).max() or 1) * 0.92
    with wave.open(str(p), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())


def place(mix, x, t, vol):
    i = int(t * SR)
    if i >= len(mix): return
    n = min(len(x), len(mix) - i); mix[i:i + n] += x[:n] * vol


def fade(x, a=0.4):
    n = int(a * SR); x = x.copy()
    if len(x) > 2 * n: x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    return x


def music_bed(duration):
    """soft pads on four chords, 4 s each, with a slow tremolo. Procedural: no sample, nothing to license."""
    N = int(duration * SR); out = np.zeros(N)
    chords = [(196.0, 246.9, 293.7), (174.6, 220.0, 261.6), (220.0, 277.2, 329.6), (196.0, 246.9, 293.7)]
    for b in range(int(np.ceil(duration / 4))):
        i0, i1 = b * 4 * SR, min(N, (b + 1) * 4 * SR)
        if i1 <= i0: break
        t = np.arange(i1 - i0) / SR
        env = np.minimum(1, t / 0.8) * np.clip((4 - t) / 0.8, 0, 1)
        trem = 0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * t)
        out[i0:i1] += sum(np.sin(2 * np.pi * f * t) for f in chords[b % 4]) * env * trem * 0.035
    return out


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    P = Path(sys.argv[1]).resolve(); data = P / 'data'
    lines = json.loads((data / 'lines.json').read_text()); dur = lines['duration']
    script = json.loads((P / 'script.json').read_text())
    mix = np.zeros(int(dur * SR) + SR)
    nar = data / 'narration.wav'
    if nar.exists(): place(mix, read(nar), 0, 1.0)
    else: print('no data/narration.wav yet: the mix has effects and music only')
    cues_f = data / 'cues.json'
    cues = json.loads(cues_f.read_text())['cues'] if cues_f.exists() else []
    if not cues_f.exists(): print('no data/cues.json: run node tools/capture.mjs cues')
    missing = set()
    for c in cues:
        name = c['name']; f = data / 'sfx' / f'{name}.wav'
        if not f.exists(): missing.add(name); continue
        x = read(f)
        if name.startswith('amb-'):
            need = int(c.get('dur', 4) * SR); reps = int(np.ceil(need / len(x))) + 1
            place(mix, fade(np.tile(x, reps)[:need], 0.6), c['t'], c.get('vol', 1.0))
        else:
            place(mix, x, c['t'], c.get('vol', 1.0) * 0.9)
    if missing: print('missing sound files (run scripts/sfx.py):', ', '.join(sorted(missing)))
    if script.get('music', 'bed') == 'bed': place(mix, music_bed(dur), 0, 1.0)
    write(data / 'mix.wav', mix[:int(dur * SR)])
    print(f'data/mix.wav: {dur:.1f} s, {len(cues)} cues')


if __name__ == '__main__':
    main()
