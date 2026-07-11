"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/my-work", label: "My Work", signedInOnly: true },
  { href: "/team", label: "Team" },
  { href: "/activity", label: "Activity" },
  { href: "/digests", label: "Digests" },
  { href: "/insights", label: "Insights" },
  { href: "/profile", label: "Profile" },
  { href: "/setup", label: "Setup", adminOnly: true },
];

export function AppNavigation({ className, signedIn = false, admin = false }: { className?: string; signedIn?: boolean; admin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Primary navigation">
      {links.filter((link) => (!link.signedInOnly || signedIn) && (!link.adminOnly || admin)).map((link) => (
        <Link key={link.href} href={link.href} className={pathname === link.href ? "nav-link active" : "nav-link"}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
