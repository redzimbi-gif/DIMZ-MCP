"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV } from "@/lib/nav";
import { Logo } from "@/components/Logo";

export function Sidebar({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-60 shrink-0 border-r border-line bg-surface h-screen sticky top-0">
      <div className="h-16 flex items-center px-5 border-b border-line">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-7 w-7 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center">
            {userLabel.slice(0, 1).toUpperCase()}
          </div>
          <span className="text-sm text-ink-soft truncate">{userLabel}</span>
        </div>
      </div>
    </aside>
  );
}
