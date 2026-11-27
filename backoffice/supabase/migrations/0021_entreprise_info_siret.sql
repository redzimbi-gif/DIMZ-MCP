-- ---------------------------------------------------------------------------
-- SIRET complet (14 chiffres), à la place du SIREN (9 chiffres) entré par
-- erreur dans la migration 0019.
-- ---------------------------------------------------------------------------

update entreprise_info
set siret = '932 349 442 00016', updated_at = now()
where id = 1;
