-- ---------------------------------------------------------------------------
-- Rattrapage : entreprise_info (et potentiellement dossier_contrats) n'a
-- jamais été créée chez certains — la migration 0014 a dû échouer
-- silencieusement à cette étape. Version idempotente (create if not exists /
-- do blocks pour les enums) qui recrée tout proprement sans risque si
-- certaines parties existent déjà, et insère directement les valeurs finales
-- correctes (celles des migrations 0019 à 0021, qui n'ont pas pu s'appliquer
-- faute de table).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contrat_type') then
    create type contrat_type as enum (
      'cgv',
      'contrat_convoyage',
      'contrat_copilote',
      'contrat_copilote_plus',
      'contrat_inspection',
      'etat_vehicule',
      'commencement_anticipe',
      'retractation'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'contrat_statut') then
    create type contrat_statut as enum ('a_signer', 'signe', 'archive');
  end if;
end $$;

create table if not exists dossier_contrats (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  type contrat_type not null,
  statut contrat_statut not null default 'a_signer',
  champs jsonb not null default '{}'::jsonb,
  date_generation timestamptz,
  date_signature timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dossier_id, type)
);
create index if not exists dossier_contrats_dossier_idx on dossier_contrats (dossier_id);
alter table dossier_contrats enable row level security;

create table if not exists entreprise_info (
  id int primary key default 1 check (id = 1),
  nom_dirigeant text,
  siret text,
  adresse text,
  ville text default 'Lyon',
  email text,
  telephone text,
  mediateur_nom text,
  mediateur_adresse text,
  mediateur_site text,
  updated_at timestamptz not null default now()
);
alter table entreprise_info enable row level security;

insert into entreprise_info (id, nom_dirigeant, siret, adresse, ville, email, telephone)
values (
  1,
  'Roland Edzimbi',
  '932 349 442 00016',
  '7 Rue de L''Isernon, 74960 Annecy',
  'Annecy',
  'contact@dimz-copilote.com',
  '09 62 30 72 84'
)
on conflict (id) do update set
  nom_dirigeant = excluded.nom_dirigeant,
  siret = excluded.siret,
  adresse = excluded.adresse,
  ville = excluded.ville,
  email = excluded.email,
  telephone = excluded.telephone,
  updated_at = now();
