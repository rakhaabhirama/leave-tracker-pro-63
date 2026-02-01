import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import ImigrasiLogo from '@/components/ImigrasiLogo';
import {
  ArrowLeft,
  Plus,
  CalendarPlus,
  CalendarMinus,
  History,
  Edit,
  Trash2,
  FileDown,
  Search,
  Users,
  Calendar,
  Moon,
  Sun,
  BookOpen
} from 'lucide-react';

interface GuideItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  steps?: string[];
}

const guideItems: GuideItem[] = [
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Tambah Pegawai",
    description: "Menambahkan data pegawai baru ke dalam sistem.",
    steps: [
      "Klik tombol 'Tambah Pegawai' pada bagian atas tabel",
      "Isi form dengan data pegawai (NIP, Nama, Jabatan, Departemen)",
      "Tentukan sisa cuti tahun lalu dan tahun ini",
      "Klik 'Simpan' untuk menyimpan data pegawai"
    ]
  },
  {
    icon: <CalendarPlus className="h-5 w-5" />,
    title: "Tambah Cuti (Pembatalan)",
    description: "Mengembalikan saldo cuti pegawai karena pembatalan cuti yang telah diajukan.",
    steps: [
      "Pada kolom 'Aksi', klik ikon kalender dengan tanda plus",
      "Pilih tanggal mulai dan tanggal selesai periode yang ingin dibatalkan",
      "Sistem akan memvalidasi apakah periode tersebut termasuk dalam pengajuan cuti yang aktif",
      "Jika valid, saldo cuti akan dikembalikan sesuai jumlah hari kerja (Senin-Jumat)",
      "Tambahkan keterangan untuk dokumentasi"
    ]
  },
  {
    icon: <CalendarMinus className="h-5 w-5" />,
    title: "Ambil Cuti",
    description: "Mencatat pengambilan cuti oleh pegawai.",
    steps: [
      "Pada kolom 'Aksi', klik ikon kalender dengan tanda minus",
      "Pilih tanggal mulai dan tanggal selesai cuti",
      "Sistem akan menghitung otomatis jumlah hari kerja (Sabtu-Minggu tidak terhitung)",
      "Saldo cuti akan berkurang dari tahun lalu terlebih dahulu, kemudian tahun ini",
      "Tambahkan keterangan untuk dokumentasi"
    ]
  },
  {
    icon: <History className="h-5 w-5" />,
    title: "Lihat Riwayat Cuti",
    description: "Melihat seluruh riwayat pengambilan dan pembatalan cuti pegawai.",
    steps: [
      "Pada kolom 'Aksi', klik ikon jam (History)",
      "Modal akan menampilkan tabel riwayat cuti pegawai tersebut",
      "Informasi meliputi: tanggal pengajuan, periode cuti, jenis (pengambilan/pembatalan), jumlah hari, dan keterangan"
    ]
  },
  {
    icon: <Edit className="h-5 w-5" />,
    title: "Edit Data Pegawai",
    description: "Mengubah informasi data pegawai yang sudah tersimpan.",
    steps: [
      "Pada kolom 'Aksi', klik ikon pensil (Edit)",
      "Ubah data yang diperlukan pada form yang muncul",
      "Klik 'Simpan' untuk menyimpan perubahan"
    ]
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Hapus Pegawai",
    description: "Menghapus data pegawai dari sistem secara permanen.",
    steps: [
      "Pada kolom 'Aksi', klik ikon tempat sampah (Hapus)",
      "Konfirmasi penghapusan pada dialog yang muncul",
      "Data pegawai beserta riwayat cutinya akan terhapus permanen"
    ]
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Pencarian & Filter",
    description: "Mencari dan memfilter data pegawai berdasarkan kriteria tertentu.",
    steps: [
      "Gunakan kolom pencarian untuk mencari berdasarkan nama atau NIP",
      "Gunakan dropdown filter untuk memfilter berdasarkan status:",
      "- Semua Status: Menampilkan semua pegawai",
      "- Sedang Cuti: Pegawai yang sedang dalam periode cuti",
      "- Tidak Cuti: Pegawai yang aktif bertugas",
      "- Cuti Hampir Habis: Pegawai dengan sisa cuti < 3 hari"
    ]
  },
  {
    icon: <FileDown className="h-5 w-5" />,
    title: "Ekspor Data",
    description: "Mengunduh data pegawai atau riwayat cuti dalam format file.",
    steps: [
      "Klik 'Ekspor' untuk mengunduh data pegawai dalam format Excel",
      "Klik 'Ekspor Riwayat' untuk mengunduh seluruh riwayat cuti dalam format Excel",
      "Klik nama pegawai pada tabel untuk mengunduh data individual dalam format DOCX"
    ]
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Manajemen Tahun",
    description: "Mengatur periode tahun untuk pengelolaan data cuti.",
    steps: [
      "Gunakan kontrol tahun di bagian atas dashboard",
      "Sesuaikan tahun aktif sesuai periode pengelolaan cuti",
      "Data cuti akan dikelompokkan berdasarkan tahun yang dipilih"
    ]
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Status Pegawai",
    description: "Memahami indikator status pegawai pada dashboard.",
    steps: [
      "Badge 'Aktif' (hijau): Pegawai sedang bertugas (tidak dalam periode cuti)",
      "Badge 'Cuti' (kuning/oranye): Pegawai sedang dalam periode cuti aktif",
      "Indikator peringatan merah pada 'Total': Sisa cuti pegawai kurang dari 3 hari"
    ]
  },
  {
    icon: <Sun className="h-5 w-5" />,
    title: "Pengaturan Tema",
    description: "Mengubah tampilan antara mode terang dan gelap.",
    steps: [
      "Klik ikon matahari/bulan pada bagian header",
      "Pilih antara tema terang, gelap, atau mengikuti sistem",
      "Tampilan akan berubah sesuai preferensi yang dipilih"
    ]
  }
];

const Panduan = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-golden/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-success/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Kembali</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-golden/20 to-golden/5 border border-golden/20">
                  <ImigrasiLogo size="sm" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold font-baskerville text-golden tracking-wide">MACAN</h1>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Panduan Penggunaan</p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Panduan Penggunaan
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Panduan lengkap untuk menggunakan fitur-fitur pada sistem MACAN. 
            Klik setiap kartu untuk melihat langkah-langkah penggunaan secara detail.
          </p>
        </div>

        {/* Guide Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guideItems.map((item, index) => (
            <Card 
              key={index} 
              className="group border-border/50 bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {item.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {item.steps && (
                <CardContent className="pt-0">
                  <div className="border-t border-border/50 pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Langkah-langkah:
                    </p>
                    <ol className="space-y-2">
                      {item.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex gap-3 text-sm">
                          {step.startsWith('-') ? (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{step.substring(2)}</span>
                            </>
                          ) : (
                            <>
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                {stepIndex + 1}
                              </span>
                              <span className="text-foreground">{step}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <Card className="mt-8 border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Catatan Penting</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Sistem menghitung hari kerja secara otomatis (Senin-Jumat), hari Sabtu dan Minggu tidak dihitung sebagai cuti.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Pengambilan cuti akan mengurangi saldo dari tahun sebelumnya terlebih dahulu sebelum tahun berjalan.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Pembatalan cuti hanya dapat dilakukan pada periode yang memiliki pengajuan cuti aktif.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Status pegawai akan otomatis berubah berdasarkan periode cuti yang terdaftar.</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Link to="/dashboard">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Panduan;
