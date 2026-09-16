import { NavIcon, type NavIconName } from "@/components/nav-icon";

export type Tab = "today" | "connect" | "rewards" | "progress" | "leader";

const BASE_NAV_ITEMS: { id: Tab; label: string; icon: NavIconName }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "connect", label: "Connect", icon: "people" },
  { id: "progress", label: "Progress", icon: "progress" },
];

export function BottomNav({
  tab,
  onSelect,
  showLeaderTab,
}: {
  tab: Tab;
  onSelect: (next: Tab) => void;
  // True when the viewer should see the Leader tab: group leaders AND
  // admin-scope viewers (regional/cluster/department heads, ADMIN_PERSON_IDS)
  // who may have no Connect Group of their own.
  showLeaderTab: boolean;
}) {
  const items = showLeaderTab
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
