"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import type { RosterMemberView } from "@/components/app-shell";
import type { UserProfile } from "@/components/avatar";
import { createPerson } from "./scene-person";
import { addLandscape } from "./scene-landscape";
import { fireFocus, groundPosition, homePlacement } from "./scene-home-contract";
import { modelFor } from "./scene-home-registry";
import {
  clearAllSceneOrientations,
  clearSceneOrientation,
  headingToward,
  loadSceneOrientations,
  normalizeAngle,
  orientationScope,
  ROTATE_STEP,
  saveSceneOrientation,
} from "@/lib/scene-orientation";
import styles from "./immersive-home-scene.module.css";

type SceneMode = "tent" | "campfire";
type SceneTime = "Day" | "Sunset" | "Night";

type ImmersiveHomeSceneProps = {
  stage: number;
  mode: SceneMode;
  time: SceneTime;
  roster: RosterMemberView[];
  profile: UserProfile;
  people: boolean;
  names: boolean;
  selectedMemberId: number | null;
  onSelectMember: (member: RosterMemberView) => void;
  resetKey: number;
};

type DragState =
  | { kind: "camera"; pointerId: number; startX: number; startYaw: number }
  | { kind: "person"; pointerId: number; memberId: number; startX: number; startY: number; moved: boolean; offset: THREE.Vector3 }
  | { kind: "rotate"; pointerId: number; memberId: number; startX: number; startYaw: number };

type SceneRuntime = {
  camera: THREE.PerspectiveCamera;
  people: Map<number, THREE.Group>;
  render: () => void;
};

const GROUND_Y = 0;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}


function mesh(
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  options: { roughness?: number; emissive?: THREE.ColorRepresentation; cast?: boolean } = {},
) {
  const item = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? .82,
      emissive: options.emissive ?? 0x000000,
    }),
  );
  item.castShadow = options.cast ?? true;
  item.receiveShadow = true;
  return item;
}

function addTree(scene: THREE.Scene, x: number, z: number, scale: number, tint: number) {
  const tree = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(.16, .24, 1.4, 7), 0x503824);
  trunk.position.y = .7;
  tree.add(trunk);
  for (let layer = 0; layer < 3; layer += 1) {
    const crown = mesh(new THREE.ConeGeometry(.95 - layer * .14, 1.75, 8), tint);
    crown.position.y = 1.45 + layer * .58;
    tree.add(crown);
  }
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  scene.add(tree);
}


function addFire(scene: THREE.Scene, x: number, z: number, strong: boolean) {
  const fire = new THREE.Group();
  for (let index = 0; index < 10; index += 1) {
    const stone = mesh(new THREE.DodecahedronGeometry(.28, 0), index % 2 ? 0x655f54 : 0x817969);
    const angle = index / 10 * Math.PI * 2;
    stone.position.set(Math.cos(angle) * .9, .18, Math.sin(angle) * .9);
    fire.add(stone);
  }
  for (const rotation of [-.55, .55]) {
    const log = mesh(new THREE.CylinderGeometry(.14, .18, 1.55, 8), 0x56331f);
    log.rotation.set(Math.PI / 2, 0, rotation);
    log.position.y = .32;
    fire.add(log);
  }
  const outer = mesh(new THREE.ConeGeometry(.55, 1.7, 7), 0xff6b24, { emissive: 0xb52e06 });
  outer.position.y = 1;
  fire.add(outer);
  const inner = mesh(new THREE.ConeGeometry(.3, 1.25, 7), 0xffe077, { emissive: 0xff7a00 });
  inner.position.y = .95;
  fire.add(inner);
  const light = new THREE.PointLight(0xff8b3d, strong ? 7 : 4, strong ? 13 : 9, 1.6);
  light.position.y = 2.2;
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  fire.add(light);
  fire.position.set(x, 0, z);
  fire.userData.flame = outer;
  scene.add(fire);
  return fire;
}

function addLogSeat(scene: THREE.Scene, x: number, z: number, rotation: number) {
  const log = mesh(new THREE.CylinderGeometry(.28, .36, 2.2, 9), 0x6f4328);
  log.rotation.set(Math.PI / 2, 0, rotation);
  log.position.set(x, .42, z);
  scene.add(log);
}

