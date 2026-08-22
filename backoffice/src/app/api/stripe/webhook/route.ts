import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeWebhookSignature } from "@/lib/stripe";
import { logActivity, notifyStaff } from "@/lib/log";

// Endpoint public appelé par Stripe (jamais par le navigateur) à chaque
// événement de paiement. Authentifié uniquement par la signature HMAC de
// l'en-tête Stripe-Signature (STRIPE_WEBHOOK_SECRET), pas par une session —
// à déclarer dans le Dashboard Stripe : https://<app>/api/stripe/webhook,
// événement "checkout.session.completed".
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET manquante : webhook Stripe refusé.");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent: string | null;
      metadata?: Record<string, string>;
    };

    const db = createAdminClient();
    const colonnes = "id, numero, dossier_id, statut";
    let { data: doc } = await db
      .from("documents_commerciaux")
      .select(colonnes)
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    // Repli par les métadonnées. Chaque envoi d'une facture crée une nouvelle
    // session Checkout et écrase stripe_checkout_session_id : si le client
    // paie via un lien précédent (une session reste valable 24h), la recherche
    // par identifiant de session ne trouve rien alors que le paiement est bien
    // réel. L'identifiant du document est justement joint aux métadonnées à la
    // création de la session, côté facturation.
    const documentId = session.metadata?.document_commercial_id;
    if (!doc && documentId) {
      ({ data: doc } = await db
        .from("documents_commerciaux")
        .select(colonnes)
        .eq("id", documentId)
        .maybeSingle());
    }

    if (doc) {
      // Stripe réémet un événement tant qu'il n'a pas reçu de 200 : sans cette
      // sortie, chaque réémission renotifierait l'équipe et rejournaliserait
      // un paiement déjà enregistré.
      if (doc.statut === "paye") {
        return NextResponse.json({ received: true, already: true });
      }

      await db
        .from("documents_commerciaux")
        .update({ statut: "paye", stripe_payment_intent_id: session.payment_intent })
        .eq("id", doc.id);

      await logActivity({
        action: "document_commercial.paye",
        entiteType: "document_commercial",
        entiteId: doc.id,
        description: `Facture ${doc.numero} payée en ligne via Stripe`,
      });

      await notifyStaff({
        titre: `Facture ${doc.numero} payée`,
        message: "Paiement en ligne confirmé par Stripe.",
        type: "paiement_recu",
        lien: doc.dossier_id ? `/dossiers/${doc.dossier_id}` : `/facturation/documents/${doc.id}`,
      });
    } else {
      console.error(
        "Webhook Stripe : aucune facture pour la session Checkout",
        session.id,
        "ni pour le document",
        documentId ?? "(absent des métadonnées)"
      );
    }
  }

  return NextResponse.json({ received: true });
}
