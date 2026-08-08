import { notFound } from "next/navigation";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { getAnnonce } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader } from "@/components/ui";
import { AnnonceForm } from "../../AnnonceForm";
import { updateAnnonce, deleteAnnoncePhoto } from "../actions";

export default async function EditAnnoncePage({
  params,
}: {
  params: { id: string; annonceId: string };
}) {
  const annonce = await getAnnonce(params.annonceId);
  if (!annonce || annonce.dossier_id !== params.id) notFound();

  const photoUrls = await getSignedUrls(annonce.photos);
  const action = updateAnnonce.bind(null, params.id, annonce.id);
  const removePhotoAction = async (path: string) => {
    "use server";
    await deleteAnnoncePhoto(params.id, annonce.id, path);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Noter l'annonce`} description={annonce.titre} />

      {annonce.photos.length > 0 ? (
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-3">Photos existantes</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {annonce.photos.map((path) =>
              photoUrls[path] ? (
                <div key={path} className="relative aspect-square rounded-md overflow-hidden border border-line group">
                  <Image src={photoUrls[path]} alt="" fill className="object-cover" unoptimized />
                  <form action={removePhotoAction.bind(null, path)} className="absolute top-1 right-1">
                    <button
                      type="submit"
                      className="p-1.5 rounded-md bg-surface/90 text-ink-faint hover:text-bad hover:bg-bad-bg"
                      aria-label="Supprimer cette photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              ) : null
            )}
          </div>
        </Card>
      ) : null}

      <AnnonceForm action={action} annonce={annonce} submitLabel="Enregistrer les modifications" />
    </div>
  );
}
