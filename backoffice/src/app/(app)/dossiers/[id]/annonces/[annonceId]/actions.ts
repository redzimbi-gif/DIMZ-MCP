"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { getAnnonce } from "@/lib/queries";
import { uploadFiles, deleteFile } from "@/lib/storage";
import { annonceFieldsFromForm } from "@/lib/annonce-fields";

export async function updateAnnonce(dossierId: string, annonceId: string, formData: FormData) {
  const db = createAdminClient();
  const existing = await getAnnonce(annonceId);
  if (!existing) throw new Error("Annonce introuvable.");

  const photos = (formData.getAll("photos") as File[]).filter((f) => f.size > 0);
  const newPhotoPaths = await uploadFiles(`annonces/${dossierId}`, photos);

  const titre = String(formData.get("titre") || "").trim();

  const payload = {
    ...(titre ? { titre } : {}),
    ...annonceFieldsFromForm(formData),
    photos: [...existing.photos, ...newPhotoPaths],
  };

  const { error } = await db.from("annonces").update(payload).eq("id", annonceId);
  if (error) throw new Error(error.message || "Erreur lors de la mise à jour de l'annonce.");

  await logActivity({
    action: "annonce.modifiee",
    entiteType: "annonce",
    entiteId: annonceId,
    description: `Annonce mise à jour : ${existing.titre}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  redirect(`/dossiers/${dossierId}?tab=vehicules`);
}

export async function deleteAnnoncePhoto(dossierId: string, annonceId: string, path: string) {
  const db = createAdminClient();
  const existing = await getAnnonce(annonceId);
  if (!existing) return;

  await deleteFile(path);
  await db
    .from("annonces")
    .update({ photos: existing.photos.filter((p) => p !== path) })
    .eq("id", annonceId);

  revalidatePath(`/dossiers/${dossierId}/annonces/${annonceId}/edit`);
}
