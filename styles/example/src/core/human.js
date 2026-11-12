// 3D Bengali characters. Built from primitives (capsules, spheres, boxes) and posed by code every frame: no model files,
// no pictures, so every frame is a pure function of time.
//   const h = new Human({ skin, hair, top, bottom, sex: 'm'|'f', age: 'child'|'adult'|'elder', h: 1,
//                         hairStyle: 'short'|'long'|'bun'|'bald', beard, mustache, glasses, topi, gamcha: [c1, c2],
//                         lungi: [c1, c2], saree: [c1, c2], ribbon, legs: '#skin' (shorts) })
//   h.root                      add to the scene; set h.root.position and h.root.rotation.y (facing)
//   h.pose({ walk, phase, sit, arms: { L: [pitch, elbow, side], R: [...] }, head: [yaw, pitch], lean, bob, t })
//   h.face({ mood, talk, t })   mood: neutral|happy|laugh|shock|worried|angry|sad|smug|proud|tired
//   h.hold('R' | 'L', object)   puts a prop (props.js) into a hand
import * as THREE from 'three';

const cache = new Map();
export function mat(color, rough = 0.8, extra = {}) {
  const key = color + '|' + rough + '|' + JSON.stringify(extra);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }));
  return cache.get(key);
}
/** checked cloth (gamcha, lungi, saree border): a canvas texture, cached */
const clothCache = new Map();
export function cloth(c1, c2, rep = 3) {
  const key = c1 + c2 + rep;
  if (!clothCache.has(key)) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    g.fillStyle = c1; g.fillRect(0, 0, 64, 64); g.fillStyle = c2;
    g.fillRect(0, 0, 32, 10); g.fillRect(0, 32, 32, 10); g.fillRect(32, 16, 10, 32); g.fillRect(0, 48, 64, 0);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
    t.colorSpace = THREE.SRGBColorSpace;
    clothCache.set(key, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0 }));
  }
  return clothCache.get(key);
}
const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
const caps = (r, len, color, rough = 0.8) => shadow(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat(color, rough)));
const ball = (r, color, sx = 1, sy = 1, sz = 1, rough = 0.6, wd = 20, ht = 14, th0 = 0, th1 = Math.PI, ph1 = Math.PI * 2) => {
  const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(r, wd, ht, 0, ph1, th0, th1), mat(color, rough)));
  m.scale.set(sx, sy, sz); return m;
};
const box = (w, h, d, color, rough = 0.85, m = null) => shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || mat(color, rough)));
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const put = (parent, obj, x = 0, y = 0, z = 0) => { obj.position.set(x, y, z); parent.add(obj); return obj; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Face presets. eyes/mouth are multipliers; brow: + = inner ends up (worry), - = inner ends down (anger).
const MOODS = {
  neutral: { brow: 0, browY: 0, eyes: 1, mW: 1.0, mH: 0.7, mY: 0, cheek: 0 },
  happy: { brow: 0, browY: 0.004, eyes: 0.8, mW: 2.4, mH: 0.42, mY: 0.004, cheek: 1 },
  proud: { brow: 0, browY: 0.004, eyes: 0.9, mW: 2.0, mH: 0.5, mY: 0.002, cheek: 1 },
  laugh: { brow: 0, browY: 0.006, eyes: 0.3, mW: 2.0, mH: 1.6, mY: 0, cheek: 1 },
  shock: { brow: 0, browY: 0.024, eyes: 1.4, mW: 0.8, mH: 2.0, mY: 0, cheek: 0 },
  worried: { brow: 1, browY: 0.008, eyes: 1.0, mW: 1.3, mH: 0.4, mY: -0.004, cheek: 0 },
  angry: { brow: -1, browY: -0.006, eyes: 0.75, mW: 1.7, mH: 0.3, mY: 0, cheek: 0 },
  sad: { brow: 1, browY: 0.0, eyes: 0.85, mW: 1.2, mH: 0.35, mY: -0.01, cheek: 0 },
  smug: { brow: 0.5, browY: 0.004, eyes: 0.55, mW: 1.6, mH: 0.35, mY: 0.002, cheek: 0 },
  tired: { brow: 0, browY: -0.004, eyes: 0.45, mW: 1.0, mH: 0.3, mY: 0, cheek: 0 },
};

export class Human {
  constructor(o = {}) {
    const L = (this.look = { skin: '#A56B47', hair: '#1C1410', top: '#2F6DB5', bottom: '#2D3340', sex: 'm', age: 'adult', h: 1,
      hairStyle: 'short', ...o });
    this.seed = [...L.skin].reduce((a, c) => a + c.charCodeAt(0), 0) % 13;
    const sk = L.skin, hairC = L.hair;
    const sc = (L.age === 'child' ? 0.72 : L.age === 'elder' ? 0.95 : 1) * L.h;
    this.root = new THREE.Group(); this.root.scale.setScalar(sc);

    // ---- skeleton (adult metres; feet on y = 0) ----
    this.hips = grp(this.root, 0, 0.9, 0);
    this.spine = grp(this.hips);
    const top = L.top;
    // torso: a lathe profile (hips narrow, waist, chest, rounded shoulders), not a plain capsule
    const prof = [[0.001, 0], [0.13, 0.02], [0.15, 0.14], [0.125, 0.26], [0.145, 0.38], [0.165, 0.46], [0.15, 0.56], [0.09, 0.66], [0.001, 0.7]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    this.chest = put(this.spine, shadow(new THREE.Mesh(new THREE.LatheGeometry(prof, 22), mat(top, 0.85))), 0, 0.12, 0);
    this.chest.scale.set(1.12, 1, 0.9);
    put(this.spine, caps(0.05, 0.06, sk), 0, 0.78, 0);                 // neck
    this.headG = grp(this.spine, 0, 0.88, 0);                           // head pivot
    this.buildHead(sk, hairC);

    this.arms = {};
    for (const [side, x, sgn] of [['L', -0.24, -1], ['R', 0.24, 1]]) {
      const sh = grp(this.spine, x, 0.6, 0);
      put(sh, caps(0.052, 0.22, top, 0.85), 0, -0.17, 0);
      const el = grp(sh, 0, -0.34, 0);
      put(el, caps(0.046, 0.2, top, 0.85), 0, -0.14, 0);
      const wr = grp(el, 0, -0.3, 0);
      put(wr, ball(0.05, sk, 0.9, 1.15, 0.7), 0, -0.07, 0);
      const hand = grp(wr, 0, -0.1, 0.02);
      this.arms[side] = { sh, el, hand, sgn };
    }

    // lower body: trousers, lungi (checked sarong) or saree / frock
    this.legs = {};
    const legC = L.legs || L.bottom;                    // shorts: 'legs' = skin colour
    for (const [side, x] of [['L', -0.1], ['R', 0.1]]) {
      const hj = grp(this.hips, x, 0, 0);
      put(hj, caps(0.075, 0.3, legC, 0.85), 0, -0.2, 0);
      const kj = grp(hj, 0, -0.4, 0);
      put(kj, caps(0.062, 0.28, legC, 0.85), 0, -0.2, 0);
      const an = grp(kj, 0, -0.4, 0);
      put(an, box(0.11, 0.07, 0.24, '#3B2A22', 0.7), 0, -0.04, 0.05);
      this.legs[side] = { hj, kj, an };
    }
    if (L.lungi || L.saree || (L.sex === 'f' && L.dress)) {
      const c = L.lungi || L.saree || [L.bottom, L.bottom];
      const m = cloth(c[0], c[1], L.saree ? 2 : 5);
      const skirt = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.6, 20, 1, true), m));
      put(this.hips, skirt, 0, -0.2, 0);
      for (const s of ['L', 'R']) this.legs[s].hj.visible = false;
      if (L.saree) put(this.spine, box(0.12, 0.62, 0.035, L.saree[1], 0.6, cloth(L.saree[1], L.saree[0], 1)), 0.1, 0.36, 0.17).rotation.z = -0.25;
    }
    if (L.gamcha) {
      put(this.spine, box(0.3, 0.02, 0.1, L.gamcha[0], 0.9, cloth(L.gamcha[0], L.gamcha[1], 2)), 0.1, 0.52, 0.02).rotation.z = -0.35;
    }
    this.hipsY = 0.9;
    this.props = {};
    this.look.skinCol = sk;
  }

  buildHead(sk, hairC) {
    const L = this.look, h = this.headG;
    put(h, ball(0.12, sk, 0.92, 1.08, 0.98, 0.7), 0, 0, 0);            // head
    put(h, ball(0.03, sk, 0.6, 1, 0.9), -0.118, 0, 0); put(h, ball(0.03, sk, 0.6, 1, 0.9), 0.118, 0, 0);   // ears
    put(h, ball(0.018, sk, 0.9, 1.1, 0.8), 0, -0.02, 0.12); // nose
    // eyes: white ball + pupil; the eye group squashes for blinks
    this.eyes = [-0.045, 0.045].map((x) => {
      const g = grp(h, x, 0.02, 0.105);
      put(g, ball(0.025, '#FFFFFF', 1, 1, 0.6, 0.3), 0, 0, 0);
      put(g, ball(0.012, '#140E0B', 1, 1, 0.8, 0.3), 0, 0, 0.016);
      return g;
    });
    this.brows = [-0.045, 0.045].map((x) => put(h, box(0.05, 0.012, 0.014, hairC, 0.9), x, 0.055, 0.11));
    this.mouth = put(h, ball(0.02, '#6B2A2A', 2.2, 0.7, 0.5, 0.4), 0, -0.05, 0.108);
    this.cheeks = [-0.07, 0.07].map((x) => put(h, ball(0.02, '#E0707A', 1, 0.7, 0.4, 0.9), x, -0.03, 0.095));
    if (L.glasses) {
      for (const x of [-0.045, 0.045]) put(h, new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0045, 8, 18), mat('#151515', 0.4)), x, 0.02, 0.118);
      put(h, box(0.03, 0.004, 0.004, '#151515', 0.4), 0, 0.02, 0.118);
    }
    if (L.mustache) put(h, box(0.06, 0.014, 0.022, hairC, 0.9), 0, -0.035, 0.115);
    if (L.beard) put(h, ball(0.125, hairC, 0.98, 1.0, 0.98, 0.95, 24, 12, Math.PI * 0.55, Math.PI * 0.98), 0, -0.01, 0.005);
    // hair
    const hs = L.hairStyle;
    if (hs !== 'bald') {
      put(h, ball(0.127, hairC, 0.97, 0.98, 1.0, 0.95, 24, 12, 0, Math.PI * 0.52), 0, 0.012, -0.004);
    }
    if (hs === 'long') put(h, shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 18, 1, true), mat(hairC, 0.95))), 0, -0.16, -0.06);
    if (hs === 'bun') put(h, ball(0.05, hairC, 1, 1, 1, 0.9), 0, 0.12, -0.085);
    if (L.ribbon) put(h, box(0.05, 0.03, 0.02, L.ribbon, 0.5), 0.1, 0.1, 0.06).rotation.z = 0.3;
    if (L.topi) {
      put(h, shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.15, 0.06, 22), mat(L.topi, 0.7))), 0, 0.125, 0);
      put(h, shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 22), mat(L.topi, 0.7))), 0, 0.15, 0);
    }
  }

  /** pose the body for this frame. Angles in radians. arms.L/R = [pitch (negative = forward), elbow bend, side out] */
  pose(p = {}) {
    const { walk = 0, phase = 0, sit = 0, arms = {}, head = [0, 0], lean = 0, bob = 0, t = 0 } = p;
    const sw = Math.sin(phase) * walk;
    const L = this.legs;
    L.L.hj.rotation.x = -sw * 0.55 - sit * 1.5; L.R.hj.rotation.x = sw * 0.55 - sit * 1.5;
    L.L.kj.rotation.x = walk * 0.6 * Math.max(0, -Math.sin(phase)) + sit * 1.5;
    L.R.kj.rotation.x = walk * 0.6 * Math.max(0, Math.sin(phase)) + sit * 1.5;
    this.hips.position.y = this.hipsY - sit * 0.45 + bob;
    this.spine.rotation.x = lean;
    this.chest.scale.y = 1 + 0.01 * Math.sin(t * 2.4);
    const A = this.arms;
    const dflt = { L: [0.08, 0.1, 0.06], R: [0.08, 0.1, -0.06] };
    const sideArm = (s, v) => {
      const a = A[s], vv = v || dflt[s];
      a.sh.rotation.x = vv[0] + (s === 'L' ? sw * 0.45 : -sw * 0.45);
      a.sh.rotation.z = a.sgn * (vv[2] || 0);
      a.el.rotation.x = -(vv[1] || 0);
    };
    sideArm('L', arms.L); sideArm('R', arms.R);
    this.headG.rotation.set(head[1], head[0], 0);
  }

  /** facial expression. mood from MOODS; talk = 0..1 mouth activity; blinks happen on their own schedule */
  face({ mood = 'neutral', talk = 0, t = 0 } = {}) {
    const M = MOODS[mood] || MOODS.neutral;
    const cyc = (t + this.seed * 0.37) % 3.4; const blink = cyc < 0.13 ? 1 - Math.abs(cyc - 0.065) / 0.065 : 0;
    this.eyes.forEach((e, i) => { e.scale.set(1, M.eyes * (1 - 0.9 * blink), 1); });
    this.brows.forEach((b, i) => {
      b.position.y = 0.055 + M.browY; b.rotation.z = (i === 0 ? 1 : -1) * M.brow * 0.35;
    });
    const open = talk > 0 ? clamp(0.25 + 0.9 * Math.abs(Math.sin(t * 16 + this.seed) * Math.sin(t * 6.1 + 1.3)), 0, 1.2) * talk : 0;
    const h = M.mH + open * 1.1;
    this.mouth.scale.set(M.mW, Math.max(0.3, h) * 0.7, 0.5);
    this.mouth.position.y = -0.05 + M.mY;
    this.cheeks.forEach((c) => { c.visible = !!M.cheek; });
  }

  /** attach a prop (props.js) to a hand; returns the prop */
  hold(hand, obj) {
    const a = this.arms[hand];
    obj.position.set(0, 0, 0); a.hand.add(obj); return obj;
  }
  /** world position of the right hand (for rods, lines) */
  handWorld(hand = 'R') {
    const v = new THREE.Vector3(); this.arms[hand].hand.getWorldPosition(v); return v;
  }
}
