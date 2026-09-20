-- Bucket privado para documentos de sanción (upload de notificaciones PDF/JPG/PNG).
-- Las RLS policies sobre storage.objects (sanction_docs_read/insert/delete/update)
-- se crean en 20260825184159 y 20260826191508, pero ninguna migración creaba la
-- fila del bucket en storage.buckets — el upload fallaba en prod con
-- "No se ha podido subir el documento" (404 NoSuchBucket). Ver
-- docs/spec/08-paridad-lovable.md GAP-1.
insert into storage.buckets (id, name, public)
values ('sanction-documents', 'sanction-documents', false)
on conflict (id) do nothing;