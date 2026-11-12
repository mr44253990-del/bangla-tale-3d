// The Bengali world, all in 3D. Four sets, each a group that main shows for the lines that use it:
//   village_pond  a village pond (পুকুর) with ghat steps, paddy field, bamboo, banyan, tube well, ducks, float
//   village_yard  a courtyard (উঠোন) with a mud house (কাঁচা ঘর), a tulsi platform (তুলসী মঞ্চ), a mango tree
//   village_road  a dirt road (মেঠো পথ) between fields, at sunset
//   city_street   a city street (শহরের রাস্তা): shop fronts with Bengali signs, rickshaws (রিকশা), a bus, lamps
// build once: buildWorld(scene) → { show(id, t), fog(id), sunTarget(id), bobber, fish, update(t), sets }
// The shot code moves the characters; these functions only make the places.
import * as THREE from 'three';
import { mat } from './human.js';
import { bobber, goldFish } from './props.js';

const sh = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
const add = (p, o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); p.add(o); return o; };
const box = (w, h, d, c, r = 0.9, mm) => sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm || mat(c, r)));
const cyl = (rt, rb, h, c, r = 0.8, seg = 14, mm) => sh(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mm || mat(c, r)));
const rn = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const grp = (p, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; };
const ground = (c, s = 260, r = 1) => { const m = sh(new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat(c, r))); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };

function skyDome(top, bottom) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }',
  });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), m);
}

const texCache = new Map();
/** a Bengali sign painted on a canvas (the page's font must be loaded before this runs) */
function signTex(text, bg, fg = '#FFFFFF') {
  const key = text + bg + fg; if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#1B1B1B'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 150);
  g.fillStyle = fg; g.font = '900 88px "Noto Sans Bengali", "Noto Sans", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 84);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t); return t;
}
/** a window grid: lit (warm) and dark panes, seeded */
function windowTex(base, seed) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
    g.fillStyle = rn(seed * 31 + r * 4 + c) > 0.55 ? '#FFE49A' : '#2B3442';
    g.fillRect(14 + c * 60, 18 + r * 40, 36, 24);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// ---------- village pieces ----------
