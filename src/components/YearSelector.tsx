import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Year } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Calendar } from 'lucide-react';

interface YearSelectorProps {
  years: Year[];
  selectedYear: number | null;
  onYearChange: (year: number) => void;
  onYearAdded: () => void;
}

const YearSelector = ({ years, selectedYear, onYearChange, onYearAdded }: YearSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [isLoading, setIsLoading] = useState(false);
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
      const { error } = await supabase
        .from('years')
        .insert({ year: newYear });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Tahun ${newYear} berhasil ditambahkan`
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Tahun Baru</DialogTitle>
            <DialogDescription>
              Data pegawai tahun baru akan kosong dan terpisah dari tahun lain.
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
    </div>
  );
};

export default YearSelector;
