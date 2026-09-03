export type HairStyle =
  | "crop"
  | "curls"
  | "bob"
  | "bun"
  | "bald"
  | "waves"
  | "graybun"
  | "pixie"
  | "long-curly"
  | "medium-curly"
  | "short-curly"
  | "long-straight"
  | "medium-straight"
  | "short-straight"
  | "long-wavy"
  | "medium-wavy"
  | "short-wavy"
  | "extra-short"
  | "ponytail";
export type SkinTone = "light" | "golden" | "warm" | "deep";
export type FaceShape = "narrow" | "normal" | "round";
export type Gender = "male" | "female";
export type FacialHair = "none" | "mustache" | "stubble" | "beard";
export type GlassesStyle = "none" | "round" | "wayfarer";
export type AvatarColor = "coral" | "blue" | "gold" | "sage" | "violet";
export type Translation = "NET" | "ESV" | "CSB" | "NIV" | "NLT";

export type UserProfile = {
  displayName: string;
  gender: Gender;
  face: FaceShape;
  hair: HairStyle;
  glasses: GlassesStyle;
  facialHair: FacialHair;
  hairColor: string;
  skinColor: string;
  shirtColor: string;
  backgroundColor: string;
  translation: Translation;
};

/** The subset of UserProfile persisted as profiles.avatar jsonb -- displayName and translation have their own columns. */
export type AvatarConfig = Omit<UserProfile, "displayName" | "translation">;

export const defaultAvatarConfig: AvatarConfig = {
  gender: "female",
  face: "normal",
  hair: "short-straight",
  glasses: "none",
  facialHair: "none",
  hairColor: "#172943",
  skinColor: "#b97856",
  shirtColor: "#d96c57",
  backgroundColor: "#efd8bd",
};

export function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.gender === "string" && typeof v.hair === "string" && typeof v.hairColor === "string";
}

export const defaultProfile: UserProfile = {
  displayName: "",
  gender: "female",
  face: "normal",
  hair: "short-straight",
  glasses: "none",
  facialHair: "none",
  hairColor: "#172943",
  skinColor: "#b97856",
  shirtColor: "#d96c57",
  backgroundColor: "#efd8bd",
  translation: "NET",
};

export function Avatar({
  color,
  gender = "female",
  skin = "warm",
  hair = "crop",
  glasses = "none",
  facialHair = "none",
  face = "normal",
  hairColor,
  skinColor,
  shirtColor,
  backgroundColor,
  small = false,
  preview = false,
}: {
  color: string;
  gender?: Gender;
  skin?: SkinTone;
  hair?: HairStyle;
  glasses?: GlassesStyle;
  facialHair?: FacialHair;
  face?: FaceShape;
  hairColor?: string;
  skinColor?: string;
  shirtColor?: string;
  backgroundColor?: string;
  small?: boolean;
  preview?: boolean;
}) {
  const customStyle = {
    ...(hairColor ? { "--hair": hairColor } : {}),
    ...(skinColor ? { "--skin": skinColor } : {}),
    ...(shirtColor ? { "--avatar-color": shirtColor } : {}),
    ...(backgroundColor ? { "--avatar-bg": backgroundColor } : {}),
  } as React.CSSProperties;
  return (
    <span
      style={customStyle}
      className={`avatar avatar-${color} gender-${gender} skin-${skin} hair-${hair} face-${face} glasses-${glasses} facial-${facialHair} ${small ? "avatar-small" : ""} ${preview ? "avatar-preview" : ""}`}
      aria-hidden="true"
    >
      <span className="avatar-back-hair" />
      <span className="avatar-ears" />
      <span className="avatar-face">
        <i />
        <i />
        <b />
      </span>
      <span className="avatar-hair" />
      <span className="avatar-brows" />
      {glasses !== "none" && (
        <span className={`avatar-glasses glasses-${glasses}`}>
          <i />
          <i />
          <b />
        </span>
      )}
      {gender === "male" && facialHair !== "none" && <span className={`avatar-facial-hair facial-${facialHair}`} />}
      <span className="avatar-body" />
    </span>
  );
}

const SEED_COLORS: AvatarColor[] = ["coral", "blue", "gold", "sage", "violet"];
const SEED_SKINS: SkinTone[] = ["light", "golden", "warm", "deep"];
const SEED_HAIR: HairStyle[] = ["crop", "bob", "curls", "waves", "bun", "graybun", "pixie", "ponytail"];

/**
 * A deterministic, cosmetics-only avatar look for roster members other than
 * the signed-in reader -- Read My Bible doesn't store custom avatars for
 * people who haven't opened the app, so this gives visual variety without
 * inventing data.
 */
export function avatarSeedFor(personId: number): { color: AvatarColor; skin: SkinTone; hair: HairStyle } {
  return {
    color: SEED_COLORS[personId % SEED_COLORS.length],
    skin: SEED_SKINS[(personId * 7) % SEED_SKINS.length],
    hair: SEED_HAIR[(personId * 13) % SEED_HAIR.length],
  };
}
