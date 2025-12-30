export const exportToExcel = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(header => {
    const value = item[header];
    // Escape quotes and handle special characters
    if (typeof value === 'string') {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value?.toString() || '';
  }));
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

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
