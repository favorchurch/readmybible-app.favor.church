import { NavIcon, type NavIconName } from "@/components/nav-icon";

export type Tab = "today" | "connect" | "rewards" | "progress";

export const navItems: { id: Tab; label: string; icon: NavIconName }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "connect", label: "Connect", icon: "people" },
  { id: "rewards", label: "Rewards", icon: "medal" },
  { id: "progress", label: "Progress", icon: "progress" },
];

export function BottomNav({ tab, onSelect }: { tab: Tab; onSelect: (next: Tab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button key={item.id} data-tab={item.id} className={tab === item.id ? "active" : ""} onClick={() => onSelect(item.id)}>
          <NavIcon icon={item.icon} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
