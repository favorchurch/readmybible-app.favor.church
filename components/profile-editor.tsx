"use client";

import { useState } from "react";

import { Avatar, type FacialHair, type FaceShape, type Gender, type GlassesStyle, type HairStyle, type Translation, type UserProfile } from "@/components/avatar";
import { Sheet } from "@/components/sheet";

const hairChoices: Array<{ value: HairStyle; label: string }> = [
  { value: "bald", label: "Bald" },
  { value: "extra-short", label: "Buzz cut" },
  { value: "crop", label: "Short crop" },
  { value: "short-straight", label: "Side part" },
  { value: "pixie", label: "Pixie" },
  { value: "bob", label: "Bob" },
  { value: "ponytail", label: "Ponytail" },
  { value: "short-curly", label: "Short curls" },
  { value: "long-curly", label: "Long curls" },
  { value: "short-wavy", label: "Short waves" },
  { value: "long-wavy", label: "Long waves" },
  { value: "long-straight", label: "Long straight" },
];

const hairColors = ["#172943", "#302a29", "#5a3c31", "#9a5843", "#d5ad55", "#85887e"];
const skinColors = ["#f0c6a1", "#dfa16d", "#c47f5f", "#81503a"];
const shirtColors = ["#dc6e57", "#75a6c5", "#edaa35", "#71846c", "#9b84c5"];
const backgroundColors = ["#f1dfc7", "#e8def0", "#d1e2eb", "#dce5d6", "#f2d1c3"];
const facialHairChoices: Array<{ value: FacialHair; label: string }> = [
  { value: "none", label: "Clean-shaven" },
  { value: "mustache", label: "Mustache" },
  { value: "stubble", label: "Stubble" },
  { value: "beard", label: "Beard" },
];
const translationChoices: Translation[] = ["NET", "ESV", "CSB", "NIV", "NLT"];

