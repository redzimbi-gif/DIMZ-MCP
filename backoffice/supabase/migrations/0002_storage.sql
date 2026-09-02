-- Buckets de stockage (photos annonces, inspections, convoyages, documents, signatures)
-- Buckets privés : tous les fichiers sont servis via URLs signées générées côté serveur.

insert into storage.buckets (id, name, public)
values ('dimz-files', 'dimz-files', false)
on conflict (id) do nothing;
