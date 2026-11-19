"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { uploadFiles, deleteFile } from "@/lib/storage";
import type { DocumentType } from "@/lib/types";

function failDocuments(dossierId: string, error: unknown, fallback: string): never {
  console.error("Erreur document", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/dossiers/${dossierId}?tab=documents&error=${encodeURIComponent(message)}`);
}

export async function uploadDossierDocument(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  try {
    const fichier = formData.get("fichier") as File | null;
    if (!fichier || fichier.size === 0) throw new Error("Sélectionne un fichier.");

    const [path] = await uploadFiles(`documents/${dossierId}`, [fichier]);
    if (!path) throw new Error("Échec de l'envoi du fichier.");

    const { data: dossier } = await db.from("dossiers").select("client_id").eq("id", dossierId).single();

    const uploadedBy = await getActorId();
    const { error } = await db.from("documents").insert({
      dossier_id: dossierId,
      client_id: dossier?.client_id ?? null,
      type: String(formData.get("type") || "autre") as DocumentType,
      nom: fichier.name,
      storage_path: path,
      taille: fichier.size,
      uploaded_by: uploadedBy,
    });
    if (error) throw new Error(error.message);

    await logActivity({
      action: "document.ajoute",
      entiteType: "dossier",
      entiteId: dossierId,
      description: `Document ajouté : ${fichier.name}`,
    });
  } catch (error) {
    failDocuments(dossierId, error, "Erreur lors de l'ajout du document.");
  }

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function archiverDocument(dossierId: string, documentId: string) {
  const db = createAdminClient();
  const { error } = await db.from("documents").update({ archive: true }).eq("id", documentId);
  if (error) failDocuments(dossierId, error, "Erreur lors de l'archivage du document.");
  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/documents");
}

export async function reactiverDocument(dossierId: string, documentId: string) {
  const db = createAdminClient();
  const { error } = await db.from("documents").update({ archive: false }).eq("id", documentId);
  if (error) failDocuments(dossierId, error, "Erreur lors de la réactivation du document.");
  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/documents");
}

export async function supprimerDocument(dossierId: string, documentId: string) {
  const db = createAdminClient();
  const { data: doc } = await db.from("documents").select("storage_path").eq("id", documentId).maybeSingle();

  const { error } = await db.from("documents").delete().eq("id", documentId);
  if (error) failDocuments(dossierId, error, "Erreur lors de la suppression du document.");

  if (doc?.storage_path) await deleteFile(doc.storage_path);

  await logActivity({
    action: "document.supprime",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Document supprimé`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/documents");
}
