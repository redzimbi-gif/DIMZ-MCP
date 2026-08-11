import type { ContratType } from "./types";

export type ContratChampType = "text" | "number" | "date" | "select" | "textarea";

export interface ContratChampDef {
  key: string;
  label: string;
  type: ContratChampType;
  options?: string[];
  placeholder?: string;
}

// Champs propres à chaque document, non déductibles du dossier/client — le
// reste (identité client, coordonnées DIMZ, dates de génération/signature)
// est rempli automatiquement dans le PDF à partir du dossier et des
// informations de l'entreprise.
export const CONTRAT_CHAMPS: Record<ContratType, ContratChampDef[]> = {
  cgv: [],
  contrat_convoyage: [
    { key: "marque_modele", label: "Véhicule (marque / modèle)", type: "text" },
    { key: "immatriculation", label: "Immatriculation", type: "text" },
    { key: "km_depart", label: "Kilométrage au départ", type: "text" },
    { key: "lieu_depart", label: "Lieu de départ", type: "text" },
    { key: "lieu_arrivee", label: "Lieu d'arrivée", type: "text" },
    { key: "date_convoyage", label: "Date prévue du convoyage", type: "date" },
    { key: "montant_ht", label: "Montant HT (€)", type: "number" },
    { key: "montant_tva", label: "TVA (€)", type: "number" },
    { key: "montant_ttc", label: "Montant TTC (€)", type: "number" },
  ],
  contrat_copilote: [
    { key: "montant", label: "Montant TTC (€)", type: "number", placeholder: "99 ou 149" },
  ],
  contrat_copilote_plus: [
    { key: "montant", label: "Montant TTC (€)", type: "number", placeholder: "749" },
    { key: "montant_deja_paye", label: "Déjà réglé au titre de l'offre Copilote (€)", type: "number" },
  ],
  contrat_inspection: [
    { key: "marque", label: "Marque", type: "text" },
    { key: "modele", label: "Modèle", type: "text" },
    { key: "version", label: "Version", type: "text" },
    { key: "immatriculation", label: "Immatriculation", type: "text" },
    { key: "vin", label: "VIN", type: "text" },
    { key: "kilometrage", label: "Kilométrage affiché", type: "text" },
    { key: "lieu", label: "Lieu de l'inspection", type: "text" },
    { key: "date_inspection", label: "Date de l'inspection", type: "date" },
    { key: "vendeur", label: "Vendeur", type: "text" },
    { key: "prix", label: "Prix de l'inspection (€ TTC)", type: "number" },
    { key: "frais_supplementaires", label: "Frais supplémentaires éventuels (€ TTC)", type: "number" },
  ],
  etat_vehicule: [
    { key: "marque_modele", label: "Véhicule (marque / modèle)", type: "text" },
    { key: "immatriculation", label: "Immatriculation", type: "text" },
    { key: "vin", label: "VIN", type: "text" },
    { key: "km_depart", label: "Kilométrage au départ", type: "text" },
    { key: "date_prise_en_charge", label: "Date / heure de prise en charge", type: "text" },
    { key: "lieu_depart", label: "Lieu de départ", type: "text" },
    { key: "lieu_arrivee", label: "Lieu d'arrivée", type: "text" },
    {
      key: "carburant_depart",
      label: "Carburant / charge au départ",
      type: "select",
      options: ["Réserve", "1/4", "1/2", "3/4", "Plein"],
    },
    { key: "voyants_depart", label: "Voyants allumés au départ", type: "text", placeholder: "Aucun, ou préciser" },
    {
      key: "etat_exterieur_depart",
      label: "État extérieur au départ",
      type: "textarea",
      placeholder: "Aucun dommage apparent, rayure, impact, jante endommagée…",
    },
    { key: "observations_depart", label: "Observations au départ", type: "textarea" },
    { key: "km_arrivee", label: "Kilométrage à l'arrivée", type: "text" },
    { key: "carburant_arrivee", label: "Carburant / charge à l'arrivée", type: "text" },
    { key: "voyants_arrivee", label: "Voyants allumés à l'arrivée", type: "text" },
    { key: "dommages_arrivee", label: "Dommages constatés à l'arrivée", type: "textarea" },
    { key: "observations_arrivee", label: "Observations à l'arrivée", type: "textarea" },
    { key: "reserves", label: "Réserves du client / destinataire", type: "textarea" },
    { key: "photos_autres", label: "Autres photos prises (en plus de la liste standard)", type: "text" },
  ],
  commencement_anticipe: [
    {
      key: "prestation",
      label: "Prestation concernée",
      type: "select",
      options: ["Copilote", "Copilote Plus", "Inspection automobile", "Convoyage", "Autre"],
    },
    { key: "reference_commande", label: "Référence de commande / devis", type: "text" },
  ],
  retractation: [
    { key: "prestation", label: "Prestation", type: "text" },
    { key: "reference_commande", label: "Référence du devis / commande", type: "text" },
    { key: "date_commande", label: "Date de commande", type: "date" },
    { key: "date_conclusion", label: "Date de conclusion du contrat", type: "date" },
  ],
};
