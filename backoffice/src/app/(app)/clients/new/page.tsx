import { PageHeader, Card, Field, inputClass, Button } from "@/components/ui";
import { createClientRecord } from "../actions";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouveau client" />
      <Card className="p-6">
        <form action={createClientRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Civilité">
              <select name="civilite" className={inputClass}>
                <option value="">—</option>
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
              </select>
            </Field>
            <Field label="Nom">
              <input name="nom" required className={inputClass} />
            </Field>
            <Field label="Prénom">
              <input name="prenom" className={inputClass} />
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
          <Field label="Adresse">
            <textarea name="adresse" rows={2} className={inputClass} />
          </Field>
          <div className="pt-2">
            <Button type="submit">Créer le client</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
