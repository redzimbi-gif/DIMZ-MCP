import { type ReactNode } from "react";
import { Field, inputClass, Button } from "@/components/ui";
import type { Annonce } from "@/lib/types";

const SCORE_DIMZ_CRITERES: { name: string; label: string }[] = [
  { name: "score_prix", label: "Prix" },
  { name: "score_historique", label: "Historique" },
  { name: "score_etat", label: "État" },
  { name: "score_adequation", label: "Adéquation" },
];

export function AnnonceForm({
  action,
  annonce,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  annonce?: Annonce;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <Card title="L'annonce">
        {!annonce ? (
          <div className="mb-4">
            <Field label="Titre">
              <input name="titre" required className={inputClass} />
            </Field>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lien de l'annonce">
            <input name="lien" type="url" defaultValue={annonce?.lien ?? ""} className={inputClass} />
          </Field>
          <Field label="Localisation">
            <input name="localisation" defaultValue={annonce?.localisation ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Field label="Prix (€)">
            <input
              name="prix"
              type="number"
              step="0.01"
              defaultValue={annonce?.prix ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Kilométrage">
            <input name="kilometrage" type="number" defaultValue={annonce?.kilometrage ?? ""} className={inputClass} />
          </Field>
          <Field label="Année">
            <input name="annee" type="number" defaultValue={annonce?.annee ?? ""} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Score DIMZ">
        <div className="mb-4">
          <Field label="Score DIMZ global (/10)">
            <input
              name="score_confiance"
              type="number"
              min={0}
              max={10}
              step="0.5"
              defaultValue={annonce?.score_confiance ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SCORE_DIMZ_CRITERES.map(({ name, label }) => (
            <Field key={name} label={label}>
              <input
                name={name}
                type="number"
                min={0}
                max={10}
                step="0.5"
                defaultValue={(annonce as any)?.[name] ?? ""}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Analyse">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Points forts">
            <textarea name="points_forts" rows={3} defaultValue={annonce?.points_forts ?? ""} className={inputClass} />
          </Field>
          <Field label="Points faibles">
            <textarea name="points_faibles" rows={3} defaultValue={annonce?.points_faibles ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Avis du copilote">
            <textarea name="avis_copilote" rows={3} defaultValue={annonce?.avis_copilote ?? ""} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Photos">
        <Field label={annonce ? "Ajouter des photos" : "Photos"}>
          <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
        </Field>
      </Card>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-lg2 shadow-card p-6">
      <h2 className="text-sm font-semibold text-ink mb-4">{title}</h2>
      {children}
    </div>
  );
}
