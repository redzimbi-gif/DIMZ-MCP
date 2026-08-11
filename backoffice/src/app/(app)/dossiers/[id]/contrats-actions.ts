"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { CONTRAT_CHAMPS } from "@/lib/contrats";
import { CONTRAT_TYPE_LABELS, type ContratType } from "@/lib/types";

export async function generateContrat(dossierId: string, type: ContratType, formData: FormData) {
  const db = createAdminClient();

  const champs: Record<string, string> = {};
  for (const def of CONTRAT_CHAMPS[type]) {
    const value = String(formData.get(def.key) || "").trim();
    if (value) champs[def.key] = value;
  }

  await db
    .from("dossier_contrats")
    .upsert(
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
  await db
    .from("dossier_contrats")
    .update({ statut: "signe", date_signature: new Date().toISOString() })
    .eq("dossier_id", dossierId)
    .eq("type", type);

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
  await db.from("dossier_contrats").update({ statut: "archive" }).eq("dossier_id", dossierId).eq("type", type);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function reactiverContrat(dossierId: string, type: ContratType) {
  const db = createAdminClient();
  await db.from("dossier_contrats").update({ statut: "a_signer" }).eq("dossier_id", dossierId).eq("type", type);
  revalidatePath(`/dossiers/${dossierId}`);
}
