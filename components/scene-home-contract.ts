import type * as THREE from "three";

export type SceneMode = "tent" | "campfire";
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Geometry is local and grounded. Only the shared renderer places the home. */
export interface HomeModel {
  name: string;
  supported: boolean;
  footprint: Bounds;
  memberArea: Bounds;
  focalPoint: { x: number; y: number; z: number };
  labelClearance: number;
  framing: { height: number; radius: number; fov: number; minYaw: number; maxYaw: number };
  create: (three: typeof THREE) => THREE.Group;
}

export const memberArea: Bounds = { minX: -7.2, maxX: 7.2, minZ: -2.8, maxZ: 5.2 };
export const framing = { height: 7.4, radius: 15.6, fov: 46, minYaw: -.72, maxYaw: .72 };
export const focalPoint = { x: 0, y: 1.75, z: 0 };
export const homePlacement = (mode: SceneMode) => ({ z: mode === "campfire" ? -4.8 : -2.6, scale: mode === "campfire" ? .78 : 1 });

/** The real fire each mode centers on -- the default heading target for every character (#174). */
export const fireFocus = (mode: SceneMode) => ({ x: 0, z: mode === "campfire" ? .5 : 1.15 });

/** Keep Three.js behind the renderer's lazy boundary, including model factories. */
export function modelBuilder(three: typeof THREE) {
  const group = new three.Group();
  function mesh(geometry: THREE.BufferGeometry, color: number, emissive = 0) {
    const value = new three.Mesh(geometry, new three.MeshStandardMaterial({ color, emissive, roughness: .82 }));
    value.castShadow = true;
    value.receiveShadow = true;
    return value;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, emissive = 0) {
    const value = mesh(new three.BoxGeometry(w, h, d), color, emissive);
    value.position.set(x, y, z);
    group.add(value);
    return value;
  }
  function gable(x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
    const shape = new three.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath();
    const value = mesh(new three.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }), color);
    value.position.set(x, y, z - d / 2);
    group.add(value);
    return value;
  }
  function window(x: number, y: number, z: number, w = .7, h = .85) {
    box(x, y, z, w + .14, h + .14, .12, 0xeadcc4);
    box(x, y, z + .07, w, h, .04, 0xffd38a, 0x70451c);
    box(x, y, z + .1, .045, h, .04, 0x725743);
  }
  return { group, mesh, box, gable, window };
}

/** Project into a home-safe rectangle, then around the fire; validate both together. */
export function groundPosition(point: { x: number; z: number }, mode: SceneMode, model: HomeModel) {
  const area = model.memberArea;
  const placement = homePlacement(mode);
  const footprint = {
    minX: model.footprint.minX * placement.scale - .45,
    maxX: model.footprint.maxX * placement.scale + .45,
    minZ: model.footprint.minZ * placement.scale + placement.z - .45,
    maxZ: model.footprint.maxZ * placement.scale + placement.z + .45,
  };
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  let x = clamp(point.x, area.minX, area.maxX);
  let z = clamp(point.z, area.minZ, area.maxZ);
  const fireZ = fireFocus(mode).z;
  const insideHome = (px: number, pz: number) => px > footprint.minX && px < footprint.maxX && pz > footprint.minZ && pz < footprint.maxZ;
  const valid = (px: number, pz: number) => px >= area.minX && px <= area.maxX && pz >= area.minZ && pz <= area.maxZ && !insideHome(px, pz) && Math.hypot(px, pz - fireZ) >= 1.65 - 1e-8;
  if (valid(x, z)) return { x, y: 0, z };
  const candidates = [
    { x: footprint.minX, z }, { x: footprint.maxX, z },
    { x, z: footprint.maxZ }, { x, z: footprint.minZ },
  ];
  // The circle and footprint may overlap. Evaluate candidates against BOTH exclusions.
  for (let i = 0; i < 64; i++) {
    const angle = i * Math.PI / 32;
    candidates.push({ x: Math.cos(angle) * 1.65, z: fireZ + Math.sin(angle) * 1.65 });
  }
  candidates.push({ x: area.minX, z: area.maxZ }, { x: area.maxX, z: area.maxZ });
  const nearest = candidates.filter(p => valid(p.x, p.z)).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  if (nearest) { x = nearest.x; z = nearest.z; }
  return { x, y: 0, z };
}
