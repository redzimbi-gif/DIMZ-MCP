-- ---------------------------------------------------------------------------
-- Fiche Découverte : fourchette de prix indicative par véhicule repéré
-- (« Entre X € et Y € »), affichée sur chaque carte de la fiche.
-- ---------------------------------------------------------------------------

alter table fiche_decouverte_vehicules add column if not exists prix_min numeric;
alter table fiche_decouverte_vehicules add column if not exists prix_max numeric;
