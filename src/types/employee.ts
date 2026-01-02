export interface Employee {
  id: string;
  nip: string;
  nama: string;
  departemen: string;
  sisa_cuti_tahun_lalu: number;
  sisa_cuti_tahun_ini: number;
  created_at: string;
  updated_at: string;
}

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
