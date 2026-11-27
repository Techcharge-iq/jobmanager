DROP POLICY IF EXISTS "Authenticated users view job images" ON storage.objects;
CREATE POLICY "Active staff view job images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-order-images' AND public.is_active_staff(auth.uid()));