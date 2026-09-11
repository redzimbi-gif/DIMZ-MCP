-- ---------------------------------------------------------------------------
-- Score DIMZ détaillé pour les annonces (recherche de véhicules), sur le
-- même principe que le score par catégorie du Rapport DIMZ (inspections) :
-- quatre critères notés par le copilote (prix, historique, état,
-- adéquation), indépendants du score global qui reste son verdict de
-- synthèse plutôt qu'une moyenne mécanique. Passage de score_confiance en
-- /10 (au lieu de /100) pour rester cohérent avec le Score DIMZ affiché
-- partout ailleurs (Rapport DIMZ, site vitrine).
-- ---------------------------------------------------------------------------

alter table annonces drop constraint if exists annonces_score_confiance_check;
alter table annonces alter column score_confiance type numeric(3,1) using score_confiance::numeric(3,1);

-- Convertit les scores déjà saisis sur l'ancienne échelle /100 (valeurs
-- au-delà de 10, donc forcément sur l'ancienne échelle) vers /10.
update annonces set score_confiance = round(score_confiance / 10, 1) where score_confiance > 10;

alter table annonces add constraint annonces_score_confiance_check check (score_confiance between 0 and 10);

alter table annonces add column score_prix numeric(3,1) check (score_prix between 0 and 10);
alter table annonces add column score_historique numeric(3,1) check (score_historique between 0 and 10);
alter table annonces add column score_etat numeric(3,1) check (score_etat between 0 and 10);
alter table annonces add column score_adequation numeric(3,1) check (score_adequation between 0 and 10);