function tree(p, x, z, s = 1, leaf = '#5DAA52') {
  const t = grp(p, x, 0, z);
  add(t, cyl(0.13 * s, 0.2 * s, 2.5 * s, '#6B4A2E', 0.9), 0, 1.25 * s, 0);
  for (let i = 0; i < 6; i++) {
    const r = (0.8 + (i % 3) * 0.22) * s;
    const c = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(i % 2 ? leaf : '#3F8A3E', 0.9, { flatShading: true })));
    add(t, c, Math.cos(i * 1.3) * 0.9 * s, (2.7 + (i % 3) * 0.35) * s, Math.sin(i * 1.9) * 0.9 * s);
  }
}
function bamboo(p, x, z, n = 7, s = 1) {
  const g = grp(p, x, 0, z);
  for (let i = 0; i < n; i++) {
    const h = (4.5 + rn(i + x) * 2.5) * s;
    add(g, cyl(0.07 * s, 0.08 * s, h, i % 2 ? '#7FA650' : '#93B962', 0.5, 8), (rn(i * 3.1) - 0.5) * 0.9, h / 2, (rn(i * 5.7) - 0.5) * 0.9);
  }
}
function mudHouse(p, x, z, ry, wall = '#D8B98A', roof = '#C9A24A') {
  const g = grp(p, x, 0, z, ry);
  add(g, box(3.2, 1.7, 2.6, wall, 0.95), 0, 0.85, 0);
  add(g, box(0.75, 1.25, 0.06, '#4A2E1C', 0.8), 0, 0.63, 1.33);           // door
  add(g, box(0.5, 0.45, 0.06, '#3B5B7A', 0.5), -1.0, 1.1, 1.33);          // window
  const r = sh(new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 4), mat(roof, 0.95)));
  r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.82); add(g, r, 0, 2.35, 0);
}
function tinHouse(p, x, z, ry, wall = '#E9E4D8', roof = '#8C9BA8') {
  const g = grp(p, x, 0, z, ry);
  add(g, box(3.4, 1.9, 2.8, wall, 0.9), 0, 0.95, 0);
  add(g, box(0.75, 1.25, 0.06, '#7A3B22', 0.7), 0, 0.63, 1.43);
  for (const s of [-1, 1]) { const rf = box(1.95, 0.08, 3.2, roof, 0.45, mat(roof, 0.45, { metalness: 0.4 })); rf.rotation.z = s * -0.36; add(g, rf, s * 0.95, 2.25, 0); }
}
function tulsiMancha(p, x, z) {
  const g = grp(p, x, 0, z);
  add(g, box(1.6, 0.5, 1.6, '#D6C7AA', 0.95), 0, 0.25, 0);
  add(g, cyl(0.25, 0.3, 0.7, '#C56A3D', 0.7), 0, 0.85, 0);
  add(g, sh(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat('#4E9A4A', 0.9))), 0, 1.45, 0);
}
function pond(p, x, z, r) {
  const g = grp(p, x, 0, z);
  add(g, cyl(r + 0.7, r + 0.8, 0.12, '#7A5A3A', 1), 0, 0.02, 0);
  const water = add(g, cyl(r, r, 0.12, '#2F8FA8', 0.12, 40, mat('#2F8FA8', 0.12, { metalness: 0.2, transparent: true, opacity: 0.92 })), 0, 0.07, 0);
  for (let i = 0; i < 3; i++) add(g, box(2.6 - i * 0.2, 0.22, 1.5, '#B35A3C', 0.9), -r * 0.4 - i * 0.1 + 0.9, 0.12 + i * 0.12 - 0.12, r + 0.7 + 0.55 * i); // ghat steps
  return water;
}
function paddy(p, x, z, w, d) {
  const g = grp(p, x, 0, z);
  add(g, sh(new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat('#8ED0C0', 0.2, { metalness: 0.3 }))), 0, 0.03, 0).rotation.x = -Math.PI / 2;
  for (let i = 0; i < Math.floor(d / 0.7); i++) add(g, box(w - 0.4, 0.22, 0.2, '#5DAA52', 0.9), 0, 0.14, -d / 2 + 0.35 + i * 0.7);
}
function tubeWell(p, x, z) {
  const g = grp(p, x, 0, z);
  add(g, cyl(0.08, 0.08, 2.4, '#9AA3AD', 0.4), 0, 1.2, 0);
  add(g, box(0.1, 0.1, 1.1, '#3B3F45', 0.4), 0.5, 2.1, 0);
  add(g, cyl(0.16, 0.16, 0.1, '#C0392B', 0.6), 0, 2.45, 0);
}
function duck(p, x, z) {
  const d = grp(p, x, 0.2, z);
  add(d, sh(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), mat('#F7F4EC', 0.8))), 0, 0, 0).scale.set(1, 0.7, 1.5);
  add(d, sh(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat('#F7F4EC', 0.8))), 0, 0.14, 0.13);
  add(d, box(0.06, 0.03, 0.08, '#E98B2A', 0.6), 0, 0.13, 0.25);
  return d;
}
function cloud(p, x, y, z, s = 1) {
  const g = grp(p, x, y, z);
  for (let i = 0; i < 4; i++) add(g, sh(new THREE.Mesh(new THREE.SphereGeometry(1.3 * s, 14, 10), mat('#FFFFFF', 1))), (i - 1.5) * 1.5 * s, (i % 2) * 0.5 * s, 0).scale.set(1, 0.6, 0.8);
  return g;
}
function lamp(p, x, z) {
  const g = grp(p, x, 0, z);
  add(g, cyl(0.05, 0.07, 3.2, '#4D5560', 0.6), 0, 1.6, 0);
  add(g, sh(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat('#FFE9A8', 0.4, { emissive: '#FFD27A', emissiveIntensity: 2 }))), 0, 3.3, 0);
}

