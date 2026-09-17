import * as THREE from "three";

import type { RosterMemberView } from "@/components/app-shell";
import type { AvatarConfig, UserProfile } from "@/components/avatar";

/** Face ink follows the Read My Bible avatar/peg palette: navy features on skin. */
const FACE_INK = "#172943";
const MOUTH_INK = "#8e4d40";

function avatarFor(member: RosterMemberView, profile: UserProfile): AvatarConfig {
  if (!member.isSelf) return member.avatar;
  return {
    gender: profile.gender,
    face: profile.face,
    hair: profile.hair,
    glasses: profile.glasses,
    facialHair: profile.facialHair,
    hairColor: profile.hairColor,
    skinColor: profile.skinColor,
    shirtColor: profile.shirtColor,
    backgroundColor: profile.backgroundColor,
  };
}

function material(color: THREE.ColorRepresentation, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function mesh(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, roughness = 0.82) {
  const item = new THREE.Mesh(geometry, material(color, roughness));
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

/**
 * Draw the flat graphic face (#174 Option C): bold navy eyes, brows and a
 * smile in the peg's language, plus glasses and facial hair from the saved
 * avatar. Everything is sized to read at scene distance, not in close-up.
 */
function drawFace(context: CanvasRenderingContext2D, avatar: AvatarConfig) {
  const eyeY = 104;
  const eyeX = 44;
  // Facial hair first so the mouth and eyes stay readable on top of it.
  if (avatar.facialHair === "stubble" || avatar.facialHair === "beard") {
    context.fillStyle = avatar.hairColor;
    context.globalAlpha = avatar.facialHair === "stubble" ? .45 : 1;
    context.beginPath();
    context.moveTo(84, 128);
    context.quadraticCurveTo(74, 176, 128, 206);
    context.quadraticCurveTo(182, 176, 172, 128);
    context.quadraticCurveTo(128, 118, 84, 128);
    context.fill();
    context.globalAlpha = 1;
  }
  context.strokeStyle = MOUTH_INK;
  context.lineWidth = 12;
  context.lineCap = "round";
  context.beginPath();
  context.arc(128, 120, 46, Math.PI * .22, Math.PI * .78);
  context.stroke();
  if (avatar.facialHair === "mustache" || avatar.facialHair === "stubble") {
    context.strokeStyle = avatar.hairColor;
    context.lineWidth = 14;
    context.beginPath();
    context.moveTo(94, 146);
    context.quadraticCurveTo(128, 158, 162, 146);
    context.stroke();
  }
  context.fillStyle = FACE_INK;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(128 + side * eyeX, eyeY, 15, 0, Math.PI * 2);
    context.fill();
  }
  // Brows match the peg: stronger on male faces, finer on female faces.
  context.strokeStyle = avatar.hairColor;
  context.lineWidth = avatar.gender === "male" ? 11 : 7;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(128 + side * eyeX - 22, eyeY - 26);
    context.quadraticCurveTo(128 + side * eyeX, eyeY - 38, 128 + side * eyeX + 22, eyeY - 24);
    context.stroke();
  }
  if (avatar.glasses !== "none") {
    context.strokeStyle = FACE_INK;
    context.fillStyle = "rgba(255,248,231,.16)";
    context.lineWidth = 7;
    for (const side of [-1, 1]) {
      const centerX = 128 + side * eyeX;
      context.beginPath();
      if (avatar.glasses === "wayfarer") {
        context.roundRect(centerX - 28, eyeY - 21, 56, 42, 10);
        context.fill();
        context.stroke();
        context.beginPath();
        context.moveTo(centerX - 28, eyeY - 21);
        context.lineTo(centerX + 28, eyeY - 21);
        context.lineWidth = 10;
        context.stroke();
        context.lineWidth = 7;
      } else {
        context.arc(centerX, eyeY, 26, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }
    context.beginPath();
    context.moveTo(128 - 18, eyeY - 4);
    context.lineTo(128 + 18, eyeY - 4);
    context.stroke();
  }
}

function createFaceTexture(avatar: AvatarConfig) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const context = canvas.getContext("2d");
  // Without a 2d context (e.g. jsdom) the decal stays transparent -- the 3D wiring still builds.
  if (context) drawFace(context, avatar);
  return texture;
}

/**
 * Decal the drawn face just in front of the 3D head. The disc floats ahead of
 * both the head and hair cap so the graphic treatment reads from any yaw,
 * while hair, skin and body stay dimensional.
 */
function addFaceDecal(person: THREE.Group, avatar: AvatarConfig, faceScale: number) {
  const decal = new THREE.Mesh(
    new THREE.CircleGeometry(.27, 32),
    new THREE.MeshBasicMaterial({ map: createFaceTexture(avatar), transparent: true, depthWrite: false }),
  );
  decal.name = "face-decal";
  decal.position.set(0, 2.06, .375);
  decal.scale.x = faceScale;
  person.add(decal);
}

function addHair(person: THREE.Group, avatar: AvatarConfig) {
  if (avatar.hair === "bald") return;
  const cap = mesh(new THREE.SphereGeometry(0.365, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), avatar.hairColor);
  cap.position.set(0, 2.23, 0);
  cap.scale.y = avatar.hair.includes("long") ? 1.08 : 0.98;
  person.add(cap);

  if (avatar.hair.includes("long") || avatar.hair === "waves" || avatar.hair === "curls") {
    const back = mesh(new THREE.CapsuleGeometry(0.24, 0.56, 5, 8), avatar.hairColor);
    back.position.set(0, 1.98, -0.18);
    back.scale.x = 1.1;
    person.add(back);
  }
  if (avatar.hair === "bun" || avatar.hair === "graybun") {
    const bun = mesh(new THREE.SphereGeometry(0.19, 10, 8), avatar.hairColor);
    bun.position.set(0, 2.57, -0.08);
    person.add(bun);
  }
  if (avatar.hair === "ponytail") {
    const ponytail = mesh(new THREE.CapsuleGeometry(0.12, 0.42, 5, 7), avatar.hairColor);
    ponytail.position.set(-0.28, 2.2, -0.12);
    ponytail.rotation.z = -0.45;
    person.add(ponytail);
  }
}

/** Build a small seated human while retaining the full saved avatar identity. */
export function createPerson(member: RosterMemberView, profile: UserProfile) {
  const avatar = avatarFor(member, profile);
  const person = new THREE.Group();
  const isFemale = avatar.gender === "female";
  const torso = mesh(new THREE.CapsuleGeometry(isFemale ? 0.34 : 0.39, isFemale ? 0.66 : 0.74, 5, 9), avatar.shirtColor, 0.72);
  torso.position.y = 1.12;
  torso.scale.x = isFemale ? 0.9 : 1;
  person.add(torso);

  const faceScale = avatar.face === "narrow" ? 0.86 : avatar.face === "round" ? 1.12 : 1;
  const head = mesh(new THREE.SphereGeometry(0.34, 14, 10), avatar.skinColor);
  head.position.y = 2.08;
  head.scale.x = faceScale;
  person.add(head);
  addFaceDecal(person, avatar, faceScale);
  addHair(person, avatar);

  for (const side of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.09, 0.48, 4, 7), avatar.skinColor);
    arm.position.set(side * (isFemale ? 0.34 : 0.39), 1.04, 0.02);
    arm.rotation.z = side * 0.38;
    person.add(arm);
    const hand = mesh(new THREE.SphereGeometry(0.105, 8, 6), avatar.skinColor);
    hand.position.set(side * (isFemale ? 0.47 : 0.52), 0.75, 0.05);
    person.add(hand);
    const leg = mesh(new THREE.CapsuleGeometry(0.105, 0.52, 4, 7), 0x263746);
    leg.position.set(side * 0.18, 0.45, 0.22);
    leg.rotation.x = Math.PI / 2.8;
    person.add(leg);
    const shoe = mesh(new THREE.SphereGeometry(0.14, 8, 6), 0x172943);
    shoe.scale.set(1.35, 0.6, 1.6);
    shoe.position.set(side * 0.18, 0.18, 0.43);
    person.add(shoe);
  }
  const seat = mesh(new THREE.CylinderGeometry(.3, .33, 1.15, 10), 0x795237);
  seat.rotation.z = Math.PI / 2;
  seat.position.set(0, .47, -.05);
  person.add(seat);
  if (member.readToday) {
    const halo = mesh(new THREE.RingGeometry(0.49, 0.57, 20), 0xffdb64, 0.65);
    halo.position.y = 0.03;
    halo.rotation.x = -Math.PI / 2;
    halo.name = "read-halo";
    person.add(halo);
  }
  person.traverse(child => { child.userData.memberId = member.personId; });
  return person;
}
