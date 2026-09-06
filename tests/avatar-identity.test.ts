import { describe, expect, it } from "vitest";

import { avatarGenderFromRock, defaultAvatarConfig, isAvatarConfig, resolveAvatar } from "@/components/avatar";

describe("Rock avatar identity", () => {
  it.each([1, "1", "Male", "male"])("maps Rock male value %s", (value) => {
    expect(avatarGenderFromRock(value)).toBe("male");
    expect(resolveAvatar(101, value).gender).toBe("male");
  });

  it.each([2, "2", "Female", "female"])("maps Rock female value %s", (value) => {
    expect(avatarGenderFromRock(value)).toBe("female");
    expect(resolveAvatar(102, value).gender).toBe("female");
  });

  it.each([0, null, undefined, "Unknown", "unexpected"])("does not treat missing/unknown %s as female", (value) => {
    expect(avatarGenderFromRock(value)).toBeNull();
    const pair = [resolveAvatar(100, value), resolveAvatar(101, value)];
    expect(new Set(pair.map((avatar) => avatar.gender))).toEqual(new Set(["male", "female"]));
    expect(resolveAvatar(100, value)).toEqual(pair[0]);
  });

  it("preserves a saved avatar, including gender, across a later Rock gender change", () => {
    const saved = { ...defaultAvatarConfig, gender: "female" as const, shirtColor: "#123456", hair: "pixie" as const };
    expect(resolveAvatar(100, 1, saved)).toEqual(saved);
    expect(resolveAvatar(100, 2, saved)).toEqual(saved);
    expect(saved.shirtColor).toBe("#123456");
  });

  it("handles a chooseGroup-only profile's empty avatar as uncustomized", () => {
    expect(isAvatarConfig({})).toBe(false);
    expect(resolveAvatar(101, 1, {})).toEqual(resolveAvatar(101, 1));
  });

  it("does not allow invalid persisted gender to mask Rock gender", () => {
    expect(resolveAvatar(101, 1, { ...defaultAvatarConfig, gender: "unknown" }).gender).toBe("male");
  });

  it("resolves the same person identically for reader, roster, and shared Home", () => {
    const person = { Id: 401, Gender: 1 };
    const reader = resolveAvatar(person.Id, person.Gender);
    const roster = resolveAvatar(person.Id, person.Gender, {});
    expect(reader).toEqual(roster);
    expect(reader.gender).toBe("male");
  });
});
