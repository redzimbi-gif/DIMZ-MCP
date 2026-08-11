export const DOSSIER_STATUTS = [
  "demande_recue",
  "analyse_besoin",
  "recherche",
  "vehicules_selectionnes",
  "inspection",
  "negociation",
  "achat_valide",
  "convoyage",
  "livraison",
  "dossier_termine",
] as const;

export type DossierStatut = (typeof DOSSIER_STATUTS)[number];

export const DOSSIER_STATUT_LABELS: Record<DossierStatut, string> = {
  demande_recue: "Demande reçue",
  analyse_besoin: "Analyse du besoin",
  recherche: "Recherche",
  vehicules_selectionnes: "Véhicules sélectionnés",
  inspection: "Inspection",
  negociation: "Négociation",
  achat_valide: "Achat validé",
  convoyage: "Convoyage",
  livraison: "Livraison",
  dossier_termine: "Dossier terminé",
};

export const DOSSIER_OFFRES = [
  "decouverte",
  "copilote",
  "copilote_plus",
  "convoyage_seul",
  "expertise_seule",
] as const;
export type DossierOffre = (typeof DOSSIER_OFFRES)[number];

export const DOSSIER_OFFRE_LABELS: Record<DossierOffre, string> = {
  decouverte: "Découverte",
  copilote: "Copilote",
  copilote_plus: "Copilote Plus",
  convoyage_seul: "Livraison seule",
  expertise_seule: "Inspection",
};

export const CONVOYAGE_DECISIONS = ["en_attente", "accepte", "refuse"] as const;
export type ConvoyageDecision = (typeof CONVOYAGE_DECISIONS)[number];

export const DOCUMENT_TYPES = [
  "carte_grise",
  "certificat_cession",
  "facture",
  "contrat",
  "rapport_inspection",
  "photo",
  "administratif",
  "autre",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  carte_grise: "Carte grise",
  certificat_cession: "Certificat de cession",
  facture: "Facture",
  contrat: "Contrat",
  rapport_inspection: "Rapport d'inspection",
  photo: "Photo",
  administratif: "Administratif",
  autre: "Autre",
};

export const AGENDA_EVENT_TYPES = [
  "rendez_vous",
  "visioconference",
  "inspection",
  "convoyage",
  "livraison",
  "convoyage_externe",
] as const;
export type AgendaEventType = (typeof AGENDA_EVENT_TYPES)[number];

export const AGENDA_EVENT_TYPE_LABELS: Record<AgendaEventType, string> = {
  rendez_vous: "Rendez-vous",
  visioconference: "Visioconférence",
  inspection: "Inspection",
  convoyage: "Convoyage",
  livraison: "Livraison",
  convoyage_externe: "Convoyage (hors DIMZ)",
};

export const CONVOYAGE_STATUTS = ["planifie", "en_cours", "livre", "annule"] as const;
export type ConvoyageStatut = (typeof CONVOYAGE_STATUTS)[number];
export const CONVOYAGE_STATUT_LABELS: Record<ConvoyageStatut, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  livre: "Livré",
  annule: "Annulé",
};

