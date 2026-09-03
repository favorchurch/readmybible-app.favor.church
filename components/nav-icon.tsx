export type NavIconName = "home" | "people" | "medal" | "progress";

export function NavIcon({ icon }: { icon: NavIconName }) {
  if (icon === "people") {
    return (
      <span className="nav-icon nav-people" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    );
  }

  if (icon === "medal") {
    return (
      <span className="nav-icon nav-medal" aria-hidden="true">
        <i />
        <b>★</b>
      </span>
    );
  }

  return (
    <span className="nav-icon nav-symbol" aria-hidden="true">
      {icon === "home" ? "⌂" : "◔"}
    </span>
  );
}
