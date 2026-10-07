// Supabase Edge Function — réception du questionnaire de test utilisateur du
// site vitrine DIMZ. Même logique que lead-intake (pas d'authentification,
// appelée par un visiteur anonyme, contourne la protection Vercel).

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

const TEXT_FIELDS = [
  "comprehension_immediate",
  "confiance_site",
  "offres_faciles",
  "tarifs_clairs",
  "navigation_facile",
  "note_design_general",
  "note_professionnalisme",
  "note_logo",
  "note_couleurs",
  "note_lisibilite",
  "note_modernite",
  "ressenti_duree",
  "hesite_abandonner",
  "note_experience_formulaire",
  "offre_choisie",
  "prix_coherents",
  "meilleur_rapport_qualite_prix",
  "utiliserait_dimz",
  "recommanderait_dimz",
  "note_globale",
  "duree_secondes",
  "duree_declaree",
] as const;

const INT_FIELDS = new Set([
  "confiance_site",
  "note_design_general",
  "note_professionnalisme",
  "note_logo",
  "note_couleurs",
  "note_lisibilite",
  "note_modernite",
  "note_experience_formulaire",
  "note_globale",
  "duree_secondes",
]);

const TEXT_FIELD_MAX_LENGTH = 2000;
const BODY_MAX_BYTES = 50_000;

// Limite de fréquence par IP, sur une fenêtre fixe de 10 minutes, pour
// contenir le spam sur ce formulaire public. Compteur en base (fonction
// increment_rate_limit, migration 0040) : incrément atomique, pas de
// condition de course entre deux requêtes simultanées de la même IP.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// deno-lint-ignore no-explicit-any
async function isRateLimited(db: any, ip: string): Promise<boolean> {
  if (Math.random() < 0.05) await db.rpc("cleanup_rate_limits");
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: count } = await db.rpc("increment_rate_limit", {
    p_ip: ip,
    p_endpoint: "test-feedback",
    p_window: windowStart,
  });
  return (count ?? 0) > RATE_LIMIT;
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

// Alerte équipe : ligne dans "notifications" (cloche du back-office) ET push
// sur le téléphone. Les deux dans la même fonction, pour qu'elles ne puissent
// plus se désynchroniser — voir le commentaire détaillé dans lead-intake, où
// l'insert seul a longtemps laissé les alertes muettes. Duplication assumée :
// une Edge Function ne peut pas importer src/lib/log.ts.
// deno-lint-ignore no-explicit-any
async function notifierEquipe(
  db: any,
  params: { titre: string; message: string; type: string; lien?: string }
) {
  await db.from("notifications").insert({
    titre: params.titre,
    message: params.message,
    type: params.type,
    lien: params.lien ?? null,
  });

  // Trois canaux indépendants : la cloche du back-office, le push, l'email.
  // Chacun dans sa propre fonction, pour qu'un "return" anticipé sur un canal
  // non configuré ne puisse pas supprimer silencieusement les suivants.
  await envoyerPush(params);
  await alerterParEmail(params);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Alerte par email via Resend, second canal à côté du push. Le push dépend
// d'un service gratuit dont le quota anonyme se compte par adresse IP de
// sortie, mutualisée entre projets Supabase : il s'est déjà tu sans prévenir.
// Une demande client manquée coûte bien plus cher qu'un email de trop, d'où
// deux canaux plutôt qu'un.
//
// S'active en posant ALERTE_EMAIL, se désactive en retirant la variable.
async function alerterParEmail(params: { titre: string; message: string; lien?: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const destinataire = Deno.env.get("ALERTE_EMAIL")?.trim();
  if (!apiKey || !destinataire) return;

  const appUrl = (Deno.env.get("APP_URL") || "https://back.dimz-copilote.com").replace(/\/$/, "");
  const url = params.lien ? `${appUrl}${params.lien}` : appUrl;

  // Sujet = titre + détail : c'est la seule ligne visible sur un écran
  // verrouillé, elle doit suffire à décider si ça vaut le déverrouillage.
  const sujet = (params.message ? `${params.titre} — ${params.message}` : params.titre)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  // Titre et message viennent d'un formulaire public : sans échappement, un
  // nom contenant un chevron casserait la mise en page du mail.
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
            <p style="margin:0 0 6px;font-size:12px;color:#565c68;text-transform:uppercase;letter-spacing:0.06em;">Alerte back-office</p>
            <p style="margin:0 0 14px;font-size:17px;font-weight:700;line-height:1.35;">${escapeHtml(params.titre)}</p>
            ${params.message ? `<p style="margin:0;">${escapeHtml(params.message)}</p>` : ""}
            <a href="${url}" style="display:inline-block;background:#2f6fed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;margin-top:18px;">Ouvrir dans le back-office</a>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #e6e8ee;color:#565c68;font-size:12px;">
            DIMZ · Mon copilote auto<br />Alerte automatique du back-office.
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
        to: destinataire,
        subject: sujet,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Échec alerte email:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Échec alerte email:", err);
  }
}

async function envoyerPush(params: { titre: string; message: string; lien?: string }) {
  // trim() : voir le commentaire dans lead-intake — un espace parasite dans le
  // secret rend le topic invalide pour ntfy et rend l'alerte muette.
  const topic = Deno.env.get("NTFY_TOPIC")?.trim();
  if (!topic) {
    console.error("NTFY_TOPIC manquante : notification push non envoyée.");
    return;
  }

  const appUrl = (Deno.env.get("APP_URL") || "https://back.dimz-copilote.com").replace(/\/$/, "");
  // Jeton ntfy facultatif : voir le commentaire dans lead-intake. Sans lui, le
  // quota est celui de l'IP de sortie, partagée avec d'autres projets.
  const token = Deno.env.get("NTFY_TOKEN")?.trim();
  try {
    const res = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        topic,
        title: params.titre,
        message: params.message || params.titre,
        priority: 4,
        ...(params.lien ? { click: `${appUrl}${params.lien}` } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Échec notification push:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Échec notification push:", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const rawBody = await req.text();
  if (rawBody.length > BODY_MAX_BYTES) {
    return jsonResponse({ error: "Requête trop volumineuse" }, 413);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "JSON invalide" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (await isRateLimited(db, getClientIp(req))) {
    return jsonResponse({ error: "Trop de requêtes, réessayez plus tard." }, 429);
  }

  const payload: Record<string, unknown> = {
    donnees_brutes: (data.donnees_brutes && typeof data.donnees_brutes === "object") ? data.donnees_brutes : {},
  };

  for (const field of TEXT_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null || value === "") continue;
    payload[field] = INT_FIELDS.has(field) ? Number(value) : String(value).slice(0, TEXT_FIELD_MAX_LENGTH);
  }

  const { data: created, error } = await db
    .from("test_feedback")
    .insert(payload)
    .select("id, reference")
    .single();

  if (error || !created) {
    return jsonResponse({ error: "Erreur enregistrement" }, 500);
  }

  await notifierEquipe(db, {
    titre: "Nouveau retour de test utilisateur",
    message: created.reference,
    type: "test_feedback",
    lien: `/retours-test/${created.id}`,
  });

  return jsonResponse({ status: "ok", reference: created.reference });
});
