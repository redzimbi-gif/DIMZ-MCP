-- Ajoute le type 'conge' à l'enum agenda_event_type, manquant dans la migration 0001
-- permettant de créer des événements de congé dans l'agenda.
alter type agenda_event_type add value if not exists 'conge';
