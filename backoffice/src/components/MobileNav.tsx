"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { NAV, isNavItemActive } from "@/lib/nav";
import { Logo } from "@/components/Logo";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  const drawer = open ? (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
      <div className="absolute inset-y-0 left-0 w-64 bg-surface border-r border-line flex flex-col">
        <div className="h-16 flex items-center justify-between px-5 border-b border-line">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="p-1 text-ink-soft"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {NAV.map((group) => (
            <div key={group.emoji + group.label}>
              <div className="flex items-center gap-1.5 px-3 mb-1 text-xs font-semibold text-ink-faint uppercase tracking-wide">
                <span aria-hidden="true">{group.emoji}</span>
                {group.label ? <span>{group.label}</span> : null}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(item, pathname, search);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
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
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="lg:hidden -ml-1.5 p-1.5 text-ink-soft hover:text-ink"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
