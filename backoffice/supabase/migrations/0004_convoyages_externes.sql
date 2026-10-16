-- Convoyages réalisés en dehors de la plateforme DIMZ (missions personnelles
-- de convoyage), pour le suivi comptable et le calcul de la part due à
-- l'URSSAF. Le gain de prestation (total - frais) et la part URSSAF sont
-- calculés côté application, pas stockés ici.
create table convoyages_externes (
  id uuid primary key default gen_random_uuid(),
  date_convoyage date,
  lieu_depart text,
  lieu_arrivee text,
  total_prestation numeric(10,2) not null default 0,
  frais numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index convoyages_externes_date_idx on convoyages_externes (date_convoyage);

alter table convoyages_externes enable row level security;
