-- ---------------------------------------------------------------------------
-- Archivage des documents uploadés : même logique que dossiers.archive — un
-- document archivé sort de la liste par défaut mais reste consultable et
-- récupérable. La suppression définitive reste une action séparée.
-- ---------------------------------------------------------------------------

alter table documents add column if not exists archive boolean not null default false;
create index if not exists documents_archive_idx on documents (archive);
