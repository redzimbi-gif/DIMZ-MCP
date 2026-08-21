// Supabase Edge Function — retrouver le suivi d'un dossier à partir d'un
// email, appelée depuis la page "Suivre mon projet" du site vitrine DIMZ
// (autre domaine). Ne renvoie jamais les données du dossier dans la
// réponse HTTP : seulement un statut ok/not_found, l'email lui-même part
// par email au client.
// Déploiement (JWT désactivé, comme lead-intake et test-feedback) :
//   npx supabase functions deploy track-lookup --project-ref TON-PROJET --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Emails via l'API Resend en appel HTTP direct (pas de SDK, pour rester un
// fichier autonome déployable tel quel comme Edge Function Deno).
async function sendTrackingEmail(params: {
  to: string;
  prenom: string | null;
  dossiers: { reference: string; portalUrl: string }[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("RESEND_API_KEY manquante : email de suivi non envoyé.");
    return { ok: false, error: "RESEND_API_KEY manquante" };
  }

  const hello = params.prenom ? `Bonjour ${params.prenom},` : "Bonjour,";
  const intro =
    params.dossiers.length > 1
      ? "Vous avez demandé à retrouver le suivi de vos dossiers DIMZ. Les voici :"
      : "Vous avez demandé à retrouver le suivi de votre dossier DIMZ. Le voici :";
  const links = params.dossiers
    .map(
      (d) => `
            <p style="margin:0 0 6px;font-weight:600;">Dossier ${d.reference}</p>
            <a href="${d.portalUrl}" style="display:inline-block;background:#2f6fed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;margin-bottom:22px;">Suivre ce dossier</a>`
    )
    .join("");
  const html = `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ee;">
          <tr><td style="padding:26px 32px 18px;border-bottom:1px solid #e6e8ee;">
            <span style="font-size:18px;font-weight:700;color:#0b0d12;letter-spacing:-0.02em;">DIMZ</span>
            <span style="font-size:13px;color:#565c68;margin-left:8px;">Mon copilote auto</span>
          </td></tr>
          <tr><td style="padding:32px;color:#0b0d12;font-size:14px;line-height:1.6;">
            <p style="margin:0 0 16px;">${hello}</p>
            <p style="margin:0 0 20px;">${intro}</p>
            ${links}
            <p style="margin:6px 0 0;color:#8a909c;font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #e6e8ee;color:#565c68;font-size:12px;">
            DIMZ · Mon copilote auto<br />Cet email vous a été envoyé suite à votre demande de suivi sur dimz-copilote.com.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") || "DIMZ <onboarding@resend.dev>",
        to: params.to,
        subject:
          params.dossiers.length > 1
            ? "Vos dossiers DIMZ"
            : `Votre dossier DIMZ (${params.dossiers[0].reference})`,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Échec envoi email Resend:", res.status, detail);
      return { ok: false, error: `Resend ${res.status}: ${detail}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Échec envoi email de suivi:", err);
    return { ok: false, error: String(err) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalide" }, 400);
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!email || !email.includes("@")) {
    return jsonResponse({ error: "Email invalide" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: client } = await db
    .from("clients")
    .select("id, nom, prenom")
    .ilike("email", email)
    .maybeSingle();

  if (!client) {
    return jsonResponse({ status: "not_found" });
  }

  const { data: dossiers } = await db
    .from("dossiers")
    .select("reference, portal_token")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (!dossiers || dossiers.length === 0) {
    return jsonResponse({ status: "not_found" });
  }

  const appUrl = (Deno.env.get("APP_URL") || "http://localhost:3000").replace(/\/$/, "");
  const sendResult = await sendTrackingEmail({
    to: email,
    prenom: client.prenom,
    dossiers: dossiers.map((d: { reference: string; portal_token: string }) => ({
      reference: d.reference,
      portalUrl: `${appUrl}/suivi/${d.portal_token}`,
    })),
  });

  if (!sendResult.ok) {
    return jsonResponse({ status: "email_error" });
  }

  return jsonResponse({ status: "ok" });
});
