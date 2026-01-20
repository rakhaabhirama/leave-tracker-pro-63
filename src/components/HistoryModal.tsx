import { Employee, LeaveHistory } from '@/types/employee';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarPlus, CalendarMinus, History } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface HistoryModalProps {
  open: boolean;
  employee?: Employee;
  history: LeaveHistory[];
  onClose: () => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'd-M-yyyy', { locale: localeId });
};

const HistoryModal = ({ open, employee, history, onClose }: HistoryModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Riwayat Cuti
          </DialogTitle>
          {employee && (
            <DialogDescription>
              {employee.nama} ({employee.nip})
            </DialogDescription>
          )}
        </DialogHeader>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada riwayat cuti
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Pengajuan</TableHead>
                  <TableHead>Tanggal/Periode</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(item.tanggal), 'd MMMM yyyy', { locale: localeId })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.jenis === 'tambah' ? (
                        item.tanggal_mulai ? (
                          <span className="text-sm">{formatDate(item.tanggal_mulai)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )
                      ) : item.tanggal_mulai && item.tanggal_selesai ? (
                        <span className="text-sm">
                          {formatDate(item.tanggal_mulai)} s/d {formatDate(item.tanggal_selesai)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.jenis === 'tambah'
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {item.jenis === 'tambah' ? (
                          <>
                            <CalendarPlus className="h-3 w-3" />
                            Penambahan
                          </>
                        ) : (
                          <>
                            <CalendarMinus className="h-3 w-3" />
                            Pengambilan
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.jenis === 'tambah' ? '+' : '-'}{item.jumlah} hari
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.keterangan}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HistoryModal;
