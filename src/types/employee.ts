export const JABATAN_OPTIONS = [
  'KAKANIM',
  'KASUBBAG', 
  'KASI',
  'KU',
  'KASUBSI',
  'JFT',
  'JFU',
  'P3K',
  'CPNS'
] as const;

export type Jabatan = typeof JABATAN_OPTIONS[number];

export interface Employee {
  id: string;
  nip: string;
  nama: string;
  jabatan: Jabatan;
  departemen: string;
  sisa_cuti_tahun_lalu: number;
  sisa_cuti_tahun_ini: number;
  created_at: string;
  updated_at: string;
}

// Helper function to sort employees by jabatan hierarchy then by name
export const sortEmployeesByJabatan = (employees: Employee[]): Employee[] => {
  return [...employees].sort((a, b) => {
    const indexA = JABATAN_OPTIONS.indexOf(a.jabatan);
    const indexB = JABATAN_OPTIONS.indexOf(b.jabatan);
    
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    
    return a.nama.localeCompare(b.nama, 'id');
  });
};

export interface LeaveHistory {
  id: string;
  employee_id: string;
  tanggal: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  jenis: 'tambah' | 'kurang';
  jumlah: number;
  keterangan: string;
  admin_id: string;
  created_at: string;
}

export interface LeaveYearSettings {
  id: string;
  current_year: number;
  created_at: string;
  updated_at: string;
}
