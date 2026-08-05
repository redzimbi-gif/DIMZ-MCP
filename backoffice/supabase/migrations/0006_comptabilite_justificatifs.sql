-- Permet de joindre des justificatifs (photos, factures) aux frais d'un
-- convoyage hors DIMZ, stockés dans le même bucket Storage que les autres
-- documents de l'application.
alter table convoyages_externes add column if not exists justificatifs text[] not null default '{}';
