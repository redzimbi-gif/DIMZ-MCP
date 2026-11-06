-- ---------------------------------------------------------------------------
-- Fiche Découverte : pour les clients sur l'offre Découverte (gratuite), une
-- fiche plus légère que le Rapport DIMZ des inspections — pas de score, juste
-- les véhicules repérés (marque, modèle, énergie) avec un point fort et un
-- point de vigilance chacun. Table dédiée plutôt que de réutiliser
-- `annonces`, dont les champs (prix, score, lien...) ne correspondent pas à
-- ce que l'offre Découverte couvre.
-- ---------------------------------------------------------------------------

create table fiche_decouverte_vehicules (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  marque text,
  modele text,
  energie text,
  point_fort text,
  point_vigilance text,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fiche_decouverte_vehicules_dossier_idx on fiche_decouverte_vehicules (dossier_id);

alter table fiche_decouverte_vehicules enable row level security;
