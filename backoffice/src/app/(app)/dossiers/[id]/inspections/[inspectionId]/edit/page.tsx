import { notFound } from "next/navigation";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { getInspection } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader } from "@/components/ui";
import { InspectionForm } from "../../InspectionForm";
import { updateInspection, deleteInspectionPhoto } from "../actions";

export default async function EditInspectionPage({
  params,
  searchParams,
}: {
  params: { id: string; inspectionId: string };
  searchParams: { error?: string };
}) {
  const inspection = await getInspection(params.inspectionId);
  if (!inspection || inspection.dossier_id !== params.id) notFound();

  const photoUrls = await getSignedUrls(inspection.photos);
  const action = updateInspection.bind(null, params.id, inspection.id);
  const removePhotoAction = async (path: string) => {
    "use server";
    await deleteInspectionPhoto(params.id, inspection.id, path);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Modifier le rapport ${inspection.reference}`}
        description={`${inspection.dossiers?.reference} — ${inspection.dossiers?.clients?.prenom} ${inspection.dossiers?.clients?.nom}`}
      />

      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}

      {inspection.photos.length > 0 ? (
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-3">Photos existantes</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {inspection.photos.map((path) =>
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

      <InspectionForm action={action} inspection={inspection} submitLabel="Enregistrer les modifications" />
    </div>
  );
}
