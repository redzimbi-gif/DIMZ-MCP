"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossier, getFicheDecouverteVehicules } from "@/lib/queries";
import { uploadFiles, deleteFile, getSignedUrls } from "@/lib/storage";
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

function failDecouverte(dossierId: string, error: unknown, fallback: string): never {
  console.error("Erreur fiche Découverte", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/dossiers/${dossierId}?tab=decouverte&error=${encodeURIComponent(message)}`);
}

export async function addFicheDecouverteVehicule(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  try {
    const existing = await getFicheDecouverteVehicules(dossierId);

    const photo = formData.get("photo") as File | null;
    const [photoPath] = photo && photo.size > 0 ? await uploadFiles(`fiche-decouverte/${dossierId}`, [photo]) : [null];

    const payload = {
      dossier_id: dossierId,
      marque: text(formData, "marque"),
      modele: text(formData, "modele"),
      energie: text(formData, "energie"),
      point_fort: text(formData, "point_fort"),
      point_vigilance: text(formData, "point_vigilance"),
      prix_min: num(formData, "prix_min"),
      prix_max: num(formData, "prix_max"),
      photo_path: photoPath ?? null,
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
  } catch (error) {
    failDecouverte(dossierId, error, "Erreur lors de l'ajout du véhicule.");
  }

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function updateFicheDecouverteVehicule(dossierId: string, vehiculeId: string, formData: FormData) {
  const db = createAdminClient();

  try {
    const { data: existing } = await db
      .from("fiche_decouverte_vehicules")
      .select("photo_path")
      .eq("id", vehiculeId)
      .maybeSingle();

    const photo = formData.get("photo") as File | null;
    let photoPath = existing?.photo_path ?? null;
    if (photo && photo.size > 0) {
      const [newPath] = await uploadFiles(`fiche-decouverte/${dossierId}`, [photo]);
      if (newPath) {
        if (existing?.photo_path) await deleteFile(existing.photo_path);
        photoPath = newPath;
      }
    }

    const payload = {
      marque: text(formData, "marque"),
      modele: text(formData, "modele"),
      energie: text(formData, "energie"),
      point_fort: text(formData, "point_fort"),
      point_vigilance: text(formData, "point_vigilance"),
      prix_min: num(formData, "prix_min"),
      prix_max: num(formData, "prix_max"),
      photo_path: photoPath,
    };

    const { error } = await db.from("fiche_decouverte_vehicules").update(payload).eq("id", vehiculeId);
    if (error) throw new Error(error.message);

    await logActivity({
      action: "fiche_decouverte.vehicule_modifie",
      entiteType: "dossier",
      entiteId: dossierId,
      description: `Véhicule modifié sur la fiche Découverte : ${[payload.marque, payload.modele].filter(Boolean).join(" ") || "sans nom"}`,
    });
  } catch (error) {
    failDecouverte(dossierId, error, "Erreur lors de la modification du véhicule.");
  }

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function deleteFicheDecouverteVehicule(dossierId: string, vehiculeId: string) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("fiche_decouverte_vehicules")
    .select("photo_path")
    .eq("id", vehiculeId)
    .maybeSingle();

  await db.from("fiche_decouverte_vehicules").delete().eq("id", vehiculeId);
  if (existing?.photo_path) await deleteFile(existing.photo_path);

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
      const photoUrls = await getSignedUrls(
        vehicules.map((v) => v.photo_path).filter((p): p is string => !!p)
      );
      const vehiculesAvecPhoto = vehicules.map((v) => ({
        ...v,
        photoUrl: v.photo_path ? photoUrls[v.photo_path] ?? null : null,
      }));
      const buffer = await renderToBuffer(
        FicheDecouverteReport({
          vehicules: vehiculesAvecPhoto,
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
