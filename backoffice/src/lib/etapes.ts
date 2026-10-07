// Étapes de suivi visibles par le client, sur /suivi/[token]. Distinct du
// statut interne (dossiers.statut, pipeline à 10 valeurs, kanban interne) :
// ce fichier pilote uniquement ce que le client voit, et dépend de l'offre
// choisie. Le statut interne continue de vivre sa vie de son côté.

import type { DossierOffre, DossierStatut } from "./types";

export interface EtapeDef {
  key: string;
  label: string;
}

const DEMANDE_RECUE: EtapeDef = { key: "demande_recue", label: "Demande reçue" };
const TRAITEMENT: EtapeDef = {
  key: "traitement_en_cours",
  label: "Votre copilote prend connaissance de votre dossier",
};

// Communes à toutes les offres d'accompagnement : avant que le copilote
// n'ait confirmé l'offre, le client ne voit que ces deux étapes.
export const ETAPES_SOCLE: EtapeDef[] = [DEMANDE_RECUE, TRAITEMENT];

// Offres payantes : le travail ne démarre qu'une fois la prestation réglée.
// L'étape s'intercale entre la demande et la prise en charge — et son libellé
// bascule sur place en « Paiement reçu » une fois encaissé (cf.
// resolveEtapesOffre), sur le même principe que « Devis en cours » →
// « Devis envoyé » côté convoyage.
export const ETAPE_PAIEMENT_KEY = "paiement_en_attente";
const PAIEMENT: EtapeDef = { key: ETAPE_PAIEMENT_KEY, label: "En attente du paiement" };
const PAIEMENT_LABEL_RECU = "Paiement reçu";

const SOCLE_PAYANT: EtapeDef[] = [DEMANDE_RECUE, PAIEMENT, TRAITEMENT];

const EXPLORATION: EtapeDef = { key: "exploration_projet", label: "Exploration de votre projet" };
const RECHERCHE: EtapeDef = { key: "recherche_annonces", label: "Recherche d'annonces qualifiées" };
const REDACTION: EtapeDef = { key: "redaction_rapport", label: "Rédaction de votre rapport" };

export type OffreAccompagnement = Exclude<DossierOffre, "convoyage_seul">;

/** Offres dont le parcours client commence par une étape de paiement. */
export const OFFRES_PAYANTES: DossierOffre[] = ["copilote", "copilote_plus"];

export const ETAPES_OFFRE: Record<OffreAccompagnement, EtapeDef[]> = {
  decouverte: [...ETAPES_SOCLE, EXPLORATION, { key: "reponse_envoyee", label: "Réponse envoyée" }],
  copilote: [...SOCLE_PAYANT, EXPLORATION, RECHERCHE, REDACTION, { key: "dossier_envoye", label: "Dossier envoyé" }],
  copilote_plus: [
    ...SOCLE_PAYANT,
    EXPLORATION,
    RECHERCHE,
    REDACTION,
    { key: "mise_en_relation", label: "Mise en relation avec le vendeur" },
    { key: "inspection_vehicule", label: "Inspection du véhicule" },
    { key: "processus_achat", label: "Accompagnement à l'achat" },
    { key: "demarches_administratives", label: "Démarches administratives" },
    { key: "livraison", label: "Livraison" },
  ],
  expertise_seule: [
    ...ETAPES_SOCLE,
    { key: "inspection_planifiee", label: "Inspection planifiée" },
    { key: "inspection_realisee", label: "Inspection réalisée" },
    { key: "rapport_envoye", label: "Rapport envoyé" },
  ],
};

// Offre par défaut pour toute demande d'accompagnement (le client ne choisit
// pas explicitement au dépôt de sa demande) : Découverte.
export const OFFRE_ACCOMPAGNEMENT_DEFAUT: OffreAccompagnement = "decouverte";

export function getOffreAccompagnement(offre: DossierOffre | null): OffreAccompagnement {
  return offre && offre !== "convoyage_seul" ? offre : OFFRE_ACCOMPAGNEMENT_DEFAUT;
}

export function getEtapesOffre(offre: DossierOffre | null): EtapeDef[] {
  return ETAPES_OFFRE[getOffreAccompagnement(offre)];
}

// ---------------------------------------------------------------------------
// Paiement des offres payantes
// ---------------------------------------------------------------------------
/**
 * Vrai si l'offre demande un paiement qui n'a pas encore été encaissé.
 *
 * Le test porte sur *quelle* offre a été réglée, pas sur le simple fait qu'un
 * paiement a eu lieu : un dossier qui passe de Copilote à Copilote Plus a déjà
 * payé son Copilote, et doit pourtant régler la différence avant que le
 * travail ne reprenne.
 *
 * Seule source de vérité sur la question : les quatre endroits qui changent
 * l'offre d'un dossier appellent tous cette fonction plutôt que de réécrire la
 * règle chacun de leur côté.
 */
export function besoinPaiementOffre(
  offre: DossierOffre | null,
  paiementOffre: DossierOffre | null
): boolean {
  return !!offre && OFFRES_PAYANTES.includes(offre) && paiementOffre !== offre;
}

/** Étape sur laquelle poser le dossier après un changement d'offre. */
export function etapeApresChangementOffre(
  offre: DossierOffre | null,
  paiementOffre: DossierOffre | null
): string {
  return besoinPaiementOffre(offre, paiementOffre) ? ETAPE_PAIEMENT_KEY : TRAITEMENT.key;
}

/**
 * Étape qui suit le paiement, déduite de la liste de l'offre plutôt que codée
 * en dur, pour rester juste si l'ordre des étapes change un jour.
 */
