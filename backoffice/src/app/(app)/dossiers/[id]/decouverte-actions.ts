"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossier, getFicheDecouverteVehicules } from "@/lib/queries";
import { FicheDecouverteReport } from "@/lib/pdf/FicheDecouverteReport";
import { sendEmail, getAppUrl } from "@/lib/email";
import { ficheDecouverteEmail } from "@/lib/email-templates";
import { logActivity } from "@/lib/log";

function text(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

function num(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) || "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function addFicheDecouverteVehicule(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const existing = await getFicheDecouverteVehicules(dossierId);
  const payload = {
    dossier_id: dossierId,
    marque: text(formData, "marque"),
    modele: text(formData, "modele"),
    energie: text(formData, "energie"),
    point_fort: text(formData, "point_fort"),
    point_vigilance: text(formData, "point_vigilance"),
    prix_min: num(formData, "prix_min"),
    prix_max: num(formData, "prix_max"),
    ordre: existing.length,
  };

  const { error } = await db.from("fiche_decouverte_vehicules").insert(payload);
  if (error) throw new Error(error.message);

  await logActivity({
    action: "fiche_decouverte.vehicule_ajoute",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Véhicule ajouté à la fiche Découverte : ${[payload.marque, payload.modele].filter(Boolean).join(" ") || "sans nom"}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function deleteFicheDecouverteVehicule(dossierId: string, vehiculeId: string) {
  const db = createAdminClient();
  await db.from("fiche_decouverte_vehicules").delete().eq("id", vehiculeId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function updateFicheDecouverteIntro(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const intro = text(formData, "fiche_decouverte_intro");
  await db.from("dossiers").update({ fiche_decouverte_intro: intro }).eq("id", dossierId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function sendFicheDecouverteEmail(dossierId: string) {
  const dossier = await getDossier(dossierId);
  const email = dossier?.clients?.email;

  let status: "sent" | "no-email" | "error" = "sent";

  if (!dossier || !email) {
    status = "no-email";
  } else {
    try {
      const vehicules = await getFicheDecouverteVehicules(dossierId);
      const buffer = await renderToBuffer(
        FicheDecouverteReport({
          vehicules,
          commentaire: dossier.fiche_decouverte_intro,
          dossierReference: dossier.reference,
          clientNom: `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim(),
        })
      );

      const { subject, html } = ficheDecouverteEmail({
        prenom: dossier.clients?.prenom ?? null,
        reference: dossier.reference,
        portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
      });

      const result = await sendEmail({
        to: email,
        subject,
        html,
        attachments: [
          { filename: `fiche-decouverte-${dossier.reference}.pdf`, content: buffer.toString("base64") },
        ],
      });
      status = result.ok ? "sent" : "error";

      if (result.ok) {
        await logActivity({
          action: "email.fiche_decouverte",
          entiteType: "dossier",
          entiteId: dossierId,
          description: `Email fiche Découverte envoyé à ${email}`,
        });
      }
    } catch (err) {
      console.error("Échec envoi email fiche Découverte:", err);
      status = "error";
    }
  }

  redirect(`/dossiers/${dossierId}?tab=decouverte&notif=${status}`);
}
