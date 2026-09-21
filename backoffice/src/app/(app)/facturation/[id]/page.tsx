import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getFacture, listClients } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { Card, PageHeader, Field, inputClass, Button, LinkButton } from "@/components/ui";
import { updateFacture } from "../actions";

export default async function EditFacturePage({ params }: { params: { id: string } }) {
  const facture = await getFacture(params.id);
  if (!facture) notFound();

  const clients = await listClients();
  const action = updateFacture.bind(null, facture.id);
  const pdfUrl = facture.pdf_path ? await getSignedUrl(facture.pdf_path) : null;

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Modifier la facture"
        description={facture.numero ? `Facture ${facture.numero}` : "Facture sans numéro"}
        actions={
          <LinkButton href="/facturation" variant="outline">
            <ArrowLeft className="h-4 w-4" /> Retour
          </LinkButton>
        }
      />
      <Card className="p-6">
        <form action={action} className="space-y-3" encType="multipart/form-data">
          <Field label="Client">
            <select name="client_id" defaultValue={facture.client_id ?? ""} className={inputClass}>
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
            <input name="numero" defaultValue={facture.numero ?? ""} className={inputClass} />
          </Field>
          <Field label="Date">
            <input name="date_facture" type="date" defaultValue={facture.date_facture ?? ""} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Montant total (€)">
              <input
                name="montant_total"
                type="number"
                step="0.01"
                min="0"
                defaultValue={facture.montant_total}
                className={inputClass}
              />
            </Field>
            <Field label="Montant des frais (€)">
              <input
                name="montant_frais"
                type="number"
                step="0.01"
                min="0"
                defaultValue={facture.montant_frais}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Notes (optionnel)">
            <textarea name="notes" rows={2} defaultValue={facture.notes ?? ""} className={inputClass} />
          </Field>
          <Field label={facture.pdf_path ? "Remplacer le PDF de la facture" : "PDF de la facture (optionnel)"}>
            <input name="pdf" type="file" accept="application/pdf" className={inputClass} />
          </Field>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" /> Voir le PDF actuel
            </a>
          ) : null}
          <Button type="submit" className="w-full">
            Enregistrer les modifications
          </Button>
        </form>
      </Card>
    </div>
  );
}
