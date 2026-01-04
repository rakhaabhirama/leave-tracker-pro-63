import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, JABATAN_OPTIONS, Jabatan } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

interface EmployeeModalProps {
  open: boolean;
  employee?: Employee;
  currentYear: number;
  onClose: () => void;
  onSuccess: () => void;
}

const employeeSchema = z.object({
  nip: z.string().trim().min(1, "NIP wajib diisi").max(50, "NIP maksimal 50 karakter"),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(255, "Nama maksimal 255 karakter"),
  jabatan: z.enum(JABATAN_OPTIONS, { required_error: "Jabatan wajib dipilih" }),
  sisa_cuti_tahun_lalu: z.number().min(0, "Sisa cuti tidak boleh negatif"),
  sisa_cuti_tahun_ini: z.number().min(0, "Sisa cuti tidak boleh negatif")
});

const EmployeeModal = ({ open, employee, currentYear, onClose, onSuccess }: EmployeeModalProps) => {
  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    jabatan: 'JFU' as Jabatan,
    sisa_cuti_tahun_lalu: 0,
    sisa_cuti_tahun_ini: 12
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employee) {
      setFormData({
        nip: employee.nip,
        nama: employee.nama,
        jabatan: employee.jabatan,
        sisa_cuti_tahun_lalu: employee.sisa_cuti_tahun_lalu,
        sisa_cuti_tahun_ini: employee.sisa_cuti_tahun_ini
      });
    } else {
      setFormData({
        nip: '',
        nama: '',
        jabatan: 'JFU',
        sisa_cuti_tahun_lalu: 0,
        sisa_cuti_tahun_ini: 12
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
            departemen: 'Umum'
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Error",
              description: "NIP sudah terdaftar",
              variant: "destructive"
            });
            return;
          }
          throw error;
        }
        toast({
          title: "Berhasil",
          description: "Pegawai baru berhasil ditambahkan"
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
            {employee ? 'Edit Pegawai' : 'Tambah Pegawai'}
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
            <Label htmlFor="jabatan">Jabatan</Label>
            <Select 
              value={formData.jabatan} 
              onValueChange={(value: Jabatan) => setFormData({ ...formData, jabatan: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jabatan" />
              </SelectTrigger>
              <SelectContent>
                {JABATAN_OPTIONS.map((jabatan) => (
                  <SelectItem key={jabatan} value={jabatan}>
                    {jabatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sisa_cuti_tahun_lalu">Sisa Cuti {currentYear - 1}</Label>
              <Input
                id="sisa_cuti_tahun_lalu"
                type="number"
                min="0"
                value={formData.sisa_cuti_tahun_lalu}
                onChange={(e) => setFormData({ ...formData, sisa_cuti_tahun_lalu: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sisa_cuti_tahun_ini">Sisa Cuti {currentYear}</Label>
              <Input
                id="sisa_cuti_tahun_ini"
                type="number"
                min="0"
                value={formData.sisa_cuti_tahun_ini}
                onChange={(e) => setFormData({ ...formData, sisa_cuti_tahun_ini: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
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
