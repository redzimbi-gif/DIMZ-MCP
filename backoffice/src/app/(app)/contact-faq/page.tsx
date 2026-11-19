import { CircleHelp, AlertTriangle } from "lucide-react";
import { listContactsFaq } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Button, StatCard, inputClass } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { formatDateTime } from "@/lib/format";
import { clsx } from "clsx";
import { markContactFaqRead, markAllContactsFaqRead, repondreContactFaq } from "./actions";

export default async function ContactFaqPage() {
  const contacts = await listContactsFaq();
  const nonLues = contacts.filter((c) => !c.lu).length;
  // « Sans réponse » compte les envois réussis : une réponse dont l'email a
  // échoué n'a atteint personne, la question reste donc à traiter.
  const sansReponse = contacts.filter(
    (c) => !c.contacts_faq_reponses?.some((r) => r.email_statut === "envoye")
  ).length;

  return (
    <div>
      <PageHeader
        title="Questions FAQ"
        description="Questions envoyées depuis le formulaire de contact de la FAQ, sur le site vitrine. Les réponses partent par email."
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

      <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl">
        <StatCard label="Questions reçues" value={contacts.length} icon={<CircleHelp className="h-4 w-4" strokeWidth={1.8} />} />
        <StatCard label="Non lues" value={nonLues} />
        <StatCard label="Sans réponse" value={sansReponse} />
      </div>

      <Card>
        {contacts.length === 0 ? (
          <EmptyState
            title="Aucune question pour le moment"
            description="Les questions posées depuis la FAQ du site vitrine apparaîtront ici automatiquement."
          />
        ) : (
          <ul className="divide-y divide-line">
            {contacts.map((c) => {
              const reponses = c.contacts_faq_reponses ?? [];
              const repondu = reponses.some((r) => r.email_statut === "envoye");

              return (
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

                  {reponses.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {reponses.map((r) =>
                        r.email_statut === "envoye" ? (
                          <div key={r.id} className="border-l-2 border-blue-200 pl-3">
                            <p className="text-xs text-ink-faint">
                              Répondu le {formatDateTime(r.created_at)}
                            </p>
                            <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap">{r.contenu}</p>
                          </div>
                        ) : (
                          <div key={r.id} className="border-l-2 border-red-300 pl-3">
                            <p className="text-xs font-medium text-red-700 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
                              Envoi échoué le {formatDateTime(r.created_at)}
                              {r.email_erreur ? ` — ${r.email_erreur}` : null}
                            </p>
                            <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap">{r.contenu}</p>
                            <p className="text-xs text-ink-faint mt-1">
                              Ce message n&apos;est jamais parti. Renvoyez-le ci-dessous.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ) : null}

                  {/* Ouvert tant que rien n'est parti : c'est le travail qui reste. */}
                  <details className="mt-3 group" open={!repondu}>
                    <summary className="text-xs font-medium text-ink-soft cursor-pointer select-none hover:text-ink">
                      {repondu ? "Répondre à nouveau" : "Répondre par email"}
                    </summary>
                    <AutoResetForm action={repondreContactFaq.bind(null, c.id)} className="mt-2 space-y-2">
                      <textarea
                        name="contenu"
                        rows={4}
                        required
                        maxLength={4000}
                        className={inputClass}
                        placeholder={`Votre réponse à ${c.nom}, envoyée à ${c.email}`}
                      />
                      <Button type="submit" className="text-xs">
                        Envoyer la réponse
                      </Button>
                    </AutoResetForm>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
