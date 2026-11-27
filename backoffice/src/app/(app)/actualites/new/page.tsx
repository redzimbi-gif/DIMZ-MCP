import { PageHeader, Card, Field, inputClass, Button } from "@/components/ui";
import { CompressedImageInput } from "@/components/CompressedImageInput";
import { createArticle } from "../actions";

export default function NewArticlePage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouvel article" />

      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      <Card className="p-6">
        <form action={createArticle} encType="multipart/form-data" className="space-y-4">
          <Field label="Titre">
            <input name="titre" required className={inputClass} />
          </Field>
          <Field label="Extrait (affiché sur la carte, avant de déplier l'article)">
            <textarea name="extrait" rows={2} required className={inputClass} />
          </Field>
          <Field label="Contenu">
            <textarea name="contenu" rows={10} required className={inputClass} />
          </Field>
          <Field label="Photo (optionnel)">
            <CompressedImageInput name="photo" className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="publie" className="rounded border-line" />
            Publier immédiatement (sinon l'article reste en brouillon)
          </label>
          <div className="pt-2">
            <Button type="submit">Créer l'article</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
