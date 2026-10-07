-- ---------------------------------------------------------------------------
-- Fiche Découverte : commentaire libre affiché en introduction de la fiche
-- (avant la liste des véhicules), rédigé par le copilote pour chaque dossier.
-- ---------------------------------------------------------------------------

alter table dossiers add column if not exists fiche_decouverte_intro text;
