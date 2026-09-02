"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles, deleteFile } from "@/lib/storage";
import { CONTRAT_CHAMPS } from "@/lib/contrats";
import { CONTRAT_TYPE_LABELS, type ContratType } from "@/lib/types";

function failContrats(dossierId: string, error: unknown, fallback: string): never {
  console.error("Erreur document/contrat", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/dossiers/${dossierId}?tab=contrats&error=${encodeURIComponent(message)}`);
}

function parsePathArray(raw: string | undefined): string[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function generateContrat(dossierId: string, type: ContratType, formData: FormData) {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("dossier_contrats")
    .select("champs")
    .eq("dossier_id", dossierId)
    .eq("type", type)
    .maybeSingle();
  const existingChamps = (existing?.champs as Record<string, string>) ?? {};

  const champs: Record<string, string> = {};
  for (const def of CONTRAT_CHAMPS[type]) {
    if (def.type === "photos") {
      const files = (formData.getAll(def.key) as File[]).filter((f) => f && f.size > 0);
      const newPaths = await uploadFiles(`contrats/${dossierId}/${type}`, files);
      const existingPaths = parsePathArray(existingChamps[def.key]);
      const allPaths = [...existingPaths, ...newPaths];
      if (allPaths.length > 0) champs[def.key] = JSON.stringify(allPaths);
      continue;
    }
    const value = String(formData.get(def.key) || "").trim();
    if (value) champs[def.key] = value;
  }

  const { error } = await db.from("dossier_contrats").upsert(
    {
      dossier_id: dossierId,
      type,
      champs,
      statut: "a_signer",
      date_generation: new Date().toISOString(),
      date_signature: null,
    },
    { onConflict: "dossier_id,type" }
  );
  if (error) failContrats(dossierId, error, "Erreur lors de la génération du document.");

  await logActivity({
    action: "contrat.genere",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Document généré : ${CONTRAT_TYPE_LABELS[type]}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function supprimerPhotoContrat(dossierId: string, type: ContratType, key: string, path: string) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("dossier_contrats")
    .select("champs")
    .eq("dossier_id", dossierId)
    .eq("type", type)
    .maybeSingle();
  const champs = { ...((existing?.champs as Record<string, string>) ?? {}) };
  const remaining = parsePathArray(champs[key]).filter((p) => p !== path);
  if (remaining.length > 0) champs[key] = JSON.stringify(remaining);
  else delete champs[key];

  const { error } = await db.from("dossier_contrats").update({ champs }).eq("dossier_id", dossierId).eq("type", type);
  if (error) failContrats(dossierId, error, "Erreur lors de la suppression de la photo.");

  await deleteFile(path);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function marquerContratSigne(dossierId: string, type: ContratType) {
  const db = createAdminClient();
  const { error } = await db
    .from("dossier_contrats")
    .update({ statut: "signe", date_signature: new Date().toISOString() })
    .eq("dossier_id", dossierId)
    .eq("type", type);
  if (error) failContrats(dossierId, error, "Erreur lors du marquage comme signé.");

  await logActivity({
    action: "contrat.signe",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Document marqué signé : ${CONTRAT_TYPE_LABELS[type]}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function archiverContrat(dossierId: string, type: ContratType) {
  const db = createAdminClient();
  const { error } = await db
    .from("dossier_contrats")
    .update({ statut: "archive" })
    .eq("dossier_id", dossierId)
    .eq("type", type);
  if (error) failContrats(dossierId, error, "Erreur lors de l'archivage du document.");
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function reactiverContrat(dossierId: string, type: ContratType) {
  const db = createAdminClient();
  const { error } = await db
    .from("dossier_contrats")
    .update({ statut: "a_signer" })
    .eq("dossier_id", dossierId)
    .eq("type", type);
  if (error) failContrats(dossierId, error, "Erreur lors de la réactivation du document.");
  revalidatePath(`/dossiers/${dossierId}`);
}
