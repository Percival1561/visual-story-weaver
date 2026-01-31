-- Add user_id column to gallery table
ALTER TABLE public.gallery ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Public read access for gallery" ON public.gallery;
DROP POLICY IF EXISTS "Public insert access for gallery" ON public.gallery;

-- Create user-specific policies
CREATE POLICY "Users can view their own gallery"
ON public.gallery FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
ON public.gallery FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.gallery FOR DELETE
USING (auth.uid() = user_id);

-- Update storage policies for user-specific access
DROP POLICY IF EXISTS "Public insert access for generated images" ON storage.objects;

CREATE POLICY "Users can upload their images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their images"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-images' AND auth.uid() IS NOT NULL);