import { describe, expect, it } from "vitest";

import { JOIN_CODE_ALPHABET, isValidJoinCodeShape, randomJoinCode } from "@/lib/join-code";

describe("randomJoinCode", () => {
  it("generates a 4-character code from the join-code alphabet", () => {
    const code = randomJoinCode();
    expect(code).toHaveLength(4);
    expect([...code].every((ch) => JOIN_CODE_ALPHABET.includes(ch))).toBe(true);
  });

  it("never includes visually-ambiguous characters (I, O, 0, 1)", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = randomJoinCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it("is deterministic given an injected random source", () => {
    const random = () => 0; // always picks alphabet[0]
    expect(randomJoinCode(random)).toBe("AAAA");
  });

  it("uses the full alphabet range with an injected max source", () => {
    const random = () => 0.999999;
    const code = randomJoinCode(random);
    expect(code).toBe(
      JOIN_CODE_ALPHABET[JOIN_CODE_ALPHABET.length - 1].repeat(4),
    );
  });
});

describe("isValidJoinCodeShape", () => {
  it("accepts a well-formed code", () => {
    expect(isValidJoinCodeShape("F52A")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(isValidJoinCodeShape("F52")).toBe(false);
    expect(isValidJoinCodeShape("F52AA")).toBe(false);
  });

  it("rejects characters outside the alphabet", () => {
    expect(isValidJoinCodeShape("F5O1")).toBe(false); // O and 1 excluded
    expect(isValidJoinCodeShape("f52a")).toBe(false); // lowercase excluded
  });
});
