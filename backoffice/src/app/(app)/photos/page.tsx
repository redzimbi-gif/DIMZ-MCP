import { Trash2 } from "lucide-react";
import { listPhotosBibliotheque } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, EmptyState, Field, Button, inputClass } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { addPhotosBibliotheque, renamePhotoBibliotheque, deletePhotoBibliotheque } from "./actions";

export default async function PhotosPage({ searchParams }: { searchParams: { error?: string } }) {
  const photos = await listPhotosBibliotheque();
  const urls = await getSignedUrls(photos.map((p) => p.storage_path));

  return (
    <div>
      <PageHeader
        title="Photos"
        description="Bibliothèque de photos réutilisables : uploadez une photo une fois, puis choisissez-la directement sur la fiche Découverte d'un dossier, sans avoir à la re-uploader."
      />

      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      <Card className="p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Ajouter des photos</h2>
        <AutoResetForm action={addPhotosBibliotheque} className="space-y-3" encType="multipart/form-data">
          <Field label="Photos">
            <input name="photos" type="file" accept="image/*" multiple required className={inputClass} />
          </Field>
          <Field label="Nom (optionnel, uniquement si une seule photo — sinon le nom du fichier est utilisé)">
            <input name="nom" placeholder="ex. Peugeot 208 rouge" className={inputClass} />
          </Field>
          <Button type="submit">Ajouter à la bibliothèque</Button>
        </AutoResetForm>
      </Card>

      {photos.length === 0 ? (
        <Card>
          <EmptyState title="Aucune photo dans la bibliothèque" description="Ajoutez des photos ci-dessus pour pouvoir les réutiliser sur vos fiches Découverte." />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((p) => {
            const url = urls[p.storage_path];
            const renameAction = renamePhotoBibliotheque.bind(null, p.id);
            const deleteAction = deletePhotoBibliotheque.bind(null, p.id);
            return (
              <Card key={p.id} className="p-3">
                <div className="aspect-square rounded-md overflow-hidden bg-surface-sunken mb-2">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={p.nom} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <form action={renameAction} className="flex items-center gap-1.5">
                  <input name="nom" defaultValue={p.nom} className={`${inputClass} !py-1.5 text-xs`} />
                  <button type="submit" className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 px-1.5">
                    OK
                  </button>
                </form>
                <form action={deleteAction} className="mt-1.5">
                  <ConfirmSubmitButton
                    variant="ghost"
                    className="!p-1 !gap-1 text-xs text-ink-faint hover:text-bad hover:bg-bad-bg w-full justify-start"
                    confirmMessage={`Supprimer « ${p.nom} » de la bibliothèque ? Les véhicules qui l'utilisent perdront cette photo.`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </ConfirmSubmitButton>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
