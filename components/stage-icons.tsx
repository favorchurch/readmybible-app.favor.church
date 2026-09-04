import type { Stage } from "@/lib/game";

type IconProps = {
  size?: number;
  className?: string;
};

const SHARED_SVG_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

function TentIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...SHARED_SVG_PROPS}>
      <path d="M3 19h18" />
      <path d="M12 4l8 15H4z" />
      <path d="M12 9.5L8.2 19" />
      <path d="M12 9.5l3.8 9.5" />
    </svg>
  );
}

function TrailerIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...SHARED_SVG_PROPS}>
      <path d="M2.5 16V9.5a1 1 0 011-1H18l3.5 3.5V16a1 1 0 01-1 1H3.5a1 1 0 01-1-1z" />
      <path d="M13 8.5V16" />
      <path d="M15.5 11h4" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="17" cy="18.5" r="1.5" />
    </svg>
  );
}

function CabinIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...SHARED_SVG_PROPS}>
      <path d="M5 13L12 7L19 13L19 20L5 20Z" />
      <path d="M10 20v-4.5h4V20" />
      <path d="M6 16h3.5M14.5 16h3.5M6 18.3h3.5M14.5 18.3h3.5" />
    </svg>
  );
}

function ApartmentIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...SHARED_SVG_PROPS}>
      <path d="M5 20V4.5h14V20" />
      <path d="M3 20h18" />
      <path d="M8 7.7h1.6v1.6H8zM14.4 7.7H16v1.6h-1.6zM8 11.6h1.6v1.6H8zM14.4 11.6H16v1.6h-1.6z" />
      <path d="M10.4 20v-4.6h3.2V20" />
    </svg>
  );
}

function HouseIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...SHARED_SVG_PROPS}>
      <path d="M3.5 20V11L12 4.2 20.5 11v9z" />
      <path d="M9.6 20v-6.4h4.8V20" />
      <path d="M7.4 12.6h1.8v1.8H7.4zM14.8 12.6h1.8v1.8h-1.8z" />
      <path d="M16.5 8V5.2h2.2V9.7" />
    </svg>
  );
}

function MansionIcon({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...SHARED_SVG_PROPS}>
      <path d="M1.5 9L12 4L22.5 9" />
      <path d="M2.5 9V20H21.5V9" />
      <path d="M9.3 13v7M14.7 13v7" />
      <path d="M10 20v-5h4v5" />
      <path d="M4.3 12.6h1.8v1.8H4.3zM17.9 12.6h1.8v1.8h-1.8z" />
    </svg>
  );
}

const STAGE_ICONS: Record<Stage, (props: IconProps) => React.JSX.Element> = {
  Tent: TentIcon,
  Trailer: TrailerIcon,
  Cabin: CabinIcon,
  Apartment: ApartmentIcon,
  House: HouseIcon,
  Mansion: MansionIcon,
};

export function StageIcon({ name, size, className }: { name: Stage } & IconProps) {
  const Icon = STAGE_ICONS[name];
  return <Icon size={size} className={className} />;
}
