import { Employee } from '@/types/employee';

export const exportToExcel = (data: Employee[] | Record<string, any>[], filename: string) => {
  if (data.length === 0) return;

  // Determine if it's employee data or custom data
  const isEmployeeData = 'nip' in data[0];
  
  let csvContent: string;
  
  if (isEmployeeData) {
    const headers = ['NIP', 'Nama', 'Jabatan', 'Sisa Cuti'];
    const rows = (data as Employee[]).map(emp => [
      emp.nip,
      emp.nama,
      emp.jabatan,
      emp.sisa_cuti.toString()
    ]);
    
    csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  } else {
    // Custom data (like history export)
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => item[header]?.toString() || ''));
    
    csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
