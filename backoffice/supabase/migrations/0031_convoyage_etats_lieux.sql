-- ---------------------------------------------------------------------------
-- État des lieux guidé du convoyage, en deux temps (départ puis arrivée),
-- chacun avec ses propres kilométrage/carburant, 14 photos obligatoires à
-- emplacements fixes (permis, selfie, tours du véhicule, intérieur, coffre,
-- pare-brise, compteur), des photos facultatives, le nom du contact présent,
-- et une signature de confirmation — remplace le modèle précédent
-- (convoyages.photos_avant/photos_apres en vrac, une seule signature globale).
-- ---------------------------------------------------------------------------

create type etat_lieux_type as enum ('depart', 'arrivee');

create table convoyage_etats_lieux (
  id uuid primary key default gen_random_uuid(),
  convoyage_id uuid not null references convoyages(id) on delete cascade,
  type etat_lieux_type not null,
  kilometrage numeric(10,0),
  carburant text,
  photos jsonb not null default '{}',
  photos_autres text[] not null default '{}',
  contact_nom text,
  signature_path text,
  confirme_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (convoyage_id, type)
);

create index convoyage_etats_lieux_convoyage_idx on convoyage_etats_lieux (convoyage_id);

alter table convoyage_etats_lieux enable row level security;

create trigger convoyage_etats_lieux_set_updated_at before update on convoyage_etats_lieux
  for each row execute function set_updated_at();
