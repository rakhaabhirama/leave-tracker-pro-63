-- Add new columns for sisa_cuti_2025 and sisa_cuti_2026
ALTER TABLE public.employees 
ADD COLUMN sisa_cuti_2025 integer NOT NULL DEFAULT 12,
ADD COLUMN sisa_cuti_2026 integer NOT NULL DEFAULT 12;

-- Migrate existing sisa_cuti data to sisa_cuti_2025
UPDATE public.employees SET sisa_cuti_2025 = sisa_cuti;

-- Drop the old sisa_cuti column
ALTER TABLE public.employees DROP COLUMN sisa_cuti;

-- Drop the jabatan column
ALTER TABLE public.employees DROP COLUMN jabatan;