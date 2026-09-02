-- Étape de paiement dans le parcours client des offres payantes (Copilote,
-- Copilote Plus). Le webhook Stripe renseigne ces deux colonnes quand la
-- facture de l'offre est encaissée, ce qui fait avancer le dossier à l'étape
-- suivante (cf. src/lib/paiement-dossier.ts).
--
-- paiement_offre retient *quelle* offre a été réglée, et pas seulement le fait
-- qu'un paiement a eu lieu : un dossier passé de Copilote à Copilote Plus a
-- déjà payé quelque chose, mais doit régler la différence avant que le travail
-- ne reprenne.
alter table dossiers
  add column if not exists paiement_recu_at timestamptz,
  add column if not exists paiement_offre dossier_offre;
