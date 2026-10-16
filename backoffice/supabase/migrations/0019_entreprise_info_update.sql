-- ---------------------------------------------------------------------------
-- Renseigne les informations légales réelles de l'entreprise (utilisées dans
-- les CGV et contrats générés), en cohérence avec les Mentions légales du
-- site. Le médiateur de la consommation reste à compléter séparément (voir
-- README) une fois l'adhésion faite.
-- ---------------------------------------------------------------------------

update entreprise_info
set
  nom_dirigeant = 'Roland Edzimbi',
  siret = '932 349 442',
  adresse = '7 Rue de L''Isernon, 74960 Annecy',
  ville = 'Annecy',
  email = 'redzimbi@gmail.com',
  telephone = '09 62 30 72 84',
  updated_at = now()
where id = 1;
