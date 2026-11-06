-- ---------------------------------------------------------------------------
-- Bibliothèque de photos réutilisables : une photo peut être uploadée une
-- fois puis réutilisée sur plusieurs dossiers (ex. visuel générique d'un
-- modèle de voiture) au lieu d'être re-uploadée à chaque fiche Découverte.
-- ---------------------------------------------------------------------------

create table photos_bibliotheque (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table photos_bibliotheque enable row level security;

-- Un véhicule de fiche Découverte peut pointer directement vers un fichier
-- de la bibliothèque plutôt qu'un fichier uploadé pour lui seul ; ce
-- drapeau évite de supprimer ce fichier partagé quand le véhicule est
-- modifié ou retiré.
alter table fiche_decouverte_vehicules add column if not exists photo_from_bibliotheque boolean not null default false;
