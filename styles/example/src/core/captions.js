// Captions in Bengali: 1-2 words at a time, white heavy Bengali type with a black edge and a soft shadow, centred.
// A script line may set "caps": "রহিম | মাছ ধরল" to choose the chunks; otherwise they are made automatically.
import { ctx, clamp, lerp, seg, eob } from './lib.js';
import { T, lineWords } from './timing.js';

export const CAP = { y: 1340, size: 92, maxW: 980, font: '"Noto Sans Bengali", "Noto Sans", sans-serif' };
let caps = [];

/** words → chunks of 1-2 words; a chunk never runs past a danda/comma and never gets longer than ~16 letters */
function autoChunks(ws) {
  const out = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i], n = ws[i + 1];
    if (n && !/[,।.?!;:]$/.test(w) && (w + ' ' + n).replace(/\s/g, '').length <= 16 && w.length <= 9) { out.push([i, i + 1]); i++; }
    else out.push([i, i]);
  }
  return out;
}

export function buildCaptions(script) {
  caps = [];
  script.lines.forEach((ln, i) => {
    const ws = lineWords(i); if (!ws.length) return;
    const spoken = ws.map((w) => w.w);
    if (ln.caps) {
      ln.caps.split('|').map((c) => c.trim()).filter(Boolean).forEach((c, j) => {
        const idx = Math.min(ws.length - 1, Math.round((j / Math.max(1, ln.caps.split('|').length)) * ws.length));
        caps.push({ line: i, s: ws[idx].s - 0.03, text: c });
      });
    } else autoChunks(spoken).forEach(([a, b]) => caps.push({ line: i, s: ws[a].s - 0.03, text: spoken.slice(a, b + 1).join(' ') }));
  });
  caps.forEach((c, k) => {
    const next = caps[k + 1], lineEnd = T.lines[c.line].end;
    c.e = next ? (next.s - lineEnd > 0.6 && next.line !== c.line ? lineEnd + 0.25 : next.s) : T.dur;
  });
  return caps;
}
export const captionList = () => caps.map((c) => ({ ...c, words: [{ txt: c.text }] }));

/** one caption at x, y. Also used when drawing the style sheet */
export function captionText(text, x = 540, y = CAP.y, sc = 1) {
  ctx.save(); ctx.font = `900 ${CAP.size}px ${CAP.font}`; ctx.letterSpacing = '0px';
  const fit = Math.min(1, CAP.maxW / ctx.measureText(text).width);
  ctx.translate(x, y); ctx.scale(sc * fit, sc * fit); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(text, 3, 9);
  ctx.lineWidth = 16; ctx.strokeStyle = '#0B0B10'; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#FFFFFF'; ctx.fillText(text, 0, 0);
  ctx.restore();
}
export function drawCaption(t) {
  const c = caps.find((c) => t >= c.s && t < c.e); if (!c) return;
  const lt = t - c.s; captionText(c.text, 540, CAP.y, lt < 0.1 ? lerp(0.86, 1, eob(seg(lt, 0, 0.1))) : 1);
}