function defaultPersonPosition(index: number, count: number, mode: SceneMode) {
  if (count > 14) {
    const columns = 6;
    const x = [-5.4, -3.55, -1.7, 1.7, 3.55, 5.4][index % columns];
    return new THREE.Vector3(x, 0, .95 + Math.floor(index / columns) * 1.04);
  }
  const safeCount = Math.max(count, 1);
  const layer = Math.floor(index / 14);
  const angle = index / Math.min(safeCount, 14) * Math.PI * 2 + (layer ? .2 : 0);
  const radiusX = (mode === "campfire" ? 3.7 : 4.3) + layer * 1.05;
  const radiusZ = (mode === "campfire" ? 2.55 : 2.9) + layer * .7;
  const focus = fireFocus(mode);
  return new THREE.Vector3(focus.x + Math.cos(angle) * radiusX, 0, focus.z + Math.sin(angle) * radiusZ);
}

function validGroundPosition(point: THREE.Vector3, mode: SceneMode, stage: number) {
  const model = modelFor(stage);
  if (!model) return new THREE.Vector3(0, GROUND_Y, 4);
  const { x, y, z } = groundPosition(point, mode, model);
  return new THREE.Vector3(x, y, z);
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse(object => {
    if (object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight || object instanceof THREE.SpotLight) object.shadow.dispose();
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const item of materials) {
        const map = (item as THREE.MeshBasicMaterial).map;
        if (map) map.dispose();
        item.dispose();
      }
    }
  });
}

