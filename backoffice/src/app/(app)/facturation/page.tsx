import Link from "next/link";
import { Plus, Pencil, Trash2, FileText, FileDown, Mail } from "lucide-react";
import { listFactures, listClients, listDossiers, listDocumentsCommerciaux } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, StatCard, EmptyState, Field, inputClass, Button, Badge } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { EmailStatusBanner } from "@/components/EmailStatusBanner";
import { DOCUMENT_COMMERCIAL_STATUT_LABELS, DOCUMENT_COMMERCIAL_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { createFacture, deleteFacture } from "./actions";
import { createDocumentCommercial, envoyerDocumentCommercial } from "./documents-actions";

const DOC_STATUT_TONE: Record<string, "neutral" | "good" | "warn" | "bad" | "blue"> = {
  brouillon: "neutral",
  envoye: "blue",
  accepte: "good",
  refuse: "bad",
  paye: "good",
  annule: "neutral",
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: { notif?: string; error?: string; dossier_id?: string };
}) {
  const [factures, clients, dossiers, documentsCommerciaux] = await Promise.all([
    listFactures(),
    listClients(),
    listDossiers(),
    listDocumentsCommerciaux(),
  ]);
  const pdfUrls = await getSignedUrls(factures.map((f) => f.pdf_path).filter((p): p is string => !!p));

  const totalFacture = factures.reduce((sum, f) => sum + f.montant_total, 0);
  const totalFrais = factures.reduce((sum, f) => sum + f.montant_frais, 0);

  const dossierPrerempli = searchParams.dossier_id ? dossiers.find((d) => d.id === searchParams.dossier_id) : null;

  return (
    <div>
      <PageHeader title="Facturation" description="Devis, factures générées, et journal des factures déjà émises hors back-office." />

      <EmailStatusBanner status={searchParams.notif} />
      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      <h2 className="text-sm font-semibold text-ink mb-3">Devis & factures générés</h2>
      <div className="grid lg:grid-cols-[1fr_360px] gap-4 mb-8">
        <Card>
          {documentsCommerciaux.length === 0 ? (
            <EmptyState
              title="Aucun devis ni facture"
              description="Crée le premier devis depuis le formulaire à droite."
            />
          ) : (
            <ul className="divide-y divide-line">
              {documentsCommerciaux.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <Link href={`/facturation/documents/${d.id}`} className="text-sm font-medium text-ink hover:text-blue-600 truncate block">
                      {DOCUMENT_COMMERCIAL_TYPE_LABELS[d.type]} {d.numero}
                    </Link>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {d.dossiers?.reference ? `${d.dossiers.reference} · ` : ""}
                      {d.clients ? `${d.clients.prenom ?? ""} ${d.clients.nom ?? ""}`.trim() : "Aucun client lié"}
                      {" · "}
                      {formatDate(d.date_emission)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={DOC_STATUT_TONE[d.statut]}>{DOCUMENT_COMMERCIAL_STATUT_LABELS[d.statut]}</Badge>
                    <p className="text-sm font-semibold text-ink tnum mt-1.5">{formatEUR(d.montant_ttc)}</p>
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      <a
                        href={`/api/documents-commerciaux/${d.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        aria-label="Voir le PDF"
                      >
                        <FileDown className="h-4 w-4" strokeWidth={1.8} />
                      </a>
                      {d.statut !== "annule" ? (
                        <form action={envoyerDocumentCommercial.bind(null, d.id)}>
                          <button
                            type="submit"
                            className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            aria-label="Envoyer au client"
                          >
                            <Mail className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 h-fit">
          <h3 className="text-sm font-semibold text-ink mb-4">Nouveau devis / facture</h3>
          <AutoResetForm action={createDocumentCommercial} className="space-y-3">
            <Field label="Type">
              <select name="type" defaultValue="devis" className={inputClass}>
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </select>
            </Field>
            <Field label="Dossier lié (optionnel)">
              <select name="dossier_id" defaultValue={dossierPrerempli?.id ?? ""} className={inputClass}>
                <option value="">—</option>
                {dossiers.map((dos) => (
                  <option key={dos.id} value={dos.id}>
                    {dos.reference}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Client">
              <select name="client_id" defaultValue={dossierPrerempli?.client_id ?? ""} className={inputClass}>
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Objet (optionnel)">
              <input name="objet" placeholder="ex. Convoyage Lyon → Paris" className={inputClass} />
            </Field>
            <Field label="Première ligne">
              <input name="ligne_description_0" placeholder="Description" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité">
                <input name="ligne_quantite_0" type="number" step="0.01" min="0" defaultValue="1" className={inputClass} />
              </Field>
              <Field label="Prix unit. HT (€)">
                <input name="ligne_prix_0" type="number" step="0.01" min="0" className={inputClass} />
              </Field>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Créer en brouillon
            </Button>
          </AutoResetForm>
          <p className="text-xs text-ink-faint mt-3">
            D'autres lignes et le détail se complètent ensuite sur la fiche du document.
          </p>
        </Card>
      </div>

      <h2 className="text-sm font-semibold text-ink mb-3">Anciennes factures (import manuel)</h2>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard label="Total facturé" value={formatEUR(totalFacture)} />
        <StatCard label="Total frais" value={formatEUR(totalFrais)} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <Card>
          {factures.length === 0 ? (
            <EmptyState
              title="Aucune facture enregistrée"
              description="Ajoute une facture déjà émise depuis le formulaire à droite."
            />
          ) : (
            <ul className="divide-y divide-line">
              {factures.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {f.numero ? `Facture ${f.numero}` : "Facture sans numéro"}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {f.clients ? `${f.clients.prenom ?? ""} ${f.clients.nom ?? ""}`.trim() : "Client non lié"}
                      {f.date_facture ? ` · ${formatDate(f.date_facture)}` : ""}
                    </p>
                    {f.clients?.type_client === "professionnel" ? (
                      <p className="text-xs text-ink-faint mt-0.5">
                        {[f.clients.raison_sociale, f.clients.siret ? `SIRET ${f.clients.siret}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {f.notes ? <p className="text-xs text-ink-faint mt-1">{f.notes}</p> : null}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink tnum">{formatEUR(f.montant_total)}</p>
                    {f.montant_frais ? (
                      <p className="text-xs text-ink-faint tnum mt-0.5">Frais : {formatEUR(f.montant_frais)}</p>
                    ) : null}
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      {f.pdf_path && pdfUrls[f.pdf_path] ? (
                        <a
                          href={pdfUrls[f.pdf_path]}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label="Voir le PDF"
                        >
                          <FileText className="h-4 w-4" strokeWidth={1.8} />
                        </a>
                      ) : null}
                      <Link
                        href={`/facturation/${f.id}`}
                        className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.8} />
                      </Link>
                      <form action={deleteFacture.bind(null, f.id)}>
                        <button
                          type="submit"
                          className="p-1.5 rounded-md text-ink-faint hover:text-bad hover:bg-bad-bg transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold text-ink mb-4">Ajouter une facture</h2>
          <AutoResetForm action={createFacture} className="space-y-3" encType="multipart/form-data">
            <Field label="Client">
              <select name="client_id" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                    {c.type_client === "professionnel" && c.raison_sociale ? ` — ${c.raison_sociale}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Numéro de facture">
              <input name="numero" className={inputClass} />
            </Field>
            <Field label="Date">
              <input name="date_facture" type="date" className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Montant total (€)">
                <input name="montant_total" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
              </Field>
              <Field label="Montant des frais (€)">
                <input name="montant_frais" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
              </Field>
            </div>
            <Field label="Notes (optionnel)">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
            <Field label="PDF de la facture (optionnel)">
              <input name="pdf" type="file" accept="application/pdf" className={inputClass} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </AutoResetForm>
        </Card>
      </div>
    </div>
  );
}
