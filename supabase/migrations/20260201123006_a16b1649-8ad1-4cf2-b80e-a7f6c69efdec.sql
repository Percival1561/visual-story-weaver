-- Create table to track daily image generations per user
CREATE TABLE public.daily_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, generation_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own generation counts
CREATE POLICY "Users can view their own generation counts"
ON public.daily_generations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own generation records
CREATE POLICY "Users can insert their own generation records"
ON public.daily_generations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own generation records
CREATE POLICY "Users can update their own generation records"
ON public.daily_generations
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_daily_generations_user_date ON public.daily_generations(user_id, generation_date);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_daily_generations_updated_at
BEFORE UPDATE ON public.daily_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();