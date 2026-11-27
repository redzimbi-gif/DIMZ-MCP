"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossier } from "@/lib/queries";
import { uploadFiles, uploadDataUrlImage, deleteFile } from "@/lib/storage";
import { logActivity, getActorId } from "@/lib/log";
import { sendEmail, getAppUrl } from "@/lib/email";
import { etapeConvoyageEmail, type EtapeConvoyageKey } from "@/lib/email-templates";
import { ETAT_LIEUX_PHOTO_SLOTS } from "@/lib/etat-lieux";
import type { EtatLieuxType } from "@/lib/types";

function failEtatLieux(dossierId: string, convoyageId: string, type: EtatLieuxType, error: unknown, fallback: string): never {
  console.error("Erreur état des lieux convoyage", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/dossiers/${dossierId}/convoyages/${convoyageId}/etat-lieux/${type}?error=${encodeURIComponent(message)}`);
}

export async function saveEtatLieux(
  dossierId: string,
  convoyageId: string,
  type: EtatLieuxType,
  formData: FormData
) {
  const db = createAdminClient();

  try {
    const { data: existing } = await db
      .from("convoyage_etats_lieux")
      .select("*")
      .eq("convoyage_id", convoyageId)
      .eq("type", type)
      .maybeSingle();

    if (existing?.confirme_at) {
      throw new Error("Cet état des lieux est déjà confirmé, il ne peut plus être modifié.");
    }

    const photos: Record<string, string> = { ...(existing?.photos ?? {}) };
    for (const slot of ETAT_LIEUX_PHOTO_SLOTS) {
      const file = formData.get(`photo_${slot.key}`) as File | null;
      if (file && file.size > 0) {
        const [path] = await uploadFiles(`convoyages/${dossierId}/${convoyageId}/${type}`, [file]);
        if (path) photos[slot.key] = path;
      }
    }

    const nouvellesAutres = (formData.getAll("photos_autres") as File[]).filter((f) => f.size > 0);
    const autresPaths = nouvellesAutres.length
      ? await uploadFiles(`convoyages/${dossierId}/${convoyageId}/${type}/autres`, nouvellesAutres)
      : [];
    const photosAutres = [...(existing?.photos_autres ?? []), ...autresPaths];

    const payload = {
      convoyage_id: convoyageId,
      type,
      kilometrage: formData.get("kilometrage") ? Number(formData.get("kilometrage")) : null,
      carburant_pourcentage: formData.get("carburant_pourcentage") ? Number(formData.get("carburant_pourcentage")) : null,
      contact_nom: String(formData.get("contact_nom") || "").trim() || null,
      photos,
      photos_autres: photosAutres,
    };

    const { error } = await db.from("convoyage_etats_lieux").upsert(payload, { onConflict: "convoyage_id,type" });
    if (error) throw new Error(error.message);
  } catch (error) {
    failEtatLieux(dossierId, convoyageId, type, error, "Erreur lors de l'enregistrement de l'état des lieux.");
  }

  revalidatePath(`/dossiers/${dossierId}/convoyages/${convoyageId}/etat-lieux/${type}`);
}

export async function confirmerEtatLieux(
  dossierId: string,
  convoyageId: string,
  type: EtatLieuxType,
  formData: FormData
) {
  const db = createAdminClient();

  try {
    const { data: existing } = await db
      .from("convoyage_etats_lieux")
      .select("*")
      .eq("convoyage_id", convoyageId)
      .eq("type", type)
      .maybeSingle();

    if (!existing) throw new Error("Enregistrez d'abord l'état des lieux avant de le confirmer.");
    if (existing.confirme_at) throw new Error("Cet état des lieux est déjà confirmé.");

    const missing = ETAT_LIEUX_PHOTO_SLOTS.filter((slot) => !existing.photos?.[slot.key]);
    if (missing.length > 0) {
      throw new Error(`Photos obligatoires manquantes : ${missing.map((s) => s.label).join(", ")}.`);
    }

    const signatureData = String(formData.get("signature") || "");
    if (!signatureData) throw new Error("La signature est requise pour confirmer l'état des lieux.");
    const signaturePath = await uploadDataUrlImage(
      `convoyages/${dossierId}/${convoyageId}/${type}/signature`,
      signatureData
    );
    if (!signaturePath) throw new Error("Erreur lors de l'enregistrement de la signature.");

    const { error } = await db
      .from("convoyage_etats_lieux")
      .update({ signature_path: signaturePath, confirme_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);

    const kmField = type === "depart" ? "km_depart" : "km_arrivee";
    await db
      .from("convoyages")
      .update({
        [kmField]: existing.kilometrage,
        niveau_carburant: existing.carburant_pourcentage != null ? `${existing.carburant_pourcentage} %` : null,
        statut: type === "depart" ? "en_cours" : "livre",
      })
      .eq("id", convoyageId);

    const nextEtape: EtapeConvoyageKey = type === "depart" ? "livraison_en_cours" : "livraison_terminee";
    await db.from("dossiers").update({ etape_client: nextEtape }).eq("id", dossierId);

    const acteur = await getActorId();
    await db.from("dossier_etape_history").insert({
      dossier_id: dossierId,
      etape_client: nextEtape,
      note: type === "depart" ? "État des lieux de départ confirmé" : "État des lieux d'arrivée confirmé",
      changed_by: acteur,
    });

    await logActivity({
      action: "convoyage.etat_lieux_confirme",
      entiteType: "convoyage",
      entiteId: convoyageId,
      description: `État des lieux ${type === "depart" ? "départ" : "arrivée"} confirmé`,
    });

    const dossier = await getDossier(dossierId);
    const email = dossier?.clients?.email;
    if (dossier && email) {
      const { subject, html } = etapeConvoyageEmail(nextEtape, {
        prenom: dossier.clients?.prenom ?? null,
        reference: dossier.reference,
        portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
      });
      const result = await sendEmail({ to: email, subject, html });
      if (result.ok) {
        await logActivity({
          action: "email.etape_client",
          entiteType: "dossier",
          entiteId: dossierId,
          description: `Email (« ${subject} ») envoyé à ${email}`,
        });
      }
    }
  } catch (error) {
    failEtatLieux(dossierId, convoyageId, type, error, "Erreur lors de la confirmation de l'état des lieux.");
  }

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath(`/dossiers/${dossierId}/convoyages/${convoyageId}`);
  revalidatePath(`/dossiers/${dossierId}/convoyages/${convoyageId}/etat-lieux/${type}`);
  redirect(`/dossiers/${dossierId}/convoyages/${convoyageId}`);
}

export async function deletePhotoAutre(
  dossierId: string,
  convoyageId: string,
  type: EtatLieuxType,
  path: string
) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("convoyage_etats_lieux")
    .select("photos_autres, confirme_at")
    .eq("convoyage_id", convoyageId)
    .eq("type", type)
    .maybeSingle();
  if (!existing || existing.confirme_at) return;

  await db
    .from("convoyage_etats_lieux")
    .update({ photos_autres: (existing.photos_autres as string[]).filter((p) => p !== path) })
    .eq("convoyage_id", convoyageId)
    .eq("type", type);
  await deleteFile(path);

  revalidatePath(`/dossiers/${dossierId}/convoyages/${convoyageId}/etat-lieux/${type}`);
}
