// Emplacements photo obligatoires de l'état des lieux convoyage (départ et
// arrivée) — partagés entre le formulaire back-office et le PDF combiné pour
// ne jamais désynchroniser la liste.

export interface EtatLieuxPhotoSlot {
  key: string;
  label: string;
}

export const ETAT_LIEUX_PHOTO_SLOTS: EtatLieuxPhotoSlot[] = [
  { key: "permis", label: "Permis de conduire" },
  { key: "selfie", label: "Selfie du conducteur" },
  { key: "avant", label: "Avant" },
  { key: "avant_gauche", label: "Avant gauche" },
  { key: "arriere_gauche", label: "Arrière gauche" },
  { key: "arriere", label: "Arrière" },
  { key: "arriere_droit", label: "Arrière droit" },
  { key: "avant_droit", label: "Avant droit" },
  { key: "siege_conducteur", label: "Siège conducteur" },
  { key: "siege_passager", label: "Siège passager" },
  { key: "sieges_arriere", label: "Sièges arrière" },
  { key: "coffre", label: "Coffre" },
  { key: "pare_brise", label: "Pare-brise" },
  { key: "compteur_allume", label: "Compteur allumé" },
];

export const ETAT_LIEUX_TYPE_LABELS: Record<"depart" | "arrivee", string> = {
  depart: "Départ",
  arrivee: "Arrivée",
};
