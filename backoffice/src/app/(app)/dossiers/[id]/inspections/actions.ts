"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { uploadFiles } from "@/lib/storage";
import { inspectionFieldsFromForm } from "@/lib/inspection-fields";

export async function createInspection(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const photos = (formData.getAll("photos") as File[]).filter((f) => f.size > 0);
  const videos = (formData.getAll("videos") as File[]).filter((f) => f.size > 0);

  const [photoPaths, videoPaths] = await Promise.all([
    uploadFiles(`inspections/${dossierId}`, photos),
    uploadFiles(`inspections/${dossierId}`, videos),
  ]);

  const payload = {
    dossier_id: dossierId,
    date_inspection: String(formData.get("date_inspection") || new Date().toISOString().slice(0, 10)),
    ...inspectionFieldsFromForm(formData),
    photos: photoPaths,
    videos: videoPaths,
    created_by: await getActorId(),
  };

  const { data, error } = await db.from("inspections").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de la création de l'inspection.");

  await logActivity({
    action: "inspection.creee",
    entiteType: "inspection",
    entiteId: data.id,
    description: `Inspection réalisée pour le dossier`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/inspections");
  redirect(`/dossiers/${dossierId}/inspections/${data.id}`);
}
