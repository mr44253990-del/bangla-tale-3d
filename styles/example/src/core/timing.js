// Timing: everything on screen is placed on the narration's clock.
//   data/lines.json  { duration, lines: [{ i, text, start, end }] }   (voice_google.py, or estimate.py without an API key)
//   data/words.json  [{ w, line, s, e }]                                (the same scripts write it)
// L(i) = line i start · Le(i) = line i end · Wd(word, line) = start of the first word that starts with the given text
// (Bengali text, punctuation ignored). It throws when the word is missing, so a rewritten script can't drift silently.
export const T = { dur: 0, lines: [], words: [] };
const norm = (w) => String(w).replace(/[^\p{L}\p{M}\p{N}]+/gu, '');

export async function loadTiming() {
  const get = async (f) => { const r = await fetch(f, { cache: 'no-store' }); if (!r.ok) throw new Error(`missing ${f}: run voice_google.py or estimate.py first`); return r.json(); };
  const lines = await get('data/lines.json'), words = await get('data/words.json');
  T.lines = lines.lines; T.words = words; T.dur = lines.duration;
  return T;
}
export const L = (i) => { const l = T.lines[i]; if (!l) throw new Error(`no line ${i}`); return l.start; };
export const Le = (i) => { const l = T.lines[i]; if (!l) throw new Error(`no line ${i}`); return l.end; };
export function Wd(word, line, which = 's') {
  const n = norm(word);
  const hit = T.words.find((w) => (line == null || w.line === line) && norm(w.w).startsWith(n));
  if (!hit) throw new Error(`word "${word}" not found${line != null ? ` in line ${line}` : ''}`);
  return hit[which];
}
export const lineWords = (i) => T.words.filter((w) => w.line === i);
