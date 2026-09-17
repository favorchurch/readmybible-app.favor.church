// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import { createPerson } from "@/components/scene-person";

const profile: UserProfile = {
  displayName: "Alex",
  ...defaultAvatarConfig,
  translation: "NET",
};

function member(overrides: Partial<RosterMemberView> = {}): RosterMemberView {
  return { personId: 12, name: "Alex", avatar: { ...defaultAvatarConfig }, isSelf: false, isLeader: false, readToday: false, chapters: [], readingDates: [], ...overrides };
}

function findNamed(person: THREE.Group, name: string): THREE.Mesh | undefined {
  return person.children.find((child): child is THREE.Mesh => child.name === name && child instanceof THREE.Mesh);
}

describe("2D-on-3D face treatment", () => {
  it("decals a flat graphic face in front of the dimensional head", () => {
    const person = createPerson(member(), profile);
    const decal = findNamed(person, "face-decal");
    expect(decal).toBeInstanceOf(THREE.Mesh);
    expect(decal?.geometry).toBeInstanceOf(THREE.CircleGeometry);
    const material = decal?.material as THREE.MeshBasicMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.map).toBeInstanceOf(THREE.Texture);
    expect(material.map?.colorSpace).toBe(THREE.SRGBColorSpace);
    // The disc must clear the head (.34) and hair cap (.365) so the ink never clips.
    expect(decal?.position.z).toBeGreaterThan(.365);
    expect(decal?.position.y).toBeGreaterThan(1.9);
  });

  it("drops the old primitive facial geometry", () => {
    const person = createPerson(member(), profile);
    const geometries = person.children
      .filter(child => child instanceof THREE.Mesh)
      .map(child => (child as THREE.Mesh).geometry.type);
    expect(geometries).not.toContain("TorusGeometry"); // 3D glasses are gone
    const tinyEyeSpheres = person.children.filter(child => {
      const childMesh = child as THREE.Mesh;
      return childMesh.geometry instanceof THREE.SphereGeometry && childMesh.geometry.parameters.radius < .1 && childMesh.position.y > 1.9;
    });
    expect(tinyEyeSpheres).toHaveLength(0);
  });

  it("scales the decal with the saved face shape like the head does", () => {
    for (const [face, scale] of [["narrow", .86], ["round", 1.12], ["normal", 1]] as const) {
      const person = createPerson(member({ avatar: { ...defaultAvatarConfig, face } }), profile);
      const decal = findNamed(person, "face-decal");
      const head = person.children.find(child => child instanceof THREE.Mesh && (child as THREE.Mesh).geometry instanceof THREE.SphereGeometry && child.position.y > 1.9);
      expect(decal?.scale.x).toBeCloseTo(scale, 5);
      expect(head?.scale.x).toBeCloseTo(scale, 5);
    }
  });

  it("keeps the dimensional hair pipeline and read halo", () => {
    const bald = createPerson(member({ avatar: { ...defaultAvatarConfig, hair: "bald" } }), profile);
    const capped = createPerson(member({ avatar: { ...defaultAvatarConfig, hair: "bun" } }), profile);
    const hairMeshes = (person: THREE.Group) => person.children.filter(child => {
      const childMesh = child as THREE.Mesh;
      return childMesh.material instanceof THREE.MeshStandardMaterial
        && (childMesh.material as THREE.MeshStandardMaterial).color.getHexString() === new THREE.Color(defaultAvatarConfig.hairColor).getHexString()
        && childMesh.geometry instanceof THREE.SphereGeometry
        && childMesh.position.y > 1.5;
    });
    expect(hairMeshes(bald)).toHaveLength(0);
    expect(hairMeshes(capped).length).toBeGreaterThanOrEqual(2); // cap + bun

    const reader = createPerson(member({ readToday: true }), profile);
    expect(findNamed(reader, "read-halo")).toBeInstanceOf(THREE.Mesh);
  });

  it("still tags every child with the member id for scene raycasting", () => {
    const person = createPerson(member({ personId: 77 }), profile);
    expect(person.children.every(child => child.userData.memberId === 77)).toBe(true);
  });
});
