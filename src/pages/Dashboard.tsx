import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Employee, LeaveHistory, LeaveYearSettings, sortEmployeesByJabatan } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users, LogOut, Plus, Search,
  Edit, Trash2, History, FileDown, Loader2, CalendarPlus, CalendarMinus,
  UserCheck, UserX, AlertTriangle, Calendar, BookOpen, Download, MoreHorizontal
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-golden/15 via-golden/5 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-success/15 via-success/5 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-golden/20 to-golden/5 border border-golden/20 shadow-lg shadow-golden/5">
                  <ImigrasiLogo size="sm" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold font-baskerville text-golden tracking-wide">MACAN</h1>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Kantor Imigrasi Kelas I TPI Palembang</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/panduan">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/5">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Panduan</span>
                </Button>
              </Link>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
                className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 relative">
        {/* Year Manager */}
        <div className="flex items-center justify-between animate-fade-in">
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
          {[
            { title: 'Total Pegawai', value: totalEmployees, subtitle: 'pegawai terdaftar', icon: Users, color: 'primary' },
            { title: 'Aktif', value: activeCount, subtitle: 'sedang bertugas', icon: UserCheck, color: 'success' },
            { title: 'Sedang Cuti', value: onLeaveCount, subtitle: 'berdasarkan periode', icon: Calendar, color: 'warning' },
            { title: 'Cuti Hampir Habis', value: lowLeaveCount, subtitle: 'sisa < 3 hari', icon: AlertTriangle, color: 'destructive' },
          ].map((stat, index) => (
            <Card 
              key={stat.title}
              className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 group animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />
              <div className={`absolute bottom-0 left-0 w-20 h-20 bg-${stat.color}/5 rounded-full -ml-10 -mb-10 group-hover:scale-150 transition-transform duration-700`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2.5 rounded-xl bg-${stat.color}/10 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-4 w-4 text-${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className={`text-3xl md:text-4xl font-bold text-${stat.color} group-hover:scale-105 transition-transform duration-300 origin-left`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions & Filters */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Cari nama atau NIP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-64 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-all duration-300"
                  />
                </div>
                <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-background/50 border-border/50 focus:border-primary">
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
                  className="flex-1 lg:flex-none gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Pegawai
                </Button>
                <Button variant="outline" onClick={handleExportEmployees} className="gap-2 border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                  <FileDown className="h-4 w-4" />
                  Ekspor
                </Button>
                <Button variant="outline" onClick={handleExportHistory} className="gap-2 border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300">
                  <History className="h-4 w-4" />
                  Ekspor Riwayat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Cards Grid */}
        <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Data Pegawai</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredEmployees.length} dari {employees.length} pegawai ditampilkan
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Memuat data...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="py-20">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-4">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    {employees.length === 0 ? 'Belum ada data pegawai' : 'Tidak ada hasil pencarian'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {employees.length === 0 ? 'Tambahkan pegawai pertama Anda' : 'Coba ubah kata kunci pencarian'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEmployees.map((employee, index) => {
                const isOnLeave = onLeaveEmployeeIds.has(employee.id);
                const totalCuti = employee.sisa_cuti_tahun_lalu + employee.sisa_cuti_tahun_ini;
                const isLowLeave = totalCuti < 3;
                const cutiPercentage = Math.min((totalCuti / 24) * 100, 100);
                
                return (
                  <Card 
                    key={employee.id}
                    className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-fade-in-up"
                    style={{ animationDelay: `${(index % 6) * 50}ms` }}
                  >
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isOnLeave ? 'bg-gradient-to-r from-warning to-warning/50' : 'bg-gradient-to-r from-success to-success/50'}`} />
                    
                    {/* Background decoration */}
                    <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full ${isLowLeave ? 'bg-destructive/5' : 'bg-primary/5'} group-hover:scale-150 transition-transform duration-700`} />
                    
                    <CardContent className="p-5 relative">
                      {/* Header with name and status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                              #{index + 1}
                            </span>
                            {isOnLeave ? (
                              <Badge className="gap-1 bg-warning/15 text-warning border-warning/30 text-xs animate-pulse-soft">
                                <UserX className="h-3 w-3" />
                                Cuti
                              </Badge>
                            ) : (
                              <Badge className="gap-1 bg-success/15 text-success border-success/30 text-xs">
                                <UserCheck className="h-3 w-3" />
                                Aktif
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => handleExportEmployeeDocx(employee)}
                            className="font-semibold text-foreground hover:text-primary transition-colors text-left group/name flex items-center gap-1"
                            title="Klik untuk download DOCX"
                          >
                            <span className="truncate">{employee.nama}</span>
                            <Download className="h-3 w-3 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                          </button>
                          <p className="text-sm text-muted-foreground font-mono">{employee.nip}</p>
                        </div>
                      </div>

                      {/* Leave balance section */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sisa Cuti</span>
                          <span className={`font-bold ${isLowLeave ? 'text-destructive' : 'text-success'}`}>
                            {totalCuti} hari
                            {isLowLeave && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div 
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                              isLowLeave 
                                ? 'bg-gradient-to-r from-destructive to-destructive/70' 
                                : 'bg-gradient-to-r from-success to-success/70'
                            }`}
                            style={{ width: `${cutiPercentage}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-muted" />
                            <span>{currentYear - 1}: {employee.sisa_cuti_tahun_lalu} hari</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <span>{currentYear}: {employee.sisa_cuti_tahun_ini} hari</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 pt-3 border-t border-border/50">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLeaveModal({ open: true, employee, type: 'tambah' })}
                              className="flex-1 h-9 gap-1.5 hover:bg-success/10 hover:text-success transition-all duration-300"
                            >
                              <CalendarPlus className="h-4 w-4" />
                              <span className="hidden sm:inline text-xs">Tambah</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Tambah Cuti (Pembatalan)</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLeaveModal({ open: true, employee, type: 'kurang' })}
                              className="flex-1 h-9 gap-1.5 hover:bg-warning/10 hover:text-warning transition-all duration-300"
                            >
                              <CalendarMinus className="h-4 w-4" />
                              <span className="hidden sm:inline text-xs">Ambil</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ambil Cuti</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewHistory(employee)}
                              className="flex-1 h-9 gap-1.5 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                            >
                              <History className="h-4 w-4" />
                              <span className="hidden sm:inline text-xs">Riwayat</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Lihat Riwayat</TooltipContent>
                        </Tooltip>
                        
                        <div className="w-px h-6 bg-border/50 mx-1" />
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEmployeeModal({ open: true, employee })}
                              className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Pegawai</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Hapus Pegawai</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
