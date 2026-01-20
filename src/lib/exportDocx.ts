import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Employee, LeaveHistory } from '@/types/employee';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'd MMMM yyyy', { locale: localeId });
};

export const exportEmployeeToDocx = async (
  employee: Employee,
  history: LeaveHistory[],
  currentYear: number
) => {
  const totalCuti = employee.sisa_cuti_tahun_lalu + employee.sisa_cuti_tahun_ini;

  const paragraphs: Paragraph[] = [
    // Header
    new Paragraph({
      children: [
        new TextRun({
          text: 'DATA PEGAWAI DAN RIWAYAT CUTI',
          bold: true,
          size: 28, // 14pt
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    // Employee Info
    new Paragraph({
      children: [
        new TextRun({
          text: `NIP: ${employee.nip}`,
          size: 24, // 12pt
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Nama: ${employee.nama}`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Jabatan: ${employee.jabatan}`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Sisa Cuti Tahun ${currentYear - 1}: ${employee.sisa_cuti_tahun_lalu} hari`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Sisa Cuti Tahun ${currentYear}: ${employee.sisa_cuti_tahun_ini} hari`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Total Sisa Cuti: ${totalCuti} hari`,
          size: 24,
          font: 'Times New Roman',
          bold: true,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 400 },
    }),

    // History Header
    new Paragraph({
      children: [
        new TextRun({
          text: 'RIWAYAT CUTI',
          bold: true,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
    }),
  ];

  if (history.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Belum ada riwayat cuti',
            size: 24,
            font: 'Times New Roman',
            italics: true,
          }),
        ],
        alignment: AlignmentType.LEFT,
      })
    );
  } else {
    history.forEach((item, index) => {
      const jenisText = item.jenis === 'tambah' ? 'Penambahan' : 'Pengambilan';
      const periodeText = item.tanggal_mulai && item.tanggal_selesai 
        ? `${formatDate(item.tanggal_mulai)} s/d ${formatDate(item.tanggal_selesai)}`
        : '-';
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${jenisText} - ${item.jumlah} hari`,
              bold: true,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `   Tanggal Pengajuan: ${formatDate(item.tanggal)}`,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `   Periode: ${periodeText}`,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `   Keterangan: ${item.keterangan}`,
              size: 24,
              font: 'Times New Roman',
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Riwayat-Cuti-${employee.nama.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`);
};
