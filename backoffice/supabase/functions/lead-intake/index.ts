// Supabase Edge Function — intake public des formulaires du site DIMZ.
// Ne nécessite pas de session (à déployer avec la vérification JWT désactivée),
// car appelée par n'importe quel visiteur anonyme du site vitrine.

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

// "%" et "_" sont des jokers pour ILIKE : un email saisi avec l'un de ces
// caractères élargirait la recherche à d'autres clients (même correctif que
// track-lookup, qui fait la même recherche par email).
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Plafond générique : un champ de formulaire légitime (nom, budget, marque
// de véhicule...) ne dépasse jamais quelques dizaines de caractères ; ça
// borne surtout le pire cas d'un client qui abuserait de ce endpoint public.
const FIELD_MAX_LENGTH = 500;
const EMAIL_MAX_LENGTH = 254; // longueur maximale d'un email valide (RFC 5321)
const DONNEES_BRUTES_MAX_BYTES = 50_000;

function pick(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, FIELD_MAX_LENGTH);
  }
  return null;
}

// Limite de fréquence par IP, sur une fenêtre fixe de 10 minutes, pour
// contenir le spam sur ce formulaire public. Compteur en base (fonction
// increment_rate_limit, migration 0040) : incrément atomique, pas de
// condition de course entre deux requêtes simultanées de la même IP.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// deno-lint-ignore no-explicit-any
async function isRateLimited(db: any, ip: string): Promise<boolean> {
  if (Math.random() < 0.05) await db.rpc("cleanup_rate_limits");
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: count } = await db.rpc("increment_rate_limit", {
    p_ip: ip,
    p_endpoint: "lead-intake",
    p_window: windowStart,
  });
  return (count ?? 0) > RATE_LIMIT;
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

function guessOffre(label: string | null): string {
  if (!label) return "decouverte";
  const lower = label.toLowerCase();
  if (lower.includes("découverte")) return "decouverte";
  if (lower.includes("inspection")) return "expertise_seule";
  if (lower.includes("plus")) return "copilote_plus";
  if (lower.includes("copilote")) return "copilote";
  return "decouverte";
}

