"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import type { RosterMemberView } from "@/components/app-shell";
import type { UserProfile } from "@/components/avatar";
import { createPerson } from "./scene-person";
import { addLandscape } from "./scene-landscape";
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
  | { kind: "person"; pointerId: number; memberId: number; startX: number; startY: number; moved: boolean; offset: THREE.Vector3 };

type SceneRuntime = {
  camera: THREE.PerspectiveCamera;
  people: Map<number, THREE.Group>;
  render: () => void;
};

const HOME_NAMES = ["Tent", "Trailer", "Cabin", "Apartment", "House", "Mansion"];
const CAMERA_HEIGHT = 7.4;
const CAMERA_RADIUS = 15.6;
const CAMERA_MIN_YAW = -0.72;
const CAMERA_MAX_YAW = 0.72;
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


function roof(width: number, depth: number, color: number) {
  const w = width * .72;
  const d = depth * .72;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -w, -1.17, d, w, -1.17, d, 0, 1.17, d,
    w, -1.17, -d, -w, -1.17, -d, 0, 1.17, -d,
    -w, -1.17, -d, -w, -1.17, d, 0, 1.17, d,
    -w, -1.17, -d, 0, 1.17, d, 0, 1.17, -d,
    0, 1.17, -d, 0, 1.17, d, w, -1.17, d,
    0, 1.17, -d, w, -1.17, d, w, -1.17, -d,
  ], 3));
  geometry.computeVertexNormals();
  const value = mesh(geometry, color);
  value.material.side = THREE.DoubleSide;
  return value;
}

function createHome() {
  const home = new THREE.Group();
    const tent = roof(4.25, 3.8, 0xca673b);
    tent.scale.y = 1.7;
    tent.position.y = 1.99;
    home.add(tent);
    const openingGeometry = new THREE.BufferGeometry();
    openingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-1.55, .04, 2.75, 1.55, .04, 2.75, 0, 3.55, 2.75], 3));
    openingGeometry.computeVertexNormals();
    const opening = mesh(openingGeometry, 0xffd084, { emissive: 0xa64c15 });
    home.add(opening);
    const pole = mesh(new THREE.CylinderGeometry(.045, .045, 4.05, 8), 0x633821);
    pole.position.set(0, 2, 2.79);
    home.add(pole);
    for (const side of [-1, 1]) {
      const ropeGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(side * .12, 3.8, 2.76), new THREE.Vector3(side * 3.6, .04, 3.35)]);
      home.add(new THREE.Line(ropeGeometry, new THREE.LineBasicMaterial({ color: 0xb89d6d })));
      const stake = mesh(new THREE.CylinderGeometry(.04, .045, .35, 6), 0x523b2c);
      stake.position.set(side * 3.6, .13, 3.35);
      stake.rotation.z = side * .35;
      home.add(stake);
    }
    const lamp = new THREE.PointLight(0xffb555, 4, 6, 2);
    lamp.position.set(0, 1.4, 3);
    home.add(lamp);
  home.name = "Tent";
  home.scale.setScalar(.88);
  return home;
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
  const safeCount = Math.max(count, 1);
  const layer = Math.floor(index / 14);
  const angle = index / Math.min(safeCount, 14) * Math.PI * 2 + (layer ? .2 : 0);
  const radiusX = (mode === "campfire" ? 3.7 : 4.3) + layer * 1.05;
  const radiusZ = (mode === "campfire" ? 2.55 : 2.9) + layer * .7;
  const focusX = 0;
  const focusZ = mode === "campfire" ? .5 : 1.15;
  return new THREE.Vector3(focusX + Math.cos(angle) * radiusX, 0, focusZ + Math.sin(angle) * radiusZ);
}

