import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeaveYearSettings } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Calendar, Undo2, Redo2 } from 'lucide-react';

interface YearManagerProps {
  settings: LeaveYearSettings | null;
  onYearChanged: () => void;
}

const YearManager = ({ settings, onYearChanged }: YearManagerProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRevertPrevModalOpen, setIsRevertPrevModalOpen] = useState(false);
  const [isRevertNextModalOpen, setIsRevertNextModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const currentYear = settings?.current_year || new Date().getFullYear();
  const previousYear = settings?.previous_year;
  const nextYear = currentYear + 1;

  // Check if revert to previous year is possible (previous_year exists)
  const canRevertToPrevious = previousYear !== null && previousYear !== undefined;

  // Check if revert to next year is possible (has backup data in sisa_cuti_tahun_depan)
  const [canRevertToNext, setCanRevertToNext] = useState(false);

  // Check on mount if we can revert to next
  const checkCanRevertToNext = async () => {
    const { data } = await supabase
      .from('employees')
      .select('sisa_cuti_tahun_depan')
      .not('sisa_cuti_tahun_depan', 'is', null)
      .limit(1);
    
    setCanRevertToNext(data && data.length > 0);
  };

  // Check on component mount
  useState(() => {
    checkCanRevertToNext();
  });

  const handleAddNewYear = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil semua pegawai
      const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('id, sisa_cuti_tahun_lalu, sisa_cuti_tahun_ini');

      if (fetchError) throw fetchError;

      // 2. Update setiap pegawai:
      // - sebelumnya = tahun_lalu (backup 2 tahun lalu)
      // - tahun_lalu = tahun_ini
      // - tahun_ini = 12
      // - tahun_depan = null (reset backup tahun depan)
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              sisa_cuti_tahun_sebelumnya: emp.sisa_cuti_tahun_lalu,
              sisa_cuti_tahun_lalu: emp.sisa_cuti_tahun_ini,
              sisa_cuti_tahun_ini: 12,
              sisa_cuti_tahun_depan: null
            })
            .eq('id', emp.id);

          if (updateError) throw updateError;
        }
      }

      // 3. Update settings: previous_year = current_year, current_year = nextYear
      const { error: settingsError } = await supabase
        .from('leave_year_settings')
        .update({ 
          previous_year: currentYear,
          current_year: nextYear 
        })
        .eq('id', settings?.id);

      if (settingsError) throw settingsError;

      toast({
        title: "Berhasil",
        description: `Tahun cuti berhasil diubah ke ${nextYear}. Semua pegawai mendapat jatah cuti baru 12 hari.`
      });

      setIsAddModalOpen(false);
      onYearChanged();
      checkCanRevertToNext();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambah tahun baru",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToPrevious = async () => {
    if (!previousYear) return;
    
    setIsLoading(true);
    try {
      // 1. Ambil semua pegawai
      const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('id, sisa_cuti_tahun_sebelumnya, sisa_cuti_tahun_lalu, sisa_cuti_tahun_ini');

      if (fetchError) throw fetchError;

      // 2. Revert setiap pegawai:
      // - tahun_depan = tahun_ini (backup tahun yang akan dihapus)
      // - tahun_ini = tahun_lalu
      // - tahun_lalu = sebelumnya
      // - sebelumnya = 0 (sudah tidak ada backup lagi)
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              sisa_cuti_tahun_depan: emp.sisa_cuti_tahun_ini,
              sisa_cuti_tahun_ini: emp.sisa_cuti_tahun_lalu,
              sisa_cuti_tahun_lalu: emp.sisa_cuti_tahun_sebelumnya,
              sisa_cuti_tahun_sebelumnya: 0
            })
            .eq('id', emp.id);

          if (updateError) throw updateError;
        }
      }

      // 3. Update settings: current_year = previous_year, previous_year = null
      const { error: settingsError } = await supabase
        .from('leave_year_settings')
        .update({ 
          current_year: previousYear,
          previous_year: null
        })
        .eq('id', settings?.id);

      if (settingsError) throw settingsError;

      toast({
        title: "Berhasil",
        description: `Tahun cuti berhasil dikembalikan ke ${previousYear}. Data cuti ${currentYear} tersimpan sebagai backup.`
      });

      setIsRevertPrevModalOpen(false);
      onYearChanged();
      checkCanRevertToNext();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengembalikan tahun",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToNext = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil semua pegawai
      const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('id, sisa_cuti_tahun_sebelumnya, sisa_cuti_tahun_lalu, sisa_cuti_tahun_ini, sisa_cuti_tahun_depan');

      if (fetchError) throw fetchError;

      // 2. Restore setiap pegawai:
      // - sebelumnya = tahun_lalu
      // - tahun_lalu = tahun_ini
      // - tahun_ini = tahun_depan (restore dari backup)
      // - tahun_depan = null
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              sisa_cuti_tahun_sebelumnya: emp.sisa_cuti_tahun_lalu,
              sisa_cuti_tahun_lalu: emp.sisa_cuti_tahun_ini,
              sisa_cuti_tahun_ini: emp.sisa_cuti_tahun_depan ?? 12,
              sisa_cuti_tahun_depan: null
            })
            .eq('id', emp.id);

          if (updateError) throw updateError;
        }
      }

      // 3. Update settings: previous_year = current_year, current_year = current_year + 1
      const { error: settingsError } = await supabase
        .from('leave_year_settings')
        .update({ 
          previous_year: currentYear,
          current_year: currentYear + 1
        })
        .eq('id', settings?.id);

      if (settingsError) throw settingsError;

      toast({
        title: "Berhasil",
        description: `Tahun cuti berhasil dikembalikan ke ${currentYear + 1} dengan data backup yang tersimpan.`
      });

      setIsRevertNextModalOpen(false);
      onYearChanged();
      checkCanRevertToNext();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengembalikan tahun",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Tahun Cuti: {currentYear}</span>
      </div>
      
      {/* Revert to Previous Year Button */}
      {canRevertToPrevious && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRevertPrevModalOpen(true)}
          title={`Kembali ke ${previousYear}`}
          className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-950"
        >
          <Undo2 className="h-4 w-4 mr-1" />
          {previousYear}
        </Button>
      )}

      {/* Add New Year Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAddModalOpen(true)}
        title="Tambah Tahun Baru"
      >
        <Plus className="h-4 w-4 mr-1" />
        Tahun Baru
      </Button>

      {/* Revert to Next Year Button (if backup exists) */}
      {canRevertToNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRevertNextModalOpen(true)}
          title={`Kembali ke ${currentYear + 1}`}
          className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-950"
        >
          <Redo2 className="h-4 w-4 mr-1" />
          {currentYear + 1}
        </Button>
      )}

      {/* Add Year Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Tahun Cuti Baru</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Apakah Anda yakin ingin menambah tahun cuti baru?</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Tahun saat ini: <strong>{currentYear}</strong> → akan menjadi tahun lalu</li>
                <li>Tahun baru: <strong>{nextYear}</strong> → jatah cuti 12 hari per pegawai</li>
                <li>Sisa cuti tahun {currentYear} akan dipindahkan ke kolom "Cuti {currentYear}"</li>
                <li className="text-muted-foreground">Data 2 tahun sebelumnya akan di-backup untuk revert</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddNewYear} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert to Previous Year Dialog */}
      <Dialog open={isRevertPrevModalOpen} onOpenChange={setIsRevertPrevModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kembali ke Tahun {previousYear}</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Apakah Anda yakin ingin mengembalikan tahun cuti ke {previousYear}?</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Tahun saat ini: <strong>{currentYear}</strong> → akan di-backup</li>
                <li>Tahun aktif: <strong>{previousYear}</strong></li>
                <li>Sisa cuti tahun {currentYear} akan tersimpan dan bisa dikembalikan lagi</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsRevertPrevModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleRevertToPrevious} disabled={isLoading} variant="destructive">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kembali ke {previousYear}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert to Next Year Dialog */}
      <Dialog open={isRevertNextModalOpen} onOpenChange={setIsRevertNextModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kembali ke Tahun {currentYear + 1}</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Apakah Anda yakin ingin mengembalikan tahun cuti ke {currentYear + 1}?</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Tahun saat ini: <strong>{currentYear}</strong> → akan menjadi tahun lalu</li>
                <li>Tahun aktif: <strong>{currentYear + 1}</strong></li>
                <li>Data cuti {currentYear + 1} akan dikembalikan dari backup</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsRevertNextModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleRevertToNext} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kembali ke {currentYear + 1}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YearManager;
