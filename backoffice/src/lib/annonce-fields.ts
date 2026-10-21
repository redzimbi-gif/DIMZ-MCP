function text(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

function num(formData: FormData, name: string): number | null {
  const raw = formData.get(name);
  return raw && String(raw).trim() ? Number(raw) : null;
}

/**
 * Comme num(), mais ramène la valeur dans [0, 10] au lieu de laisser passer
 * une valeur hors bornes jusqu'à la contrainte SQL (qui la rejette avec une
 * erreur serveur peu explicite) — utile si quelqu'un saisit encore un score
 * sur l'ancienne échelle /100 par habitude.
 */
function score(formData: FormData, name: string): number | null {
  const value = num(formData, name);
  if (value === null) return null;
  return Math.min(10, Math.max(0, value));
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
    score_confiance: score(formData, "score_confiance"),
    score_prix: score(formData, "score_prix"),
    score_historique: score(formData, "score_historique"),
    score_etat: score(formData, "score_etat"),
    score_adequation: score(formData, "score_adequation"),
  };
}