export function etapeApresPaiement(offre: DossierOffre | null): string {
  const etapes = getEtapesOffre(offre);
  const index = etapes.findIndex((e) => e.key === ETAPE_PAIEMENT_KEY);
  return etapes[index + 1]?.key ?? TRAITEMENT.key;
}

/** ETAPES_OFFRE avec « En attente du paiement » remplacé par « Paiement reçu » si applicable. */
export function resolveEtapesOffre(
  offre: DossierOffre | null,
  paiementOffre: DossierOffre | null
): EtapeDef[] {
  const etapes = getEtapesOffre(offre);
  if (besoinPaiementOffre(offre, paiementOffre)) return etapes;
  return etapes.map((e) => (e.key === ETAPE_PAIEMENT_KEY ? { ...e, label: PAIEMENT_LABEL_RECU } : e));
}

// ---------------------------------------------------------------------------
// Convoyage : flux dédié, avec branche acceptée / refusée.
// ---------------------------------------------------------------------------
// "devis_en_cours" est affiché « Devis en cours » puis, une fois le devis
// envoyé (dossiers.devis_envoye_at renseigné), remplacé en place par
// « Devis envoyé » — cf. resolveEtapesConvoyage ci-dessous. Ce n'est pas une
// étape supplémentaire : même position dans la liste, seul le libellé change,
// pour éviter qu'elle n'apparaisse barrée comme une étape "terminée" alors
// qu'on est simplement passé du brouillon à l'envoi.
export const ETAPES_CONVOYAGE: EtapeDef[] = [
  { key: "demande_recue", label: "Demande reçue" },
  { key: "traitement_demande", label: "Étude de votre demande" },
  { key: "devis_en_cours", label: "Devis en cours" },
  { key: "livraison_programmee", label: "Livraison programmée" },
  { key: "livraison_en_cours", label: "Livraison en cours" },
  { key: "livraison_terminee", label: "Livraison terminée" },
];

export const ETAPE_CONVOYAGE_REFUSEE: EtapeDef = { key: "demande_refusee", label: "Demande non retenue" };

/** ETAPES_CONVOYAGE avec le libellé "Devis en cours" remplacé par "Devis envoyé" si applicable. */
export function resolveEtapesConvoyage(devisEnvoyeAt: string | null): EtapeDef[] {
  if (!devisEnvoyeAt) return ETAPES_CONVOYAGE;
  return ETAPES_CONVOYAGE.map((e) => (e.key === "devis_en_cours" ? { ...e, label: "Devis envoyé" } : e));
}

export function getEtapeLabel(offre: DossierOffre | null, etapeKey: string): string {
  const liste = offre === "convoyage_seul" ? [...ETAPES_CONVOYAGE, ETAPE_CONVOYAGE_REFUSEE] : getEtapesOffre(offre);
  return liste.find((e) => e.key === etapeKey)?.label ?? etapeKey;
}

// ---------------------------------------------------------------------------
// Correspondance étape client -> statut du pipeline interne (kanban à 10
// valeurs, /dossiers). Chaque dossier doit être classé, sur le pipeline
// interne, à l'endroit qui correspond à son étape actuelle — pas seulement
// sorti une fois de "Demande reçue" puis laissé figé. La dernière étape de
// chaque offre (celle qui n'a rien après elle dans ETAPES_OFFRE/ETAPES_CONVOYAGE)
// correspond à "dossier_termine" : rien à traiter ensuite côté équipe.
const STATUT_PAR_ETAPE_ACCOMPAGNEMENT: Record<OffreAccompagnement, Record<string, DossierStatut>> = {
  decouverte: {
    demande_recue: "demande_recue",
    traitement_en_cours: "analyse_besoin",
    exploration_projet: "analyse_besoin",
    reponse_envoyee: "dossier_termine",
  },
  copilote: {
    demande_recue: "demande_recue",
    paiement_en_attente: "demande_recue",
    traitement_en_cours: "analyse_besoin",
    exploration_projet: "analyse_besoin",
    recherche_annonces: "recherche",
    redaction_rapport: "vehicules_selectionnes",
    dossier_envoye: "dossier_termine",
  },
  copilote_plus: {
    demande_recue: "demande_recue",
    paiement_en_attente: "demande_recue",
    traitement_en_cours: "analyse_besoin",
    exploration_projet: "analyse_besoin",
    recherche_annonces: "recherche",
    redaction_rapport: "vehicules_selectionnes",
    mise_en_relation: "negociation",
    inspection_vehicule: "inspection",
    processus_achat: "achat_valide",
    demarches_administratives: "achat_valide",
    livraison: "dossier_termine",
  },
  expertise_seule: {
    demande_recue: "demande_recue",
    traitement_en_cours: "analyse_besoin",
    inspection_planifiee: "inspection",
    inspection_realisee: "inspection",
    rapport_envoye: "dossier_termine",
  },
};

const STATUT_PAR_ETAPE_CONVOYAGE: Record<string, DossierStatut> = {
  demande_recue: "demande_recue",
  traitement_demande: "analyse_besoin",
  devis_en_cours: "negociation",
  livraison_programmee: "convoyage",
  livraison_en_cours: "convoyage",
  livraison_terminee: "dossier_termine",
  demande_refusee: "dossier_termine",
};

/** Statut de pipeline interne correspondant à une étape client donnée. */
export function computeStatutFromEtape(offre: DossierOffre | null, etapeClient: string): DossierStatut {
  if (offre === "convoyage_seul") {
    return STATUT_PAR_ETAPE_CONVOYAGE[etapeClient] ?? "demande_recue";
  }
  const table = STATUT_PAR_ETAPE_ACCOMPAGNEMENT[getOffreAccompagnement(offre)];
  return table[etapeClient] ?? "demande_recue";
}
