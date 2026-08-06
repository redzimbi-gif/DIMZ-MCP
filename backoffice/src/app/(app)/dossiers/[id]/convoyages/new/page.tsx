import { notFound } from "next/navigation";
import { getDossier } from "@/lib/queries";
import { Card, PageHeader, Field, inputClass, Button } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";
import { CONVOYAGE_STATUTS, CONVOYAGE_STATUT_LABELS } from "@/lib/types";
import { createConvoyage } from "../actions";

export default async function NewConvoyagePage({ params }: { params: { id: string } }) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  const action = createConvoyage.bind(null, dossier.id);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nouveau convoyage"
        description={`Dossier ${dossier.reference} — ${dossier.clients?.prenom} ${dossier.clients?.nom}`}
      />
      <Card className="p-6">
        <form action={action} className="space-y-4" encType="multipart/form-data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Adresse de départ">
              <input name="adresse_depart" className={inputClass} />
            </Field>
            <Field label="Adresse d'arrivée">
              <input name="adresse_arrivee" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Date">
              <input name="date_convoyage" type="date" className={inputClass} />
            </Field>
            <Field label="Heure">
              <input name="heure" type="time" className={inputClass} />
            </Field>
            <Field label="Statut">
              <select name="statut" defaultValue="planifie" className={inputClass}>
                {CONVOYAGE_STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {CONVOYAGE_STATUT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Conducteur">
            <input name="conducteur" className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Kilométrage départ">
              <input name="km_depart" type="number" className={inputClass} />
            </Field>
            <Field label="Kilométrage arrivée">
              <input name="km_arrivee" type="number" className={inputClass} />
            </Field>
            <Field label="Niveau de carburant">
              <input name="niveau_carburant" placeholder="ex. 3/4" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Photos avant convoyage">
              <input name="photos_avant" type="file" accept="image/*" multiple className={inputClass} />
            </Field>
            <Field label="Photos après convoyage">
              <input name="photos_apres" type="file" accept="image/*" multiple className={inputClass} />
            </Field>
          </div>

          <Field label="Rapport de livraison">
            <textarea name="rapport_notes" rows={3} className={inputClass} />
          </Field>

          <Field label="Signature client">
            <SignaturePad name="signature_client" />
          </Field>

          <Button type="submit">Enregistrer le convoyage</Button>
        </form>
      </Card>
    </div>
  );
}