export interface Client {
  id: string;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes_privees: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dossier {
  id: string;
  client_id: string;
  reference: string;
  offre: DossierOffre | null;
  budget: string | null;
  vehicule_recherche: string | null;
  marques_souhaitees: string | null;
  motorisation: string | null;
  boite_vitesses: string | null;
  km_max: string | null;
  region: string | null;
  commentaires: string | null;
  statut: DossierStatut;
  etape_client: string;
  convoyage_decision: ConvoyageDecision;
  valeur_estimee: number | null;
  source: string;
  portal_token: string;
  donnees_brutes: Record<string, unknown> | null;
  fiche_decouverte_intro: string | null;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export interface DossierStatutHistory {
  id: string;
  dossier_id: string;
  statut: DossierStatut;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface DossierEtapeHistory {
  id: string;
  dossier_id: string;
  etape_client: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Annonce {
  id: string;
  dossier_id: string;
  titre: string;
  lien: string | null;
  prix: number | null;
  prix_negocie: number | null;
  kilometrage: number | null;
  annee: number | null;
  localisation: string | null;
  avis_copilote: string | null;
  points_forts: string | null;
  points_faibles: string | null;
  score_confiance: number | null;
  score_prix: number | null;
  score_historique: number | null;
  score_etat: number | null;
  score_adequation: number | null;
  selectionnee: boolean;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface FicheDecouverteVehicule {
  id: string;
  dossier_id: string;
  marque: string | null;
  modele: string | null;
  energie: string | null;
  point_fort: string | null;
  point_vigilance: string | null;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export const FICHE_DECOUVERTE_ENERGIES = [
  "Essence",
  "Diesel",
  "Hybride (MHEV)",
  "Hybride rechargeable (PHEV)",
  "Électrique",
] as const;

export const INSPECTION_VERDICTS = ["recommande", "envisageable", "deconseille"] as const;
export type InspectionVerdict = (typeof INSPECTION_VERDICTS)[number];
export const INSPECTION_VERDICT_LABELS: Record<InspectionVerdict, string> = {
  recommande: "Recommandé",
  envisageable: "Envisageable",
  deconseille: "Déconseillé",
};

export interface Inspection {
  id: string;
  dossier_id: string;
  annonce_id: string | null;
  reference: string;
  date_inspection: string;
  lieu: string | null;
  expert_nom: string | null;
  duree_sur_site: string | null;
  vehicule_titre: string | null;
  annonce_comparee: string | null;
  tags: string | null;
  score_administratif: number | null;
  score_exterieur: number | null;
  score_interieur: number | null;
  score_mecanique: number | null;
  score_essai_routier: number | null;
  score_marche: number | null;
  points_positifs: string | null;
  points_vigilance: string | null;
  avis_copilote: string | null;
  verdict: InspectionVerdict | null;
  recommandation_finale: string | null;
  etat_exterieur: string | null;
  etat_interieur: string | null;
  pneus: string | null;
  freins: string | null;
  carrosserie: string | null;
  mecanique: string | null;
  essai_routier: string | null;
  defauts_constates: string | null;
  commentaires: string | null;
  note_finale: number | null;
  photos: string[];
  videos: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Convoyage {
  id: string;
  dossier_id: string;
  adresse_depart: string | null;
  adresse_arrivee: string | null;
  date_convoyage: string | null;
  heure: string | null;
  conducteur: string | null;
  km_depart: number | null;
  km_arrivee: number | null;
  niveau_carburant: string | null;
  photos_avant: string[];
  photos_apres: string[];
  signature_client: string | null;
  rapport_notes: string | null;
  statut: ConvoyageStatut;
  created_at: string;
  updated_at: string;
}

export interface AgendaEvent {
  id: string;
  titre: string;
  type: AgendaEventType;
  dossier_id: string | null;
  client_id: string | null;
  date_debut: string;
  date_fin: string | null;
  lieu: string | null;
  notes: string | null;
  rappel_envoye: boolean;
  termine: boolean;
  convoyage_externe_id: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  dossier_id: string | null;
  client_id: string | null;
  type: DocumentType;
  nom: string;
  storage_path: string;
  taille: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface NoteInterne {
  id: string;
  dossier_id: string | null;
  client_id: string | null;
  auteur: string | null;
  contenu: string;
  created_at: string;
}

export interface Notification {
  id: string;
  titre: string;
  message: string | null;
  type: string;
  lien: string | null;
  lue: boolean;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entite_type: string;
  entite_id: string | null;
  description: string;
  acteur: string | null;
  created_at: string;
}

export interface ConvoyageExterne {
  id: string;
  date_convoyage: string | null;
  lieu_depart: string | null;
  lieu_arrivee: string | null;
  total_prestation: number;
  frais: number;
  notes: string | null;
  justificatifs: string[];
  created_at: string;
}

export const RESSENTI_DUREE_LABELS: Record<string, string> = {
  tres_rapide: "Très rapide",
  assez_rapide: "Assez rapide",
  un_peu_long: "Un peu trop long",
  beaucoup_trop_long: "Beaucoup trop long",
};

export const OFFRE_TEST_LABELS: Record<string, string> = {
  decouverte: "Découverte",
  copilote: "Copilote",
  copilote_plus: "Copilote Plus",
  aucune: "Aucune",
};

export interface TestFeedback {
  id: string;
  reference: string;
  comprehension_immediate: string | null;
  confiance_site: number | null;
  offres_faciles: string | null;
  tarifs_clairs: string | null;
  navigation_facile: string | null;
  note_design_general: number | null;
  note_professionnalisme: number | null;
  note_logo: number | null;
  note_couleurs: number | null;
  note_lisibilite: number | null;
  note_modernite: number | null;
  ressenti_duree: string | null;
  hesite_abandonner: string | null;
  note_experience_formulaire: number | null;
  offre_choisie: string | null;
  prix_coherents: string | null;
  meilleur_rapport_qualite_prix: string | null;
  utiliserait_dimz: string | null;
  recommanderait_dimz: string | null;
  note_globale: number | null;
  duree_secondes: number | null;
  duree_declaree: string | null;
  donnees_brutes: Record<string, unknown> | null;
  created_at: string;
}