function ColorChoices({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <fieldset className="profile-field">
      <legend>{label}</legend>
      <div className="color-choices">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={value === color ? "selected" : ""}
            style={{ background: color }}
            onClick={() => onChange(color)}
            aria-label={`${label} ${color}`}
            aria-pressed={value === color}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function ProfileEditor({
  profile,
  saving,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}) {
  const [draft, setDraft] = useState(profile);
  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <Sheet open onClose={onClose} labelledBy="profile-title" className="profile-sheet">
      <button className="close-button" onClick={onClose} aria-label="Close">
        ×
      </button>
      <p className="eyebrow">YOUR AVATAR</p>
        <h2 id="profile-title">Make it feel like you.</h2>
        <p className="profile-intro">Choose a few details for the avatar your Connect will see.</p>
        <div className="profile-preview-wrap">
          <Avatar
            color="coral"
            gender={draft.gender}
            hair={draft.hair}
            glasses={draft.glasses}
            facialHair={draft.facialHair}
            face={draft.face}
            hairColor={draft.hairColor}
            skinColor={draft.skinColor}
            shirtColor={draft.shirtColor}
            backgroundColor={draft.backgroundColor}
            preview
          />
          <div>
            <strong>{draft.displayName.trim() || "Your name"}</strong>
          </div>
        </div>

        <label className="profile-name-field">
          <span>Display name</span>
          <input
            type="text"
            value={draft.displayName}
            maxLength={24}
            autoComplete="name"
            onChange={(event) => update("displayName", event.target.value)}
            placeholder="Your name"
          />
          <small>This is the name your Connect will see.</small>
        </label>
        <fieldset className="profile-field">
          <legend>Bible translation</legend>
          <div className="translation-choices">
            {translationChoices.map((t) => (
              <button
                key={t}
                type="button"
                className={draft.translation === t ? "selected" : ""}
                onClick={() => update("translation", t)}
                aria-pressed={draft.translation === t}
              >
                {t}
              </button>
            ))}
          </div>
          <small>Used for quick verses in the app. Links still open in Bible.com.</small>
        </fieldset>
        <fieldset className="profile-field">
          <legend>Gender</legend>
          <div className="gender-choices">
            {(["female", "male"] as Gender[]).map((gender) => (
              <button
                type="button"
                key={gender}
                className={`avatar-option ${draft.gender === gender ? "selected" : ""}`}
                onClick={() => update("gender", gender)}
                aria-pressed={draft.gender === gender}
              >
                <Avatar
                  color="coral"
                  gender={gender}
                  hair={gender === "female" ? "bob" : "crop"}
                  face={draft.face}
                  hairColor={draft.hairColor}
                  skinColor={draft.skinColor}
                  shirtColor={draft.shirtColor}
                  backgroundColor={draft.backgroundColor}
                  small
                />
                <span>{gender === "female" ? "Female" : "Male"}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="profile-field">
          <legend>Face</legend>
          <div className="face-choices">
            {(["narrow", "normal", "round"] as FaceShape[]).map((face, index) => (
              <button
                type="button"
                key={face}
                className={draft.face === face ? "selected" : ""}
                onClick={() => update("face", face)}
              >
                <Avatar
                  color="coral"
                  gender={draft.gender}
                  hair="extra-short"
                  face={face}
                  hairColor={draft.hairColor}
                  skinColor={draft.skinColor}
                  shirtColor={draft.shirtColor}
                  backgroundColor={draft.backgroundColor}
                  small
                />
                <span>Face {index + 1}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="profile-field">
          <legend>Hair type</legend>
          <div className="hair-choices">
            {hairChoices.map((choice) => (
              <button
                type="button"
                key={choice.value}
                className={draft.hair === choice.value ? "selected" : ""}
                onClick={() => update("hair", choice.value)}
              >
                <Avatar
                  color="coral"
                  gender={draft.gender}
                  hair={choice.value}
                  face={draft.face}
                  hairColor={draft.hairColor}
                  skinColor={draft.skinColor}
                  shirtColor={draft.shirtColor}
                  backgroundColor={draft.backgroundColor}
                  small
                />
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <ColorChoices label="Hair color" colors={hairColors} value={draft.hairColor} onChange={(color) => update("hairColor", color)} />
        <fieldset className="profile-field">
          <legend>Glasses</legend>
          <div className="accessory-choices">
            {(["none", "round", "wayfarer"] as GlassesStyle[]).map((glasses) => (
              <button
                type="button"
                key={glasses}
                className={`avatar-option ${draft.glasses === glasses ? "selected" : ""}`}
                onClick={() => update("glasses", glasses)}
                aria-pressed={draft.glasses === glasses}
              >
                <Avatar
                  color="coral"
                  gender={draft.gender}
                  hair={draft.hair}
                  glasses={glasses}
                  face={draft.face}
                  hairColor={draft.hairColor}
                  skinColor={draft.skinColor}
                  shirtColor={draft.shirtColor}
                  backgroundColor={draft.backgroundColor}
                  small
                />
                <span>{glasses === "none" ? "No glasses" : glasses === "round" ? "Rounded" : "Wayfarer"}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {draft.gender === "male" && (
          <fieldset className="profile-field">
            <legend>Facial hair</legend>
            <div className="facial-hair-choices">
              {facialHairChoices.map((choice) => (
                <button
                  type="button"
                  key={choice.value}
                  className={`avatar-option ${draft.facialHair === choice.value ? "selected" : ""}`}
                  onClick={() => update("facialHair", choice.value)}
                  aria-pressed={draft.facialHair === choice.value}
                >
                  <Avatar
                    color="coral"
                    gender="male"
                    hair={draft.hair}
                    glasses={draft.glasses}
                    facialHair={choice.value}
                    face={draft.face}
                    hairColor={draft.hairColor}
                    skinColor={draft.skinColor}
                    shirtColor={draft.shirtColor}
                    backgroundColor={draft.backgroundColor}
                    small
                  />
                  <span>{choice.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <ColorChoices label="Skin color" colors={skinColors} value={draft.skinColor} onChange={(color) => update("skinColor", color)} />
        <ColorChoices label="T-shirt color" colors={shirtColors} value={draft.shirtColor} onChange={(color) => update("shirtColor", color)} />
        <ColorChoices label="Background color" colors={backgroundColors} value={draft.backgroundColor} onChange={(color) => update("backgroundColor", color)} />
        <button
          className="primary-button profile-save"
          disabled={saving}
          onClick={() => onSave({ ...draft, displayName: draft.displayName.trim() || profile.displayName })}
        >
          {saving ? "Saving…" : "Save"} <span>✓</span>
        </button>
    </Sheet>
  );
}