export function ImmersiveHomeScene({
  stage,
  mode,
  time,
  roster,
  profile,
  people,
  names,
  selectedMemberId,
  onSelectMember,
  resetKey,
}: ImmersiveHomeSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const labelRefs = useRef(new Map<number, HTMLButtonElement>());
  const positionsRef = useRef(new Map<SceneMode, Map<number, THREE.Vector3>>());
  const yawsRef = useRef(new Map<SceneMode, Map<number, number>>());
  const selectedRef = useRef(selectedMemberId);
  const selectRef = useRef(onSelectMember);
  const rosterRef = useRef(roster);
  const [webGlFailed, setWebGlFailed] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const model = modelFor(stage);
  const selectedMember = roster.find(member => member.personId === selectedMemberId) ?? null;

  useEffect(() => {
    selectedRef.current = selectedMemberId;
    selectRef.current = onSelectMember;
    rosterRef.current = roster;
  }, [selectedMemberId, onSelectMember, roster]);

  useEffect(() => {
    positionsRef.current.clear();
  }, [resetKey, stage]);

  // Reset view returns everyone to their default fire-facing heading (#174).
  useEffect(() => {
    yawsRef.current.clear();
    clearAllSceneOrientations(rosterRef.current);
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root || !model?.supported) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      const frame = requestAnimationFrame(() => setWebGlFailed(true));
      return () => cancelAnimationFrame(frame);
    }

    const readyFrame = requestAnimationFrame(() => setWebGlFailed(false));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = time === "Night" || mode === "campfire" ? 1.18 : 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const palette = time === "Day"
      ? { sky: 0x7099a2, fog: 0x78989a, ambient: 1.75, sun: 2.7 }
      : time === "Sunset"
        ? { sky: 0xa6695b, fog: 0x78594f, ambient: 1.05, sun: 2.1 }
        : { sky: 0x112b42, fog: 0x173640, ambient: .55, sun: .65 };
    const isCampfire = mode === "campfire";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isCampfire ? 0x102c3b : palette.sky);
    scene.fog = new THREE.Fog(isCampfire ? 0x173936 : palette.fog, 15, 35);

    const camera = new THREE.PerspectiveCamera(42, 1, .1, 70);
    const { height, radius, minYaw, maxYaw } = model.framing;
    let yaw = 0;
    const updateCamera = () => {
      camera.position.set(model.focalPoint.x + Math.sin(yaw) * radius, height, model.focalPoint.z + Math.cos(yaw) * radius);
      camera.lookAt(model.focalPoint.x, model.focalPoint.y, model.focalPoint.z);
      root.dataset.cameraYaw = yaw.toFixed(3);
      root.dataset.cameraY = camera.position.y.toFixed(3);
      root.dataset.cameraRadius = radius.toFixed(3);
      root.dataset.cameraPitchRadians = Math.atan2(height - model.focalPoint.y, radius).toFixed(6);
    };
    updateCamera();

    const ambient = new THREE.HemisphereLight(isCampfire ? 0xa0bacb : 0xe0e6e0, 0x314334, isCampfire ? .85 : palette.ambient + .5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(time === "Sunset" ? 0xffb06f : 0xfff0ca, isCampfire ? .48 : palette.sun);
    sun.position.set(-7, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    const ground = mesh(new THREE.CircleGeometry(22, 48), isCampfire ? 0x274a36 : 0x416846, { cast: false });
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    addLandscape(scene, isCampfire || time === 'Night', time === 'Sunset');
    const treeLayout: Array<[number, number, number]> = [
      [-11, -5, 2.1], [-8.3, -6, 1.55], [-6.2, -7.4, 1.7], [7, -7.5, 1.75], [9.4, -6.1, 1.7], [12, -4, 2.2],
      [-10.5, 1.5, 1.5], [-8.6, 4.2, 1.3], [9.1, 3.7, 1.35], [11, .8, 1.6],
    ];
    treeLayout.forEach(([x, z, scale], index) => addTree(scene, x, z, scale, index % 2 ? 0x17473d : 0x1d5346));
    for (let index = 0; index < 24; index++) {
      addTree(scene, -19 + index * 1.65, -12 - (index % 3) * 1.9, 1.1 + (index % 4) * .18, index % 2 ? 0x234d43 : 0x1b403b);
    }

    const home = model.create(THREE);
    const placement = homePlacement(mode);
    home.position.set(0, GROUND_Y, placement.z);
    home.scale.multiplyScalar(placement.scale);
    root.dataset.homePosition = home.position.toArray().join(",");
    scene.add(home);
    const fire = addFire(scene, 0, isCampfire ? .5 : 1.15, isCampfire);
    if (isCampfire) {
      addLogSeat(scene, -3.5, 1.2, -.18);
      addLogSeat(scene, 3.5, 1.2, .18);
      addLogSeat(scene, -2.15, 3.25, -.8);
      addLogSeat(scene, 2.15, 3.25, .8);
    }

    const personGroups = new Map<number, THREE.Group>();
    const focus = fireFocus(mode);
    const scope = orientationScope(mode, roster);
    let positions = positionsRef.current.get(mode);
    if (!positions) {
      positions = new Map();
      positionsRef.current.set(mode, positions);
    }
    let yaws = yawsRef.current.get(mode);
    if (!yaws) {
      yaws = loadSceneOrientations(scope);
      yawsRef.current.set(mode, yaws);
    }
    if (people) {
      roster.forEach((member, index) => {
        const person = createPerson(member, profile);
        const saved = positions?.get(member.personId);
        let position = validGroundPosition(saved ?? defaultPersonPosition(index, roster.length, mode), mode, stage);
        if (!saved) {
          const spacing = roster.length > 20 ? 1 : 1.2;
          const clear = (p: THREE.Vector3) => Array.from(personGroups.values()).every(other => other.position.distanceTo(p) >= spacing);
          if (!clear(position)) {
            const candidates: THREE.Vector3[] = [];
            for (let x = model.memberArea.minX; x <= model.memberArea.maxX; x += .5) {
              for (let z = model.memberArea.minZ; z <= model.memberArea.maxZ; z += .5) {
                const candidate = validGroundPosition(new THREE.Vector3(x, 0, z), mode, stage);
                if (clear(candidate)) candidates.push(candidate);
              }
            }
            candidates.sort((a,b) => a.distanceToSquared(position) - b.distanceToSquared(position));
            position = candidates[0] ?? position;
          }
        }
        person.position.copy(position);
        // Manual yaw survives; otherwise face this mode's real fire from the final placed spot.
        person.rotation.y = yaws?.get(member.personId) ?? headingToward(position, focus);
        person.scale.setScalar(roster.length > 20 ? .77 : roster.length > 14 ? .86 : .94);
        scene.add(person);
        personGroups.set(member.personId, person);
      });
    }

    // Turntable ring under the selected character -- dragging it rotates yaw only (#174).
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(.62, .74, 40),
      new THREE.MeshBasicMaterial({ color: 0xe7a72f, side: THREE.DoubleSide, transparent: true, opacity: .95 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .025;
    ring.visible = false;
    scene.add(ring);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
    const planeHit = new THREE.Vector3();
    let drag: DragState | null = null;
    let animationFrame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const memberAtPointer = () => {
      const hit = raycaster.intersectObjects(Array.from(personGroups.values()), true)[0];
      if (!hit) return null;
      let candidate: THREE.Object3D | null = hit.object;
      while (candidate) {
        if (typeof candidate.userData.memberId === "number") return candidate.userData.memberId;
        candidate = candidate.parent;
      }
      return null;
    };
    const resize = () => {
      const width = Math.max(root.clientWidth, 1);
      const height = Math.max(root.clientHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Fit the clearing's width in portrait without changing camera elevation.
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(model.framing.fov) / 2) / Math.min(camera.aspect, 1.25)));
      camera.setViewOffset(width, height, 0, height * (width < height ? .08 : .015), width, height);
      camera.updateProjectionMatrix();
    };
    const render = () => renderer.render(scene, camera);
    const projectLabels = () => {
      const placed: Array<{ x: number; y: number; width: number }> = [];
      const labels: Array<{ button: HTMLButtonElement; x: number; y: number; width: number }> = [];
      for (const [memberId, person] of personGroups) {
        const button = labelRefs.current.get(memberId);
        if (!button) continue;
        const projected = person.position.clone();
        projected.y = model.labelClearance * person.scale.y;
        projected.project(camera);
        const visible = projected.z < 1;
        button.style.display = visible ? "grid" : "none";
        const width = Math.max(34, (button.textContent?.length ?? 0) * (roster.length > 20 ? 5.5 : 6.5) + 8);
        labels.push({ button, x: clamp((projected.x * .5 + .5) * root.clientWidth, width / 2, root.clientWidth - width / 2), y: (-projected.y * .5 + .5) * root.clientHeight, width });
        button.dataset.personId = String(memberId);
        button.dataset.groundX = person.position.x.toFixed(3);
        button.dataset.groundZ = person.position.z.toFixed(3);
      }
      // Keep labels above their people while separating colliding text rows.
      labels.sort((a,b) => b.y - a.y);
      for (const label of labels) {
        let y = label.y;
        while (y > label.y - 16 && placed.some(other => Math.abs(other.y - y) < 13 && Math.abs(other.x - label.x) < (other.width + label.width) / 2)) y -= 14;
        label.button.style.left = `${label.x}px`;
        label.button.style.top = `${y}px`;
        placed.push({ x: label.x, y, width: label.width });
      }
    };
    const animate = (timestamp: number) => {
      const flame = fire.userData.flame;
      if (!reduceMotion && flame instanceof THREE.Mesh) {
        const pulse = 1 + Math.sin(timestamp * .009) * .08 + Math.sin(timestamp * .017) * .035;
        flame.scale.set(1 / pulse, pulse, 1 / pulse);
      }
      const selectedPerson = selectedRef.current === null ? undefined : personGroups.get(selectedRef.current);
      for (const [memberId, person] of personGroups) {
        const selected = selectedRef.current === memberId;
        const base = roster.length > 20 ? .77 : roster.length > 14 ? .86 : .94;
        person.scale.setScalar(selected ? base * 1.12 : base);
      }
      ring.visible = !!selectedPerson;
      if (selectedPerson) ring.position.set(selectedPerson.position.x, .025, selectedPerson.position.z);
      projectLabels();
      render();
      animationFrame = requestAnimationFrame(animate);
    };
    const start = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      setPointer(event);
      const selectedId = selectedRef.current;
      // The turntable ring only wins when it is the nearest hit, so rotation never fights repositioning (#101).
      const ringFirst = selectedId !== null && ring.visible
        && raycaster.intersectObjects([ring, ...Array.from(personGroups.values())], true)[0]?.object === ring;
      const memberId = ringFirst ? null : memberAtPointer();
      if (ringFirst && selectedId !== null) {
        const person = personGroups.get(selectedId);
        drag = { kind: "rotate", pointerId: event.pointerId, memberId: selectedId, startX: event.clientX, startYaw: person?.rotation.y ?? 0 };
        root.dataset.dragging = "rotate";
      } else if (memberId !== null) {
        const offset = new THREE.Vector3();
        const person = personGroups.get(memberId);
        if (person && raycaster.ray.intersectPlane(dragPlane, planeHit)) offset.copy(person.position).sub(planeHit);
        drag = { kind: "person", pointerId: event.pointerId, memberId, startX: event.clientX, startY: event.clientY, moved: false, offset };
        root.dataset.dragging = "person";
      } else {
        drag = { kind: "camera", pointerId: event.pointerId, startX: event.clientX, startYaw: yaw };
        root.dataset.dragging = "camera";
      }
      canvas.setPointerCapture(event.pointerId);
      setShowHint(false);
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.kind === "camera") {
        yaw = clamp(drag.startYaw - (event.clientX - drag.startX) * .0048, minYaw, maxYaw);
        updateCamera();
      } else if (drag.kind === "rotate") {
        const person = personGroups.get(drag.memberId);
        if (person) person.rotation.y = normalizeAngle(drag.startYaw + (event.clientX - drag.startX) * .012);
      } else {
        drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        if (!drag.moved) return;
        const person = personGroups.get(drag.memberId);
        setPointer(event);
        if (person && raycaster.ray.intersectPlane(dragPlane, planeHit)) {
          const position = validGroundPosition(planeHit.clone().add(drag.offset), mode, stage);
          person.position.copy(position);
          // Repositioning preserves the current heading; only placement sets the default.
          positions?.set(drag.memberId, position.clone());
          drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        }
      }
      render();
      event.preventDefault();
    };
    const end = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.kind === "rotate") {
        const person = personGroups.get(drag.memberId);
        if (person) {
          const yawValue = normalizeAngle(person.rotation.y);
          yaws?.set(drag.memberId, yawValue);
          saveSceneOrientation(scope, drag.memberId, yawValue);
        }
      }
      if (event.type === 'pointerup' && drag.kind === "person" && !drag.moved) {
        const memberId = drag.memberId;
        const member = rosterRef.current.find(candidate => candidate.personId === memberId);
        if (member) selectRef.current(member);
      }
      drag = null;
      delete root.dataset.dragging;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      if (drag) { event.preventDefault(); return; }
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      yaw = clamp(yaw + horizontal * .0016, minYaw, maxYaw);
      updateCamera();
      setShowHint(false);
      event.preventDefault();
    };
    const key = (event: KeyboardEvent) => {
      if (drag) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        yaw = clamp(yaw + (event.key === "ArrowLeft" ? -.12 : .12), minYaw, maxYaw);
        updateCamera();
        setShowHint(false);
        event.preventDefault();
      }
      if (event.key === "Home") {
        yaw = 0;
        updateCamera();
        event.preventDefault();
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(root);
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("keydown", key);
    resize();
    runtimeRef.current = { camera, people: personGroups, render };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(readyFrame);
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", key);
      runtimeRef.current = null;
      disposeScene(scene);
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      renderer.dispose();
    };
  }, [mode, model, people, profile, resetKey, roster, stage, time]);

  function moveMemberWithKeyboard(memberId: number, dx: number, dz: number) {
    const person = runtimeRef.current?.people.get(memberId);
    if (!person) return;
    const next = validGroundPosition(person.position.clone().add(new THREE.Vector3(dx, 0, dz)), mode, stage);
    person.position.copy(next);
    let positions = positionsRef.current.get(mode);
    if (!positions) {
      positions = new Map();
      positionsRef.current.set(mode, positions);
    }
    positions.set(memberId, next.clone());
    runtimeRef.current?.render();
  }

  /** Yaw-only rotation, reachable without dragging (#174). Everyone interactive is rotatable. */
  function rotateMember(memberId: number, delta: number) {
    const person = runtimeRef.current?.people.get(memberId);
    if (!person) return;
    const yaw = normalizeAngle(person.rotation.y + delta);
    person.rotation.y = yaw;
    let yaws = yawsRef.current.get(mode);
    if (!yaws) {
      yaws = new Map();
      yawsRef.current.set(mode, yaws);
    }
    yaws.set(memberId, yaw);
    saveSceneOrientation(orientationScope(mode, rosterRef.current), memberId, yaw);
    runtimeRef.current?.render();
  }

  /** Restore the exact bonfire heading and make it the locally restored state. */
  function faceMemberToFire(memberId: number) {
    const person = runtimeRef.current?.people.get(memberId);
    if (!person) return;
    person.rotation.y = headingToward(person.position, fireFocus(mode));
    yawsRef.current.get(mode)?.delete(memberId);
    clearSceneOrientation(orientationScope(mode, rosterRef.current), memberId);
    runtimeRef.current?.render();
  }

  return (
    <div
      ref={rootRef}
      className={styles.scene}
      data-scene-mode={mode}
      data-large-roster={roster.length > 20}
      data-home-stage={model?.name}
      data-camera-pitch="locked"
      aria-label={`${mode === "campfire" ? "Campfire" : "Home"} scene with ${model?.name} home`}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label={`Interactive 3D ${model?.name}. Drag empty ground or use left and right arrow keys to look around. Drag a person to rearrange the gathering, or drag the ring under a selected person to rotate them toward the fire.`}
      />
      {webGlFailed && <div className={styles.fallback} role="status">3D is unavailable on this device. Choose Classic to explore your home, or People to view your group.</div>}
      {showHint && !webGlFailed && !selectedMember && <p className={styles.hint}>Drag to look around · drag a person to move them · drag their ring to rotate</p>}
      {people && !webGlFailed && selectedMember && (
        <div className={styles.rotateControls} role="group" aria-label={`Rotate ${selectedMember.name}`}>
          <button type="button" onClick={() => rotateMember(selectedMember.personId, -ROTATE_STEP)} aria-label={`Rotate ${selectedMember.name} 15 degrees counter-clockwise`}>↺ 15°</button>
          <button type="button" onClick={() => rotateMember(selectedMember.personId, ROTATE_STEP)} aria-label={`Rotate ${selectedMember.name} 15 degrees clockwise`}>↻ 15°</button>
          <button type="button" className={styles.faceFire} onClick={() => faceMemberToFire(selectedMember.personId)} aria-label={`Face ${selectedMember.name} toward the bonfire`}>Face fire</button>
        </div>
      )}
      {people && !webGlFailed && (
        <div className={styles.labels} aria-label="Group members">
          {roster.map(member => (
            <button
              key={member.personId}
              ref={element => {
                if (element) labelRefs.current.set(member.personId, element);
                else labelRefs.current.delete(member.personId);
              }}
              type="button"
              title={member.name}
              className={`${styles.memberLabel} ${selectedMemberId === member.personId ? styles.selected : ""}`}
              aria-label={`${member.name}${member.isSelf ? ", you" : ""}${member.readToday ? ", read today" : ""}. Press Enter to view profile; arrow keys move this person; Q and E rotate them; F faces them toward the fire.`}
              onClick={() => onSelectMember(member)}
              onKeyDown={event => {
                const amount = event.shiftKey ? .8 : .35;
                if (event.key === "ArrowLeft") moveMemberWithKeyboard(member.personId, -amount, 0);
                else if (event.key === "ArrowRight") moveMemberWithKeyboard(member.personId, amount, 0);
                else if (event.key === "ArrowUp") moveMemberWithKeyboard(member.personId, 0, -amount);
                else if (event.key === "ArrowDown") moveMemberWithKeyboard(member.personId, 0, amount);
                else if (event.key === "q" || event.key === "Q") rotateMember(member.personId, -ROTATE_STEP);
                else if (event.key === "e" || event.key === "E") rotateMember(member.personId, ROTATE_STEP);
                else if (event.key === "f" || event.key === "F") faceMemberToFire(member.personId);
                else return;
                event.preventDefault();
              }}
            >
              {names ? `${member.name.split(' ')[0]}${member.isSelf ? " · You" : ""}` : <span className="sr-only">{member.name}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
