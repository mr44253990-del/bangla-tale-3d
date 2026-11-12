// Camera moves. A line's "cam" object says where the camera orbits and how it moves across the line:
//   { target: 'rahim' | [x, y, z], look: 1.1, from: { d, yaw, h, fov }, to: { d, yaw, h, fov }, aperture: 0.0015 }
//   d   = distance from the target (m) · yaw = degrees around the target (0 = in front of it, + = to its right)
//   h   = camera height (m) · fov = VERTICAL lens angle (degrees) · look = height of the point the camera looks at (1.1 = chest)
// The frame is 9:16, so the sideways view is narrow: wide shots need a bigger fov (40+) or a bigger d. Check with snap.js.
// The move runs from `from` to `to` across the line (eased). The focus follows the target, so the background blurs.
import * as THREE from 'three';
import { clamp, eio, deg } from './lib.js';

export const DEFAULT_CAM = { target: [0, 0, 0], look: 1.1, from: { d: 7, yaw: 0, h: 1.5, fov: 36 }, to: { d: 6.2, yaw: 6, h: 1.5, fov: 36 } };

/** sets the camera for progress p (0..1). Returns the distance to the look point (used as the focus) */
export function camPose(spec, p, targetPos, cam) {
  const s = spec || DEFAULT_CAM, e = eio(clamp(p));
  const a = s.from || DEFAULT_CAM.from, b = s.to || a, look = s.look ?? 1.1;
  const mix = (x, y) => x + (y - x) * e;
  const d = mix(a.d, b.d), yaw = deg(mix(a.yaw, b.yaw)), h = mix(a.h, b.h);
  const fov = mix(a.fov ?? 30, b.fov ?? a.fov ?? 30);
  const tx = targetPos.x, ty = targetPos.y, tz = targetPos.z;
  cam.position.set(tx + d * Math.sin(yaw), ty + h, tz + d * Math.cos(yaw));
  cam.lookAt(tx, ty + look, tz);
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  return cam.position.distanceTo(new THREE.Vector3(tx, ty + look, tz));
}
