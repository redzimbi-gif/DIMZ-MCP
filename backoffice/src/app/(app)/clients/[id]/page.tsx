import { notFound } from "next/navigation";
import Link from "next/link";
import { getClient, getClientDossiers, getClientDocuments, getClientNotes } from "@/lib/queries";
import { Card, PageHeader, StatutBadge, EmptyState, Field, inputClass, Button } from "@/components/ui";
import { formatDateTime, formatRelative, initials } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, CLIENT_TYPES, CLIENT_TYPE_LABELS } from "@/lib/types";
import { AutoResetForm } from "@/components/AutoResetForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Trash2 } from "lucide-react";
import { updateClient, addClientNote, deleteClient } from "../actions";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const [dossiers, documents, notes] = await Promise.all([
    getClientDossiers(client.id),
    getClientDocuments(client.id),
    getClientNotes(client.id),
  ]);

  const updateAction = updateClient.bind(null, client.id);
  const addNoteAction = addClientNote.bind(null, client.id);
  const deleteAction = deleteClient.bind(null, client.id);

  return (
    <div>
      <PageHeader
        title={`${client.prenom ?? ""} ${client.nom}`.trim()}
        description={`Client depuis le ${formatDateTime(client.created_at)}`}
        actions={
          <form action={deleteAction}>
            <ConfirmSubmitButton
              variant="danger"
              confirmMessage={`Supprimer définitivement ${client.prenom ?? ""} ${client.nom} ? Cette action est irréversible et supprimera aussi tous ses dossiers (${dossiers.length}) et tout ce qui leur est lié (annonces, inspections, convoyages, documents, notes).`}
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </ConfirmSubmitButton>
          </form>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center">
                {initials(client.nom, client.prenom)}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {client.prenom} {client.nom}
                </p>
                <p className="text-xs text-ink-soft">{dossiers.length} dossier(s)</p>
              </div>
            </div>

            <form action={updateAction} className="space-y-4">
              <Field label="Type de client">
                <select name="type_client" defaultValue={client.type_client} className={inputClass}>
                  {CLIENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CLIENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Civilité">
                  <select name="civilite" defaultValue={client.civilite ?? ""} className={inputClass}>
                    <option value="">—</option>
                    <option value="M.">M.</option>
                    <option value="Mme">Mme</option>
                  </select>
                </Field>
                <Field label="Nom">
                  <input name="nom" defaultValue={client.nom} required className={inputClass} />
                </Field>
                <Field label="Prénom">
                  <input name="prenom" defaultValue={client.prenom ?? ""} className={inputClass} />
                </Field>
              </div>
              <Field label="Téléphone">
                <input name="telephone" defaultValue={client.telephone ?? ""} className={inputClass} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" defaultValue={client.email ?? ""} className={inputClass} />
              </Field>
              <Field label="Adresse">
                <textarea name="adresse" defaultValue={client.adresse ?? ""} rows={2} className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Raison sociale (si professionnel)">
                  <input name="raison_sociale" defaultValue={client.raison_sociale ?? ""} className={inputClass} />
                </Field>
                <Field label="SIRET (si professionnel)">
                  <input name="siret" defaultValue={client.siret ?? ""} className={inputClass} />
                </Field>
              </div>
              <Field label="Notes privées">
                <textarea
                  name="notes_privees"
                  defaultValue={client.notes_privees ?? ""}
                  rows={4}
                  placeholder="Notes internes visibles uniquement par l'équipe…"
                  className={inputClass}
                />
              </Field>
              <Button type="submit" className="w-full">
                Enregistrer
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucun document.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((d) => (
                  <li key={d.id} className="text-sm flex items-center justify-between">
                    <span className="text-ink truncate">{d.nom}</span>
                    <span className="text-xs text-ink-faint shrink-0 ml-2">
                      {DOCUMENT_TYPE_LABELS[d.type]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Historique des dossiers</h2>
            {dossiers.length === 0 ? (
              <EmptyState title="Aucun dossier pour ce client" />
            ) : (
              <ul className="divide-y divide-line -mx-5">
                {dossiers.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dossiers/${d.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-surface-sunken"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{d.reference}</p>
                        <p className="text-xs text-ink-soft">{formatDateTime(d.created_at)}</p>
                      </div>
                      <StatutBadge statut={d.statut} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Historique des échanges</h2>
            <AutoResetForm action={addNoteAction} className="flex gap-2 mb-5">
              <input
                name="contenu"
                placeholder="Ajouter une note sur un échange (appel, email, RDV…)"
                className={inputClass}
              />
              <Button type="submit" variant="outline" className="shrink-0">
                Ajouter
              </Button>
            </AutoResetForm>
            {notes.length === 0 ? (
              <EmptyState title="Aucun échange enregistré" />
            ) : (
              <ul className="space-y-4">
                {notes.map((n) => (
                  <li key={n.id} className="text-sm border-l-2 border-line pl-3">
                    <p className="text-ink">{n.contenu}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{formatRelative(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
