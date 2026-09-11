import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActorId, logActivity } from "@/lib/log";
import { syncStatutAvecEtape } from "@/lib/dossier-statut";
import { sendEmail, getAppUrl } from "@/lib/email";
import {
  ETAPE_ACCOMPAGNEMENT_KEYS,
  paiementConfirmeEmail,
  type EtapeAccompagnementKey,
} from "@/lib/email-templates";
import { ETAPE_PAIEMENT_KEY, etapeApresPaiement } from "@/lib/etapes";
import { formatCurrency } from "@/lib/format";
import { DOSSIER_OFFRE_LABELS } from "@/lib/types";
import type { Dossier } from "@/lib/types";

// Pont entre le paiement (documents_commerciaux, Stripe) et le parcours client
// (dossiers.etape_client) : jusqu'ici les deux vivaient chacun de leur côté, et
// une facture payée ne faisait pas avancer le dossier d'un cran.
//
// Vit dans son propre fichier, comme dossier-statut.ts : pas de "use server"
// ici, le client Supabase est passé en paramètre (ce qu'une Server Action
// interdit, ses arguments devant être sérialisables).

/**
 * Enregistre l'encaissement de l'offre d'un dossier et le fait passer à
 * l'étape suivante. Appelé par le webhook Stripe à la confirmation du
 * paiement d'une facture rattachée à un dossier.
 */
export async function enregistrerPaiementOffre(
  db: ReturnType<typeof createAdminClient>,
  dossierId: string,
  montantTTC: number
) {
  const { data } = await db
    .from("dossiers")
    .select("id, reference, offre, etape_client, portal_token, clients(prenom, email)")
    .eq("id", dossierId)
    .maybeSingle();
  // Sélection partielle : le double cast suit la convention de queries.ts
  // (listDossiers) pour les requêtes qui ne ramènent pas toutes les colonnes.
  const dossier = data as unknown as
    | (Dossier & { clients: { prenom: string | null; email: string | null } | null })
    | null;
  if (!dossier) return;

  // Toutes les factures d'un dossier passent par ici (convoyage, prestation
  // complémentaire, régularisation) : seule celle que l'étape attend doit
  // faire avancer le parcours.
  if (dossier.etape_client !== ETAPE_PAIEMENT_KEY) return;

  const offre = dossier.offre;
  const etapeSuivante = etapeApresPaiement(offre);

  await db
    .from("dossiers")
    .update({
      paiement_recu_at: new Date().toISOString(),
      paiement_offre: offre,
      etape_client: etapeSuivante,
    })
    .eq("id", dossierId);

  await syncStatutAvecEtape(db, dossierId, offre, etapeSuivante);

  await db.from("dossier_etape_history").insert({
    dossier_id: dossierId,
    etape_client: etapeSuivante,
    note: `Paiement reçu (${formatCurrency(montantTTC)}), passage à l'étape suivante`,
    changed_by: await getActorId(),
  });

  const offreLabel = offre ? DOSSIER_OFFRE_LABELS[offre] : "votre accompagnement";

  const email = dossier.clients?.email;
  if (email) {
    const { subject, html } = paiementConfirmeEmail({
      prenom: dossier.clients?.prenom ?? null,
      reference: dossier.reference,
      portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
      offreLabel,
      montant: formatCurrency(montantTTC),
      etapeSuivante: (ETAPE_ACCOMPAGNEMENT_KEYS as string[]).includes(etapeSuivante)
        ? (etapeSuivante as EtapeAccompagnementKey)
        : null,
    });
    // sendEmail ne lève jamais : un email qui échoue ne doit pas empêcher
    // l'encaissement d'être enregistré.
    await sendEmail({ to: email, subject, html });
  }

  // Pas de notifyStaff ici : le webhook en envoie déjà une pour la facture
  // payée, avec un lien vers ce même dossier. Une seconde ferait doublon.
  await logActivity({
    action: "dossier.paiement_recu",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Paiement de l'offre ${offreLabel} reçu, dossier ${dossier.reference} passé à l'étape suivante`,
  });
}
