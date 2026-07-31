"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import type { AgendaEventType } from "@/lib/types";

export async function createAgendaEvent(formData: FormData) {
  const db = createAdminClient();

  const titre = String(formData.get("titre") || "").trim();
  const dateDebut = String(formData.get("date_debut") || "");
  if (!titre || !dateDebut) throw new Error("Titre et date sont obligatoires.");

  const dossierId = String(formData.get("dossier_id") || "") || null;

  const payload = {
    titre,
    type: String(formData.get("type") || "rendez_vous") as AgendaEventType,
    dossier_id: dossierId,
    date_debut: new Date(dateDebut).toISOString(),
    lieu: String(formData.get("lieu") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };

  const { data, error } = await db.from("agenda_events").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await logActivity({
    action: "agenda.evenement_cree",
    entiteType: "agenda_event",
    entiteId: data?.id,
    description: `Événement ajouté à l'agenda : ${titre}`,
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function deleteAgendaEvent(id: string) {
  const db = createAdminClient();
  await db.from("agenda_events").delete().eq("id", id);
  revalidatePath("/agenda");
}
