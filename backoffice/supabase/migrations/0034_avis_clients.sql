-- Avis clients laissés sur le site vitrine (page "Avis clients").
-- publie=false par défaut : aucun avis n'est visible publiquement tant
-- qu'il n'a pas été validé manuellement (dans l'éditeur de table Supabase).

create table if not exists avis (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  note smallint not null check (note between 1 and 5),
  commentaire text not null,
  offre text,
  publie boolean not null default false,
  created_at timestamptz not null default now()
);

alter table avis enable row level security;
