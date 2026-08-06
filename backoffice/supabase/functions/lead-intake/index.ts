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

function pick(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function guessOffre(label: string | null): string | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("découverte")) return "decouverte";
  if (lower.includes("plus")) return "copilote_plus";
  if (lower.includes("copilote")) return "copilote";
  return null;
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
            <p style="margin:0 0 16px;">On a bien reçu votre demande, merci ! Votre dossier <strong>${params.reference}</strong> est enregistré et on revient vers vous sous 24 à 48h pour la suite.</p>
            <p style="margin:0 0 4px;">Vous pouvez suivre l'avancement de votre dossier à tout moment via ce lien :</p>
            <a href="${params.portalUrl}" style="display:inline-block;background:#2f6fed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;margin-top:18px;">Suivre mon dossier</a>
          </td></tr>
          <tr><td style="padding:18px 32px;border-top:1px solid #e6e8ee;color:#565c68;font-size:12px;">
            DIMZ — Mon copilote auto<br />Cet email vous a été envoyé suite à votre demande.
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
        subject: `Votre demande DIMZ est bien reçue — ${params.reference}`,
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

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalide" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const formulaire = pick(data, "Formulaire") || "Accompagnement";
  const isConvoyage = formulaire.toLowerCase() === "convoyage";

  const nom =
    pick(data, "Informations personnelles — Nom") ||
    pick(data, "Le trajet — Nom (contact départ)") ||
    pick(data, "Le véhicule — Marque") ||
    "Nouveau contact";
  const prenom = pick(data, "Informations personnelles — Prénom", "Le trajet — Prénom (contact départ)");
  const telephone = pick(data, "Informations personnelles — Téléphone", "Le trajet — Téléphone (contact départ)");
  const email = pick(data, "Informations personnelles — Email", "Le trajet — Email (contact départ)");

  let clientId: string;
  if (email) {
    const { data: existing } = await db
      .from("clients")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
      await db.from("clients").update({ nom, prenom, telephone, email }).eq("id", clientId);
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
    message: `${prenom ?? ""} ${nom} — ${dossier.reference}`.trim(),
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
