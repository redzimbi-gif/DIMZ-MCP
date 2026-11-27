import {
  type EntrepriseInfo,
  type Prospect,
  type ProspectCategorie,
  type ProspectZone,
} from "@/lib/types";

/**
 * Modèles de mail de prospection. Volontairement en texte brut avec des
 * variables `{{…}}` : le back-office les remplit avec la fiche du prospect,
 * puis l'équipe retouche le texte avant l'envoi. La mise en forme HTML est
 * ajoutée à l'envoi par `prospectionEmail` (src/lib/email-templates.ts), donc
 * personne n'a à écrire de HTML ici ni dans le composeur.
 *
 * Ce fichier est importé côté client (composeur) comme côté serveur (envoi) :
 * il ne doit dépendre de rien d'autre que des libellés de types.
 */

export interface ProspectionVariables {
  etablissement: string;
  interlocuteur: string | null;
  ville: string | null;
  zone: ProspectZone | null;
  categorie: ProspectCategorie;
  signature_nom: string | null;
  signature_telephone: string | null;
  signature_email: string | null;
}

/**
 * Catégories au pluriel, pour écrire « les garages de votre secteur ». Les
 * libellés de PROSPECT_CATEGORIE_LABELS sont au singulier et pensés pour des
 * étiquettes d'interface : ils donneraient « les garage ».
 */
const CATEGORIE_PLURIEL: Record<ProspectCategorie, string> = {
  concession: "concessions et marchands de véhicules",
  garage: "garages",
  carrosserie: "carrosseries",
  location: "loueurs de véhicules",
  moto: "professionnels de la moto",
  equipementier: "équipementiers",
  controle_technique: "centres de contrôle technique",
  autre: "professionnels de l'automobile",
};

/** Variables proposées dans le composeur, pour que l'équipe puisse en rajouter. */
export const PROSPECTION_VARIABLES: { cle: string; label: string }[] = [
  { cle: "etablissement", label: "Nom de l'établissement" },
  { cle: "interlocuteur", label: "Nom du responsable" },
  { cle: "salutation", label: "« Bonjour M./Mme X, » ou « Bonjour, »" },
  { cle: "ville", label: "Ville (vide si la fiche n'en a pas)" },
  { cle: "secteur", label: "« à Annecy », « dans le canton de Genève »…" },
  { cle: "categories", label: "Catégorie au pluriel (garages, loueurs…)" },
  { cle: "signature", label: "Signature DIMZ (nom, téléphone, email)" },
];

export interface ProspectionModele {
  cle: string;
  label: string;
  objet: string;
  corps: string;
}

export const PROSPECTION_MODELES: ProspectionModele[] = [
  {
    cle: "premier_contact",
    label: "Premier contact",
    objet: "Convoyage de véhicules pour {{etablissement}}",
    corps: `{{salutation}}

Je suis convoyeur professionnel {{secteur}} et j'accompagne les {{categories}} du secteur sur leurs déplacements de véhicules : livraison à un client, transfert entre sites, retour de reprise, passage au contrôle technique ou en atelier.

Concrètement, vous me confiez le véhicule et je m'occupe du reste : conduite par un convoyeur assuré, état des lieux photo au départ et à l'arrivée, et un rapport qui vous est envoyé le jour même.

Est-ce que ce type de besoin se présente chez vous ? Si oui, je peux vous envoyer mes tarifs ou passer vous voir pour en parler quelques minutes.

{{signature}}`,
  },
  {
    cle: "relance",
    label: "Relance",
    objet: "Suite à mon message — convoyage pour {{etablissement}}",
    corps: `{{salutation}}

Je me permets de revenir vers vous au sujet du convoyage de véhicules pour {{etablissement}}. Mon message est peut-être passé au mauvais moment.

L'idée reste la même : vous libérer des trajets de véhicules (livraisons clients, transferts, reprises, contrôle technique) avec un convoyeur assuré et un état des lieux photo à chaque étape.

Si le sujet n'est pas d'actualité, dites-le moi simplement et je n'insisterai pas. Sinon, un créneau de dix minutes au téléphone suffit à faire le tour.

{{signature}}`,
  },
  {
    cle: "suite_appel",
    label: "Suite à un appel",
    objet: "Suite à notre échange — DIMZ convoyage",
    corps: `{{salutation}}

Merci pour votre accueil au téléphone. Comme convenu, voici un récapitulatif de ce que je propose à {{etablissement}} :

- Convoyage par la route de vos véhicules, par un convoyeur professionnel assuré
- État des lieux photo complet au départ et à l'arrivée
- Rapport de convoyage envoyé le jour même
- Interventions {{secteur}} et alentours

Je reste à votre disposition pour un premier trajet d'essai ou pour un devis sur un besoin précis.

{{signature}}`,
  },
];

function salutation(interlocuteur: string | null): string {
  return interlocuteur ? `Bonjour ${interlocuteur},` : "Bonjour,";
}

/**
 * Locution de lieu complète, préposition incluse, et jamais vide : une fiche
 * sans ville retombe sur sa zone, puis sur une formule générique. Sans ça une
 * fiche incomplète partirait avec « Interventions à et dans toute la région ».
 */
function secteur(vars: ProspectionVariables): string {
  if (vars.ville) return `à ${vars.ville}`;
  if (vars.zone === "geneve") return "dans le canton de Genève";
  if (vars.zone === "annecy") return "dans le bassin annécien";
  return "dans votre région";
}

function signature(vars: ProspectionVariables): string {
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
 * valeur connue (une fiche sans ville, par exemple) est retirée plutôt que
 * laissée en clair : un mail de prospection ne doit jamais partir avec un
 * « {{ville}} » visible. Les variables inconnues sont laissées telles quelles
 * pour que l'auteur du texte voie sa faute de frappe.
 */
export function remplirVariables(texte: string, vars: ProspectionVariables): string {
  const valeurs: Record<string, string | null> = {
    etablissement: vars.etablissement,
    interlocuteur: vars.interlocuteur,
    salutation: salutation(vars.interlocuteur),
    ville: vars.ville,
    secteur: secteur(vars),
    categories: CATEGORIE_PLURIEL[vars.categorie],
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
export function modelesRemplis(vars: ProspectionVariables): ProspectionModele[] {
  return PROSPECTION_MODELES.map((m) => ({
    ...m,
    objet: remplirVariables(m.objet, vars),
    corps: remplirVariables(m.corps, vars),
  }));
}

/**
 * Variables d'une fiche : l'enseigne prime sur la raison sociale (« Garage du
 * Lac » parle mieux au destinataire que « SARL DUPONT & FILS »), et la
 * signature vient des coordonnées de l'entreprise saisies dans Paramètres.
 */
export function variablesProspect(
  prospect: Prospect,
  entreprise: EntrepriseInfo | null
): ProspectionVariables {
  return {
    etablissement: prospect.enseigne || prospect.raison_sociale,
    interlocuteur: prospect.responsable_nom,
    ville: prospect.ville,
    zone: prospect.zone,
    categorie: prospect.categorie,
    signature_nom: entreprise?.nom_dirigeant ?? null,
    signature_telephone: entreprise?.telephone ?? null,
    signature_email: entreprise?.email ?? null,
  };
}
