import * as XLSX from 'xlsx';

export const exportToExcel = (
  data: Record<string, any>[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

  // Auto-fit column widths based on content
  const colWidths = headers.map((header) => {
    const maxLen = Math.max(
      header.length,
      ...data.map((row) => {
        const v = row[header];
        return v == null ? 0 : v.toString().length;
      })
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  // Bold header row
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    const cell = worksheet[cellAddr];
    if (cell) {
      cell.s = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}-${date}.xlsx`);
};
