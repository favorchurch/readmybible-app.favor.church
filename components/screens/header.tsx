import { Avatar, type UserProfile } from "@/components/avatar";
import { Brand } from "@/components/brand";
import { ConnectSwitcher, type ConnectSwitcherContext } from "@/components/connect-switcher";

export function Header({
  profile,
  onEditProfile,
  connectSwitcher,
}: {
  heading: string;
  profile: UserProfile;
  onEditProfile: () => void;
  connectSwitcher?: ConnectSwitcherContext;
}) {
  return (
    <header className="topbar">
      <Brand />
      <div className="header-actions">
        {connectSwitcher && <ConnectSwitcher {...connectSwitcher} />}
        <button className="header-person" onClick={onEditProfile} aria-label="Edit your avatar">
          <span>
            <span className="header-name">{profile.displayName ? `Hey, ${profile.displayName}!` : "Hey, you!"}</span>
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
      </div>
    </header>
  );
}
