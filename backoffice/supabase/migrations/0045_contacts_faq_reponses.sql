-- ---------------------------------------------------------------------------
-- Réponses aux questions posées depuis la FAQ du site vitrine.
--
-- Table dédiée plutôt que des colonnes sur contacts_faq, pour deux raisons :
--   1. répondre deux fois arrive (précision, relance), et des colonnes
--      écraseraient la première réponse sans laisser de trace ;
--   2. l'historique est l'intérêt même d'une boîte de réception : savoir ce
--      qu'on a déjà répondu avant de répondre à nouveau.
--
-- Pas une extension de "messages", qui exige un dossier_id : celui qui écrit
-- depuis la FAQ n'est ni client ni prospect, et n'a pas de portail de suivi.
--
-- email_statut est la différence de fond avec la messagerie d'un dossier :
-- là-bas le client retrouve le message dans son portail même si l'email
-- échoue, ici l'email EST la livraison. Un envoi raté doit donc rester
-- visible comme tel, sinon l'équipe croit avoir répondu alors que personne
-- n'a rien reçu. La ligne est écrite dans les deux cas, avec son issue.
-- ---------------------------------------------------------------------------

create table contacts_faq_reponses (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts_faq(id) on delete cascade,
  contenu text not null,

  -- Membre de l'équipe ayant répondu, comme activity_log.acteur. Nullable :
  -- une réponse envoyée par un script ou une automatisation n'a pas d'auteur.
  auteur uuid,

  email_statut text not null default 'envoye'
    check (email_statut in ('envoye', 'echec')),
  email_erreur text,

  created_at timestamptz not null default now()
);

-- Toujours lues par contact et dans l'ordre chronologique.
create index contacts_faq_reponses_contact_idx
  on contacts_faq_reponses (contact_id, created_at);

-- Comme les autres tables de ce schéma : RLS activé sans policy. Toutes les
-- lectures/écritures passent par le serveur avec la clé service-role.
alter table contacts_faq_reponses enable row level security;
