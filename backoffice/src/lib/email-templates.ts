const BLUE = "#2f6fed";
const INK = "#0b0d12";
const INK_SOFT = "#565c68";

function emailLayout(contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ee;">
            <tr>
              <td style="padding:26px 32px 18px;border-bottom:1px solid #e6e8ee;">
                <span style="font-size:18px;font-weight:700;color:${INK};letter-spacing:-0.02em;">DIMZ</span>
                <span style="font-size:13px;color:${INK_SOFT};margin-left:8px;">Mon copilote auto</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:${INK};font-size:14px;line-height:1.6;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #e6e8ee;color:${INK_SOFT};font-size:12px;">
                DIMZ · Mon copilote auto<br />Cet email vous a été envoyé suite à votre demande.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;margin-top:18px;">${label}</a>`;
}

function greeting(prenom: string | null): string {
  return prenom ? `Bonjour ${prenom},` : "Bonjour,";
}

export function confirmationDemandeEmail(params: {
  prenom: string | null;
  reference: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;">${greeting(params.prenom)}</p>
    <p style="margin:0 0 16px;">Votre demande est bien reçue, merci. Votre dossier <strong>${params.reference}</strong> est enregistré et nous revenons vers vous sous 24 à 48h pour la suite.</p>
    <p style="margin:0 0 4px;">Vous pouvez suivre l'avancement de votre dossier à tout moment via ce lien :</p>
    ${ctaButton(params.portalUrl, "Suivre mon dossier")}
  `;
  return {
    subject: `Votre demande DIMZ est bien reçue (${params.reference})`,
    html: emailLayout(content),
  };
}

export function rapportDisponibleEmail(params: {
  prenom: string | null;
  reference: string;
  typeRapport: "inspection" | "convoyage";
  portalUrl: string;
}): { subject: string; html: string } {
  const label = params.typeRapport === "inspection" ? "d'inspection" : "de convoyage";
  const content = `
    <p style="margin:0 0 16px;">${greeting(params.prenom)}</p>
    <p style="margin:0 0 16px;">Votre rapport ${label} pour le dossier <strong>${params.reference}</strong> est prêt, vous le trouverez en pièce jointe de cet email.</p>
    <p style="margin:0 0 4px;">Vous pouvez aussi le retrouver à tout moment depuis votre espace de suivi :</p>
    ${ctaButton(params.portalUrl, "Voir mon dossier")}
  `;
  return {
    subject: `Votre rapport ${label} est disponible (${params.reference})`,
    html: emailLayout(content),
  };
}

export function ficheDecouverteEmail(params: {
  prenom: string | null;
  reference: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;">${greeting(params.prenom)}</p>
    <p style="margin:0 0 16px;">Votre fiche Découverte pour le dossier <strong>${params.reference}</strong> est prête, vous la trouverez en pièce jointe de cet email : les véhicules repérés par votre copilote, avec un point fort et un point de vigilance pour chacun.</p>
    <p style="margin:0 0 4px;">Vous pouvez aussi la retrouver à tout moment depuis votre espace de suivi :</p>
    ${ctaButton(params.portalUrl, "Voir mon dossier")}
  `;
  return {
    subject: `Votre fiche Découverte est disponible (${params.reference})`,
    html: emailLayout(content),
  };
}

export function marketDisponibleEmail(params: {
  prenom: string | null;
  reference: string;
  titre: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;">${greeting(params.prenom)}</p>
    <p style="margin:0 0 16px;">Votre ${params.titre} pour le dossier <strong>${params.reference}</strong> est prêt, vous le trouverez en pièce jointe de cet email : la sélection d'annonces de votre copilote, avec le Score DIMZ pour chacune.</p>
    <p style="margin:0 0 4px;">Vous pouvez aussi la retrouver à tout moment depuis votre espace de suivi :</p>
    ${ctaButton(params.portalUrl, "Voir mon dossier")}
  `;
  return {
    subject: `Votre ${params.titre} est disponible (${params.reference})`,
    html: emailLayout(content),
  };
}

function etapeBadge(label: string): string {
  return `<span style="display:inline-block;background:#eef3ff;color:${BLUE};font-weight:600;font-size:13px;padding:6px 14px;border-radius:999px;">${label}</span>`;
}

interface EtapeEmailParams {
  prenom: string | null;
  reference: string;
  portalUrl: string;
}

function etapeEmail(params: EtapeEmailParams, badgeLabel: string, bodyHtml: string, subject: string) {
  const content = `
    <p style="margin:0 0 16px;">${greeting(params.prenom)}</p>
    <p style="margin:0 0 14px;">Votre dossier <strong>${params.reference}</strong> avance : ${etapeBadge(badgeLabel)}</p>
    <p style="margin:0 0 16px;">${bodyHtml}</p>
    <p style="margin:0 0 4px;">Le détail est disponible sur votre espace de suivi :</p>
    ${ctaButton(params.portalUrl, "Suivre mon dossier")}
  `;
  return { subject: `${subject} (${params.reference})`, html: emailLayout(content) };
}

// ---------------------------------------------------------------------------
// Accompagnement (Découverte / Copilote / Copilote Plus / Inspection) — ton
// léger et un brin humoristique, dans l'esprit de la marque. Un email par
// étape client (cf. src/lib/etapes.ts pour la liste des étapes par offre).
// L'étape "demande_recue" n'a pas d'email dédié : elle est déjà couverte par
// l'email de confirmation envoyé à la soumission du formulaire.
// ---------------------------------------------------------------------------
export type EtapeAccompagnementKey =
  | "traitement_en_cours"
  | "exploration_projet"
  | "reponse_envoyee"
  | "recherche_annonces"
  | "redaction_rapport"
  | "dossier_envoye"
  | "mise_en_relation"
  | "inspection_vehicule"
  | "processus_achat"
  | "demarches_administratives"
  | "livraison"
  | "inspection_planifiee"
  | "inspection_realisee"
  | "rapport_envoye";

const ETAPE_ACCOMPAGNEMENT_COPY: Record<EtapeAccompagnementKey, { badge: string; subject: string; body: string }> = {
  traitement_en_cours: {
    badge: "Votre copilote prend connaissance de votre dossier",
    subject: "Votre dossier est pris en charge",
    body: "Votre copilote prend le temps d'étudier votre projet en détail avant de passer à l'étape suivante. Vous aurez de ses nouvelles très vite.",
  },
  exploration_projet: {
    badge: "Exploration de votre projet",
    subject: "Exploration de votre projet",
    body: "Votre copilote passe en revue votre projet en détail : budget, usage, contraintes du quotidien. L'objectif est de cerner précisément ce qu'il vous faut avant de démarrer les recherches.",
  },
  reponse_envoyee: {
    badge: "Réponse envoyée",
    subject: "Votre réponse est disponible",
    body: "Après avoir étudié votre projet, votre copilote vous a préparé une première sélection et des conseils personnalisés. Retrouvez-les dans votre espace de suivi.",
  },
  recherche_annonces: {
    badge: "Recherche d'annonces qualifiées",
    subject: "La recherche de votre véhicule est lancée",
    body: "Votre copilote passe le marché au crible pour vous : annonces trafiquées, prix gonflés, kilométrage douteux, rien ne lui échappe. Seuls les véhicules qui en valent vraiment la peine vous seront présentés.",
  },
  redaction_rapport: {
    badge: "Rédaction de votre rapport",
    subject: "Votre rapport est en cours de rédaction",
    body: "Les meilleures annonces sont sélectionnées. Votre copilote rédige maintenant un rapport clair et sans jargon pour vous aider à choisir en toute confiance.",
  },
  dossier_envoye: {
    badge: "Dossier envoyé",
    subject: "Votre dossier complet est prêt",
    body: "Votre rapport et notre sélection de véhicules sont disponibles dans votre espace de suivi. Un appel de synthèse avec votre copilote est prévu pour faire le point ensemble.",
  },
  mise_en_relation: {
    badge: "Mise en relation avec le vendeur",
    subject: "Prise de contact avec le vendeur",
    body: "Le véhicule est choisi. Votre copilote prend contact avec le vendeur pour préparer la suite.",
  },
  inspection_vehicule: {
    badge: "Inspection du véhicule",
    subject: "Inspection du véhicule en cours",
    body: "Direction le véhicule choisi pour une inspection complète : carrosserie, mécanique, essai routier. Rien n'est laissé au hasard avant de vous donner le feu vert.",
  },
  processus_achat: {
    badge: "Accompagnement à l'achat",
    subject: "L'achat de votre véhicule avance",
    body: "Le véhicule est à vous de l'acquérir : votre copilote vous accompagne dans la négociation avec le vendeur et reste à vos côtés jusqu'à la signature.",
  },
  demarches_administratives: {
    badge: "Démarches administratives",
    subject: "Vos démarches administratives sont prises en charge",
    body: "Carte grise, certificat de cession, formalités liées à l'achat : votre copilote s'en occupe pour vous. Cette prestation est incluse dans votre offre.",
  },
  livraison: {
    badge: "Livraison",
    subject: "Votre véhicule est en cours de livraison",
    body: "Votre véhicule est en cours de livraison. Votre copilote vous recontacte pour caler les derniers détails avant la remise des clés.",
  },
  inspection_planifiee: {
    badge: "Inspection planifiée",
    subject: "Votre inspection est planifiée",
    body: "Rendez-vous est pris pour l'inspection du véhicule que vous avez repéré. Votre copilote se déplace pour passer chaque détail au crible.",
  },
  inspection_realisee: {
    badge: "Inspection réalisée",
    subject: "Votre inspection est terminée",
    body: "Votre copilote vient de terminer l'inspection du véhicule. La rédaction de votre avis, honnête et détaillé, est la prochaine étape.",
  },
  rapport_envoye: {
    badge: "Rapport envoyé",
    subject: "Votre rapport d'inspection est disponible",
    body: "Votre avis de copilote est prêt : les points positifs, les points de vigilance, et notre recommandation finale. Retrouvez-le dans votre espace de suivi.",
  },
};

export function etapeAccompagnementEmail(
  etape: EtapeAccompagnementKey,
  params: EtapeEmailParams
): { subject: string; html: string } {
  const copy = ETAPE_ACCOMPAGNEMENT_COPY[etape];
  return etapeEmail(params, copy.badge, copy.body, copy.subject);
}

// ---------------------------------------------------------------------------
// Convoyage — ton professionnel, sans humour.
// ---------------------------------------------------------------------------
// Les clés correspondent exactement aux clés d'étape stockées dans
// dossiers.etape_client pour le flux convoyage (cf. src/lib/etapes.ts), pour
// que le bouton générique « Informer le client » puisse toujours retrouver
// le bon email à partir de l'étape actuelle, qu'elle ait été posée via les
// boutons accepté/refusé ou choisie manuellement dans le sélecteur.
export type EtapeConvoyageKey =
  | "traitement_demande"
  | "devis_en_cours"
  | "demande_refusee"
  | "livraison_en_cours"
  | "vehicule_livre";

const ETAPE_CONVOYAGE_COPY: Record<EtapeConvoyageKey, { badge: string; subject: string; body: string }> = {
  traitement_demande: {
    badge: "Étude de votre demande",
    subject: "Votre demande de convoyage est en cours d'étude",
    body: "Nous avons bien reçu votre demande de convoyage. Notre équipe l'étudie et revient vers vous rapidement avec une réponse.",
  },
  devis_en_cours: {
    badge: "Devis en cours",
    subject: "Votre demande de convoyage est acceptée",
    body: "Bonne nouvelle : votre demande de convoyage est acceptée. Nous préparons votre devis, que vous recevrez très prochainement.",
  },
  demande_refusee: {
    badge: "Demande non retenue",
    subject: "Réponse de DIMZ à votre demande de convoyage",
    body: "Nous vous remercions pour votre demande de convoyage. Après étude, nous ne sommes malheureusement pas en mesure d'y donner suite pour le moment. Nous sommes sincèrement désolés pour la gêne occasionnée et restons à votre disposition pour toute question.",
  },
  livraison_en_cours: {
    badge: "Livraison en cours",
    subject: "Votre véhicule est en cours de livraison",
    body: "Le convoyage de votre véhicule a débuté. Nous vous tiendrons informé jusqu'à sa livraison.",
  },
  vehicule_livre: {
    badge: "Véhicule livré",
    subject: "Votre véhicule a été livré",
    body: "Votre véhicule a été livré avec succès. Nous restons à votre disposition pour toute question complémentaire. Merci de votre confiance.",
  },
};

export function etapeConvoyageEmail(
  etape: EtapeConvoyageKey,
  params: EtapeEmailParams
): { subject: string; html: string } {
  const copy = ETAPE_CONVOYAGE_COPY[etape];
  return etapeEmail(params, copy.badge, copy.body, copy.subject);
}

export const ETAPE_ACCOMPAGNEMENT_KEYS = Object.keys(ETAPE_ACCOMPAGNEMENT_COPY) as EtapeAccompagnementKey[];
export const ETAPE_CONVOYAGE_KEYS = Object.keys(ETAPE_CONVOYAGE_COPY) as EtapeConvoyageKey[];
