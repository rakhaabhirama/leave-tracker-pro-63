import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Year } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Calendar, Trash2 } from 'lucide-react';

interface YearSelectorProps {
  years: Year[];
  selectedYear: number | null;
  onYearChange: (year: number) => void;
  onYearAdded: () => void;
}

const YearSelector = ({ years, selectedYear, onYearChange, onYearAdded }: YearSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleAddYear = async () => {
    if (years.some(y => y.year === newYear)) {
      toast({
        title: "Error",
        description: `Tahun ${newYear} sudah ada`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Insert new year
      const { error: yearError } = await supabase
        .from('years')
        .insert({ year: newYear });

      if (yearError) throw yearError;

      // Find the closest previous year that has data
      const sortedYears = [...years].sort((a, b) => b.year - a.year);
      const previousYear = sortedYears.find(y => y.year < newYear);

      let copiedCount = 0;
      if (previousYear) {
        // Get employees from previous year
        const { data: prevEmployees, error: fetchError } = await supabase
          .from('employees')
          .select('nama, nip, departemen, sisa_cuti')
          .eq('year', previousYear.year);

        if (fetchError) throw fetchError;

        if (prevEmployees && prevEmployees.length > 0) {
          copiedCount = prevEmployees.length;
          // Copy employees to new year with reset sisa_cuti to 12
          const newEmployees = prevEmployees.map(emp => ({
            nama: emp.nama,
            nip: emp.nip,
            departemen: emp.departemen,
            sisa_cuti: 12,
            year: newYear
          }));

          const { error: insertError } = await supabase
            .from('employees')
            .insert(newEmployees);

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Berhasil",
        description: `Tahun ${newYear} berhasil ditambahkan${copiedCount > 0 ? ` dengan ${copiedCount} pegawai` : ''}`
      });
      setIsModalOpen(false);
      onYearAdded();
      onYearChange(newYear);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambah tahun",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!selectedYear || years.length <= 1) {
      toast({
        title: "Error",
        description: "Tidak dapat menghapus tahun terakhir",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      // First delete all employees for this year
      const { error: empError } = await supabase
        .from('employees')
        .delete()
        .eq('year', selectedYear);

      if (empError) throw empError;

      // Then delete the year
      const { error: yearError } = await supabase
        .from('years')
        .delete()
        .eq('year', selectedYear);

      if (yearError) throw yearError;

      toast({
        title: "Berhasil",
        description: `Tahun ${selectedYear} berhasil dihapus`
      });

      // Switch to another year
      const remainingYears = years.filter(y => y.year !== selectedYear);
      if (remainingYears.length > 0) {
        const sortedRemaining = remainingYears.sort((a, b) => b.year - a.year);
        onYearChange(sortedRemaining[0].year);
      }
      
      setIsDeleteDialogOpen(false);
      onYearAdded(); // Refresh years list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus tahun",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={selectedYear?.toString() || ''} 
        onValueChange={(v) => onYearChange(parseInt(v))}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Pilih Tahun" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.id} value={y.year.toString()}>
              {y.year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsModalOpen(true)}
        title="Tambah Tahun Baru"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsDeleteDialogOpen(true)}
        title="Hapus Tahun"
        disabled={years.length <= 1}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Add Year Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Tahun Baru</DialogTitle>
            <DialogDescription>
              Data pegawai akan di-copy dari tahun sebelumnya dengan sisa cuti di-reset ke 12 hari.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              min={2020}
              max={2100}
              value={newYear}
              onChange={(e) => setNewYear(parseInt(e.target.value) || new Date().getFullYear())}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddYear} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tambah
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Year Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tahun {selectedYear}?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua data pegawai dan riwayat cuti pada tahun {selectedYear} akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteYear}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default YearSelector;
