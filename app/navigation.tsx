"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/team", label: "Team" },
  { href: "/activity", label: "Activity" },
  { href: "/digests", label: "Digests" },
  { href: "/insights", label: "Insights" },
  { href: "/profile", label: "Profile" },
];

export function AppNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Primary navigation">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={pathname === link.href ? "nav-link active" : "nav-link"}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
