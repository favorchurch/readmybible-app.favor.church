import * as THREE from "three";

import type { RosterMemberView } from "@/components/app-shell";
import type { AvatarConfig, UserProfile } from "@/components/avatar";

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

function addEyes(person: THREE.Group, skinColor: string) {
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.055, 8, 6), 0xfff9e9);
    eye.position.set(side * 0.125, 2.13, 0.305);
    person.add(eye);
    const pupil = mesh(new THREE.SphereGeometry(0.027, 7, 5), 0x172943);
    pupil.position.set(side * 0.125, 2.13, 0.35);
    person.add(pupil);
    const brow = mesh(new THREE.BoxGeometry(0.105, 0.025, 0.025), 0x4a2f25);
    brow.position.set(side * 0.125, 2.245, 0.32);
    brow.rotation.z = side * -0.08;
    person.add(brow);
  }
  const nose = mesh(new THREE.SphereGeometry(0.045, 7, 5), skinColor);
  nose.scale.set(0.75, 1.35, 0.8);
  nose.position.set(0, 2.06, 0.34);
  person.add(nose);
  const mouth = mesh(new THREE.SphereGeometry(.075, 10, 6), 0x8b493a);
  mouth.position.set(0, 1.96, .32);
  mouth.scale.set(1, .25, .3);
  person.add(mouth);
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

function addFaceDetails(person: THREE.Group, avatar: AvatarConfig) {
  if (avatar.facialHair === "none") return;
  if (avatar.facialHair === "mustache" || avatar.facialHair === "stubble") {
    const moustache = mesh(new THREE.SphereGeometry(0.09, 8, 6), avatar.hairColor);
    moustache.scale.set(1.35, 0.42, 0.45);
    moustache.position.set(0, 1.98, 0.34);
    person.add(moustache);
  }
  if (avatar.facialHair === "stubble" || avatar.facialHair === "beard") {
    const beard = mesh(new THREE.SphereGeometry(0.23, 10, 7), avatar.hairColor);
    beard.scale.set(0.82, 0.58, 0.52);
    beard.position.set(0, 1.91, 0.22);
    person.add(beard);
  }
}

function addGlasses(person: THREE.Group, style: AvatarConfig["glasses"]) {
  if (style === "none") return;
  const width = style === "wayfarer" ? 0.13 : 0.115;
  for (const side of [-1, 1]) {
    const lens = mesh(new THREE.TorusGeometry(width, 0.018, 6, 12), 0x243033, 0.5);
    lens.position.set(side * 0.125, 2.13, 0.36);
    lens.scale.y = style === "wayfarer" ? 0.72 : 1;
    person.add(lens);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.1, 0.018, 0.018), 0x243033, 0.5);
  bridge.position.set(0, 2.13, 0.36);
  person.add(bridge);
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
  addEyes(person, avatar.skinColor);
  addHair(person, avatar);
  addFaceDetails(person, avatar);
  addGlasses(person, avatar.glasses);

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
