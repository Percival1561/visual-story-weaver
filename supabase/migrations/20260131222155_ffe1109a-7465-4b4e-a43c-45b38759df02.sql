-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true);

-- Allow public read access to generated images
CREATE POLICY "Public read access for generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Allow public insert access (since no auth yet)
CREATE POLICY "Public insert access for generated images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images');

-- Create gallery table to store image metadata
CREATE TABLE public.gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access for gallery"
ON public.gallery FOR SELECT
USING (true);

-- Allow public insert access (no auth yet)
CREATE POLICY "Public insert access for gallery"
ON public.gallery FOR INSERT
WITH CHECK (true);