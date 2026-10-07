-- ---------------------------------------------------------------------------
-- Archivage des dossiers : les dossiers archivés sortent du pipeline (kanban)
-- par défaut mais restent consultables (et récupérables) plutôt que
-- supprimés. La suppression définitive reste une action séparée.
-- ---------------------------------------------------------------------------

alter table dossiers add column if not exists archive boolean not null default false;
create index if not exists dossiers_archive_idx on dossiers (archive);
