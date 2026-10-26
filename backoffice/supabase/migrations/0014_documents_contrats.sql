-- ---------------------------------------------------------------------------
-- Documents & contrats : les documents légaux/contractuels de DIMZ (CGV,
-- contrats par offre, état du véhicule, formulaires de rétractation et de
-- commencement anticipé), générés en PDF et liés à un dossier, avec un statut
-- de signature (à signer → signé → archivé). Distinct de la table
-- `documents` existante, qui reste la bibliothèque de fichiers uploadés
-- manuellement (carte grise, factures, photos...).
-- ---------------------------------------------------------------------------

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

create type contrat_statut as enum ('a_signer', 'signe', 'archive');

create table dossier_contrats (
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
create index dossier_contrats_dossier_idx on dossier_contrats (dossier_id);

alter table dossier_contrats enable row level security;

-- Informations légales de l'entreprise (SIRET, adresse, médiateur...),
-- réutilisées dans le contenu de tous les documents générés. Une seule ligne.
create table entreprise_info (
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
insert into entreprise_info (id) values (1);

alter table entreprise_info enable row level security;
