import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Employee, LeaveHistory, LeaveYearSettings, sortEmployeesByJabatan } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users, LogOut, Plus, Search,
  Edit, Trash2, History, FileDown, Loader2, CalendarPlus, CalendarMinus,
  UserCheck, UserX, AlertTriangle, TrendingUp, Calendar
} from 'lucide-react';
import EmployeeModal from '@/components/EmployeeModal';
import LeaveModal from '@/components/LeaveModal';
import HistoryModal from '@/components/HistoryModal';
import YearManager from '@/components/YearManager';
import { exportToExcel } from '@/lib/export';
import { exportEmployeeToDocx } from '@/lib/exportDocx';
import ImigrasiLogo from '@/components/ImigrasiLogo';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';

const Dashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [yearSettings, setYearSettings] = useState<LeaveYearSettings | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Track employees who are currently on leave (based on date range)
  const [onLeaveEmployeeIds, setOnLeaveEmployeeIds] = useState<Set<string>>(new Set());

  // Modals
  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; employee?: Employee }>({ open: false });
  const [leaveModal, setLeaveModal] = useState<{ open: boolean; employee?: Employee; type?: 'tambah' | 'kurang' }>({ open: false });
  const [historyModal, setHistoryModal] = useState<{ open: boolean; employee?: Employee; history: LeaveHistory[] }>({ open: false, history: [] });

  const currentYear = yearSettings?.current_year || new Date().getFullYear();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast({
          title: "Akses Ditolak",
          description: "Anda tidak memiliki akses admin.",
          variant: "destructive"
        });
        signOut();
        navigate('/auth');
      }
    }
  }, [user, isAdmin, loading, navigate, signOut, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchYearSettings();
      fetchEmployees();
    }
  }, [isAdmin]);

  // Real-time subscription for leave status
  useEffect(() => {
    const channel = supabase
      .channel('leave-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_history'
        },
        () => {
          fetchOnLeaveStatus();
          fetchEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check leave status periodically (every minute) for auto-update
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOnLeaveStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = employees;
    
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.nip.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (leaveStatusFilter === 'cuti') {
      filtered = filtered.filter(emp => onLeaveEmployeeIds.has(emp.id));
    } else if (leaveStatusFilter === 'tidak_cuti') {
      filtered = filtered.filter(emp => !onLeaveEmployeeIds.has(emp.id));
    } else if (leaveStatusFilter === 'hampir_habis') {
      // Cuti hampir habis: total < 3 hari
      filtered = filtered.filter(emp => 
        (emp.sisa_cuti_tahun_lalu + emp.sisa_cuti_tahun_ini) < 3
      );
    }
    
    setFilteredEmployees(filtered);
  }, [employees, searchQuery, leaveStatusFilter, onLeaveEmployeeIds]);

  const fetchYearSettings = async () => {
    const { data, error } = await supabase
      .from('leave_year_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil pengaturan tahun",
        variant: "destructive"
      });
    } else if (data) {
      setYearSettings(data as LeaveYearSettings);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*');

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil data pegawai",
        variant: "destructive"
      });
    } else {
      // Sort by jabatan hierarchy then by name
      const sortedEmployees = sortEmployeesByJabatan((data || []) as Employee[]);
      setEmployees(sortedEmployees);
    }
    setIsLoading(false);
    fetchOnLeaveStatus();
  };

  const fetchOnLeaveStatus = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Get all leave records (kurang) where today is between tanggal_mulai and tanggal_selesai
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_history')
      .select('employee_id')
      .eq('jenis', 'kurang')
      .lte('tanggal_mulai', today)
      .gte('tanggal_selesai', today);

    if (leaveError || !leaveData) return;

    // Get all cancellation records (tambah) where today is within the cancelled period
    const { data: cancelData, error: cancelError } = await supabase
      .from('leave_history')
      .select('employee_id')
      .eq('jenis', 'tambah')
      .lte('tanggal_mulai', today)
      .gte('tanggal_selesai', today);

    if (cancelError) return;

    const cancelledIds = new Set((cancelData || []).map(item => item.employee_id));

    // Employee is on leave only if they have a leave record for today AND no cancellation for today
    const onLeaveIds = new Set(
      leaveData
        .filter(item => !cancelledIds.has(item.employee_id))
        .map(item => item.employee_id)
    );

    setOnLeaveEmployeeIds(onLeaveIds);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pegawai ini?')) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus pegawai",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Pegawai berhasil dihapus"
      });
      fetchEmployees();
    }
  };

  const handleViewHistory = async (employee: Employee) => {
    const { data, error } = await supabase
      .from('leave_history')
      .select('*')
      .eq('employee_id', employee.id)
      .order('tanggal', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil riwayat cuti",
        variant: "destructive"
      });
    } else {
      setHistoryModal({ open: true, employee, history: (data || []) as LeaveHistory[] });
    }
  };

  const handleExportEmployees = () => {
    const exportData = filteredEmployees.map((emp, index) => ({
      No: index + 1,
      NIP: emp.nip,
      Nama: emp.nama,
      Jabatan: emp.jabatan,
      Status: onLeaveEmployeeIds.has(emp.id) ? 'Sedang Cuti' : 'Aktif',
      [`Sisa Cuti ${currentYear - 1}`]: emp.sisa_cuti_tahun_lalu,
      [`Sisa Cuti ${currentYear}`]: emp.sisa_cuti_tahun_ini,
      'Total Sisa Cuti': emp.sisa_cuti_tahun_lalu + emp.sisa_cuti_tahun_ini,
    }));
    exportToExcel(exportData, `data-pegawai-${currentYear}`);
    toast({
      title: "Berhasil",
      description: "Data pegawai berhasil diekspor"
    });
  };

  const handleExportHistory = async () => {
    const { data, error } = await supabase
      .from('leave_history')
      .select(`
        *,
        employees(nama, nip)
      `)
      .order('tanggal', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengekspor riwayat",
        variant: "destructive"
      });
    } else {
      const exportData = (data || []).map((item: any) => ({
        Nama: item.employees?.nama || '-',
        NIP: item.employees?.nip || '-',
        'Tanggal Pengajuan': new Date(item.tanggal).toLocaleDateString('id-ID'),
        'Tanggal Mulai': item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID') : '-',
        'Tanggal Selesai': item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID') : '-',
        Jenis: item.jenis === 'tambah' ? 'Penambahan' : 'Pengambilan',
        Jumlah: item.jumlah,
        Keterangan: item.keterangan
      }));
      exportToExcel(exportData, 'riwayat-cuti');
      toast({
        title: "Berhasil",
        description: "Riwayat cuti berhasil diekspor"
      });
    }
  };

  const handleLeaveSuccess = () => {
    fetchEmployees();
    fetchOnLeaveStatus();
  };

  const handleExportEmployeeDocx = async (employee: Employee) => {
    const { data, error } = await supabase
      .from('leave_history')
      .select('*')
      .eq('employee_id', employee.id)
      .order('tanggal', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil riwayat cuti",
        variant: "destructive"
      });
      return;
    }

    try {
      await exportEmployeeToDocx(employee, (data || []) as LeaveHistory[], currentYear);
      toast({
        title: "Berhasil",
        description: `Data ${employee.nama} berhasil diekspor ke DOCX`
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Gagal mengekspor data",
        variant: "destructive"
      });
    }
  };

  const totalEmployees = employees.length;
  const onLeaveCount = onLeaveEmployeeIds.size;
  const lowLeaveCount = employees.filter(e => (e.sisa_cuti_tahun_lalu + e.sisa_cuti_tahun_ini) < 3).length;
  const activeCount = totalEmployees - onLeaveCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Mengalihkan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <div className="flex-shrink-0 p-2 rounded-xl bg-background/50 border border-border/50">
                <ImigrasiLogo size="sm" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-bold truncate font-baskerville text-golden">MACAN</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">Kantor Imigrasi Kelas I TPI Palembang</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="text-xs md:text-sm bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
              >
                <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Year Manager */}
        <div className="flex items-center justify-between">
          <YearManager
            settings={yearSettings}
            onYearChanged={() => {
              fetchYearSettings();
              fetchEmployees();
            }}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Pegawai</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground mt-1">pegawai terdaftar</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-success/5 hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Aktif</CardTitle>
              <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-success">{activeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">sedang bertugas</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-warning/5 hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Sedang Cuti</CardTitle>
              <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                <Calendar className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-warning">{onLeaveCount}</div>
              <p className="text-xs text-muted-foreground mt-1">berdasarkan periode</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-destructive/5 hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Cuti Hampir Habis</CardTitle>
              <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-destructive">{lowLeaveCount}</div>
              <p className="text-xs text-muted-foreground mt-1">sisa &lt; 3 hari</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau NIP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-64 bg-background/50 border-border/50 focus:bg-background transition-colors"
                  />
                </div>
                <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-background/50 border-border/50">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="cuti">Sedang Cuti</SelectItem>
                    <SelectItem value="tidak_cuti">Tidak Cuti</SelectItem>
                    <SelectItem value="hampir_habis">Cuti Hampir Habis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <Button 
                  onClick={() => setEmployeeModal({ open: true })} 
                  className="flex-1 lg:flex-none shadow-md hover:shadow-lg transition-shadow"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pegawai
                </Button>
                <Button variant="outline" onClick={handleExportEmployees} className="bg-background/50 hover:bg-background">
                  <FileDown className="h-4 w-4 mr-2" />
                  Ekspor
                </Button>
                <Button variant="outline" onClick={handleExportHistory} className="bg-background/50 hover:bg-background">
                  <History className="h-4 w-4 mr-2" />
                  Ekspor Riwayat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Data Pegawai
                </CardTitle>
                <CardDescription>
                  {filteredEmployees.length} dari {employees.length} pegawai ditampilkan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Memuat data...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {employees.length === 0 ? 'Belum ada data pegawai' : 'Tidak ada hasil pencarian'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/30">
                      <TableHead className="w-16 text-center font-semibold">No</TableHead>
                      <TableHead className="font-semibold">NIP</TableHead>
                      <TableHead className="font-semibold">Nama</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-center font-semibold">Cuti {currentYear - 1}</TableHead>
                      <TableHead className="text-center font-semibold">Cuti {currentYear}</TableHead>
                      <TableHead className="text-center font-semibold">Total</TableHead>
                      <TableHead className="text-right font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee, index) => {
                      const isOnLeave = onLeaveEmployeeIds.has(employee.id);
                      const totalCuti = employee.sisa_cuti_tahun_lalu + employee.sisa_cuti_tahun_ini;
                      const isLowLeave = totalCuti < 3;
                      return (
                        <TableRow 
                          key={employee.id} 
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{employee.nip}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleExportEmployeeDocx(employee)}
                              className="font-medium text-primary hover:text-primary/80 hover:underline cursor-pointer text-left transition-colors"
                              title="Klik untuk download DOCX"
                            >
                              {employee.nama}
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            {isOnLeave ? (
                              <Badge variant="destructive" className="gap-1 shadow-sm">
                                <UserX className="h-3 w-3" />
                                Cuti
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20 shadow-sm">
                                <UserCheck className="h-3 w-3" />
                                Aktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded-md text-sm ${employee.sisa_cuti_tahun_lalu === 0 ? 'text-muted-foreground bg-muted/30' : 'bg-primary/10 text-primary'}`}>
                              {employee.sisa_cuti_tahun_lalu} hari
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 rounded-md text-sm bg-primary/10 text-primary">
                              {employee.sisa_cuti_tahun_ini} hari
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${isLowLeave ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                              {totalCuti} hari
                              {isLowLeave && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLeaveModal({ open: true, employee, type: 'tambah' })}
                                title="Tambah Cuti"
                                className="hover:bg-success/10 hover:text-success"
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLeaveModal({ open: true, employee, type: 'kurang' })}
                                title="Ambil Cuti"
                                className="hover:bg-warning/10 hover:text-warning"
                              >
                                <CalendarMinus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewHistory(employee)}
                                title="Lihat Riwayat"
                                className="hover:bg-primary/10 hover:text-primary"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEmployeeModal({ open: true, employee })}
                                title="Edit Pegawai"
                                className="hover:bg-primary/10 hover:text-primary"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEmployee(employee.id)}
                                title="Hapus Pegawai"
                                className="hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      <EmployeeModal
        open={employeeModal.open}
        employee={employeeModal.employee}
        currentYear={currentYear}
        onClose={() => setEmployeeModal({ open: false })}
        onSuccess={fetchEmployees}
      />
      <LeaveModal
        open={leaveModal.open}
        employee={leaveModal.employee}
        type={leaveModal.type}
        currentYear={currentYear}
        onClose={() => setLeaveModal({ open: false })}
        onSuccess={handleLeaveSuccess}
      />
      <HistoryModal
        open={historyModal.open}
        employee={historyModal.employee}
        history={historyModal.history}
        onClose={() => setHistoryModal({ open: false, history: [] })}
      />
    </div>
  );
};

export default Dashboard;
