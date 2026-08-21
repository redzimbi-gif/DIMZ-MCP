import "server-only";
import crypto from "crypto";

// Appels HTTP directs à l'API Stripe (pas de SDK), même choix que pour
// Resend dans src/lib/email.ts : rester un fichier autonome sans dépendance
// supplémentaire à installer.
const STRIPE_API_URL = "https://api.stripe.com/v1";

function encodeFormBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

interface CreateCheckoutSessionParams {
  montantTTC: number; // en euros
  description: string;
  clientEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

interface CheckoutSession {
  id: string;
  url: string;
}

/**
 * Crée une session Stripe Checkout pour un paiement unique. Ne lève jamais
 * d'exception : un problème de configuration Stripe ne doit pas empêcher
 * l'envoi du document au client (juste le lien de paiement en moins).
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ ok: true; session: CheckoutSession } | { ok: false; error: string }> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error("STRIPE_SECRET_KEY manquante : lien de paiement non créé.");
    return { ok: false, error: "Service de paiement non configuré (STRIPE_SECRET_KEY manquante)." };
  }

  const montantCentimes = Math.round(params.montantTTC * 100);
  if (montantCentimes <= 0) {
    return { ok: false, error: "Montant invalide pour un paiement en ligne." };
  }

  const body: Record<string, string> = {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(montantCentimes),
    "line_items[0][price_data][product_data][name]": params.description.slice(0, 250),
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };
  if (params.clientEmail) body["customer_email"] = params.clientEmail;
  Object.entries(params.metadata ?? {}).forEach(([key, value]) => {
    body[`metadata[${key}]`] = value;
  });

  try {
    const res = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encodeFormBody(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Échec création session Stripe Checkout:", res.status, errText);
      return { ok: false, error: `Erreur Stripe (${res.status})` };
    }

    const data = (await res.json()) as { id: string; url: string | null };
    if (!data.url) return { ok: false, error: "Stripe n'a renvoyé aucune URL de paiement." };

    return { ok: true, session: { id: data.id, url: data.url } };
  } catch (err) {
    console.error("Échec création session Stripe Checkout:", err);
    return { ok: false, error: "Erreur réseau lors de la création du paiement." };
  }
}

/**
 * Vérifie la signature d'un événement webhook Stripe (en-tête
 * "Stripe-Signature"), à partir du corps brut de la requête. Implémentation
 * manuelle du schéma de signature Stripe (v1=HMAC-SHA256(secret, "timestamp.payload")),
 * pour rester sans dépendance au SDK.
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
