-- ---------------------------------------------------------------------------
-- Facturation (V1 manuelle) : journal des factures déjà émises par DIMZ
-- (en dehors du back-office, pas de génération/envoi ici — ça viendra avec
-- Stripe). Juste de quoi les enregistrer et les retrouver : client, numéro,
-- montant total, montant des frais, notes.
-- ---------------------------------------------------------------------------

create table factures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  numero text,
  date_facture date,
  montant_total numeric not null default 0,
  montant_frais numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index factures_client_idx on factures (client_id);

alter table factures enable row level security;
