import Link from "next/link";
import { listNotifications } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { clsx } from "clsx";
import { markAllNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const notifications = await listNotifications();

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline">
              Tout marquer comme lu
            </Button>
          </form>
        }
      />
      <Card>
        {notifications.length === 0 ? (
          <EmptyState title="Aucune notification pour le moment" />
        ) : (
          <ul className="divide-y divide-line">
            {notifications.map((n) => (
              <li key={n.id} className={clsx("p-4", !n.lue && "bg-blue-50/40")}>
                <Link href={n.lien || "#"} className="block">
                  <p className="text-sm font-medium text-ink">{n.titre}</p>
                  {n.message ? <p className="text-sm text-ink-soft mt-0.5">{n.message}</p> : null}
                  <p className="text-xs text-ink-faint mt-1">{formatDateTime(n.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