function validGroundPosition(point: THREE.Vector3, mode: SceneMode, stage: number) {
  const focusX = 0;
  const focusZ = mode === "campfire" ? .5 : 1.15;
  let x = clamp(point.x, -7.2, 7.2);
  let z = clamp(point.z, -2.8, 5.2);
  const dx = x - focusX;
  const dz = z - focusZ;
  const distance = Math.hypot(dx, dz);
  if (distance < 1.65) {
    const angle = distance < .001 ? 0 : Math.atan2(dz, dx);
    x = focusX + Math.cos(angle) * 1.65;
    z = focusZ + Math.sin(angle) * 1.65;
  }
  if (mode === "tent") {
    const safeStage = clamp(Math.round(stage), 0, 5);
    const halfWidth = [2.6, 2.7, 2.7, 2.45, 3, 4.35][safeStage];
    if (Math.abs(x) < halfWidth && z < -.15) z = -.15;
  }
  return new THREE.Vector3(x, GROUND_Y, z);
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const item of materials) item.dispose();
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
  const selectedRef = useRef(selectedMemberId);
  const selectRef = useRef(onSelectMember);
  const rosterRef = useRef(roster);
  const [webGlFailed, setWebGlFailed] = useState(false);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    selectedRef.current = selectedMemberId;
    selectRef.current = onSelectMember;
    rosterRef.current = roster;
  }, [selectedMemberId, onSelectMember, roster]);

  useEffect(() => {
    positionsRef.current.clear();
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

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
    let yaw = 0;
    const updateCamera = () => {
      const portraitScale = camera.aspect < .78 ? .78 / Math.max(camera.aspect, .35) : 1;
      const radius = CAMERA_RADIUS * portraitScale;
      camera.position.set(Math.sin(yaw) * radius, CAMERA_HEIGHT, Math.cos(yaw) * radius);
      camera.lookAt(0, 1.75, -.1);
      root.dataset.cameraYaw = yaw.toFixed(3);
      root.dataset.cameraY = CAMERA_HEIGHT.toFixed(1);
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

    const home = createHome();
    home.position.set(0, 0, isCampfire ? -4.8 : -2.6);
    if (isCampfire) home.scale.multiplyScalar(.78);
    scene.add(home);
    const fire = addFire(scene, 0, isCampfire ? .5 : 1.15, isCampfire);
    if (isCampfire) {
      addLogSeat(scene, -3.5, 1.2, -.18);
      addLogSeat(scene, 3.5, 1.2, .18);
      addLogSeat(scene, -2.15, 3.25, -.8);
      addLogSeat(scene, 2.15, 3.25, .8);
    }

    const personGroups = new Map<number, THREE.Group>();
    let positions = positionsRef.current.get(mode);
    if (!positions) {
      positions = new Map();
      positionsRef.current.set(mode, positions);
    }
    if (people) {
      roster.forEach((member, index) => {
        const person = createPerson(member, profile);
        const saved = positions?.get(member.personId);
        const position = validGroundPosition(saved ?? defaultPersonPosition(index, roster.length, mode), mode, stage);
        person.position.copy(position);
        person.rotation.y = Math.atan2((isCampfire ? 0 : 1.25) - position.x, (isCampfire ? .5 : 1.15) - position.z);
        person.scale.setScalar(roster.length > 20 ? .77 : roster.length > 14 ? .86 : .94);
        scene.add(person);
        personGroups.set(member.personId, person);
      });
    }

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
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(46) / 2) / Math.min(camera.aspect, 1.25)));
      camera.setViewOffset(width, height, 0, height * (width < height ? .08 : .015), width, height);
      camera.updateProjectionMatrix();
    };
    const render = () => renderer.render(scene, camera);
    const projectLabels = () => {
      for (const [memberId, person] of personGroups) {
        const button = labelRefs.current.get(memberId);
        if (!button) continue;
        const projected = person.position.clone();
        projected.y = 2.8;
        projected.project(camera);
        const visible = projected.z < 1;
        button.style.display = visible ? "grid" : "none";
        button.style.left = `${(projected.x * .5 + .5) * root.clientWidth}px`;
        button.style.top = `${(-projected.y * .5 + .5) * root.clientHeight}px`;
        button.dataset.personId = String(memberId);
        button.dataset.groundX = person.position.x.toFixed(3);
        button.dataset.groundZ = person.position.z.toFixed(3);
      }
    };
    const animate = (timestamp: number) => {
      const flame = fire.userData.flame;
      if (!reduceMotion && flame instanceof THREE.Mesh) {
        const pulse = 1 + Math.sin(timestamp * .009) * .08 + Math.sin(timestamp * .017) * .035;
        flame.scale.set(1 / pulse, pulse, 1 / pulse);
      }
      for (const [memberId, person] of personGroups) {
        const selected = selectedRef.current === memberId;
        const base = roster.length > 20 ? .77 : roster.length > 14 ? .86 : .94;
        person.scale.setScalar(selected ? base * 1.12 : base);
        // Keep the saved face readable as the viewer looks around the clearing.
        person.rotation.y = Math.atan2(camera.position.x - person.position.x, camera.position.z - person.position.z);
      }
      projectLabels();
      render();
      animationFrame = requestAnimationFrame(animate);
    };
    const start = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      setPointer(event);
      const memberId = memberAtPointer();
      if (memberId !== null) {
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
        yaw = clamp(drag.startYaw - (event.clientX - drag.startX) * .0048, CAMERA_MIN_YAW, CAMERA_MAX_YAW);
        updateCamera();
      } else {
        drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        if (!drag.moved) return;
        const person = personGroups.get(drag.memberId);
        setPointer(event);
        if (person && raycaster.ray.intersectPlane(dragPlane, planeHit)) {
          const position = validGroundPosition(planeHit.clone().add(drag.offset), mode, stage);
          person.position.copy(position);
          person.rotation.y = Math.atan2((isCampfire ? 0 : 1.25) - position.x, (isCampfire ? .5 : 1.15) - position.z);
          positions?.set(drag.memberId, position.clone());
          drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        }
      }
      render();
      event.preventDefault();
    };
    const end = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
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
      yaw = clamp(yaw + horizontal * .0016, CAMERA_MIN_YAW, CAMERA_MAX_YAW);
      updateCamera();
      setShowHint(false);
      event.preventDefault();
    };
    const key = (event: KeyboardEvent) => {
      if (drag) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        yaw = clamp(yaw + (event.key === "ArrowLeft" ? -.12 : .12), CAMERA_MIN_YAW, CAMERA_MAX_YAW);
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
  }, [mode, people, profile, resetKey, roster, stage, time]);

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

  return (
    <div
      ref={rootRef}
      className={styles.scene}
      data-scene-mode={mode}
      data-home-stage={HOME_NAMES[clamp(Math.round(stage), 0, 5)]}
      data-camera-pitch="locked"
      aria-label={`${mode === "campfire" ? "Campfire" : "Tent"} scene with ${HOME_NAMES[clamp(Math.round(stage), 0, 5)]} home`}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label={`Interactive 3D ${HOME_NAMES[clamp(Math.round(stage), 0, 5)]}. Drag empty ground or use left and right arrow keys to look around. Drag a person to rearrange the gathering.`}
      />
      {webGlFailed && <div className={styles.fallback} role="img">Your group is gathered around a warm campfire.</div>}
      {showHint && !webGlFailed && <p className={styles.hint}>Drag to look around · drag a person to move them</p>}
      {people && (
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
              aria-label={`${member.name}${member.isSelf ? ", you" : ""}${member.readToday ? ", read today" : ""}. Press Enter to view profile; arrow keys move this person.`}
              onClick={() => onSelectMember(member)}
              onKeyDown={event => {
                const amount = event.shiftKey ? .8 : .35;
                if (event.key === "ArrowLeft") moveMemberWithKeyboard(member.personId, -amount, 0);
                else if (event.key === "ArrowRight") moveMemberWithKeyboard(member.personId, amount, 0);
                else if (event.key === "ArrowUp") moveMemberWithKeyboard(member.personId, 0, -amount);
                else if (event.key === "ArrowDown") moveMemberWithKeyboard(member.personId, 0, amount);
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
