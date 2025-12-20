import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Employee, LeaveHistory } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, CalendarDays, LogOut, Plus, Search, 
  Edit, Trash2, History, FileDown, Loader2, CalendarPlus, CalendarMinus
} from 'lucide-react';
import EmployeeModal from '@/components/EmployeeModal';
import LeaveModal from '@/components/LeaveModal';
import HistoryModal from '@/components/HistoryModal';
import { exportToExcel } from '@/lib/export';
import ImigrasiLogo from '@/components/ImigrasiLogo';

const Dashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; employee?: Employee }>({ open: false });
  const [leaveModal, setLeaveModal] = useState<{ open: boolean; employee?: Employee; type?: 'tambah' | 'kurang' }>({ open: false });
  const [historyModal, setHistoryModal] = useState<{ open: boolean; employee?: Employee; history: LeaveHistory[] }>({ open: false, history: [] });

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
      fetchEmployees();
    }
  }, [isAdmin]);

  useEffect(() => {
    let filtered = employees;
    
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.nip.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.departemen === departmentFilter);
    }
    
    setFilteredEmployees(filtered);
  }, [employees, searchQuery, departmentFilter]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('nama');

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil data pegawai",
        variant: "destructive"
      });
    } else {
      setEmployees(data || []);
      const uniqueDepts = [...new Set((data || []).map(e => e.departemen))];
      setDepartments(uniqueDepts);
    }
    setIsLoading(false);
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
    exportToExcel(filteredEmployees, 'data-pegawai');
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
        Tanggal: new Date(item.tanggal).toLocaleDateString('id-ID'),
        Jenis: item.jenis === 'tambah' ? 'Penambahan' : 'Pengurangan',
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

  const totalEmployees = employees.length;
  const avgLeave = employees.length > 0 
    ? Math.round(employees.reduce((sum, e) => sum + e.sisa_cuti, 0) / employees.length) 
    : 0;
  const lowLeaveCount = employees.filter(e => e.sisa_cuti <= 3).length;

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <p className="text-xs text-muted-foreground">Kemenkumham RI</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Sisa Cuti</CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgLeave} hari</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cuti Hampir Habis</CardTitle>
              <CalendarMinus className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowLeaveCount}</div>
              <p className="text-xs text-muted-foreground">Sisa cuti ≤ 3 hari</p>
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
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter Departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setEmployeeModal({ open: true })} className="flex-1 sm:flex-none">
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
                      <TableHead>NIP</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead className="text-center">Sisa Cuti</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-mono">{employee.nip}</TableCell>
                        <TableCell className="font-medium">{employee.nama}</TableCell>
                        <TableCell>{employee.departemen}</TableCell>
                        <TableCell>{employee.jabatan}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            employee.sisa_cuti <= 3 
                              ? 'bg-destructive/10 text-destructive' 
                              : employee.sisa_cuti <= 6 
                                ? 'bg-warning/10 text-warning' 
                                : 'bg-success/10 text-success'
                          }`}>
                            {employee.sisa_cuti} hari
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
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
                              title="Kurangi Cuti"
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
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEmployee(employee.id)}
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
        onClose={() => setEmployeeModal({ open: false })}
        onSuccess={fetchEmployees}
      />
      <LeaveModal
        open={leaveModal.open}
        employee={leaveModal.employee}
        type={leaveModal.type}
        onClose={() => setLeaveModal({ open: false })}
        onSuccess={fetchEmployees}
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
