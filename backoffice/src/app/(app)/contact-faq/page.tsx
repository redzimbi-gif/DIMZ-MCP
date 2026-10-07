import { CircleHelp } from "lucide-react";
import { listContactsFaq } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Button, StatCard } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { clsx } from "clsx";
import { markContactFaqRead, markAllContactsFaqRead } from "./actions";

export default async function ContactFaqPage() {
  const contacts = await listContactsFaq();
  const nonLues = contacts.filter((c) => !c.lu).length;

  return (
    <div>
      <PageHeader
        title="Questions FAQ"
        description="Questions envoyées depuis le formulaire de contact de la FAQ, sur le site vitrine."
        actions={
          nonLues > 0 ? (
            <form action={markAllContactsFaqRead}>
              <Button type="submit" variant="outline">
                Tout marquer comme lu
              </Button>
            </form>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard label="Questions reçues" value={contacts.length} icon={<CircleHelp className="h-4 w-4" strokeWidth={1.8} />} />
        <StatCard label="Non lues" value={nonLues} />
      </div>

      <Card>
        {contacts.length === 0 ? (
          <EmptyState
            title="Aucune question pour le moment"
            description="Les questions posées depuis la FAQ du site vitrine apparaîtront ici automatiquement."
          />
        ) : (
          <ul className="divide-y divide-line">
            {contacts.map((c) => (
              <li key={c.id} className={clsx("p-4", !c.lu && "bg-blue-50/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {c.nom} <span className="font-normal text-ink-soft">— {c.email}</span>
                    </p>
                    <p className="text-sm text-ink-soft mt-1 whitespace-pre-wrap">{c.message}</p>
                    <p className="text-xs text-ink-faint mt-1.5">{formatDateTime(c.created_at)}</p>
                  </div>
                  {!c.lu ? (
                    <form action={markContactFaqRead.bind(null, c.id)} className="shrink-0">
                      <Button type="submit" variant="outline" className="text-xs">
                        Marquer comme lu
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
