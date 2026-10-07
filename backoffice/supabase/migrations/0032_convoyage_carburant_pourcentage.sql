-- ---------------------------------------------------------------------------
-- Le carburant de l'état des lieux se saisit désormais via une jauge (0 à
-- 100 %, 100 % = plein) plutôt qu'une liste Réserve/1/4/1/2/3/4/Plein.
-- ---------------------------------------------------------------------------

alter table convoyage_etats_lieux drop column carburant;
alter table convoyage_etats_lieux add column carburant_pourcentage integer check (carburant_pourcentage between 0 and 100);
