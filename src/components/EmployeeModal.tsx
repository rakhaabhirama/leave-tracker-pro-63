import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

interface EmployeeModalProps {
  open: boolean;
  employee?: Employee;
  selectedYear: number;
  onClose: () => void;
  onSuccess: () => void;
}

const employeeSchema = z.object({
  nip: z.string().trim().min(1, "NIP wajib diisi").max(50, "NIP maksimal 50 karakter"),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(255, "Nama maksimal 255 karakter"),
  sisa_cuti: z.number().min(0, "Sisa cuti tidak boleh negatif")
});

const EmployeeModal = ({ open, employee, selectedYear, onClose, onSuccess }: EmployeeModalProps) => {
  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    sisa_cuti: 12
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employee) {
      setFormData({
        nip: employee.nip,
        nama: employee.nama,
        sisa_cuti: employee.sisa_cuti
      });
    } else {
      setFormData({
        nip: '',
        nama: '',
        sisa_cuti: 12
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = employeeSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: "Error",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (employee) {
        const { error } = await supabase
          .from('employees')
          .update(formData)
          .eq('id', employee.id);

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Data pegawai berhasil diperbarui"
        });
      } else {
        const { error } = await supabase
          .from('employees')
          .insert({ 
            ...formData, 
            departemen: 'Umum',
            year: selectedYear
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Error",
              description: "NIP sudah terdaftar di tahun ini",
              variant: "destructive"
            });
            return;
          }
          throw error;
        }
        toast({
          title: "Berhasil",
          description: `Pegawai baru berhasil ditambahkan untuk tahun ${selectedYear}`
        });
      }
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Edit Pegawai' : `Tambah Pegawai (${selectedYear})`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nip">NIP</Label>
            <Input
              id="nip"
              value={formData.nip}
              onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
              placeholder="Masukkan NIP"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input
              id="nama"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sisa_cuti">Sisa Cuti (hari)</Label>
            <Input
              id="sisa_cuti"
              type="number"
              min="0"
              value={formData.sisa_cuti}
              onChange={(e) => setFormData({ ...formData, sisa_cuti: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {employee ? 'Simpan Perubahan' : 'Tambah Pegawai'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeModal;
