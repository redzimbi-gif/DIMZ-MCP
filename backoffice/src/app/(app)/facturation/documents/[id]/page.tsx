import { notFound } from "next/navigation";
import { FileDown, Mail } from "lucide-react";
import { getDocumentCommercial, listDossiers, listClients } from "@/lib/queries";
import { Card, PageHeader, LinkButton, Badge, Button, Field, inputClass } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DOCUMENT_COMMERCIAL_STATUT_LABELS, DOCUMENT_COMMERCIAL_TYPE_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  updateDocumentCommercial,
  deleteDocumentCommercial,
  marquerStatutDocumentCommercial,
  convertirEnFacture,
  envoyerDocumentCommercial,
} from "../../documents-actions";

const STATUT_TONE: Record<string, "neutral" | "good" | "warn" | "bad" | "blue"> = {
  brouillon: "neutral",
  envoye: "blue",
  accepte: "good",
  refuse: "bad",
  paye: "good",
  annule: "neutral",
};

export default async function DocumentCommercialPage({ params }: { params: { id: string } }) {
  const doc = await getDocumentCommercial(params.id);
  if (!doc) notFound();

  const [dossiers, clients] = await Promise.all([listDossiers(), listClients()]);
  const isBrouillon = doc.statut === "brouillon";

  const updateAction = updateDocumentCommercial.bind(null, doc.id);
  const deleteAction = deleteDocumentCommercial.bind(null, doc.id);
  const envoyerAction = envoyerDocumentCommercial.bind(null, doc.id);
  const convertirAction = convertirEnFacture.bind(null, doc.id);
  const accepterAction = marquerStatutDocumentCommercial.bind(null, doc.id, "accepte");
  const refuserAction = marquerStatutDocumentCommercial.bind(null, doc.id, "refuse");
  const payeeAction = marquerStatutDocumentCommercial.bind(null, doc.id, "paye");
  const annulerAction = marquerStatutDocumentCommercial.bind(null, doc.id, "annule");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`${DOCUMENT_COMMERCIAL_TYPE_LABELS[doc.type]} ${doc.numero}`}
        description={
          doc.dossiers?.reference
            ? `${doc.dossiers.reference} — ${doc.clients?.prenom ?? ""} ${doc.clients?.nom ?? ""}`.trim()
            : `${doc.clients?.prenom ?? ""} ${doc.clients?.nom ?? ""}`.trim() || "Aucun client lié"
        }
        actions={
          <>
            <Badge tone={STATUT_TONE[doc.statut]}>{DOCUMENT_COMMERCIAL_STATUT_LABELS[doc.statut]}</Badge>
            <LinkButton href={`/api/documents-commerciaux/${doc.id}/pdf`} variant="outline">
              <FileDown className="h-4 w-4" /> PDF
            </LinkButton>
            {doc.statut !== "annule" ? (
              <form action={envoyerAction}>
                <Button type="submit" variant="outline">
                  <Mail className="h-4 w-4" /> Envoyer au client
                </Button>
              </form>
            ) : null}
          </>
        }
      />

      <Card className="p-5 mb-4">
        <div className="flex flex-wrap gap-2">
          {doc.type === "devis" && doc.statut === "envoye" ? (
            <>
              <form action={accepterAction}>
                <Button type="submit" variant="outline">
                  Marquer accepté
                </Button>
              </form>
              <form action={refuserAction}>
                <Button type="submit" variant="outline">
                  Marquer refusé
                </Button>
              </form>
            </>
          ) : null}
          {doc.type === "devis" && doc.statut === "accepte" ? (
            <form action={convertirAction}>
              <Button type="submit">Convertir en facture</Button>
            </form>
          ) : null}
          {doc.type === "facture" && doc.statut === "envoye" ? (
            <form action={payeeAction}>
              <Button type="submit" variant="outline">
                Marquer payée
              </Button>
            </form>
          ) : null}
          {doc.statut !== "annule" && doc.statut !== "brouillon" ? (
            <form action={annulerAction}>
              <ConfirmSubmitButton variant="ghost" confirmMessage="Annuler ce document ?">
                Annuler
              </ConfirmSubmitButton>
            </form>
          ) : null}
          {isBrouillon ? (
            <form action={deleteAction}>
              <ConfirmSubmitButton
                variant="ghost"
                className="text-bad hover:bg-bad-bg"
                confirmMessage="Supprimer ce brouillon ? Cette action est irréversible."
              >
                Supprimer
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </Card>

      {isBrouillon ? (
        <DocumentForm doc={doc} dossiers={dossiers} clients={clients} action={updateAction} />
      ) : (
        <DocumentSummary doc={doc} />
      )}
    </div>
  );
}

