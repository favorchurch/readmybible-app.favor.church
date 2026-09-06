import { NavIcon, type NavIconName } from "@/components/nav-icon";

export type Tab = "today" | "connect" | "rewards" | "progress" | "leader";

const BASE_NAV_ITEMS: { id: Tab; label: string; icon: NavIconName }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "connect", label: "Connect", icon: "people" },
  { id: "rewards", label: "Rewards", icon: "medal" },
  { id: "progress", label: "Progress", icon: "progress" },
];

export function BottomNav({
  tab,
  onSelect,
  isLeader,
}: {
  tab: Tab;
  onSelect: (next: Tab) => void;
  isLeader: boolean;
}) {
  const items = isLeader
    ? [...BASE_NAV_ITEMS, { id: "leader" as const, label: "Leader", icon: "key" as const }]
    : BASE_NAV_ITEMS;
  return (
    <nav
      className="bottom-nav"
      aria-label="Main navigation"
      style={{ "--nav-count": items.length } as React.CSSProperties}
    >
      {items.map((item) => (
        <button type="button" key={item.id} data-tab={item.id} className={tab === item.id ? "active" : ""} onClick={() => onSelect(item.id)}>
          <NavIcon icon={item.icon} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
