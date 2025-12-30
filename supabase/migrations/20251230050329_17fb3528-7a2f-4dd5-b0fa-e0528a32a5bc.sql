-- Create years table to store available years
CREATE TABLE public.years (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;

-- RLS policies for years table
CREATE POLICY "Admins can view all years" 
ON public.years 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert years" 
ON public.years 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete years" 
ON public.years 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add year column to employees table
ALTER TABLE public.employees ADD COLUMN year INTEGER NOT NULL DEFAULT 2025;

-- Drop old year-specific columns since we now have a single year column
ALTER TABLE public.employees DROP COLUMN IF EXISTS sisa_cuti_2025;
ALTER TABLE public.employees DROP COLUMN IF EXISTS sisa_cuti_2026;

-- Add single sisa_cuti column
ALTER TABLE public.employees ADD COLUMN sisa_cuti INTEGER NOT NULL DEFAULT 12;

-- Insert existing years
INSERT INTO public.years (year) VALUES (2025), (2026) ON CONFLICT (year) DO NOTHING;