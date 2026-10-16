-- ---------------------------------------------------------------------------
-- Retrait de la prospection lyonnaise.
--
-- DIMZ arrête de démarcher la Métropole de Lyon et reporte cet effort sur le
-- canton de Genève (voir 0042). Les fiches lyonnaises n'ont donc plus de
-- raison d'occuper la rubrique Prospection, où elles noieraient les fiches
-- genevoises dans les décomptes et les filtres.
--
-- ⚠︎ Migration destructive, à appliquer en connaissance de cause. Elle
-- supprime des lignes et aucune sauvegarde n'est faite ici : exporter d'abord
-- les fiches concernées si l'on veut pouvoir y revenir.
--
--   select count(*) from prospects where zone = 'lyon';
--
-- Au moment où cette migration a été écrite, le 16/10/2026, les 4 623 fiches
-- lyonnaises étaient toutes au statut « froid », sans note, sans relance, sans
-- conversion et sans coordonnée saisie à la main : aucune n'avait été
-- travaillée depuis l'import du 21/09/2026. C'est ce qui rend la suppression
-- acceptable — sur des fiches travaillées, il faudrait les basculer en zone
-- 'autre' plutôt que les effacer.
--
-- La suppression passe par les deux tables : notes_internes porte une clé
-- étrangère "on delete cascade" vers prospects, donc ses lignes partent
-- d'elles-mêmes, mais converti_client_id est en "on delete set null" et aucun
-- client déjà signé n'est touché.
-- ---------------------------------------------------------------------------

delete from prospects where zone = 'lyon';

-- Maintenant que plus aucune ligne ne porte 'lyon', la contrainte peut
-- l'interdire : un prochain import mal paramétré échouera au lieu de
-- reconstituer silencieusement la zone abandonnée.
alter table prospects drop constraint prospects_zone_check;
alter table prospects add constraint prospects_zone_check
  check (zone in ('geneve', 'annecy', 'autre'));
