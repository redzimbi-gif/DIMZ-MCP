"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentCommercial, getEntrepriseInfo } from "@/lib/queries";
import { DocumentCommercialPdf } from "@/lib/pdf/DocumentCommercial";
import { sendEmail, getAppUrl } from "@/lib/email";
import { documentCommercialEmail } from "@/lib/email-templates";
import { createCheckoutSession } from "@/lib/stripe";
import { logActivity } from "@/lib/log";
import { formatCurrency } from "@/lib/format";
import type { DocumentCommercialType, DocumentCommercialStatut, LigneDocumentCommercial } from "@/lib/types";

const MAX_LIGNES = 8;

function failDocument(error: unknown, fallback: string): never {
  console.error("Erreur document commercial", error);
  const message = error instanceof Error ? error.message : fallback;
  redirect(`/facturation?error=${encodeURIComponent(message)}`);
}

function parseLignes(formData: FormData): LigneDocumentCommercial[] {
  const lignes: LigneDocumentCommercial[] = [];
  for (let i = 0; i < MAX_LIGNES; i++) {
    const description = String(formData.get(`ligne_description_${i}`) || "").trim();
    if (!description) continue;
    const quantite = Number(formData.get(`ligne_quantite_${i}`) || 1);
    const prixUnitaireHt = Number(formData.get(`ligne_prix_${i}`) || 0);
    lignes.push({ description, quantite, prix_unitaire_ht: prixUnitaireHt });
  }
  return lignes;
}

function computeMontants(lignes: LigneDocumentCommercial[]) {
  const montant_ht = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire_ht, 0);
  // Régime micro-entreprise : TVA non applicable (art. 293 B du CGI).
  return { montant_ht, montant_tva: 0, montant_ttc: montant_ht };
}

export async function createDocumentCommercial(formData: FormData) {
  const db = createAdminClient();
  let newId: string | undefined;

  try {
    const type = (String(formData.get("type") || "devis") as DocumentCommercialType) || "devis";
    const lignes = parseLignes(formData);
    if (lignes.length === 0) throw new Error("Ajoutez au moins une ligne avant d'enregistrer.");
    const { montant_ht, montant_tva, montant_ttc } = computeMontants(lignes);

    const payload = {
      type,
      dossier_id: String(formData.get("dossier_id") || "") || null,
      client_id: String(formData.get("client_id") || "") || null,
      convoyage_id: String(formData.get("convoyage_id") || "") || null,
      objet: String(formData.get("objet") || "").trim() || null,
      lignes,
      montant_ht,
      montant_tva,
      montant_ttc,
      date_echeance: String(formData.get("date_echeance") || "") || null,
    };

    const { data, error } = await db.from("documents_commerciaux").insert(payload).select("id").single();
    if (error || !data) throw new Error(error?.message || "Erreur lors de la création du document.");
    newId = data.id;

    await logActivity({
      action: "document_commercial.cree",
      entiteType: "document_commercial",
      entiteId: data.id,
      description: `${type === "devis" ? "Devis" : "Facture"} créé (brouillon)`,
    });
  } catch (error) {
    failDocument(error, "Erreur lors de la création du document.");
  }

  revalidatePath("/facturation");
  redirect(`/facturation/documents/${newId}`);
}

export async function updateDocumentCommercial(id: string, formData: FormData) {
  const db = createAdminClient();

  try {
    const { data: existing } = await db.from("documents_commerciaux").select("statut").eq("id", id).maybeSingle();
    if (!existing) throw new Error("Document introuvable.");
    if (existing.statut !== "brouillon") throw new Error("Seul un document en brouillon peut être modifié.");

    const lignes = parseLignes(formData);
    if (lignes.length === 0) throw new Error("Ajoutez au moins une ligne.");
    const { montant_ht, montant_tva, montant_ttc } = computeMontants(lignes);

    const payload = {
      dossier_id: String(formData.get("dossier_id") || "") || null,
      client_id: String(formData.get("client_id") || "") || null,
      convoyage_id: String(formData.get("convoyage_id") || "") || null,
      objet: String(formData.get("objet") || "").trim() || null,
      lignes,
      montant_ht,
      montant_tva,
      montant_ttc,
      date_echeance: String(formData.get("date_echeance") || "") || null,
    };

    const { error } = await db.from("documents_commerciaux").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } catch (error) {
    failDocument(error, "Erreur lors de la modification du document.");
  }

  revalidatePath("/facturation");
  redirect(`/facturation/documents/${id}`);
}

export async function deleteDocumentCommercial(id: string) {
  const db = createAdminClient();
  const { data: doc } = await db.from("documents_commerciaux").select("statut").eq("id", id).maybeSingle();
  if (!doc || doc.statut !== "brouillon") return;
  await db.from("documents_commerciaux").delete().eq("id", id);
  revalidatePath("/facturation");
}

export async function marquerStatutDocumentCommercial(id: string, statut: DocumentCommercialStatut) {
  const db = createAdminClient();
  await db.from("documents_commerciaux").update({ statut }).eq("id", id);
  await logActivity({
    action: "document_commercial.statut",
    entiteType: "document_commercial",
    entiteId: id,
    description: `Statut mis à jour : ${statut}`,
  });
  revalidatePath("/facturation");
  revalidatePath(`/facturation/documents/${id}`);
}

