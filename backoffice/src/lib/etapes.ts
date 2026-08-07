// Étapes de suivi visibles par le client, sur /suivi/[token]. Distinct du
// statut interne (dossiers.statut, pipeline à 10 valeurs, kanban interne) :
// ce fichier pilote uniquement ce que le client voit, et dépend de l'offre
// choisie. Le statut interne continue de vivre sa vie de son côté.

import type { DossierOffre } from "./types";

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
export const ETAPES_CONVOYAGE: EtapeDef[] = [
  { key: "demande_recue", label: "Demande reçue" },
  { key: "traitement_demande", label: "Étude de votre demande" },
  { key: "devis_en_cours", label: "Devis en cours" },
  { key: "livraison_en_cours", label: "Livraison en cours" },
  { key: "vehicule_livre", label: "Véhicule livré" },
];

export const ETAPE_CONVOYAGE_REFUSEE: EtapeDef = { key: "demande_refusee", label: "Demande non retenue" };

export function getEtapeLabel(offre: DossierOffre | null, etapeKey: string): string {
  const liste = offre === "convoyage_seul" ? [...ETAPES_CONVOYAGE, ETAPE_CONVOYAGE_REFUSEE] : getEtapesOffre(offre);
  return liste.find((e) => e.key === etapeKey)?.label ?? etapeKey;
}
