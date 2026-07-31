import { Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { logout } from "@/app/login/actions";

export function TopBar({
  title,
  unreadCount,
}: {
  title?: string;
  unreadCount: number;
}) {
  return (
    <header className="h-16 border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        {title ? <span className="font-medium text-ink md:hidden">{title}</span> : null}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          className="relative p-2 rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500" />
          ) : null}
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="p-2 rounded-md text-ink-soft hover:bg-surface-sunken hover:text-ink"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </header>
  );
}
