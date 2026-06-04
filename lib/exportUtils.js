import * as XLSX from 'xlsx';

export function exportToExcel(data, filename = 'rekap_kehadiran.xlsx') {
  // Map data to user-friendly excel columns
  const worksheetData = data.map((item, idx) => ({
    'No': idx + 1,
    'Tanggal (Date)': item.tanggal,
    'Nama Dosen (Lecturer Name)': item.dosen_nama,
    'Mata Kuliah (Course)': item.mk_nama,
    'Kelas (Class)': item.kelas,
    'Pertemuan Ke (Meeting #)': item.pertemuan_ke,
    'Materi (Topic)': item.materi,
    'Status': item.status.toUpperCase(),
    'Catatan (Notes)': item.catatan || '-',
    'Waktu Absen (Check-In Time)': item.waktu_absen ? new Date(item.waktu_absen).toLocaleString() : '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran');
  
  // Save file
  XLSX.writeFile(workbook, filename);
}

export async function exportToPDF(data, title = 'REKAPITULASI KEHADIRAN DOSEN', dateRange = '', lang = 'id') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageHeight = doc.internal.pageSize.height;
  
  // Margins & Dimensions
  let y = 15;
  const margin = 12;
  const colWidths = [20, 45, 20, 20, 50, 30]; // Tanggal, Dosen, MK, Kelas, Materi, TTD
  const headers = lang === 'id' 
    ? ['TANGGAL', 'DOSEN', 'MK', 'KELAS', 'MATERI', 'TANDA TANGAN']
    : ['DATE', 'LECTURER', 'COURSE', 'CLASS', 'TOPIC', 'SIGNATURE'];

  // --- Title & Header ---
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TRIESAKTI INSTITUTE OF AIRLINES MAKASSAR', margin, y);
  y += 6;
  
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'normal');
  doc.text(title, margin, y);
  y += 5;
  
  if (dateRange) {
    doc.setFontSize(9);
    doc.text(dateRange, margin, y);
    y += 8;
  }

  // Draw separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 210 - margin, y);
  y += 8;

  // --- Table Headers ---
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, 186, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);

  let currentX = margin;
  headers.forEach((header, idx) => {
    doc.text(header, currentX + 2, y);
    currentX += colWidths[idx];
  });
  
  y += 5;
  doc.line(margin, y - 3, 210 - margin, y - 3);

  // --- Table Rows ---
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    // Check page height limit to add new page if necessary
    if (y + 15 > pageHeight - 15) {
      doc.addPage();
      y = 20;

      // Draw header row again
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 5, 186, 7, 'F');
      doc.setFont('Helvetica', 'bold');
      currentX = margin;
      headers.forEach((header, idx) => {
        doc.text(header, currentX + 2, y);
        currentX += colWidths[idx];
      });
      y += 5;
      doc.line(margin, y - 3, 210 - margin, y - 3);
      doc.setFont('Helvetica', 'normal');
    }

    currentX = margin;
    
    // Column 1: Date
    doc.text(item.tanggal, currentX + 2, y + 4);
    currentX += colWidths[0];

    // Column 2: Lecturer Name (wrap if long)
    const lecturerLines = doc.splitTextToSize(item.dosen_nama || '', colWidths[1] - 4);
    doc.text(lecturerLines, currentX + 2, y + 4);
    currentX += colWidths[1];

    // Column 3: Course ID
    doc.text(item.mk_kode || '', currentX + 2, y + 4);
    currentX += colWidths[2];

    // Column 4: Class
    doc.text(item.kelas || '', currentX + 2, y + 4);
    currentX += colWidths[3];

    // Column 5: Topic/Material (wrap if long)
    const materiLines = doc.splitTextToSize(item.materi || '', colWidths[4] - 4);
    doc.text(materiLines, currentX + 2, y + 4);
    currentX += colWidths[4];

    // Column 6: E-Signature Thumbnail
    if (item.tanda_tangan && item.tanda_tangan.startsWith('data:image')) {
      try {
        doc.addImage(item.tanda_tangan, 'PNG', currentX + 5, y, 20, 10);
      } catch (err) {
        console.error("Error drawing signature in PDF:", err);
      }
    } else {
      doc.text('-', currentX + 15, y + 4);
    }
    
    // Row height is determined by wrapped text or signature pad
    const textHeight = Math.max(lecturerLines.length, materiLines.length) * 4;
    const rowHeight = Math.max(12, textHeight + 2);
    
    y += rowHeight;
    doc.line(margin, y - 2, 210 - margin, y - 2);
  }

  // Footer Sign-Off
  if (y + 35 > pageHeight) {
    doc.addPage();
    y = 20;
  }
  y += 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Makassar, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 140, y);
  y += 5;
  doc.text('Bagian Akademik Triesakti Makassar,', 140, y);
  y += 20;
  doc.setFont('Helvetica', 'bold');
  doc.text('Kurniawan, S.Si., M.Sc.', 140, y);
  y += 4;
  doc.setFont('Helvetica', 'normal');
  doc.text('Kepala Bagian Akademik', 140, y);

  doc.save('laporan_kehadiran_triesakti.pdf');
}
