import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeaveYearSettings } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Calendar } from 'lucide-react';

interface YearManagerProps {
  settings: LeaveYearSettings | null;
  onYearChanged: () => void;
}

const YearManager = ({ settings, onYearChanged }: YearManagerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const currentYear = settings?.current_year || new Date().getFullYear();
  const nextYear = currentYear + 1;

  const handleAddNewYear = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil semua pegawai
      const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('id, sisa_cuti_tahun_ini');

      if (fetchError) throw fetchError;

      // 2. Update setiap pegawai: tahun_lalu = tahun_ini, tahun_ini = 12
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({
              sisa_cuti_tahun_lalu: emp.sisa_cuti_tahun_ini,
              sisa_cuti_tahun_ini: 12
            })
            .eq('id', emp.id);

          if (updateError) throw updateError;
        }
      }

      // 3. Update current_year di settings
      const { error: settingsError } = await supabase
        .from('leave_year_settings')
        .update({ current_year: nextYear })
        .eq('id', settings?.id);

      if (settingsError) throw settingsError;

      toast({
        title: "Berhasil",
        description: `Tahun cuti berhasil diubah ke ${nextYear}. Semua pegawai mendapat jatah cuti baru 12 hari.`
      });

      setIsModalOpen(false);
      onYearChanged();
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

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Tahun Cuti: {currentYear}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        title="Tambah Tahun Baru"
      >
        <Plus className="h-4 w-4 mr-1" />
        Tahun Baru
      </Button>

      {/* Add Year Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Tahun Cuti Baru</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Apakah Anda yakin ingin menambah tahun cuti baru?</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Tahun saat ini: <strong>{currentYear}</strong> → akan menjadi tahun lalu</li>
                <li>Tahun baru: <strong>{nextYear}</strong> → jatah cuti 12 hari per pegawai</li>
                <li>Sisa cuti tahun {currentYear} akan dipindahkan ke kolom "Cuti {currentYear}"</li>
                <li>Sisa cuti tahun {currentYear - 1} (tahun lalu sebelumnya) akan dihapus</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddNewYear} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YearManager;
