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
    const { data: doc } = await db
      .from("documents_commerciaux")
      .select("id, numero, dossier_id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (doc) {
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
      console.error("Webhook Stripe : session Checkout inconnue", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
