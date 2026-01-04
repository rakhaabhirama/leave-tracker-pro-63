import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Employee, LeaveHistory, LeaveYearSettings, sortEmployeesByJabatan } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users, LogOut, Plus, Search,
  Edit, Trash2, History, FileDown, Loader2, CalendarPlus, CalendarMinus,
  UserCheck, UserX, AlertTriangle
} from 'lucide-react';
import EmployeeModal from '@/components/EmployeeModal';
import LeaveModal from '@/components/LeaveModal';
import HistoryModal from '@/components/HistoryModal';
import YearManager from '@/components/YearManager';
import { exportToExcel } from '@/lib/export';
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

    // Get all leave records where today is between tanggal_mulai and tanggal_selesai
    const { data, error } = await supabase
      .from('leave_history')
      .select('employee_id, tanggal_mulai, tanggal_selesai')
      .lte('tanggal_mulai', today)
      .gte('tanggal_selesai', today);

    if (error || !data) return;

    const onLeaveIds = new Set(data.map(item => item.employee_id));
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

  const totalEmployees = employees.length;
  const onLeaveCount = onLeaveEmployeeIds.size;
  const lowLeaveCount = employees.filter(e => (e.sisa_cuti_tahun_lalu + e.sisa_cuti_tahun_ini) < 3).length;

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImigrasiLogo size="sm" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Manajemen Cuti</h1>
              <p className="text-xs text-muted-foreground">Kementerian Imigrasi dan Pemasyarakatan RI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pegawai</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sedang Cuti</CardTitle>
              <UserX className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{onLeaveCount}</div>
              <p className="text-xs text-muted-foreground">Berdasarkan periode cuti</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cuti Hampir Habis</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowLeaveCount}</div>
              <p className="text-xs text-muted-foreground">Total sisa cuti &lt; 3 hari</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setEmployeeModal({ open: true })} 
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pegawai
            </Button>
            <Button variant="outline" onClick={handleExportEmployees}>
              <FileDown className="h-4 w-4 mr-2" />
              Ekspor
            </Button>
            <Button variant="outline" onClick={handleExportHistory}>
              <History className="h-4 w-4 mr-2" />
              Ekspor Riwayat
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {employees.length === 0 ? 'Belum ada data pegawai' : 'Tidak ada hasil pencarian'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">No</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Cuti {currentYear - 1}</TableHead>
                      <TableHead className="text-center">Cuti {currentYear}</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee, index) => {
                      const isOnLeave = onLeaveEmployeeIds.has(employee.id);
                      const totalCuti = employee.sisa_cuti_tahun_lalu + employee.sisa_cuti_tahun_ini;
                      const isLowLeave = totalCuti < 3;
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="text-center font-medium">{index + 1}</TableCell>
                          <TableCell className="font-mono">{employee.nip}</TableCell>
                          <TableCell className="font-medium">{employee.nama}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.jabatan}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {isOnLeave ? (
                              <Badge variant="destructive" className="gap-1">
                                <UserX className="h-3 w-3" />
                                Cuti
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <UserCheck className="h-3 w-3" />
                                Aktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={employee.sisa_cuti_tahun_lalu === 0 ? 'text-muted-foreground' : ''}>
                              {employee.sisa_cuti_tahun_lalu} hari
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {employee.sisa_cuti_tahun_ini} hari
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${isLowLeave ? 'text-destructive' : ''}`}>
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
                              >
                                <CalendarPlus className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLeaveModal({ open: true, employee, type: 'kurang' })}
                                title="Ambil Cuti"
                              >
                                <CalendarMinus className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewHistory(employee)}
                                title="Lihat Riwayat"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEmployeeModal({ open: true, employee })}
                                title="Edit Pegawai"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEmployee(employee.id)}
                                title="Hapus Pegawai"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
