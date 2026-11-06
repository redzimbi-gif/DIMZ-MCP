-- ---------------------------------------------------------------------------
-- Nouveau format de référence dossier : [offre]-[AAMM]-[0000].
--   01 Découverte, 02 Copilote, 03 Copilote Plus, 04 Inspection (expertise
--   seule), 05 Convoyage (convoyage seul) — 01 par défaut si l'offre n'est
--   pas encore renseignée.
-- Le compteur (0000) repart à 0001 chaque mois, partagé entre toutes les
-- offres. La référence est assignée une seule fois à la création du dossier
-- et ne change plus ensuite, même si l'offre du dossier change.
-- ---------------------------------------------------------------------------

create table if not exists dossier_reference_counters (
  periode text primary key,
  compteur int not null default 0
);

create or replace function next_dossier_reference(p_offre dossier_offre)
returns text
language plpgsql
as $$
declare
  v_periode text := to_char(now(), 'YYMM');
  v_compteur int;
  v_code text;
begin
  insert into dossier_reference_counters (periode, compteur)
  values (v_periode, 1)
  on conflict (periode) do update set compteur = dossier_reference_counters.compteur + 1
  returning compteur into v_compteur;

  v_code := case p_offre::text
    when 'decouverte' then '01'
    when 'copilote' then '02'
    when 'copilote_plus' then '03'
    when 'expertise_seule' then '04'
    when 'convoyage_seul' then '05'
    else '01'
  end;

  return v_code || '-' || v_periode || '-' || lpad(v_compteur::text, 4, '0');
end;
$$;

create or replace function set_dossier_reference()
returns trigger
language plpgsql
as $$
begin
  new.reference := next_dossier_reference(new.offre);
  return new;
end;
$$;

drop trigger if exists trg_set_dossier_reference on dossiers;
create trigger trg_set_dossier_reference
  before insert on dossiers
  for each row
  execute function set_dossier_reference();

-- Le trigger prend systématiquement le dessus à l'insertion ; l'ancien default
-- ne servait qu'en son absence.
alter table dossiers alter column reference drop default;
