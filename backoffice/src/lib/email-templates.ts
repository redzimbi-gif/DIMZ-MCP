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
                DIMZ — Mon copilote auto<br />Cet email vous a été envoyé suite à votre demande.
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
    <p style="margin:0 0 16px;">On a bien reçu votre demande, merci ! Votre dossier <strong>${params.reference}</strong> est enregistré et on revient vers vous sous 24 à 48h pour la suite.</p>
    <p style="margin:0 0 4px;">Vous pouvez suivre l'avancement de votre dossier à tout moment via ce lien :</p>
    ${ctaButton(params.portalUrl, "Suivre mon dossier")}
  `;
  return {
    subject: `Votre demande DIMZ est bien reçue — ${params.reference}`,
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
    subject: `Votre rapport ${label} est disponible — ${params.reference}`,
    html: emailLayout(content),
  };
}

export function avancementDossierEmail(params: {
  prenom: string | null;
  reference: string;
  statutLabel: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;">${greeting(params.prenom)}</p>
    <p style="margin:0 0 16px;">Votre dossier <strong>${params.reference}</strong> avance ! Statut actuel :</p>
    <p style="margin:0 0 16px;">
      <span style="display:inline-block;background:#eef3ff;color:${BLUE};font-weight:600;font-size:13px;padding:6px 14px;border-radius:999px;">${params.statutLabel}</span>
    </p>
    <p style="margin:0 0 4px;">Le détail est disponible sur votre espace de suivi :</p>
    ${ctaButton(params.portalUrl, "Suivre mon dossier")}
  `;
  return {
    subject: `Avancement de votre dossier — ${params.reference}`,
    html: emailLayout(content),
  };
}
