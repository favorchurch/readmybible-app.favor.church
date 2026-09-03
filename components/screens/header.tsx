import { Avatar, type UserProfile } from "@/components/avatar";
import { Brand } from "@/components/brand";

export function Header({
  heading,
  profile,
  onEditProfile,
}: {
  heading: string;
  profile: UserProfile;
  onEditProfile: () => void;
}) {
  return (
    <header className="topbar">
      <Brand />
      <button className="header-person" onClick={onEditProfile} aria-label="Edit your avatar">
        <span>
          {heading}
          <small>Edit profile</small>
        </span>
        <Avatar
          color="coral"
          gender={profile.gender}
          hair={profile.hair}
          glasses={profile.glasses}
          facialHair={profile.facialHair}
          face={profile.face}
          hairColor={profile.hairColor}
          skinColor={profile.skinColor}
          shirtColor={profile.shirtColor}
          backgroundColor={profile.backgroundColor}
          small
        />
      </button>
    </header>
  );
}
