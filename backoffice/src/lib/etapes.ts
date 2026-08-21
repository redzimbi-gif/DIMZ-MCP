// Étapes de suivi visibles par le client, sur /suivi/[token]. Distinct du
// statut interne (dossiers.statut, pipeline à 10 valeurs, kanban interne) :
// ce fichier pilote uniquement ce que le client voit, et dépend de l'offre
// choisie. Le statut interne continue de vivre sa vie de son côté.

import type { DossierOffre, DossierStatut } from "./types";

export interface EtapeDef {
  key: string;
  label: string;
}

// Communes à toutes les offres d'accompagnement : avant que le copilote
// n'ait confirmé l'offre, le client ne voit que ces deux étapes.
export const ETAPES_SOCLE: EtapeDef[] = [
  { key: "demande_recue", label: "Demande reçue" },
  { key: "traitement_en_cours", label: "Votre copilote prend connaissance de votre dossier" },
];

const EXPLORATION: EtapeDef = { key: "exploration_projet", label: "Exploration de votre projet" };
const RECHERCHE: EtapeDef = { key: "recherche_annonces", label: "Recherche d'annonces qualifiées" };
const REDACTION: EtapeDef = { key: "redaction_rapport", label: "Rédaction de votre rapport" };

export type OffreAccompagnement = Exclude<DossierOffre, "convoyage_seul">;

export const ETAPES_OFFRE: Record<OffreAccompagnement, EtapeDef[]> = {
  decouverte: [...ETAPES_SOCLE, EXPLORATION, { key: "reponse_envoyee", label: "Réponse envoyée" }],
  copilote: [...ETAPES_SOCLE, EXPLORATION, RECHERCHE, REDACTION, { key: "dossier_envoye", label: "Dossier envoyé" }],
  copilote_plus: [
    ...ETAPES_SOCLE,
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
    traitement_en_cours: "analyse_besoin",
    exploration_projet: "analyse_besoin",
    recherche_annonces: "recherche",
    redaction_rapport: "vehicules_selectionnes",
    dossier_envoye: "dossier_termine",
  },
  copilote_plus: {
    demande_recue: "demande_recue",
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
