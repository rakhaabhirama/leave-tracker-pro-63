-- Add jabatan column to employees table
ALTER TABLE public.employees 
ADD COLUMN jabatan character varying NOT NULL DEFAULT 'JFU';