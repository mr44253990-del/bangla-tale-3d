"""Line and caption timing WITHOUT a voice. Estimates how long each Bengali line takes to say, so you can build and
check the film before you have a Google API key. voice_google.py replaces these numbers with the real audio timing.

  scripts/py scripts/estimate.py <project>

Writes data/lines.json and data/words.json (the same files voice_google.py writes). Words share their line's time by length.
"""
import json, re, sys
from pathlib import Path

RATE = 13.0          # letters per second of spoken Bengali (rough; the real voice replaces this)
SENT_END = ('।', '?', '!')


def letters(s): return len(re.sub(r'\s', '', s))


def estimate_line(text):
    return max(1.2, letters(text) / RATE + 0.25)


def word_times(text, line, start, dur):
    """each word gets a slice of the line in proportion to its length (+1 for the space after it)"""
    ws = [w for w in text.split() if w]
    weights = [len(w) + 1 for w in ws]; tot = float(sum(weights)); out, t = [], start
    for w, wt in zip(ws, weights):
        d = dur * wt / tot; out.append({'w': w, 'line': line, 's': round(t, 3), 'e': round(t + d, 3)}); t += d
    return out


def write_timing(project, timed, duration):
    """timed = [(text, start, end)] for every line, in order"""
    data = project / 'data'; data.mkdir(exist_ok=True)
    lines = [{'i': i, 'text': tx, 'start': round(s, 3), 'end': round(e, 3)} for i, (tx, s, e) in enumerate(timed)]
    words = []
    for i, (tx, s, e) in enumerate(timed): words += word_times(tx, i, s, e - s)
    (data / 'lines.json').write_text(json.dumps({'duration': round(duration, 3), 'lines': lines}, ensure_ascii=False, indent=1))
    (data / 'words.json').write_text(json.dumps(words, ensure_ascii=False, indent=0))


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    project = Path(sys.argv[1]).resolve()
    script = json.loads((project / 'script.json').read_text())
    t = script.get('lead', 0.5); gap = script.get('gap', 0.32); timed = []
    for ln in script['lines']:
        d = estimate_line(ln['text']); timed.append((ln['text'], t, t + d))
        g = ln.get('gap', gap + (0.2 if ln['text'].rstrip().endswith(SENT_END) else 0))
        t = t + d + g
    duration = timed[-1][2] + script.get('outro', 1.2)
    write_timing(project, timed, duration)
    print(f'{len(timed)} lines, {duration:.1f} s (estimated, no voice). Next: node tools/capture.mjs check')


if __name__ == '__main__':
    main()
