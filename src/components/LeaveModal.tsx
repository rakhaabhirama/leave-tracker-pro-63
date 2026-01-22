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
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(500, "Keterangan maksimal 500 karakter"),
  tanggal_mulai: z.string().min(1, "Tanggal pembatalan (mulai) wajib diisi"),
  tanggal_selesai: z.string().min(1, "Tanggal pembatalan (selesai) wajib diisi")
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
  const [tanggalBatalMulai, setTanggalBatalMulai] = useState(today);
  const [tanggalBatalSelesai, setTanggalBatalSelesai] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isWeekend = (d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const toYmd = (d: Date) => d.toISOString().split('T')[0];

  const nextWorkday = (dateStr: string) => {
    const d = new Date(dateStr);
    while (isWeekend(d)) d.setDate(d.getDate() + 1);
    return toYmd(d);
  };

  // Count working days (Mon-Fri) inclusively.
  const calculateWorkingDays = (start: string, end: string) => {
    let s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;

    let count = 0;
    while (s <= e) {
      if (!isWeekend(s)) count += 1;
      s.setDate(s.getDate() + 1);
    }
    return count;
  };

  const handleDateChange = (start: string, end: string) => {
    const normalizedStart = nextWorkday(start);
    const normalizedEnd = nextWorkday(end);

    setTanggalMulai(normalizedStart);
    setTanggalSelesai(normalizedEnd);
    setJumlah(Math.max(1, calculateWorkingDays(normalizedStart, normalizedEnd)));
  };

  const handleCancelDateChange = (start: string, end: string) => {
    const normalizedStart = nextWorkday(start);
    const normalizedEnd = nextWorkday(end);

    setTanggalBatalMulai(normalizedStart);
    setTanggalBatalSelesai(normalizedEnd);
    setJumlah(Math.max(1, calculateWorkingDays(normalizedStart, normalizedEnd)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !user) return;

    const isTambah = type === 'tambah';

    if (isTambah) {
      const validation = addLeaveSchema.safeParse({
        keterangan,
        tanggal_mulai: tanggalBatalMulai,
        tanggal_selesai: tanggalBatalSelesai
      });
      if (!validation.success) {
        toast({
          title: "Error",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      if (new Date(tanggalBatalSelesai) < new Date(tanggalBatalMulai)) {
        toast({
          title: "Error",
          description: "Tanggal pembatalan (selesai) harus setelah tanggal pembatalan (mulai)",
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
        // Validasi: periode pembatalan harus berada di dalam periode cuti yang sudah diajukan
        const { data: existingLeave, error: existingLeaveError } = await supabase
          .from('leave_history')
          .select('id, tanggal_mulai, tanggal_selesai')
          .eq('employee_id', employee.id)
          .eq('jenis', 'kurang')
          .lte('tanggal_mulai', tanggalBatalMulai)
          .gte('tanggal_selesai', tanggalBatalSelesai)
          .limit(1)
          .maybeSingle();

        if (existingLeaveError) throw existingLeaveError;
        if (!existingLeave) {
          toast({
            title: "Error",
            description: "Tidak bisa membatalkan: tidak ada cuti pada periode tersebut.",
            variant: "destructive"
          });
          return;
        }

        // Tambah ke kolom tahun yang kurang dari 12
        // Prioritas: tahun lalu dulu (jika < 12), baru tahun ini
        if (newSisaTahunLalu < 12) {
          const canAddToLastYear = 12 - newSisaTahunLalu;
          const addToLastYear = Math.min(jumlah, canAddToLastYear);
          newSisaTahunLalu += addToLastYear;
          const remaining = jumlah - addToLastYear;
          if (remaining > 0) {
            newSisaTahunIni += remaining;
          }
        } else {
          newSisaTahunIni += jumlah;
        }
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

      // Keterangan tanpa tanggal (tanggal sudah ada di kolom periode)
      const formattedKeterangan = keterangan;

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
      } else {
        // Untuk pembatalan, simpan periode yang dibatalkan
        historyData.tanggal_mulai = tanggalBatalMulai;
        historyData.tanggal_selesai = tanggalBatalSelesai;
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
      setTanggalBatalMulai(today);
      setTanggalBatalSelesai(today);
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
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggal_batal_mulai">Tanggal Dibatalkan (Mulai)</Label>
                  <Input
                    id="tanggal_batal_mulai"
                    type="date"
                    value={tanggalBatalMulai}
                    onChange={(e) => handleCancelDateChange(e.target.value, tanggalBatalSelesai)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggal_batal_selesai">Tanggal Dibatalkan (Selesai)</Label>
                  <Input
                    id="tanggal_batal_selesai"
                    type="date"
                    value={tanggalBatalSelesai}
                    min={tanggalBatalMulai}
                    onChange={(e) => handleCancelDateChange(tanggalBatalMulai, e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                Durasi pembatalan (hari kerja): <strong>{jumlah} hari</strong>
                <span className="block text-xs mt-1">
                  * Pembatalan hanya bisa dilakukan jika periode tersebut memang sedang cuti.
                </span>
                <span className="block text-xs mt-1">
                  {employee && employee.sisa_cuti_tahun_lalu < 12
                    ? `* Saldo akan dikembalikan ke cuti tahun ${currentYear - 1} terlebih dahulu`
                    : `* Saldo akan dikembalikan ke cuti tahun ${currentYear}`}
                </span>
              </div>
            </>
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
