-- ---------------------------------------------------------------------------
-- Retrait de la prospection lyonnaise.
--
-- DIMZ arrête de démarcher la Métropole de Lyon et reporte cet effort sur le
-- canton de Genève (voir 0042). Les fiches lyonnaises n'ont donc plus de
-- raison d'occuper la rubrique Prospection, où elles noieraient les fiches
-- genevoises dans les décomptes et les filtres.
--
-- ⚠︎ Migration destructive, à appliquer en connaissance de cause. Les fiches
-- sont d'abord recopiées dans prospects_lyon_archive, de sorte que la décision
-- reste réversible : une copie dans la même base ne coûte presque rien et
-- évite d'avoir à choisir entre « supprimer » et « pouvoir y revenir ».
--
-- Pour vérifier avant d'appliquer :
--   select count(*) from prospects where zone = 'lyon';
--
-- Pour revenir en arrière (la contrainte doit redevenir tolérante d'abord) :
--   alter table prospects drop constraint prospects_zone_check;
--   alter table prospects add constraint prospects_zone_check
--     check (zone in ('lyon', 'geneve', 'annecy', 'autre'));
--   insert into prospects select * from prospects_lyon_archive;
--
-- Quand Lyon est définitivement derrière nous :
--   drop table prospects_lyon_archive;
--
-- Au moment où cette migration a été écrite, le 16/10/2026, les 4 623 fiches
-- lyonnaises étaient toutes au statut « froid », sans note, sans relance, sans
-- conversion et sans coordonnée saisie à la main : aucune n'avait été
-- travaillée depuis l'import du 21/09/2026. C'est ce qui rend la suppression
-- acceptable — sur des fiches travaillées, il faudrait les basculer en zone
-- 'autre' plutôt que les effacer.
--
-- notes_internes porte une clé étrangère "on delete cascade" vers prospects,
-- donc ses lignes partiraient d'elles-mêmes — il n'y en a aucune sur Lyon.
-- converti_client_id est en "on delete set null" : aucun client déjà signé
-- n'est touché.
-- ---------------------------------------------------------------------------

-- Copie de sauvegarde, structure incluse. "create table as" ne reprend ni les
-- index ni les contraintes, et c'est voulu : l'archive n'a pas à être
-- interrogeable vite, seulement à être complète.
create table prospects_lyon_archive as
  select * from prospects where zone = 'lyon';

-- Même régime que prospects : RLS activé sans policy, tout passe par le
-- serveur avec la clé service-role.
alter table prospects_lyon_archive enable row level security;

-- Garde-fou : on ne supprime que si l'archive est complète. Une copie
-- partielle (disque plein, transaction interrompue) ferait perdre la
-- différence sans rien signaler.
do $$
declare
  nb_source bigint;
  nb_archive bigint;
begin
  select count(*) into nb_source from prospects where zone = 'lyon';
  select count(*) into nb_archive from prospects_lyon_archive;
  if nb_source <> nb_archive then
    raise exception 'Archive incomplète : % fiches lyonnaises, % archivées. Rien supprimé.',
      nb_source, nb_archive;
  end if;
end $$;

delete from prospects where zone = 'lyon';

-- Maintenant que plus aucune ligne ne porte 'lyon', la contrainte peut
-- l'interdire : un prochain import mal paramétré échouera au lieu de
-- reconstituer silencieusement la zone abandonnée.
alter table prospects drop constraint prospects_zone_check;
alter table prospects add constraint prospects_zone_check
  check (zone in ('geneve', 'annecy', 'autre'));
