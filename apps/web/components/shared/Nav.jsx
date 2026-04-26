"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, Briefcase, Settings, FolderKanban } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospects", label: "Pipeline", icon: FolderKanban },
  { href: "/estimates", label: "Estimates", icon: Briefcase },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-56 shrink-0 bg-white border-r border-[var(--border)] flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <p className="text-sm font-bold tracking-tight text-[var(--ink)]">Framework Studio</p>
      </div>
      <div className="flex-1 py-4 px-3 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-[var(--sand)] text-[var(--ink)] font-medium" : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--sand)]"
              }`}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </div>
      <div className="px-5 py-4 border-t border-[var(--border)]">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </nav>
  );
}