function DocumentSummary({ doc }: { doc: NonNullable<Awaited<ReturnType<typeof getDocumentCommercial>>> }) {
  return (
    <Card className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-ink-soft">Objet</p>
          <p className="text-ink font-medium">{doc.objet || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Émis le</p>
          <p className="text-ink font-medium">{formatDate(doc.date_emission)}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-soft border-b border-line">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 font-medium text-right">Qté</th>
            <th className="py-2 font-medium text-right">PU HT</th>
            <th className="py-2 font-medium text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {doc.lignes.map((l, i) => (
            <tr key={i} className="border-b border-line">
              <td className="py-2 text-ink">{l.description}</td>
              <td className="py-2 text-ink text-right tnum">{l.quantite}</td>
              <td className="py-2 text-ink text-right tnum">{formatCurrency(l.prix_unitaire_ht)}</td>
              <td className="py-2 text-ink text-right tnum font-medium">
                {formatCurrency(l.quantite * l.prix_unitaire_ht)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-56 space-y-1 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Total HT</span>
            <span className="tnum">{formatCurrency(doc.montant_ht)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>TVA</span>
            <span className="tnum">{formatCurrency(doc.montant_tva)}</span>
          </div>
          <div className="flex justify-between font-semibold text-ink pt-1 border-t border-line">
            <span>Total TTC</span>
            <span className="tnum">{formatCurrency(doc.montant_ttc)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DocumentForm({
  doc,
  dossiers,
  clients,
  action,
}: {
  doc: NonNullable<Awaited<ReturnType<typeof getDocumentCommercial>>>;
  dossiers: Awaited<ReturnType<typeof listDossiers>>;
  clients: Awaited<ReturnType<typeof listClients>>;
  action: (formData: FormData) => Promise<void>;
}) {
  const lignesAffichees = doc.lignes.length > 0 ? doc.lignes : [{ description: "", quantite: 1, prix_unitaire_ht: 0 }];

  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Dossier lié (optionnel)">
            <select name="dossier_id" defaultValue={doc.dossier_id ?? ""} className={inputClass}>
              <option value="">—</option>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.reference}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <select name="client_id" defaultValue={doc.client_id ?? ""} className={inputClass}>
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Objet (optionnel)">
            <input name="objet" defaultValue={doc.objet ?? ""} className={inputClass} />
          </Field>
          <Field label={doc.type === "devis" ? "Valable jusqu'au (optionnel)" : "Échéance de paiement (optionnel)"}>
            <input name="date_echeance" type="date" defaultValue={doc.date_echeance ?? ""} className={inputClass} />
          </Field>
        </div>

        <div>
          <p className="text-xs font-medium text-ink-soft mb-2">Lignes (description vide = ignorée)</p>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const ligne = lignesAffichees[i];
              return (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input
                    name={`ligne_description_${i}`}
                    placeholder="Description"
                    defaultValue={ligne?.description ?? ""}
                    className={`${inputClass} col-span-6`}
                  />
                  <input
                    name={`ligne_quantite_${i}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Qté"
                    defaultValue={ligne?.quantite ?? 1}
                    className={`${inputClass} col-span-2`}
                  />
                  <input
                    name={`ligne_prix_${i}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Prix unit. HT"
                    defaultValue={ligne?.prix_unitaire_ht ?? ""}
                    className={`${inputClass} col-span-4`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Button type="submit">Enregistrer</Button>
      </form>
    </Card>
  );
}
