"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview", icon: "grid" as const },
  { href: "/machines", label: "Machine List", icon: "machine" as const },
  { href: "/oq-upload", label: "OQ Upload", icon: "upload" as const },
  { href: "/health-database", label: "Health Database", icon: "database" as const },
  { href: "/vendors", label: "Vendor Contacts", icon: "vendors" as const },
];

function BrandMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="appSidebarBrandMark"
      aria-hidden
    >
      <path d="M11 4h10l3 3H8z" />
      <path d="M11 7v4M16 7v4M21 7v4" />
      <path d="M8 11h16" />
      <path d="M7 11l2 5h14l2-5" />
      <path d="M9 16h14" />
      <path d="M10 16v3M14 16v3M18 16v3M22 16v3" />
      <path d="M11 16v12h10V16" />
      <path d="M15 22h2v6h-2z" />
      <path d="M13 20h6" />
    </svg>
  );
}

function Icon({ name }: { name: "grid" | "machine" | "upload" | "database" | "vendors" }) {
  const stroke = "currentColor";
  const common = { width: 18, height: 18, fill: "none" as const, stroke, strokeWidth: 1.6 };
  if (name === "grid") {
    return (
      <svg {...common} viewBox="0 0 24 24" className="appNavIcon" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === "upload") {
    return (
      <svg {...common} viewBox="0 0 24 24" className="appNavIcon" aria-hidden>
        <path d="M12 15V4" />
        <path d="M8 8l4-4 4 4" />
        <path d="M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" />
      </svg>
    );
  }
  if (name === "database") {
    return (
      <svg {...common} viewBox="0 0 24 24" className="appNavIcon" aria-hidden>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    );
  }
  if (name === "vendors") {
    return (
      <svg {...common} viewBox="0 0 24 24" className="appNavIcon" aria-hidden>
        <path d="M16 19v-1.2a3.8 3.8 0 00-3.8-3.8H7.8A3.8 3.8 0 004 17.8V19" />
        <circle cx="10" cy="8" r="3" />
        <path d="M20 19v-1a3.2 3.2 0 00-2.2-3" />
        <path d="M16.8 5.2a3 3 0 010 5.6" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24" className="appNavIcon" aria-hidden>
      <path d="M4 10h16v8H4z" />
      <path d="M6 10V7a2 2 0 012-2h8a2 2 0 012 2v3" />
      <path d="M8 18v2M16 18v2" />
    </svg>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="appSidebar">
      <div className="appSidebarBrand">
        <div className="appSidebarBrandLabel">Navigation</div>
        <div className="appSidebarBrandTitle">
          <BrandMark />
          <strong>WatchTower</strong>
        </div>
      </div>
      <nav className="appNav">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" || pathname === ""
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} data-active={active}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
