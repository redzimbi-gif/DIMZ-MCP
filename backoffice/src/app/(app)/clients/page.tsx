import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listClients } from "@/lib/queries";
import { Card, PageHeader, LinkButton, EmptyState } from "@/components/ui";
import { initials } from "@/lib/format";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const clients = await listClients(searchParams.q);

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length > 1 ? "s" : ""}`}
        actions={
          <LinkButton href="/clients/new">
            <Plus className="h-4 w-4" /> Nouveau client
          </LinkButton>
        }
      />

      <form className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Rechercher un client…"
          className="w-full rounded-md border border-line bg-surface pl-9 pr-3 py-2 text-sm focus-ring"
        />
      </form>

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            title="Aucun client"
            description="Les clients apparaissent ici automatiquement dès qu'un formulaire est envoyé depuis le site, ou peuvent être ajoutés manuellement."
          />
        ) : (
          <ul className="divide-y divide-line">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-sunken transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                    {initials(c.nom, c.prenom)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {c.civilite ? `${c.civilite} ` : ""}
                      {c.prenom} {c.nom}
                    </p>
                    <p className="text-xs text-ink-soft truncate">
                      {[c.email, c.telephone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="text-xs text-ink-faint whitespace-nowrap">
                    {c.dossiers?.length ?? 0} dossier{(c.dossiers?.length ?? 0) > 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
