"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadFiles, deleteFile } from "@/lib/storage";

function failPhotos(error: unknown, fallback: string): never {
  console.error("Erreur bibliothèque de photos", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/photos?error=${encodeURIComponent(message)}`);
}

function nomFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Photo";
}

export async function addPhotosBibliotheque(formData: FormData) {
  const db = createAdminClient();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const nomManuel = String(formData.get("nom") || "").trim();

  if (files.length === 0) {
    failPhotos(null, "Sélectionnez au moins une photo.");
  }

  try {
    for (const file of files) {
      const [path] = await uploadFiles("bibliotheque", [file]);
      if (!path) continue;
      const nom = nomManuel && files.length === 1 ? nomManuel : nomFromFilename(file.name);
      const { error } = await db.from("photos_bibliotheque").insert({ nom, storage_path: path });
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    failPhotos(error, "Erreur lors de l'ajout des photos.");
  }

  revalidatePath("/photos");
}

export async function renamePhotoBibliotheque(id: string, formData: FormData) {
  const db = createAdminClient();
  const nom = String(formData.get("nom") || "").trim();
  if (!nom) failPhotos(null, "Le nom ne peut pas être vide.");

  const { error } = await db.from("photos_bibliotheque").update({ nom }).eq("id", id);
  if (error) failPhotos(error, "Erreur lors du renommage de la photo.");

  revalidatePath("/photos");
}

export async function deletePhotoBibliotheque(id: string) {
  const db = createAdminClient();
  const { data: photo } = await db.from("photos_bibliotheque").select("storage_path").eq("id", id).maybeSingle();
  if (!photo) return;

  // Les véhicules de fiche Découverte qui pointaient vers cette photo perdent
  // leur photo plutôt que de garder une référence vers un fichier supprimé.
  await db
    .from("fiche_decouverte_vehicules")
    .update({ photo_path: null, photo_from_bibliotheque: false })
    .eq("photo_path", photo.storage_path)
    .eq("photo_from_bibliotheque", true);

  await db.from("photos_bibliotheque").delete().eq("id", id);
  await deleteFile(photo.storage_path);

  revalidatePath("/photos");
  revalidatePath("/dossiers");
}
