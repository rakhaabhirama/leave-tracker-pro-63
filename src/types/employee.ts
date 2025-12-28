export interface Employee {
  id: string;
  nip: string;
  nama: string;
  departemen: string;
  sisa_cuti_2025: number;
  sisa_cuti_2026: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveHistory {
  id: string;
  employee_id: string;
  tanggal: string;
  jenis: 'tambah' | 'kurang';
  jumlah: number;
  keterangan: string;
  admin_id: string;
  created_at: string;
}
