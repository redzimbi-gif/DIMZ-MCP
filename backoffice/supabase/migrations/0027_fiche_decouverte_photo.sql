-- ---------------------------------------------------------------------------
-- Une petite photo par véhicule de la fiche Découverte, affichée dans le
-- back-office et dans le PDF envoyé au client.
-- ---------------------------------------------------------------------------

alter table fiche_decouverte_vehicules add column if not exists photo_path text;
