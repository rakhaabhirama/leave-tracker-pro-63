export interface Employee {
  id: string;
  nip: string;
  nama: string;
  departemen: string;
  jabatan: string;
  sisa_cuti: number;
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
