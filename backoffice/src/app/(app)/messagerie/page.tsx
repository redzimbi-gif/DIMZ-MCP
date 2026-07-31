import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { listRecentNotes } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import { formatRelative } from "@/lib/format";

export default async function MessageriePage() {
  const notes = await listRecentNotes();

  return (
    <div>
      <PageHeader
        title="Messagerie"
        description="Messages internes rattachés aux dossiers et aux clients."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            {notes.length === 0 ? (
              <EmptyState title="Aucun message interne pour le moment" />
            ) : (
              <ul className="divide-y divide-line">
                {notes.map((n) => (
                  <li key={n.id} className="px-5 py-3.5">
                    <p className="text-sm text-ink">{n.contenu}</p>
                    <p className="text-xs text-ink-faint mt-1">
                      {n.dossiers ? (
                        <Link href={`/dossiers/${n.dossier_id}?tab=notes`} className="hover:text-blue-600">
                          {n.dossiers.reference}
                        </Link>
                      ) : n.clients ? (
                        <Link href={`/clients/${n.client_id}`} className="hover:text-blue-600">
                          {n.clients.prenom} {n.clients.nom}
                        </Link>
                      ) : null}
                      {" · "}
                      {formatRelative(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-6 h-fit text-center">
          <Mail className="h-7 w-7 text-blue-500 mx-auto mb-3" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-ink mb-1.5">Emails & SMS</h2>
          <p className="text-sm text-ink-soft">
            L'envoi et la réception d'emails et de SMS directement dans cet espace arrivent dans
            une prochaine phase, une fois un service d'envoi (ex. Resend, Twilio) connecté.
          </p>
        </Card>
      </div>
    </div>
  );
}
