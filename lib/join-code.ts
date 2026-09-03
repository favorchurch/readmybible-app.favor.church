/**
 * Join-code generation for Connect Groups. See intent/FLOWS.md: "Codes are
 * four characters from ABCDEFGHJKLMNPQRSTUVWXYZ23456789, one per group,
 * created the first time a leader opens the tab." The alphabet drops
 * visually-ambiguous characters (I, O, 0, 1).
 */

export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 4;

/** A random 4-character join code. `random` is injectable for tests. */
export function randomJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    const index = Math.floor(random() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET[index];
  }
  return code;
}

/** True if every character of `code` is in the join-code alphabet and it is the right length. */
export function isValidJoinCodeShape(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false;
  return [...code].every((ch) => JOIN_CODE_ALPHABET.includes(ch));
}
