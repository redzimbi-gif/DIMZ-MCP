-- ---------------------------------------------------------------------------
-- Questions posées depuis le formulaire de contact de la FAQ (site vitrine).
-- Ne concerne ni un client existant ni un dossier : juste une question
-- ponctuelle, une soumission = une ligne, sur le même principe que
-- test_feedback (table dédiée, pas rattachée à dossiers/clients).
-- ---------------------------------------------------------------------------

create table contacts_faq (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  message text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index contacts_faq_created_idx on contacts_faq (created_at desc);
create index contacts_faq_lu_idx on contacts_faq (lu);

alter table contacts_faq enable row level security;
