import { notFound } from "next/navigation";
import { getDossier } from "@/lib/queries";
import { Card, PageHeader, Field, inputClass, Button } from "@/components/ui";
import { createInspection } from "../actions";

export default async function NewInspectionPage({ params }: { params: { id: string } }) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  const action = createInspection.bind(null, dossier.id);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nouvelle inspection"
        description={`Dossier ${dossier.reference} — ${dossier.clients?.prenom} ${dossier.clients?.nom}`}
      />
      <Card className="p-6">
        <form action={action} className="space-y-4" encType="multipart/form-data">
          <Field label="Date de l'inspection">
            <input
              name="date_inspection"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="État extérieur">
              <textarea name="etat_exterieur" rows={2} className={inputClass} />
            </Field>
            <Field label="État intérieur">
              <textarea name="etat_interieur" rows={2} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pneus">
              <textarea name="pneus" rows={2} className={inputClass} />
            </Field>
            <Field label="Freins">
              <textarea name="freins" rows={2} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Carrosserie">
              <textarea name="carrosserie" rows={2} className={inputClass} />
            </Field>
            <Field label="Mécanique">
              <textarea name="mecanique" rows={2} className={inputClass} />
            </Field>
          </div>

          <Field label="Essai routier">
            <textarea name="essai_routier" rows={2} className={inputClass} />
          </Field>

          <Field label="Défauts constatés">
            <textarea name="defauts_constates" rows={3} className={inputClass} />
          </Field>

          <Field label="Commentaires">
            <textarea name="commentaires" rows={3} className={inputClass} />
          </Field>

          <Field label="Note finale (/10)">
            <input name="note_finale" type="number" min={0} max={10} step="0.5" className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Photos">
              <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
            </Field>
            <Field label="Vidéos">
              <input name="videos" type="file" accept="video/*" multiple className={inputClass} />
            </Field>
          </div>

          <Button type="submit">Enregistrer l'inspection</Button>
        </form>
      </Card>
    </div>
  );
}
