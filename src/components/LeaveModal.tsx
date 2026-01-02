import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarPlus, CalendarMinus } from 'lucide-react';
import { z } from 'zod';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface LeaveModalProps {
  open: boolean;
  employee?: Employee;
  type?: 'tambah' | 'kurang';
  currentYear: number;
  onClose: () => void;
  onSuccess: () => void;
}

const leaveSchema = z.object({
  jumlah: z.number().min(1, "Jumlah minimal 1 hari"),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(500, "Keterangan maksimal 500 karakter"),
  tanggal_mulai: z.string().min(1, "Tanggal mulai wajib diisi"),
  tanggal_selesai: z.string().min(1, "Tanggal selesai wajib diisi")
});

const addLeaveSchema = z.object({
  jumlah: z.number().min(1, "Jumlah minimal 1 hari"),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(500, "Keterangan maksimal 500 karakter")
});

const formatDateIndonesia = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, 'd-M-yyyy', { locale: localeId });
};

const LeaveModal = ({ open, employee, type = 'kurang', currentYear, onClose, onSuccess }: LeaveModalProps) => {
  const today = new Date().toISOString().split('T')[0];
  const [jumlah, setJumlah] = useState(1);
  const [keterangan, setKeterangan] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(today);
  const [tanggalSelesai, setTanggalSelesai] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate jumlah from date range
  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const handleDateChange = (start: string, end: string) => {
    setTanggalMulai(start);
    setTanggalSelesai(end);
    if (type === 'kurang') {
      setJumlah(calculateDays(start, end));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !user) return;

    const isTambah = type === 'tambah';

    if (isTambah) {
      const validation = addLeaveSchema.safeParse({ jumlah, keterangan });
      if (!validation.success) {
        toast({
          title: "Error",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }
    } else {
      const validation = leaveSchema.safeParse({ jumlah, keterangan, tanggal_mulai: tanggalMulai, tanggal_selesai: tanggalSelesai });
      if (!validation.success) {
        toast({
          title: "Error",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      // Validate date range
      if (new Date(tanggalSelesai) < new Date(tanggalMulai)) {
        toast({
          title: "Error",
          description: "Tanggal selesai harus setelah tanggal mulai",
          variant: "destructive"
        });
        return;
      }
    }

    const totalSisaCuti = employee.sisa_cuti_tahun_lalu + employee.sisa_cuti_tahun_ini;

    // Validasi sisa cuti tidak boleh minus
    if (type === 'kurang' && totalSisaCuti < jumlah) {
      toast({
        title: "Error",
        description: `Sisa cuti tidak mencukupi. Total sisa: ${totalSisaCuti} hari`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      let newSisaTahunLalu = employee.sisa_cuti_tahun_lalu;
      let newSisaTahunIni = employee.sisa_cuti_tahun_ini;

      if (type === 'tambah') {
        // Tambah ke tahun ini
        newSisaTahunIni += jumlah;
      } else {
        // Kurangi dari tahun lalu dulu, baru tahun ini
        let remaining = jumlah;
        if (newSisaTahunLalu >= remaining) {
          newSisaTahunLalu -= remaining;
        } else {
          remaining -= newSisaTahunLalu;
          newSisaTahunLalu = 0;
          newSisaTahunIni -= remaining;
        }
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update({ 
          sisa_cuti_tahun_lalu: newSisaTahunLalu,
          sisa_cuti_tahun_ini: newSisaTahunIni
        })
        .eq('id', employee.id);

      if (updateError) throw updateError;

      // Format keterangan dengan tanggal
      let formattedKeterangan = keterangan;
      if (type === 'kurang') {
        formattedKeterangan = `${formatDateIndonesia(tanggalMulai)} s/d ${formatDateIndonesia(tanggalSelesai)} - ${keterangan}`;
      }

      // Catat riwayat
      const historyData: any = {
        employee_id: employee.id,
        jenis: type,
        jumlah,
        keterangan: formattedKeterangan,
        admin_id: user.id
      };

      if (type === 'kurang') {
        historyData.tanggal_mulai = tanggalMulai;
        historyData.tanggal_selesai = tanggalSelesai;
      }

      const { error: historyError } = await supabase
        .from('leave_history')
        .insert(historyData);

      if (historyError) throw historyError;

      toast({
        title: "Berhasil",
        description: type === 'tambah' 
          ? `${jumlah} hari cuti berhasil ditambahkan` 
          : `Cuti ${jumlah} hari (${formatDateIndonesia(tanggalMulai)} - ${formatDateIndonesia(tanggalSelesai)}) berhasil dicatat`
      });

      // Reset form
      setJumlah(1);
      setKeterangan('');
      setTanggalMulai(today);
      setTanggalSelesai(today);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isTambah = type === 'tambah';
  const totalSisaCuti = employee ? employee.sisa_cuti_tahun_lalu + employee.sisa_cuti_tahun_ini : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTambah ? (
              <>
                <CalendarPlus className="h-5 w-5 text-success" />
                Tambah Cuti
              </>
            ) : (
              <>
                <CalendarMinus className="h-5 w-5 text-destructive" />
                Pengambilan Cuti
              </>
            )}
          </DialogTitle>
          {employee && (
            <DialogDescription>
              {employee.nama} - Total sisa cuti: <strong>{totalSisaCuti} hari</strong>
              <br />
              <span className="text-xs">
                (Tahun {currentYear - 1}: {employee.sisa_cuti_tahun_lalu} hari | Tahun {currentYear}: {employee.sisa_cuti_tahun_ini} hari)
              </span>
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isTambah && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
                  <Input
                    id="tanggal_mulai"
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => handleDateChange(e.target.value, tanggalSelesai)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                  <Input
                    id="tanggal_selesai"
                    type="date"
                    value={tanggalSelesai}
                    min={tanggalMulai}
                    onChange={(e) => handleDateChange(tanggalMulai, e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                Durasi: <strong>{jumlah} hari</strong>
                {employee && employee.sisa_cuti_tahun_lalu > 0 && (
                  <span className="block text-xs mt-1">
                    * Akan dikurangi dari cuti tahun {currentYear - 1} terlebih dahulu
                  </span>
                )}
              </div>
            </>
          )}
          {isTambah && (
            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah Hari</Label>
              <Input
                id="jumlah"
                type="number"
                min="1"
                value={jumlah}
                onChange={(e) => setJumlah(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={isTambah ? "Contoh: Reset cuti tahunan" : "Contoh: Cuti tahunan, Sakit, dll"}
              required
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              variant={isTambah ? "default" : "destructive"}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTambah ? 'Tambah Cuti' : 'Ambil Cuti'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveModal;
