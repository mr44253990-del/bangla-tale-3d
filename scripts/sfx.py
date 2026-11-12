"""Sound effects made on this computer (no downloads, no sample library). Writes data/sfx/*.wav.

  scripts/py scripts/sfx.py <project>

One-shots: ding, ting (rickshaw bell), plop, splash, whoosh, pop, thud, bell (temple ghanta), bird, door, tick.
Ambience loops (tiled under a whole place by mix.py): amb-village (wind and birds), amb-city (traffic hum).
"""
import sys, wave
from pathlib import Path

import numpy as np

SR = 24000
rng = np.random.default_rng(7)


def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.004, k=6.0):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-k * t)
def noise(d): return rng.standard_normal(int(d * SR))
def lowpass(x, hz):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[fr > hz] = 0; return np.fft.irfft(f, len(x))
def bandpass(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(f, len(x))
def sweep(f0, f1, d):
    t = tt(d); k = (f1 / f0) ** (1 / d); return np.sin(2 * np.pi * f0 * (k ** t - 1) / np.log(k))


def ding(): t = tt(1.4); return (np.sin(2*np.pi*1320*t) + 0.35*np.sin(2*np.pi*2640*t)) * np.exp(-t*4.5) * 0.5
def ting(): t = tt(0.9); return (np.sin(2*np.pi*2100*t) + 0.5*np.sin(2*np.pi*3150*t)) * np.exp(-t*7) * 0.45
def plop(): x = sweep(640, 180, 0.22) * env(int(0.22*SR), 0.002, 9); return lowpass(x, 2500) * 0.8
def splash(): n = noise(0.9); x = bandpass(n, 900, 6000) * env(len(n), 0.003, 5.5); return x * 0.55 + lowpass(noise(0.9), 400) * env(len(n), 0.01, 4) * 0.3
def whoosh():
    d = 0.9; n = noise(d); t = tt(d); x = bandpass(n, 400, 3500) * np.sin(np.pi * t / d) ** 1.5; return x * 0.45
def pop(): x = sweep(320, 110, 0.14) * env(int(0.14*SR), 0.002, 14); return x * 0.75
def thud(): x = sweep(120, 45, 0.4) * env(int(0.4*SR), 0.003, 9); return lowpass(x + 0.2 * noise(0.4) * env(int(0.4*SR), 0.001, 30), 500) * 0.9
def bell():
    t = tt(2.6); return sum(a * np.sin(2*np.pi*f*t) * np.exp(-t * d) for f, a, d in [(520, 1, 1.1), (1140, 0.5, 1.6), (1770, 0.3, 2.2), (2330, 0.18, 2.8)]) * 0.45
def bird():
    out = np.zeros(int(0.7*SR))
    for k, st in enumerate([0.0, 0.3]):
        c = sweep(2400 + 300 * k, 3400, 0.14) * env(int(0.14*SR), 0.01, 5); i = int(st*SR); out[i:i+len(c)] += c * 0.25
    return out
def door(): t = tt(0.9); return (sweep(160, 220, 0.9) * (1 + 0.4 * np.sin(2*np.pi*7*t)) * np.sin(np.pi * t / 0.9) * 0.25 + 0.04 * noise(0.9)) * 0.8
def tick(): x = bandpass(noise(0.03), 2000, 6000) * env(int(0.03*SR), 0.001, 90); return x * 0.6

def amb_village(d=8.0):
    wind = lowpass(noise(d), 700) * (0.5 + 0.5 * np.sin(2*np.pi*tt(d)/d)) * 0.09
    x = wind.copy()
    for st in rng.uniform(0, d - 0.5, size=10):
        c = sweep(2600 + rng.uniform(-300, 300), 3600, 0.12) * env(int(0.12*SR), 0.01, 6) * 0.05; i = int(st*SR); x[i:i+len(c)] += c[:len(x)-i]
    return x
def amb_city(d=8.0):
    t = tt(d); return lowpass(noise(d), 260) * (0.6 + 0.4 * np.sin(2*np.pi*0.25*t)) * 0.16

def save(name, x, out, peak=0.7):
    x = x / (np.abs(x).max() or 1) * peak
    with wave.open(str(out / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    out = Path(sys.argv[1]).resolve() / 'data' / 'sfx'; out.mkdir(parents=True, exist_ok=True)
    for name, fn in [('ding', ding), ('ting', ting), ('plop', plop), ('splash', splash), ('whoosh', whoosh), ('pop', pop),
                     ('thud', thud), ('bell', bell), ('bird', bird), ('door', door), ('tick', tick),
                     ('amb-village', amb_village), ('amb-city', amb_city)]:
        save(name, fn(), out, 0.45 if name.startswith('amb') else 0.7)
    print(f'{len(list(out.glob("*.wav")))} sound files in {out}')


if __name__ == '__main__':
    main()
