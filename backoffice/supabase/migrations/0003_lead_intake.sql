-- Conserve la totalité des réponses brutes envoyées par le site (aucune perte
-- de donnée même si le mapping vers les colonnes structurées est partiel).
alter table dossiers add column if not exists donnees_brutes jsonb;