// ---------- city pieces ----------
function shopfront(p, x, z, ry, label, bg, fg) {
  const g = grp(p, x, 0, z, ry);
  const h = 3.4 + rn(x * 3 + z) * 2.5;
  add(g, box(4.0, h, 3.0, '#E8DCC4', 0.9), 0, h / 2, 0);
  const sm = new THREE.MeshStandardMaterial({ map: signTex(label, bg, fg), roughness: 0.5 });
  const sign = sh(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.95), sm));
  sign.position.set(0, 2.8, 1.52); g.add(sign);
  add(g, box(4.2, 0.1, 1.1, bg, 0.8), 0, 2.2, 1.6).rotation.x = 0.2;
  add(g, box(1.2, 1.1, 0.06, '#2B3442', 0.5, mat('#2B3442', 0.3, { emissive: '#FFD27A', emissiveIntensity: 0.25 })), -0.9, 1.1, 1.52);
  return g;
}
function building(p, x, z, ry, h, base, seed) {
  const g = grp(p, x, 0, z, ry);
  const tex = windowTex(base, seed); tex.repeat.set(2, Math.max(1, Math.round(h / 4)));
  const m = sh(new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })));
  m.position.y = h / 2; g.add(m);
  add(g, box(8.2, 0.4, 8.2, '#C9C2B6', 0.9), 0, h + 0.2, 0);
}
function rickshaw(p, x, z, ry, body = '#E8542C', canopy = '#FFD43B') {
  const g = grp(p, x, 0, z, ry);
  add(g, box(0.9, 0.12, 0.7, '#2B2B2B', 0.6), 0, 0.5, 0);               // seat
  add(g, box(0.9, 0.55, 0.08, body, 0.6), 0, 0.8, -0.38);               // back
  add(g, box(0.9, 0.22, 0.9, body, 0.6), 0, 0.42, 0.05);                // body
  for (const s of [-1, 1]) {
    const w = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 18), mat('#222', 0.7)));
    w.rotation.z = Math.PI / 2; add(g, w, s * 0.5, 0.42, -0.5);
    add(g, box(0.06, 0.06, 1.7, '#3A2A1E', 0.7), s * 0.36, 0.5, 1.1).rotation.x = -0.1;
    add(g, box(0.05, 1.0, 0.05, '#3A2A1E', 0.7), s * 0.45, 1.1, -0.5);
  }
  const w2 = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 18), mat('#222', 0.7)));
  w2.rotation.z = Math.PI / 2; add(g, w2, 0, 0.4, 1.35);
  const cn = box(1.2, 0.05, 1.3, canopy, 0.6); cn.rotation.x = 0.12; add(g, cn, 0, 1.62, -0.1);
  return g;
}
function bus(p, x, z, ry) {
  const g = grp(p, x, 0, z, ry);
  add(g, box(2.6, 2.4, 7, '#2E6DB4', 0.7), 0, 1.5, 0);
  add(g, box(2.62, 0.7, 6.2, '#E9EEF2', 0.3, mat('#E9EEF2', 0.3, { emissive: '#1E2A36', emissiveIntensity: 0.1 })), 0, 2.1, 0);
  for (const [xx, zz] of [[-1.25, -2.2], [1.25, -2.2], [-1.25, 2.2], [1.25, 2.2]]) { const w = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), mat('#1B1B1B', 0.8))); w.rotation.z = Math.PI / 2; add(g, w, xx, 0.45, zz); }
  return g;
}

