import type { InspectionVerdict } from "@/lib/types";
import { INSPECTION_VERDICTS } from "@/lib/types";

function text(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

function score(formData: FormData, name: string): number | null {
  const raw = formData.get(name);
  return raw && String(raw).trim() ? Number(raw) : null;
}

function verdict(formData: FormData): InspectionVerdict | null {
  const raw = String(formData.get("verdict") || "");
  return (INSPECTION_VERDICTS as readonly string[]).includes(raw) ? (raw as InspectionVerdict) : null;
}

/** Extrait les champs éditables communs à la création et à la modification d'une inspection. */
export function inspectionFieldsFromForm(formData: FormData) {
  return {
    lieu: text(formData, "lieu"),
    expert_nom: text(formData, "expert_nom"),
    duree_sur_site: text(formData, "duree_sur_site"),
    vehicule_titre: text(formData, "vehicule_titre"),
    annonce_comparee: text(formData, "annonce_comparee"),
    tags: text(formData, "tags"),
    score_administratif: score(formData, "score_administratif"),
    score_exterieur: score(formData, "score_exterieur"),
    score_interieur: score(formData, "score_interieur"),
    score_mecanique: score(formData, "score_mecanique"),
    score_essai_routier: score(formData, "score_essai_routier"),
    score_marche: score(formData, "score_marche"),
    points_positifs: text(formData, "points_positifs"),
    points_vigilance: text(formData, "points_vigilance"),
    avis_copilote: text(formData, "avis_copilote"),
    verdict: verdict(formData),
    recommandation_finale: text(formData, "recommandation_finale"),
    etat_exterieur: text(formData, "etat_exterieur"),
    etat_interieur: text(formData, "etat_interieur"),
    pneus: text(formData, "pneus"),
    freins: text(formData, "freins"),
    carrosserie: text(formData, "carrosserie"),
    mecanique: text(formData, "mecanique"),
    essai_routier: text(formData, "essai_routier"),
    defauts_constates: text(formData, "defauts_constates"),
    commentaires: text(formData, "commentaires"),
    note_finale: score(formData, "note_finale"),
  };
}
