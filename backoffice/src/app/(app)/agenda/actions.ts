"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
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

export async function updateAgendaEvent(id: string, formData: FormData) {
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

  const { error } = await db.from("agenda_events").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({
    action: "agenda.evenement_modifie",
    entiteType: "agenda_event",
    entiteId: id,
    description: `Événement d'agenda modifié : ${titre}`,
  });

  revalidatePath("/agenda");
  revalidatePath("/");
  redirect(`/agenda?month=${format(new Date(payload.date_debut), "yyyy-MM")}&day=${format(new Date(payload.date_debut), "yyyy-MM-dd")}`);
}

export async function deleteAgendaEvent(id: string, redirectTo?: string) {
  const db = createAdminClient();
  await db.from("agenda_events").delete().eq("id", id);
  revalidatePath("/agenda");
  revalidatePath("/");
  if (redirectTo) redirect(redirectTo);
}

// Marque un événement "Convoyage (hors DIMZ)" comme terminé : crée la ligne
// de comptabilité correspondante et redirige vers son édition pour saisir
// les montants (total, frais, gain).
export async function marquerConvoyageExterneTermine(id: string) {
  const db = createAdminClient();

  const { data: event } = await db.from("agenda_events").select("*").eq("id", id).maybeSingle();
  if (!event) throw new Error("Événement introuvable.");

  const [lieuDepart, lieuArrivee] = (event.lieu || "")
    .split(/→|->/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  const { data: convoyage, error } = await db
    .from("convoyages_externes")
    .insert({
      date_convoyage: event.date_debut ? event.date_debut.slice(0, 10) : null,
      lieu_depart: lieuDepart || null,
      lieu_arrivee: lieuArrivee || null,
      notes: event.titre,
      total_prestation: 0,
      frais: 0,
    })
    .select("id")
    .single();
  if (error || !convoyage) throw new Error(error?.message || "Erreur lors de la création du convoyage.");

  await db
    .from("agenda_events")
    .update({ termine: true, convoyage_externe_id: convoyage.id })
    .eq("id", id);

  await logActivity({
    action: "agenda.convoyage_externe_termine",
    entiteType: "convoyage_externe",
    entiteId: convoyage.id,
    description: `Convoyage hors DIMZ terminé depuis l'agenda : ${event.titre}`,
  });

  revalidatePath("/agenda");
  revalidatePath("/comptabilite");
  redirect(`/comptabilite/${convoyage.id}`);
}
