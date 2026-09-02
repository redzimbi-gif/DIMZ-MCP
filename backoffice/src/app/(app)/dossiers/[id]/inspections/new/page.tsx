import { notFound } from "next/navigation";
import { getDossier } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { InspectionForm } from "../InspectionForm";
import { createInspection } from "../actions";

export default async function NewInspectionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  const action = createInspection.bind(null, dossier.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nouvelle inspection"
        description={`Dossier ${dossier.reference} — ${dossier.clients?.prenom} ${dossier.clients?.nom}`}
      />
      {searchParams.error ? (
        <div className="mb-4 text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
          {searchParams.error}
        </div>
      ) : null}
      <InspectionForm action={action} submitLabel="Enregistrer l'inspection" />
    </div>
  );
}
