-- Articles publiés sur le site vitrine (page "Actualités"), repris
-- manuellement du contenu Instagram par l'équipe. Sur le même principe que
-- "avis" : publie=false par défaut, aucun article n'est visible publiquement
-- tant qu'il n'a pas été rédigé et publié depuis le back-office (contrairement
-- à "avis", ici c'est l'équipe elle-même qui écrit le contenu, pas un visiteur
-- du site — donc pas de limite de fréquence ni de validation d'un tiers,
-- seulement la distinction brouillon / publié pour pouvoir préparer un
-- article avant de le mettre en ligne).

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  extrait text not null,
  contenu text not null,
  image_path text,
  publie boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table articles enable row level security;

create trigger articles_set_updated_at before update on articles
  for each row execute function set_updated_at();
