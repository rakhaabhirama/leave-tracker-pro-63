-- Add backup column for storing previous year's leave data (2 years ago)
ALTER TABLE public.employees 
ADD COLUMN sisa_cuti_tahun_sebelumnya integer DEFAULT 0;

-- Add backup column for future year's leave data (for revert to next year)
ALTER TABLE public.employees 
ADD COLUMN sisa_cuti_tahun_depan integer DEFAULT NULL;

-- Add column to store the backup year info in settings
ALTER TABLE public.leave_year_settings 
ADD COLUMN previous_year integer DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.employees.sisa_cuti_tahun_sebelumnya IS 'Backup sisa cuti 2 tahun lalu, untuk revert ke tahun sebelumnya';
COMMENT ON COLUMN public.employees.sisa_cuti_tahun_depan IS 'Backup sisa cuti tahun depan, untuk revert ke tahun sesudahnya';