import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarPlus, CalendarMinus } from 'lucide-react';
import { z } from 'zod';

interface LeaveModalProps {
  open: boolean;
  employee?: Employee;
  type?: 'tambah' | 'kurang';
  onClose: () => void;
  onSuccess: () => void;
}

const leaveSchema = z.object({
  jumlah: z.number().min(1, "Jumlah minimal 1 hari"),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(500, "Keterangan maksimal 500 karakter"),
  tahun: z.enum(['2025', '2026'])
});

const LeaveModal = ({ open, employee, type = 'kurang', onClose, onSuccess }: LeaveModalProps) => {
  const [jumlah, setJumlah] = useState(1);
  const [keterangan, setKeterangan] = useState('');
  const [tahun, setTahun] = useState<'2025' | '2026'>('2025');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const getSisaCuti = () => {
    if (!employee) return 0;
    return tahun === '2025' ? employee.sisa_cuti_2025 : employee.sisa_cuti_2026;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !user) return;

    const validation = leaveSchema.safeParse({ jumlah, keterangan, tahun });
    if (!validation.success) {
      toast({
        title: "Error",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const sisaCuti = getSisaCuti();

    // Validasi sisa cuti tidak boleh minus
    if (type === 'kurang' && sisaCuti < jumlah) {
      toast({
        title: "Error",
        description: `Sisa cuti ${tahun} tidak mencukupi. Sisa: ${sisaCuti} hari`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update sisa cuti pegawai berdasarkan tahun
      const newSisaCuti = type === 'tambah' 
        ? sisaCuti + jumlah 
        : sisaCuti - jumlah;

      const updateData = tahun === '2025' 
        ? { sisa_cuti_2025: newSisaCuti }
        : { sisa_cuti_2026: newSisaCuti };

      const { error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employee.id);

      if (updateError) throw updateError;

      // Catat riwayat
      const { error: historyError } = await supabase
        .from('leave_history')
        .insert({
          employee_id: employee.id,
          jenis: type,
          jumlah,
          keterangan: `[${tahun}] ${keterangan}`,
          admin_id: user.id
        });

      if (historyError) throw historyError;

      toast({
        title: "Berhasil",
        description: type === 'tambah' 
          ? `${jumlah} hari cuti ${tahun} berhasil ditambahkan` 
          : `${jumlah} hari cuti ${tahun} berhasil dikurangi`
      });

      setJumlah(1);
      setKeterangan('');
      setTahun('2025');
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
  const sisaCuti = getSisaCuti();

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
                Kurangi Cuti
              </>
            )}
          </DialogTitle>
          {employee && (
            <DialogDescription>
              {employee.nama} - Sisa cuti {tahun}: <strong>{sisaCuti} hari</strong>
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tahun">Tahun Cuti</Label>
            <Select value={tahun} onValueChange={(v) => setTahun(v as '2025' | '2026')}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025 (Sisa: {employee?.sisa_cuti_2025 ?? 0} hari)</SelectItem>
                <SelectItem value="2026">2026 (Sisa: {employee?.sisa_cuti_2026 ?? 0} hari)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah Hari</Label>
            <Input
              id="jumlah"
              type="number"
              min="1"
              max={isTambah ? undefined : sisaCuti}
              value={jumlah}
              onChange={(e) => setJumlah(parseInt(e.target.value) || 1)}
              required
            />
          </div>
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
              {isTambah ? 'Tambah Cuti' : 'Kurangi Cuti'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveModal;
