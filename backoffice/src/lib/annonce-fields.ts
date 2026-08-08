function text(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

function num(formData: FormData, name: string): number | null {
  const raw = formData.get(name);
  return raw && String(raw).trim() ? Number(raw) : null;
}

/** Extrait les champs éditables communs à la création et à la modification d'une annonce. */
export function annonceFieldsFromForm(formData: FormData) {
  return {
    lien: text(formData, "lien"),
    prix: num(formData, "prix"),
    kilometrage: num(formData, "kilometrage"),
    annee: num(formData, "annee"),
    localisation: text(formData, "localisation"),
    avis_copilote: text(formData, "avis_copilote"),
    points_forts: text(formData, "points_forts"),
    points_faibles: text(formData, "points_faibles"),
    score_confiance: num(formData, "score_confiance"),
    score_prix: num(formData, "score_prix"),
    score_historique: num(formData, "score_historique"),
    score_etat: num(formData, "score_etat"),
    score_adequation: num(formData, "score_adequation"),
  };
}
