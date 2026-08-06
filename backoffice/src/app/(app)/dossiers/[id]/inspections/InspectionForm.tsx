import { type ReactNode } from "react";
import { Field, inputClass, Button } from "@/components/ui";
import { INSPECTION_VERDICTS, INSPECTION_VERDICT_LABELS, type Inspection } from "@/lib/types";

const CATEGORY_SCORES: { name: string; label: string }[] = [
  { name: "score_administratif", label: "Contrôle administratif" },
  { name: "score_exterieur", label: "Inspection extérieure" },
  { name: "score_interieur", label: "Inspection intérieure" },
  { name: "score_mecanique", label: "Contrôle mécanique" },
  { name: "score_essai_routier", label: "Essai routier" },
  { name: "score_marche", label: "Analyse du marché" },
];

const TECHNICAL_FIELDS: { name: keyof Inspection; label: string }[] = [
  { name: "etat_exterieur", label: "État extérieur" },
  { name: "etat_interieur", label: "État intérieur" },
  { name: "pneus", label: "Pneus" },
  { name: "freins", label: "Freins" },
  { name: "carrosserie", label: "Carrosserie" },
  { name: "mecanique", label: "Mécanique" },
  { name: "essai_routier", label: "Essai routier (notes libres)" },
  { name: "defauts_constates", label: "Défauts constatés" },
];

export function InspectionForm({
  action,
  inspection,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  inspection?: Inspection;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <Card title="Le rapport que reçoit le client">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date de l'inspection">
            <input
              name="date_inspection"
              type="date"
              defaultValue={inspection?.date_inspection ?? new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </Field>
          <Field label="Score DIMZ global (/10)">
            <input
              name="note_finale"
              type="number"
              min={0}
              max={10}
              step="0.1"
              defaultValue={inspection?.note_finale ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Véhicule">
            <input
              name="vehicule_titre"
              defaultValue={inspection?.vehicule_titre ?? ""}
              placeholder="Peugeot 308 SW 1.5 BlueHDi 130 · 2019"
              className={inputClass}
            />
          </Field>
          <Field label="Annonce comparée">
            <input
              name="annonce_comparee"
              defaultValue={inspection?.annonce_comparee ?? ""}
              placeholder="14 800 € · 78 400 km · Diesel · Boîte manuelle · 1 propriétaire"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Field label="Lieu de l'expertise">
            <input name="lieu" defaultValue={inspection?.lieu ?? ""} placeholder="Lyon (69)" className={inputClass} />
          </Field>
          <Field label="Expert">
            <input
              name="expert_nom"
              defaultValue={inspection?.expert_nom ?? ""}
              placeholder="Copilote certifié"
              className={inputClass}
            />
          </Field>
          <Field label="Durée sur site">
            <input
              name="duree_sur_site"
              defaultValue={inspection?.duree_sur_site ?? ""}
              placeholder="1h50"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Tags (séparés par des virgules)">
            <input
              name="tags"
              defaultValue={inspection?.tags ?? ""}
              placeholder="Carnet complet, Contrôle technique OK, Aucun choc structurel"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card title="Score par étape du contrôle (/10)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CATEGORY_SCORES.map(({ name, label }) => (
            <Field key={name} label={label}>
              <input
                name={name}
                type="number"
                min={0}
                max={10}
                step="0.5"
                defaultValue={(inspection as any)?.[name] ?? ""}
                className={inputClass}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Analyse">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Points positifs (un par ligne)">
            <textarea name="points_positifs" rows={4} defaultValue={inspection?.points_positifs ?? ""} className={inputClass} />
          </Field>
          <Field label="Points de vigilance (un par ligne)">
            <textarea name="points_vigilance" rows={4} defaultValue={inspection?.points_vigilance ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Avis du copilote (citation)">
            <textarea name="avis_copilote" rows={3} defaultValue={inspection?.avis_copilote ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 mt-4">
          <Field label="Verdict">
            <select name="verdict" defaultValue={inspection?.verdict ?? ""} className={inputClass}>
              <option value="">—</option>
              {INSPECTION_VERDICTS.map((v) => (
                <option key={v} value={v}>
                  {INSPECTION_VERDICT_LABELS[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recommandation finale">
            <textarea name="recommandation_finale" rows={2} defaultValue={inspection?.recommandation_finale ?? ""} className={inputClass} />
          </Field>
        </div>
      </Card>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-ink-soft select-none">
          Notes techniques internes (optionnel, n'apparaissent pas dans le rapport envoyé au client)
        </summary>
        <Card title={null} className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TECHNICAL_FIELDS.map(({ name, label }) => (
              <Field key={name} label={label}>
                <textarea name={name} rows={2} defaultValue={(inspection?.[name] as string) ?? ""} className={inputClass} />
              </Field>
            ))}
          </div>
          <div className="mt-4">
            <Field label="Commentaires">
              <textarea name="commentaires" rows={3} defaultValue={inspection?.commentaires ?? ""} className={inputClass} />
            </Field>
          </div>
        </Card>
      </details>

      <Card title="Photos et vidéos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={inspection ? "Ajouter des photos" : "Photos"}>
            <input name="photos" type="file" accept="image/*" multiple className={inputClass} />
          </Field>
          <Field label={inspection ? "Ajouter des vidéos" : "Vidéos"}>
            <input name="videos" type="file" accept="video/*" multiple className={inputClass} />
          </Field>
        </div>
      </Card>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function Card({ title, children, className }: { title: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-line rounded-lg2 shadow-card p-6 ${className ?? ""}`}>
      {title ? <h2 className="text-sm font-semibold text-ink mb-4">{title}</h2> : null}
      {children}
    </div>
  );
}
