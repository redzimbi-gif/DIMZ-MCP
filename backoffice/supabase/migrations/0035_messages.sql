-- Messagerie interne entre le copilote (back-office) et le client, visible
-- côté client sur sa page de suivi (/suivi/[token]). Un message "staff"
-- déclenche un email au client ; un message "client" notifie le staff via
-- la table notifications (déjà utilisée pour les autres alertes internes).

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers(id) on delete cascade,
  auteur text not null check (auteur in ('staff', 'client')),
  contenu text not null,
  lu_par_client boolean not null default false,
  lu_par_staff boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_dossier_idx on messages (dossier_id, created_at);

alter table messages enable row level security;
