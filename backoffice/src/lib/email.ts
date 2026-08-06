import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";

/** Base URL publique du back-office, pour construire des liens absolus dans les emails. */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[]; // content en base64
}

/**
 * Envoie un email via l'API Resend (appel HTTP direct, sans SDK, pour ne
 * dépendre d'aucun package supplémentaire). Ne lève jamais d'exception :
 * un email qui échoue ne doit jamais casser le flux qui l'a déclenché
 * (soumission de formulaire, action du back-office...).
 */
export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY manquante : email non envoyé.");
    return { ok: false, error: "Service d'email non configuré (RESEND_API_KEY manquante)." };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "DIMZ <onboarding@resend.dev>",
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Échec envoi email Resend:", res.status, body);
      return { ok: false, error: `Erreur d'envoi (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Échec envoi email:", err);
    return { ok: false, error: "Erreur réseau lors de l'envoi de l'email." };
  }
}
