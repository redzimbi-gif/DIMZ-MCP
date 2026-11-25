import type { Client, EntrepriseInfo } from "@/lib/types";

/**
 * Modèles de mail client, sur le même principe que `prospection-email.ts` :
 * du texte brut avec des variables `{{…}}`, que le back-office remplit depuis
 * la fiche du client et que l'équipe retouche avant l'envoi. La mise en forme
 * HTML est ajoutée à l'envoi par `emailClientPersonnalise`
 * (src/lib/email-templates.ts), donc personne n'écrit de HTML ici.
 *
 * Ce fichier est importé côté client (composeur) comme côté serveur (envoi) :
 * il ne doit dépendre de rien d'autre que des types.
 */

export interface ClientVariables {
  civilite: string | null;
  nom: string;
  prenom: string | null;
  raison_sociale: string | null;
  signature_nom: string | null;
  signature_telephone: string | null;
  signature_email: string | null;
}

/** Variables proposées dans le composeur, pour que l'équipe puisse en rajouter. */
export const CLIENT_VARIABLES: { cle: string; label: string }[] = [
  { cle: "salutation", label: "« Bonjour Marie, » ou « Bonjour, »" },
  { cle: "prenom", label: "Prénom du client (vide si la fiche n'en a pas)" },
  { cle: "nom", label: "Nom du client" },
  { cle: "nom_complet", label: "Prénom et nom, ou raison sociale pour un pro" },
  { cle: "signature", label: "Signature DIMZ (nom, téléphone, email)" },
];

export interface ClientModele {
  cle: string;
  label: string;
  objet: string;
  corps: string;
}

/**
 * Les quatre situations qui reviennent : envoyer un devis, envoyer des
 * documents, relancer un devis sans réponse, écrire sans motif particulier.
 * Le modèle vierge est volontairement présent en premier choix explicite :
 * l'équipe part souvent d'une page blanche.
 */
export const CLIENT_MODELES: ClientModele[] = [
  {
    cle: "envoi_devis",
    label: "Envoi d'un devis",
    objet: "Votre devis DIMZ",
    corps: `{{salutation}}

Comme convenu, vous trouverez votre devis en pièce jointe de ce message.

Il reprend la prestation dont nous avons parlé, avec le détail et le montant. Si un point mérite d'être précisé ou ajusté, dites-le moi simplement : je le reprends.

Pour l'accepter, un mot de votre part en réponse à ce mail me suffit.

{{signature}}`,
  },
  {
    cle: "envoi_documents",
    label: "Envoi de documents",
    objet: "Vos documents DIMZ",
    corps: `{{salutation}}

Vous trouverez en pièce jointe les documents de votre dossier.

N'hésitez pas à me dire s'il vous manque quelque chose ou si vous souhaitez que je vous en renvoie une copie plus tard.

{{signature}}`,
  },
  {
    cle: "relance_devis",
    label: "Relance d'un devis",
    objet: "Votre devis DIMZ — toujours d'actualité ?",
    corps: `{{salutation}}

Je reviens vers vous au sujet du devis que je vous ai transmis. Mon message est peut-être passé au mauvais moment.

Si le projet est toujours d'actualité, je reste disponible pour en reparler ou pour ajuster le devis. Si ce n'est plus le cas, dites-le moi simplement et je n'insisterai pas.

{{signature}}`,
  },
  {
    cle: "libre",
    label: "Message libre",
    objet: "",
    corps: `{{salutation}}



{{signature}}`,
  },
];

function salutation(vars: ClientVariables): string {
  if (vars.prenom) return `Bonjour ${vars.prenom},`;
  if (vars.civilite) return `Bonjour ${vars.civilite} ${vars.nom},`;
  return "Bonjour,";
}

/**
 * Nom à afficher : la raison sociale pour un professionnel (« Garage du Lac »
 * parle mieux au destinataire que le nom du gérant), le prénom et le nom
 * sinon.
 */
function nomComplet(vars: ClientVariables): string {
  if (vars.raison_sociale) return vars.raison_sociale;
  return [vars.prenom, vars.nom].filter(Boolean).join(" ");
}

function signature(vars: ClientVariables): string {
  return [
    vars.signature_nom || "L'équipe DIMZ",
    "DIMZ — Mon copilote auto",
    vars.signature_telephone,
    vars.signature_email,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Remplace les `{{variables}}` par les valeurs de la fiche. Une variable sans
 * valeur connue (une fiche sans prénom) est retirée plutôt que laissée en
 * clair : un mail client ne doit jamais partir avec un « {{prenom}} » visible.
 * Les variables inconnues sont laissées telles quelles pour que l'auteur du
 * texte voie sa faute de frappe.
 */
export function remplirVariablesClient(texte: string, vars: ClientVariables): string {
  const valeurs: Record<string, string | null> = {
    salutation: salutation(vars),
    prenom: vars.prenom,
    nom: vars.nom,
    nom_complet: nomComplet(vars),
    signature: signature(vars),
  };

  return texte
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (brut, cle: string) => {
      const valeur = valeurs[cle.toLowerCase()];
      if (valeur === undefined) return brut;
      return valeur ?? "";
    })
    // Une variable vide peut laisser une double espace ou une ligne orpheline.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Les modèles, variables déjà remplies, prêts à être affichés dans le composeur. */
export function modelesClientRemplis(vars: ClientVariables): ClientModele[] {
  return CLIENT_MODELES.map((m) => ({
    ...m,
    objet: remplirVariablesClient(m.objet, vars),
    corps: remplirVariablesClient(m.corps, vars),
  }));
}

export function variablesClient(client: Client, entreprise: EntrepriseInfo | null): ClientVariables {
  return {
    civilite: client.civilite,
    nom: client.nom,
    prenom: client.prenom,
    raison_sociale: client.type_client === "professionnel" ? client.raison_sociale : null,
    signature_nom: entreprise?.nom_dirigeant ?? null,
    signature_telephone: entreprise?.telephone ?? null,
    signature_email: entreprise?.email ?? null,
  };
}

/**
 * Une pièce jointe proposée dans le composeur. `cle` encode d'où vient le
 * fichier, parce que les deux familles ne se récupèrent pas de la même façon :
 * un document est téléchargé du bucket, un devis ou une facture est regénéré
 * en PDF à l'envoi (le `pdf_path` d'un document commercial peut être vide, et
 * un devis modifié depuis doit partir à jour).
 */
export interface PieceJointeOption {
  cle: string;
  nom: string;
  categorie: "document" | "document_commercial";
  /** Libellé de la nature du fichier : « Devis · 1 250,00 € », « Carte grise »… */
  detail: string;
}

/** Taille maximale cumulée des pièces jointes, limite de l'API Resend (40 Mo). */
export const MAX_PIECES_JOINTES_BYTES = 40 * 1024 * 1024;