export async function convertirEnFacture(devisId: string) {
  const db = createAdminClient();
  let newId: string | undefined;

  try {
    const devis = await getDocumentCommercial(devisId);
    if (!devis) throw new Error("Devis introuvable.");
    if (devis.type !== "devis") throw new Error("Seul un devis peut être converti en facture.");

    const payload = {
      type: "facture" as const,
      dossier_id: devis.dossier_id,
      client_id: devis.client_id,
      convoyage_id: devis.convoyage_id,
      objet: devis.objet,
      lignes: devis.lignes,
      montant_ht: devis.montant_ht,
      montant_tva: devis.montant_tva,
      montant_ttc: devis.montant_ttc,
      devis_origine_id: devis.id,
    };

    const { data, error } = await db.from("documents_commerciaux").insert(payload).select("id").single();
    if (error || !data) throw new Error(error?.message || "Erreur lors de la conversion en facture.");
    newId = data.id;

    await logActivity({
      action: "document_commercial.converti",
      entiteType: "document_commercial",
      entiteId: data.id,
      description: `Facture créée depuis le devis ${devis.numero}`,
    });
  } catch (error) {
    failDocument(error, "Erreur lors de la conversion en facture.");
  }

  revalidatePath("/facturation");
  redirect(`/facturation/documents/${newId}`);
}

/**
 * Envoi effectif d'un devis ou d'une facture au client : PDF, lien de paiement
 * Stripe pour une facture non réglée, email, et passage du document en
 * "envoyé".
 *
 * Séparé de la Server Action ci-dessous, qui redirige vers /facturation : la
 * fiche dossier a besoin d'envoyer une facture sans quitter la page.
 */
export async function envoyerDocument(id: string): Promise<"sent" | "no-email" | "error"> {
  const db = createAdminClient();
  let status: "sent" | "no-email" | "error" = "sent";

  try {
    const doc = await getDocumentCommercial(id);
    if (!doc) throw new Error("Document introuvable.");
    const email = doc.clients?.email as string | undefined;

    if (!email) {
      status = "no-email";
    } else {
      const entreprise = await getEntrepriseInfo();
      const clientNom = `${doc.clients?.prenom ?? ""} ${doc.clients?.nom ?? ""}`.trim();

      const buffer = await renderToBuffer(
        DocumentCommercialPdf({
          doc,
          clientNom,
          clientAdresse: doc.clients?.adresse ?? null,
          clientRaisonSociale: doc.clients?.type_client === "professionnel" ? doc.clients?.raison_sociale : null,
          clientSiret: doc.clients?.type_client === "professionnel" ? doc.clients?.siret : null,
          entreprise,
        })
      );

      let portalUrl: string | null = null;
      if (doc.dossier_id) {
        const { data: dossier } = await db
          .from("dossiers")
          .select("portal_token")
          .eq("id", doc.dossier_id)
          .maybeSingle();
        if (dossier?.portal_token) portalUrl = `${getAppUrl()}/suivi/${dossier.portal_token}`;
      }

      // Une facture (pas un devis) déclenche un lien de paiement Stripe à
      // chaque envoi, pour toujours proposer un lien valide (une session
      // Checkout expire après 24h) — la précédente, si elle existe, est
      // simplement remplacée.
      let paiementUrl: string | null = null;
      if (doc.type === "facture" && doc.statut !== "paye") {
        const checkout = await createCheckoutSession({
          montantTTC: doc.montant_ttc,
          description: doc.objet || `Facture DIMZ ${doc.numero}`,
          clientEmail: email,
          successUrl: portalUrl ? `${portalUrl}?paiement=succes` : `${getAppUrl()}?paiement=succes`,
          cancelUrl: portalUrl ? `${portalUrl}?paiement=annule` : `${getAppUrl()}?paiement=annule`,
          metadata: { document_commercial_id: doc.id },
        });
        if (checkout.ok) {
          paiementUrl = checkout.session.url;
          await db
            .from("documents_commerciaux")
            .update({ stripe_checkout_session_id: checkout.session.id })
            .eq("id", id);
        } else {
          console.error("Lien de paiement Stripe non créé:", checkout.error);
        }
      }

      const { subject, html } = documentCommercialEmail({
        prenom: doc.clients?.prenom ?? null,
        type: doc.type,
        numero: doc.numero,
        montantTTC: formatCurrency(doc.montant_ttc),
        portalUrl,
        paiementUrl,
      });

      const result = await sendEmail({
        to: email,
        subject,
        html,
        attachments: [{ filename: `${doc.type}-${doc.numero}.pdf`, content: buffer.toString("base64") }],
      });

      if (!result.ok) {
        status = "error";
      } else {
        await db.from("documents_commerciaux").update({ statut: "envoye" }).eq("id", id);

        // Envoyer un devis lié à un dossier convoyage remplace en place "Devis
        // en cours" par "Devis envoyé" sur /suivi/[token] (cf. Phase 1,
        // resolveEtapesConvoyage dans src/lib/etapes.ts).
        if (doc.type === "devis" && doc.dossier_id) {
          await db.from("dossiers").update({ devis_envoye_at: new Date().toISOString() }).eq("id", doc.dossier_id);
          await db.from("dossier_etape_history").insert({
            dossier_id: doc.dossier_id,
            etape_client: "devis_en_cours",
            note: `Devis ${doc.numero} envoyé au client`,
          });
        }

        await logActivity({
          action: "document_commercial.envoye",
          entiteType: "document_commercial",
          entiteId: id,
          description: `${doc.type === "devis" ? "Devis" : "Facture"} ${doc.numero} envoyé à ${email}`,
        });
      }
    }
  } catch (error) {
    console.error("Erreur envoi document commercial", error);
    status = "error";
  }

  return status;
}

export async function envoyerDocumentCommercial(id: string) {
  const status = await envoyerDocument(id);
  revalidatePath("/facturation");
  redirect(`/facturation?notif=${status}`);
}
