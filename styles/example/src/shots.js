// The film, line by line. Every line of script.json is one cut: its set, its camera move, who is on screen and what
// they do, props, fish, and sound cues. Everything is a pure function of time t, so any frame can be drawn on its own.
import * as THREE from 'three';
import { lightRig, camera } from './core/engine.js';
import { buildWorld } from './core/sets.js';
import { Human } from './core/human.js';
import { prop } from './core/props.js';
import { camPose, DEFAULT_CAM } from './core/camera.js';
import { L, Le } from './core/timing.js';
import { clamp, lerp, deg, eio } from './core/lib.js';

export function buildShots(E, script) {
  const scene = new THREE.Scene();
  const rig = lightRig(scene, { key: '#FFD9A6', keyI: 3.0, keyPos: [6, 10, 7], rimCol: '#BFD8FF', rimI: 1.2, sky: '#FFF0D8', ground: '#7A8A4A', hemiI: 0.9, shadowBox: 26, target: [0, 0.8, 0] });
  const world = buildWorld(scene);
  const fogs = {};
  const setFog = (id) => {
    const f = world.fog(id); if (!fogs[id]) fogs[id] = new THREE.Fog(f.color, f.near, f.far);
    scene.fog = fogs[id];
  };

  // the cast: one Human per character in script.json "cast"
  const cast = {};
  for (const [id, look] of Object.entries(script.cast || {})) {
    const h = new Human(look); h.root.visible = false; scene.add(h.root); cast[id] = { h, props: {}, look };
  }

  // the fishing line (rod tip → float) and the golden fish's flight
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#F4F4F0' }));
  fishLine.visible = false; scene.add(fishLine);
  const fish = world.pond.fish;                       // lives in the pond set (it is hidden with the set)

  const cam = camera(30);
  const shots = [], cues = [];

  // ---- one actor for one line ----
  function placeActor(a, c, lt, dur) {
    const p = clamp(lt / dur), e = eio(p);
    const x = c.to ? lerp(c.at[0], c.to[0], e) : c.at[0];
    const z = c.to ? lerp(c.at[1], c.to[1], e) : c.at[1];
    a.h.root.position.set(x, 0, z);
    const walking = (c.act === 'walk' || !!c.to) ? 1 : 0;
    if (c.to) a.h.root.rotation.y = Math.atan2(c.to[0] - c.at[0], c.to[1] - c.at[1]);
    else if (Array.isArray(c.face)) a.h.root.rotation.y = Math.atan2(c.face[0] - x, c.face[1] - z);
    else if (typeof c.face === 'number') a.h.root.rotation.y = deg(c.face);
    return { x, z, walking };
  }

  function pose(a, c, lt, dur, t, ln, walking) {
    const p = clamp(lt / dur);
    const isSpeaker = ln.speaker === c.id;
    let mood = c.mood || (c.act === 'laugh' ? 'laugh' : c.act === 'shock' ? 'shock' : 'neutral');
    let arms = {}, sit = 0, bob = 0, lean = 0, head = [0, 0], talk = isSpeaker ? 1 : 0;
    switch (c.act) {
      case 'talk': arms.R = [-0.55 + 0.25 * Math.sin(t * 2.3), 0.9 + 0.25 * Math.sin(t * 3.1), -0.1]; head = [0, 0.05 * Math.sin(t * 1.7)]; break;
      case 'point': arms.R = [-1.45, 0.05, 0]; break;
      case 'wave': arms.R = [-2.5, 0.4 + 0.6 * Math.abs(Math.sin(lt * 8)), 0.1]; break;
      case 'shock': mood = 'shock'; arms.L = [-2.6, 0.3, 0.5]; arms.R = [-2.6, 0.3, -0.5]; bob = lt < 0.5 ? 0.03 : 0; break;
      case 'laugh': mood = 'laugh'; bob = 0.03 * Math.abs(Math.sin(lt * 9)); arms.L = [-0.4, 1.4, 0.2]; arms.R = [-0.4, 1.4, -0.2]; break;
      case 'cast': arms.R = [-1.3, 0.1, 0]; arms.L = [-1.1, 0.6, 0]; break;
      case 'pull': arms.R = [-0.7, 1.25, 0]; arms.L = [-0.7, 1.25, 0]; bob = 0.02 * Math.sin(lt * 6); lean = -0.05; break;
      case 'sit': sit = 1; arms.L = [-0.35, 1.5, 0.15]; arms.R = [-0.35, 1.5, -0.15]; break;
      case 'jump': bob = Math.max(0, Math.sin(lt * 4.2)) * 0.28; arms.L = [-2.7, 0.1, 0.4]; arms.R = [-2.7, 0.1, -0.4]; mood = 'laugh'; break;
      case 'cheer': bob = 0.04 * Math.abs(Math.sin(lt * 7)); arms.L = [-2.6, 0.2, 0.3]; arms.R = [-2.6, 0.2, -0.3]; mood = 'happy'; break;
      case 'bow': lean = 0.35 * Math.sin(p * Math.PI); break;
      case 'sad': head = [0, 0.14]; break;
      case 'carry': arms.L = [0.1, 0.9, 0.1]; arms.R = [0.1, 0.9, -0.1]; break;
      case 'proud': lean = -0.05; arms.L = [0.2, 1.9, 0.5]; arms.R = [0.2, 1.9, -0.5]; mood = 'proud'; break;
      case 'think': arms.R = [-1.8, 1.9, 0]; head = [0.2, -0.1]; break;
      default: break;
    }
    if (c.nod) head[1] += 0.06 * Math.sin(t * 2.2);
    a.h.pose({ walk: walking, phase: lt * 6.2, sit, arms, head, lean, bob, t });
    a.h.face({ mood, talk, t });
  }

  function props(a, c) {
    const want = c.hold ? `${c.hand || 'R'}:${c.hold}` : null;
    for (const [k, o] of Object.entries(a.props)) o.visible = k === want;
    if (want && !a.props[want]) {
      const [hand, name] = want.split(':');
      const o = prop(name); a.h.hold(hand, o); a.props[want] = o;
      o.visible = true;
    }
    return want && a.props[want];
  }

  script.lines.forEach((ln, i) => {
    const at = L(i), end = Le(i), dur0 = end - at;
    (ln.sfx || []).forEach(([name, s]) => cues.push({ t: at + (s || 0), name }));
    const amb = ln.amb || ((ln.set || '').startsWith('city') ? 'city' : 'village');  // ambience follows the place
    cues.push({ t: at, name: 'amb-' + amb, dur: dur0 });
    shots.push({
      id: String(i), at, note: ln.text,
      draw(lt, d, t, blit) {
        const set = ln.set || 'village_pond';
        world.show(set); setFog(set);
        rig.key.target.position.set(...world.sunTarget(set)); rig.key.target.updateMatrixWorld();
        world.update(t);
        const present = new Set((ln.cast || []).map((c) => c.id));
        for (const [id, a] of Object.entries(cast)) a.h.root.visible = present.has(id);
        const placed = {};
        for (const c of ln.cast || []) {
          const a = cast[c.id]; if (!a) throw new Error(`line ${i}: unknown character "${c.id}" (add it to "cast")`);
          placed[c.id] = placeActor(a, c, lt, d || dur0);
          pose(a, c, lt, d || dur0, t, ln, placed[c.id].walking);
          props(a, c);
        }
        // camera (after the actors are placed: a camera can look at a character)
        const spec = ln.cam || DEFAULT_CAM;
        const tp = typeof spec.target === 'string' ? cast[spec.target].h.root.position : new THREE.Vector3(...(spec.target || [0, 0, 0]));
        const focus = camPose(spec, lt / (d || dur0), tp, cam);
        // characters with face: 'cam' turn to the camera
        for (const c of ln.cast || []) if (c.face === 'cam') cast[c.id].h.root.rotation.y = Math.atan2(cam.position.x - placed[c.id].x, cam.position.z - placed[c.id].z);
        // fishing line: rod tip → float
        const lineCast = (ln.cast || []).find((c) => c.line && c.hold === 'rod');
        if (lineCast) {
          const rod = cast[lineCast.id].props[`${lineCast.hand || 'R'}:rod`];
          if (rod) {
            const tip = rod.userData.tip.clone(); rod.localToWorld(tip);
            const flo = world.pond.bob.getWorldPosition(new THREE.Vector3());
            fishLine.geometry.setFromPoints([tip, flo]); fishLine.visible = true;
          }
        } else fishLine.visible = false;
        // the golden fish flying out of the pond
        fish.visible = false;
        for (const f of ln.fx || []) if (f.kind === 'fish' && lt >= f.t0 && lt <= f.t1) {
          const q = (lt - f.t0) / (f.t1 - f.t0);
          fish.visible = true;
          fish.position.set(lerp(f.from[0], f.to[0], q), lerp(f.from[1], f.to[1], q) + Math.sin(q * Math.PI) * (f.h || 1), lerp(f.from[2], f.to[2], q));
          fish.rotation.set(0, 0, Math.sin(q * Math.PI * 3) * 0.6);
        }
        E.render(scene, cam, { focus, aperture: spec.aperture ?? 0.0015, bloom: 0.22, bloomThreshold: 0.9, vignette: 0.2, sat: 1.1, warm: 0.02, grain: 0.006, t });
        blit();
      },
    });
  });
  // for checks: where every character stands (tools and tests read it through window.OP)
  const actors = () => ({ _camera: { at: cam.position.toArray().map((v) => +v.toFixed(2)), fov: cam.fov }, ...Object.fromEntries(Object.entries(cast).map(([k, a]) => [k, { visible: a.h.root.visible, x: +a.h.root.position.x.toFixed(2), z: +a.h.root.position.z.toFixed(2), scale: +a.h.root.scale.x.toFixed(3) }])) });
  return { shots, cues, actors };
}
