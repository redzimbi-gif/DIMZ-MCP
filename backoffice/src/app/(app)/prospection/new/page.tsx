import { PageHeader, Card, Field, inputClass, Button } from "@/components/ui";
import {
  PROSPECT_STATUTS,
  PROSPECT_STATUT_LABELS,
  PROSPECT_CATEGORIES,
  PROSPECT_CATEGORIE_LABELS,
  PROSPECT_ZONES,
  PROSPECT_ZONE_LABELS,
} from "@/lib/types";
import { createProspect } from "../actions";

export default function NewProspectPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nouveau prospect"
        description="Un professionnel de l'automobile à démarcher pour le convoyage."
      />
      <Card className="p-6">
        <form action={createProspect} className="space-y-4">
          <Field label="Raison sociale">
            <input name="raison_sociale" required className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Enseigne">
              <input name="enseigne" className={inputClass} />
            </Field>
            <Field label="Catégorie">
              <select name="categorie" defaultValue="garage" className={inputClass}>
                {PROSPECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {PROSPECT_CATEGORIE_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Adresse">
            <input name="adresse" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Code postal">
              <input name="code_postal" className={inputClass} />
            </Field>
            <Field label="Ville">
              <input name="ville" className={inputClass} />
            </Field>
            <Field label="Zone">
              <select name="zone" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {PROSPECT_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {PROSPECT_ZONE_LABELS[z]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Téléphone">
              <input name="telephone" type="tel" className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
          </div>
          <Field label="Site web">
            <input name="site_web" className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom du responsable">
              <input name="responsable_nom" className={inputClass} />
            </Field>
            <Field label="Fonction">
              <input name="responsable_fonction" placeholder="Gérant, chef d'atelier…" className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="SIRET">
              <input name="siret" className={inputClass} />
            </Field>
            <Field label="Statut de départ">
              <select name="statut" defaultValue="a_contacter" className={inputClass}>
                {PROSPECT_STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {PROSPECT_STATUT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              placeholder="Contexte, besoins en convoyage, volumes évoqués…"
              className={inputClass}
            />
          </Field>
          <div className="pt-2">
            <Button type="submit">Créer le prospect</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
