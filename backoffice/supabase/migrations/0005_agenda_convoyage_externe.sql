-- Permet de créer un événement d'agenda "Convoyage (hors DIMZ)" et de le
-- marquer comme terminé, ce qui génère automatiquement une ligne dans
-- convoyages_externes (Comptabilité) prête à être complétée avec les
-- montants (total, frais, gain).
alter type agenda_event_type add value if not exists 'convoyage_externe';

alter table agenda_events add column if not exists termine boolean not null default false;
alter table agenda_events add column if not exists convoyage_externe_id uuid references convoyages_externes(id) on delete set null;
