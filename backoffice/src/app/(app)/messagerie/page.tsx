import Link from "next/link";
import { clsx } from "clsx";
import { Mail } from "lucide-react";
import { listRecentMessages } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import { formatRelative } from "@/lib/format";

export default async function MessageriePage() {
  const messages = await listRecentMessages();

  return (
    <div>
      <PageHeader
        title="Messagerie"
        description="Messages échangés avec les clients, tous dossiers confondus."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            {messages.length === 0 ? (
              <EmptyState
                title="Aucun message pour le moment"
                description="Écris à un client depuis l'onglet Messages de sa fiche dossier — il recevra un email et pourra te répondre depuis sa page de suivi."
              />
            ) : (
              <ul className="divide-y divide-line">
                {messages.map((m) => (
                  <li key={m.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={m.auteur === "client" ? "blue" : "neutral"}>
                        {m.auteur === "client" ? "Client" : "Vous"}
                      </Badge>
                      {m.dossiers ? (
                        <Link
                          href={`/dossiers/${m.dossier_id}?tab=messages`}
                          className="text-xs font-medium text-ink-soft hover:text-blue-600"
                        >
                          {m.dossiers.reference}
                          {m.dossiers.clients ? ` — ${m.dossiers.clients.prenom ?? ""} ${m.dossiers.clients.nom ?? ""}`.trim() : ""}
                        </Link>
                      ) : null}
                    </div>
                    <p className={clsx("text-sm text-ink whitespace-pre-wrap")}>{m.contenu}</p>
                    <p className="text-xs text-ink-faint mt-1">{formatRelative(m.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-6 h-fit text-center">
          <Mail className="h-7 w-7 text-blue-500 mx-auto mb-3" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-ink mb-1.5">Répondre à un client</h2>
          <p className="text-sm text-ink-soft">
            Ouvre l'onglet <strong>Messages</strong> de sa fiche dossier pour lire le fil complet et
            répondre. Chaque message envoyé déclenche un email au client ; les emails de suivi
            d'étape restent séparés, depuis la fiche dossier.
          </p>
        </Card>
      </div>
    </div>
  );
}
