"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles } from "@/lib/storage";
import { annonceFieldsFromForm } from "@/lib/annonce-fields";

export async function createAnnonce(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) throw new Error("Le titre de l'annonce est obligatoire.");

  const photos = formData.getAll("photos") as File[];
  const photoPaths = await uploadFiles(`annonces/${dossierId}`, photos);

  const payload = {
    dossier_id: dossierId,
    titre,
    ...annonceFieldsFromForm(formData),
    photos: photoPaths,
  };

  const { data, error } = await db.from("annonces").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await logActivity({
    action: "annonce.ajoutee",
    entiteType: "annonce",
    entiteId: data?.id,
    description: `Annonce ajoutée : ${titre}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function toggleAnnonceSelection(dossierId: string, annonceId: string, next: boolean) {
  const db = createAdminClient();
  await db.from("annonces").update({ selectionnee: next }).eq("id", annonceId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function updateAnnonceNegociation(dossierId: string, annonceId: string, formData: FormData) {
  const db = createAdminClient();
  const prixNegocie = formData.get("prix_negocie") ? Number(formData.get("prix_negocie")) : null;
  await db.from("annonces").update({ prix_negocie: prixNegocie }).eq("id", annonceId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function deleteAnnonce(dossierId: string, annonceId: string) {
  const db = createAdminClient();
  await db.from("annonces").delete().eq("id", annonceId);
  revalidatePath(`/dossiers/${dossierId}`);
}