// ---------- the sets ----------
export function buildWorld(scene) {
  const sets = {}; const fogs = {};
  const sun = {};
  const showable = [];
  const mk = (id, sky, fog, target) => { const g = new THREE.Group(); g.visible = false; g.name = id; g.add(skyDome(sky[0], sky[1])); scene.add(g); sets[id] = g; fogs[id] = fog; sun[id] = target; showable.push(id); return g; };

  // village_pond
  const vp = mk('village_pond', ['#8FD3F2', '#F7E7C4'], { color: '#E8E0C8', near: 40, far: 170 }, [0, 0.5, 0]);
  vp.add(ground('#7DBE58'));
  const water = pond(vp, 0, 0, 3.2);
  paddy(vp, -16, -12, 9, 14);
  paddy(vp, 15, -10, 8, 12);
  bamboo(vp, -12, -7, 8, 1.1); bamboo(vp, 13, -6, 6, 1);
  tree(vp, -9, -4, 1.3); tree(vp, 10, 4, 1.1, '#6DB35A');
  tubeWell(vp, 6, -8);
  duck(vp, 2.3, 1.6); duck(vp, -1.2, -1.9);
  cloud(vp, -12, 13, -20, 1.6); cloud(vp, 14, 15, -26, 1.9); cloud(vp, 2, 12, -40, 2.2);
  const bob = bobber(); bob.position.set(1.4, 0.13, -1.3); vp.add(bob);
  const fish = goldFish(); fish.visible = false; fish.scale.setScalar(1.1); vp.add(fish);
  sets.village_pond.userData = { water, bob, fish };

  // village_yard (courtyard)
  const vy = mk('village_yard', ['#9ADDF4', '#FBE9C9'], { color: '#F1E4CC', near: 30, far: 150 }, [0, 0.8, 0]);
  vy.add(ground('#C4A46C', 260));                      // packed mud courtyard
  mudHouse(vy, -0.5, -7, 0);
  tulsiMancha(vy, 3.2, -2.5);
  tree(vy, -8, 3, 1.4, '#4E9A4A'); tree(vy, 9, -5, 1.1);
  bamboo(vy, 11, 5, 5, 1);
  tinHouse(vy, -15, 0, 0.5);
  cloud(vy, 3, 13, -30, 1.8);

  // village_road (dirt road at sunset)
  const vr = mk('village_road', ['#F4A46B', '#FFE3B0'], { color: '#F5C79B', near: 30, far: 130 }, [0, 0.8, 0]);
  vr.add(ground('#8DBF5C', 300));
  add(vr, sh(new THREE.Mesh(new THREE.PlaneGeometry(6, 240), mat('#B98A5E', 0.95))), 0, 0.01, 0).rotation.x = -Math.PI / 2;
  for (let i = -6; i <= 6; i++) { tree(vr, -8.5 - (i % 2) * 1.3, i * 6.5, 1.1 + rn(i) * 0.4); }
  mudHouse(vr, -16, -18, 0.4); tinHouse(vr, 16, -6, -0.3);
  paddy(vr, 18, 12, 10, 16);
  cloud(vr, -8, 12, -10, 1.5); cloud(vr, 10, 14, -30, 1.6);

  // city_street
  const cs = mk('city_street', ['#7F9DC6', '#F7C9A0'], { color: '#AFB8C6', near: 45, far: 170 }, [0, 0.8, -4]);
  cs.add(ground('#3B4048', 300));
  add(cs, box(7, 0.25, 130, '#B9B4AA', 0.9), -10.5, 0.12, 0);
  add(cs, box(7, 0.25, 130, '#B9B4AA', 0.9), 10.5, 0.12, 0);
  const signs = [['চায়ের দোকান', '#F7F1E1', '#8A4B2A'], ['ওষুধের দোকান', '#2E7D5B', '#FFFFFF'], ['বইঘর', '#7A2E2E', '#FFE9A8'], ['মুদি দোকান', '#2B5A9E', '#FFFFFF'], ['হোটেল', '#D6861F', '#FFFFFF']];
  for (let i = 0; i < 9; i++) {
    const z = -48 + i * 11;
    const sgn = signs[i % signs.length];
    building(cs, -15.5, z, Math.PI / 2, 12 + rn(i * 7) * 9, '#8C6A59', i);
    building(cs, 15.5, z + 4, -Math.PI / 2, 10 + rn(i * 3) * 8, '#5E6F86', i + 9);
    const o = signs[(i + 2) % signs.length];
    shopfront(cs, -11.8, z + 0.5, Math.PI / 2, sgn[0], sgn[1], sgn[2]);
    shopfront(cs, 11.8, z + 4.5, -Math.PI / 2, o[0], o[1], o[2]);
  }
  lamp(cs, -8.4, -10); lamp(cs, 8.4, -10); lamp(cs, -8.4, 8); lamp(cs, 8.4, 8); lamp(cs, -8.4, 26); lamp(cs, 8.4, 26);
  rickshaw(cs, -5.6, 2.5, 0.25); rickshaw(cs, 4.6, -3.5, -0.3, '#2E6DB4', '#E94F37');
  bus(cs, 3.2, -18, Math.PI);

  // Sun: the key light's shadow target is moved per set (see shots.js)
  return {
    sets, fog: (id) => fogs[id], sunTarget: (id) => sun[id],
    show(id) { for (const k of showable) sets[k].visible = k === id; },
    water: vp.userData, pond: sets.village_pond.userData,
    update(t) {
      // the float bobs on the water, whatever the line is doing
      const b = sets.village_pond.userData.bob; if (b) b.position.y = 0.13 + Math.sin(t * 2.1) * 0.03;
    },
  };
}
