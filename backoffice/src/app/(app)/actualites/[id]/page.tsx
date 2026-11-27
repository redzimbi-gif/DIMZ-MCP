import { notFound } from "next/navigation";
import Image from "next/image";
import { getArticle } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { PageHeader, Card, Field, inputClass, Button, Badge } from "@/components/ui";
import { CompressedImageInput } from "@/components/CompressedImageInput";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatDateTime } from "@/lib/format";
import { updateArticle, deleteArticle } from "../actions";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const article = await getArticle(params.id);
  if (!article) notFound();

  const imageUrl = article.image_path ? await getSignedUrl(article.image_path) : null;
  const updateArticleAction = updateArticle.bind(null, article.id);
  const deleteArticleAction = deleteArticle.bind(null, article.id);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={article.titre}
        description={`Créé le ${formatDateTime(article.created_at)}`}
        actions={<Badge tone={article.publie ? "good" : "neutral"}>{article.publie ? "Publié" : "Brouillon"}</Badge>}
      />

      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      <Card className="p-6">
        <form action={updateArticleAction} encType="multipart/form-data" className="space-y-4">
          <Field label="Titre">
            <input name="titre" required defaultValue={article.titre} className={inputClass} />
          </Field>
          <Field label="Extrait (affiché sur la carte, avant de déplier l'article)">
            <textarea name="extrait" rows={2} required defaultValue={article.extrait} className={inputClass} />
          </Field>
          <Field label="Contenu">
            <textarea name="contenu" rows={10} required defaultValue={article.contenu} className={inputClass} />
          </Field>

          {imageUrl ? (
            <Field label="Photo actuelle">
              <div className="flex items-center gap-3">
                <Image
                  src={imageUrl}
                  alt=""
                  width={120}
                  height={90}
                  unoptimized
                  className="w-30 h-[90px] rounded-md object-cover bg-surface-sunken"
                />
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" name="supprimer_photo" className="rounded border-line" />
                  Supprimer cette photo
                </label>
              </div>
            </Field>
          ) : null}
          <Field label={imageUrl ? "Remplacer la photo" : "Photo (optionnel)"}>
            <CompressedImageInput name="photo" className={inputClass} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="publie" defaultChecked={article.publie} className="rounded border-line" />
            Publié (visible sur le site)
          </label>

          <div className="pt-2">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-line">
          <form action={deleteArticleAction}>
            <ConfirmSubmitButton
              variant="danger"
              confirmMessage={`Supprimer définitivement l'article « ${article.titre} » ?`}
            >
              Supprimer l'article
            </ConfirmSubmitButton>
          </form>
        </div>
      </Card>
    </div>
  );
}
