"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { CONTRAT_CHAMPS } from "@/lib/contrats";
import { CONTRAT_TYPE_LABELS, type ContratType } from "@/lib/types";

function failContrats(dossierId: string, error: unknown, fallback: string): never {
  console.error("Erreur document/contrat", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/dossiers/${dossierId}?tab=contrats&error=${encodeURIComponent(message)}`);
}

export async function generateContrat(dossierId: string, type: ContratType, formData: FormData) {
  const db = createAdminClient();

  const champs: Record<string, string> = {};
  for (const def of CONTRAT_CHAMPS[type]) {
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
