"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { uploadFiles } from "@/lib/storage";

export async function createInspection(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const photos = (formData.getAll("photos") as File[]).filter((f) => f.size > 0);
  const videos = (formData.getAll("videos") as File[]).filter((f) => f.size > 0);

  const [photoPaths, videoPaths] = await Promise.all([
    uploadFiles(`inspections/${dossierId}`, photos),
    uploadFiles(`inspections/${dossierId}`, videos),
  ]);

  const noteFinale = formData.get("note_finale") ? Number(formData.get("note_finale")) : null;

  const payload = {
    dossier_id: dossierId,
    date_inspection: String(formData.get("date_inspection") || new Date().toISOString().slice(0, 10)),
    etat_exterieur: String(formData.get("etat_exterieur") || "").trim() || null,
    etat_interieur: String(formData.get("etat_interieur") || "").trim() || null,
    pneus: String(formData.get("pneus") || "").trim() || null,
    freins: String(formData.get("freins") || "").trim() || null,
    carrosserie: String(formData.get("carrosserie") || "").trim() || null,
    mecanique: String(formData.get("mecanique") || "").trim() || null,
    essai_routier: String(formData.get("essai_routier") || "").trim() || null,
    defauts_constates: String(formData.get("defauts_constates") || "").trim() || null,
    commentaires: String(formData.get("commentaires") || "").trim() || null,
    note_finale: noteFinale,
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
  redirect(`/dossiers/${dossierId}/inspections/${data.id}`);
}
