// Props held by the characters, and the pond's fish and float. Each prop's origin is its grip (the hand).
//   prop('rod' | 'basket' | 'stick' | 'lota' | 'bag' | 'lantern' | 'tiffin' | 'umbrella' | 'book')  → THREE.Group
//   goldFish()  → a rui fish (its nose points along +z)      bobber()  → a float for the pond
//   rod.userData.tip  is the rod tip in the prop's own space (used by the fishing line)
import * as THREE from 'three';
import { mat } from './human.js';

const m = (col, rough = 0.8, extra) => mat(col, rough, extra || {});
const sh = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
const cyl = (rt, rb, h, col, rough, seg = 14, open = false) => sh(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m(col, rough)));

export function prop(name) {
  const g = new THREE.Group();
  const at = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); g.add(o); return o; };
  switch (name) {
    case 'rod': {                                    // bamboo fishing rod with a tip
      const r = at(cyl(0.012, 0.006, 1.9, '#B38B4D', 0.6), 0, 0.85, 0);
      r.rotation.x = 0.55;                                   // points forward (+z) and up
      g.userData.tip = new THREE.Vector3(0, 0.85 + 0.95 * Math.cos(0.55), 0.95 * Math.sin(0.55));
      break;
    }
    case 'stick': at(cyl(0.016, 0.016, 1.15, '#C9B56A', 0.5), 0, 0.5, 0); break;
    case 'basket': {
      at(cyl(0.2, 0.15, 0.16, '#A8743A', 0.95, 18, true), 0, 0.02, 0);
      at(cyl(0.15, 0.15, 0.02, '#8A5A2B', 0.95, 18), 0, -0.06, 0);
      break;
    }
    case 'lota': at(cyl(0.05, 0.06, 0.12, '#D9A441', 0.2), 0, 0.02, 0); break;
    case 'bag': at(sh(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.08), m('#2E7D5B', 0.9))), 0, -0.05, 0.03); break;
    case 'tiffin': at(cyl(0.09, 0.09, 0.2, '#C75B39', 0.4), 0, -0.02, 0); break;
    case 'book': at(sh(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.1), m('#7A2E2E', 0.7))), 0, 0, 0); break;
    case 'umbrella': {
      at(cyl(0.006, 0.006, 0.9, '#3A2A1E', 0.6), 0, 0.42, 0);
      at(sh(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.16, 16, 1, true), m('#B3261E', 0.7, { side: THREE.DoubleSide }))), 0, 0.92, 0);
      break;
    }
    case 'lantern': {
      at(sh(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), m('#FFD86B', 0.4, { emissive: '#FFB347', emissiveIntensity: 1.2 }))), 0, -0.02, 0);
      at(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 16, Math.PI), m('#3A2A1E', 0.5)), 0, 0.07, 0).rotation.z = Math.PI;
      break;
    }
    default: at(cyl(0.02, 0.02, 0.1, '#888', 0.5), 0, 0, 0);
  }
  return g;
}

/** a golden rui: body, tail and fins, built from primitives */
export function goldFish() {
  const g = new THREE.Group();
  const body = sh(new THREE.Mesh(new THREE.SphereGeometry(0.16, 22, 16), m('#E9B23B', 0.35, { metalness: 0.35 })));
  body.scale.set(0.55, 0.7, 1.7); g.add(body);
  const tail = sh(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 6), m('#D99A2B', 0.4, { metalness: 0.2 })));
  tail.rotation.x = Math.PI / 2; tail.position.z = -0.28; g.add(tail);
  const fin = sh(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 5), m('#F2C75C', 0.5)));
  fin.position.set(0, 0.1, 0.02); fin.rotation.x = -0.15; g.add(fin);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), m('#111', 0.3));
  eye.position.set(0.085, 0.04, 0.22); g.add(eye);
  return g;
}

/** the float on the pond: red top, white bottom */
export function bobber() {
  const g = new THREE.Group();
  const top = sh(new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), m('#D62839', 0.4)));
  top.position.y = 0.03; g.add(top);
  const bot = sh(new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), m('#FFFFFF', 0.4)));
  bot.position.y = -0.01; g.add(bot);
  return g;
}
