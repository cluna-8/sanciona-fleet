CREATE POLICY "sanction_docs_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sanction-documents' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND owner = auth.uid())
WITH CHECK (bucket_id = 'sanction-documents' AND public.is_org_member(((storage.foldername(name))[1])::uuid) AND owner = auth.uid());