// Emails via l'API Resend en appel HTTP direct (pas de SDK, pour rester un
// fichier autonome déployable tel quel comme Edge Function Deno).
async function sendConfirmationEmail(params: { to: string; prenom: string | null; reference: string; portalUrl: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("RESEND_API_KEY manquante : email de confirmation non envoyé.");
    return;
  }

  const hello = params.prenom ? `Bonjour ${params.prenom},` : "Bonjour,";
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
            <p style="margin:0 0 16px;">Votre demande est bien reçue, merci. Votre dossier <strong>${params.reference}</strong> est enregistré et nous revenons vers vous sous 24 à 48h pour la suite.</p>
            <p style="margin:0 0 4px;">Vous pouvez suivre l'avancement de votre dossier à tout moment via ce lien :</p>
            <a href="${params.portalUrl}" style="display:inline-block;background:#2f6fed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;margin-top:18px;">Suivre mon dossier</a>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #e6e8ee;color:#565c68;font-size:12px;">
            DIMZ · Mon copilote auto<br />Cet email vous a été envoyé suite à votre demande.
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
        subject: `Votre demande DIMZ est bien reçue (${params.reference})`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Échec envoi email Resend:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Échec envoi email de confirmation:", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const rawBody = await req.text();
  if (rawBody.length > DONNEES_BRUTES_MAX_BYTES) {
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

  const ip = getClientIp(req);
  if (await isRateLimited(db, ip)) {
    return jsonResponse({ error: "Trop de requêtes, réessayez plus tard." }, 429);
  }

  const formulaire = pick(data, "Formulaire") || "Accompagnement";
  const isConvoyage = formulaire.toLowerCase() === "convoyage";

  const nom =
    pick(data, "Informations personnelles — Nom") ||
    pick(data, "Le trajet — Nom (contact départ)") ||
    pick(data, "Le véhicule — Marque") ||
    "Nouveau contact";
  const prenom = pick(data, "Informations personnelles — Prénom", "Le trajet — Prénom (contact départ)");
  const telephone = pick(data, "Informations personnelles — Téléphone", "Le trajet — Téléphone (contact départ)");
  const email = pick(data, "Informations personnelles — Email", "Le trajet — Email (contact départ)")?.slice(
    0,
    EMAIL_MAX_LENGTH
  ) ?? null;

  let clientId: string;
  if (email) {
    const { data: existing } = await db
      .from("clients")
      .select("id, nom, prenom, telephone")
      .ilike("email", escapeLikePattern(email))
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
      // Ne jamais écraser des coordonnées déjà connues : ce formulaire est public et
      // rien ne prouve que le soumetteur est bien le propriétaire de cet email. On ne
      // comble que les champs encore vides (ex. numéro laissé de côté la première fois).
      const completion: Record<string, string> = {};
      if (!existing.nom && nom) completion.nom = nom;
      if (!existing.prenom && prenom) completion.prenom = prenom;
      if (!existing.telephone && telephone) completion.telephone = telephone;
      if (Object.keys(completion).length > 0) {
        await db.from("clients").update(completion).eq("id", clientId);
      }
    } else {
      const { data: created, error } = await db
        .from("clients")
        .insert({ nom, prenom, telephone, email })
        .select("id")
        .single();
      if (error || !created) return jsonResponse({ error: "Erreur client" }, 500);
      clientId = created.id;
    }
  } else {
    const { data: created, error } = await db
      .from("clients")
      .insert({ nom, prenom, telephone })
      .select("id")
      .single();
    if (error || !created) return jsonResponse({ error: "Erreur client" }, 500);
    clientId = created.id;
  }

  const vehiculeRecherche = isConvoyage
    ? [pick(data, "Le véhicule — Marque"), pick(data, "Le véhicule — Modèle")].filter(Boolean).join(" ") || null
    : pick(data, "Véhicules souhaités — Véhicules ciblés");

  const offreLabel = pick(data, "Projet et délai — Accompagnement recherché");

  // Le détail complet de la soumission est conservé dans donnees_brutes et
  // affiché de façon structurée dans le back-office ; "commentaires" reste
  // un champ de notes libres pour l'équipe, pas un déversoir des réponses.
  const payload = {
    client_id: clientId,
    offre: isConvoyage ? "convoyage_seul" : guessOffre(offreLabel),
    budget: pick(data, "Budget et financement — Budget total envisagé"),
    vehicule_recherche: vehiculeRecherche,
    boite_vitesses: pick(data, "Le véhicule — Transmission"),
    km_max: pick(data, "Votre quotidien — Kilométrage annuel estimé"),
    commentaires: null,
    source: "site",
    donnees_brutes: data,
  };

  const { data: dossier, error: dossierError } = await db
    .from("dossiers")
    .insert(payload)
    .select("id, reference, portal_token")
    .single();

  if (dossierError || !dossier) return jsonResponse({ error: "Erreur dossier" }, 500);

  await db.from("dossier_statut_history").insert({
    dossier_id: dossier.id,
    statut: "demande_recue",
  });

  await db.from("notifications").insert({
    titre: `Nouvelle demande : ${formulaire}`,
    message: `${prenom ?? ""} ${nom} (${dossier.reference})`.trim(),
    type: "nouveau_dossier",
    lien: `/dossiers/${dossier.id}`,
  });

  // Confirmation envoyée au client si on a son email ; un échec d'envoi ne
  // doit jamais faire échouer la création du dossier (déjà géré en interne
  // par sendConfirmationEmail, qui ne relance jamais d'exception).
  if (email) {
    const appUrl = (Deno.env.get("APP_URL") || "http://localhost:3000").replace(/\/$/, "");
    await sendConfirmationEmail({
      to: email,
      prenom,
      reference: dossier.reference,
      portalUrl: `${appUrl}/suivi/${dossier.portal_token}`,
    });
  }

  return jsonResponse({ status: "ok", dossier: dossier.reference });
});
