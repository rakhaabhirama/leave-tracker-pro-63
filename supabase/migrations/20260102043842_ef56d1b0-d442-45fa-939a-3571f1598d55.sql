-- =============================================
-- Migration: Sistem Cuti Baru dengan 2 Kolom Tahun
-- =============================================

-- 1. Ubah tabel employees: hapus kolom year dan sisa_cuti, ganti dengan sisa_cuti_tahun_lalu dan sisa_cuti_tahun_ini
-- Pertama backup data yang ada
CREATE TEMP TABLE temp_employees AS SELECT * FROM public.employees;

-- Hapus kolom year dan sisa_cuti, tambah kolom baru
ALTER TABLE public.employees 
DROP COLUMN IF EXISTS year,
DROP COLUMN IF EXISTS sisa_cuti;

ALTER TABLE public.employees 
ADD COLUMN sisa_cuti_tahun_lalu integer NOT NULL DEFAULT 0,
ADD COLUMN sisa_cuti_tahun_ini integer NOT NULL DEFAULT 12;

-- Hapus constraint unique yang ada (jika ada) dan buat yang baru tanpa year
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_nip_year_key;

-- Buat unique constraint baru hanya untuk NIP
ALTER TABLE public.employees ADD CONSTRAINT employees_nip_unique UNIQUE (nip);

-- 2. Ubah tabel leave_history: tambah tanggal_mulai dan tanggal_selesai untuk tracking
ALTER TABLE public.leave_history 
ADD COLUMN IF NOT EXISTS tanggal_mulai date,
ADD COLUMN IF NOT EXISTS tanggal_selesai date;

-- 3. Buat tabel untuk tracking tahun saat ini (hanya 1 record)
CREATE TABLE IF NOT EXISTS public.leave_year_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    current_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_year_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_year_settings
CREATE POLICY "Admins can view leave_year_settings" 
ON public.leave_year_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update leave_year_settings" 
ON public.leave_year_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert leave_year_settings" 
ON public.leave_year_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.leave_year_settings (current_year) VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::integer);

-- 4. Hapus tabel years (tidak dibutuhkan lagi)
DROP TABLE IF EXISTS public.years CASCADE;

-- 5. Hapus data employees duplikat dan sisakan hanya yang terbaru per NIP
-- Kemudian restore dari temp dengan nilai default
DELETE FROM public.employees;

-- Insert unique employees dari temp (ambil yang paling baru per NIP)
INSERT INTO public.employees (id, nip, nama, departemen, sisa_cuti_tahun_lalu, sisa_cuti_tahun_ini, created_at, updated_at)
SELECT DISTINCT ON (nip) 
    gen_random_uuid(), 
    nip, 
    nama, 
    departemen, 
    0, -- sisa_cuti_tahun_lalu dimulai dari 0
    12, -- sisa_cuti_tahun_ini default 12
    created_at, 
    updated_at
FROM temp_employees
ORDER BY nip, updated_at DESC;

-- 6. Enable realtime untuk leave_history (untuk status cuti real-time)
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_history;