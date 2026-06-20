import * as XLSX from 'xlsx';
import { formatTanggalStr } from './dateUtils';

export function exportToExcel(data, filename = 'rekap_kehadiran.xlsx') {
  // Sort data by date ascending
  const sortedData = [...data].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

  const totalPertemuan = sortedData.length;
  const totalHadir = sortedData.filter(d => d.status && d.status.toLowerCase() === 'hadir').length;
  const persentase = totalPertemuan > 0 ? Math.round((totalHadir / totalPertemuan) * 100) : 0;

  // Map data to user-friendly excel columns
  const worksheetData = sortedData.map((item, idx) => ({
    'No': idx + 1,
    'Tanggal (Date)': formatTanggalStr(item.tanggal),
    'Nama Dosen (Lecturer Name)': item.dosen_nama,
    'Mata Kuliah (Course)': item.mk_nama,
    'Kelas (Class)': item.kelas,
    'Pertemuan Ke (Meeting #)': item.pertemuan_ke,
    'Materi (Topic)': item.materi,
    'Sub Materi (Sub Topic)': item.sub_materi || '-',
    'Status': item.status.toUpperCase(),
    'Catatan (Notes)': item.catatan || '-',
    'Waktu Absen (Check-In Time)': item.waktu_absen ? new Date(item.waktu_absen).toLocaleString() : '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  // Add total and percentage at the bottom
  XLSX.utils.sheet_add_aoa(worksheet, [
    [],
    ['Jumlah Pertemuan', totalPertemuan],
    ['Persentase Kehadiran', `${persentase}%`]
  ], { origin: -1 });

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
  let y = 30; // 3 cm top margin
  const margin = 12;
  const colWidths = [20, 45, 20, 20, 50, 30]; // Tanggal, Dosen, MK, Kelas, Materi, Sub Materi
  const headers = lang === 'id' 
    ? ['TANGGAL', 'DOSEN', 'MK', 'KELAS', 'MATERI', 'SUB MATERI']
    : ['DATE', 'LECTURER', 'COURSE', 'CLASS', 'TOPIC', 'SUB TOPIC'];

  const sortedData = [...data].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
  const totalPertemuan = sortedData.length;
  const totalHadir = sortedData.filter(d => d.status && d.status.toLowerCase() === 'hadir').length;
  const persentase = totalPertemuan > 0 ? Math.round((totalHadir / totalPertemuan) * 100) : 0;

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

  for (let i = 0; i < sortedData.length; i++) {
    const item = sortedData[i];

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
    doc.text(formatTanggalStr(item.tanggal, lang), currentX + 2, y + 4);
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

    // Column 6: Sub Materi
    const subMateriLines = doc.splitTextToSize(item.sub_materi || '-', colWidths[5] - 4);
    doc.text(subMateriLines, currentX + 2, y + 4);
    
    // Row height is determined by wrapped text
    const textHeight = Math.max(lecturerLines.length, materiLines.length, subMateriLines.length) * 4;
    const rowHeight = Math.max(8, textHeight + 2);
    
    y += rowHeight;
    doc.line(margin, y - 2, 210 - margin, y - 2);
  }

  // Add total and percentage
  if (y + 15 > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }
  y += 5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Jumlah Pertemuan: ${totalPertemuan}`, margin, y);
  y += 5;
  doc.text(`Persentase Kehadiran: ${persentase}%`, margin, y);
  y += 5;

  // Footer Sign-Off
  if (y + 35 > pageHeight) {
    doc.addPage();
    y = 20;
  }
  y += 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Makassar, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 135, y);
  y += 5;
  doc.text('Divisi Akademik Triesakti Institute of Airlines', 135, y);
  y += 20;
  doc.setFont('Helvetica', 'bold');
  doc.text('Darwin S.Pd', 135, y);
  y += 4;
  doc.setFont('Helvetica', 'normal');
  doc.text('Manager Akademik', 135, y);

  doc.save('laporan_kehadiran_triesakti.pdf');
}

export async function exportSyllabusToPDF(course, lang = 'id') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Fungsi helper untuk load dan render kop surat
  const addBackground = async () => {
    try {
      const img = new Image();
      img.src = '/kop_surat.png'; // Asumsi gambar ada di folder public
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      // Render full width & height (210 x 297 mm)
      doc.addImage(img, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch (e) {
      console.log("Kop surat tidak ditemukan atau gagal dimuat.");
    }
  };

  await addBackground();

  // Y awal lebih besar karena ada kop surat di bagian atas
  let y = 45;
  const margin = 12;

  // Judul
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(lang === 'id' ? 'SILABUS PEMBELAJARAN' : 'COURSE SYLLABUS', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Info
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`${lang === 'id' ? 'Mata Kuliah' : 'Course'}: ${course.kode_mk || '-'} - ${course.nama_mk || '-'}`, margin, y);
  y += 8;
  doc.text(`${lang === 'id' ? 'Jumlah Pertemuan' : 'Total Meetings'}: ${course.jumlah_pertemuan || '14'}`, margin, y);
  y += 10;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 210 - margin, y);
  y += 8;

  // Table Headers
  const colWidths = [15, 60, 110]; // Pertemuan, Materi Pokok, Sub Materi
  const headers = lang === 'id' 
    ? ['PERT.', 'MATERI POKOK', 'SUB MATERI']
    : ['MEET.', 'MAIN TOPIC', 'SUB TOPIC'];

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, 186, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  let currentX = margin;
  headers.forEach((header, idx) => {
    doc.text(header, currentX + 2, y);
    currentX += colWidths[idx];
  });
  
  y += 5;
  doc.line(margin, y - 3, 210 - margin, y - 3);

  // Table Rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  let existingSyllabus = [];
  try {
    if (typeof course.silabus === 'string') {
      existingSyllabus = JSON.parse(course.silabus);
    } else if (Array.isArray(course.silabus)) {
      existingSyllabus = course.silabus;
    }
  } catch(e) {}
  
  existingSyllabus.sort((a,b) => parseInt(a.pertemuan) - parseInt(b.pertemuan));

  if (existingSyllabus.length === 0) {
    doc.text(lang === 'id' ? 'Silabus belum tersedia.' : 'Syllabus not available.', margin, y + 5);
  } else {
    for (let i = 0; i < existingSyllabus.length; i++) {
      const item = existingSyllabus[i];

      // Batas bawah lebih kecil agar tidak menabrak footer kop surat (misalnya y > 255)
      if (y + 15 > pageHeight - 35) {
        doc.addPage();
        await addBackground();
        y = 45;

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
      
      doc.text(item.pertemuan ? item.pertemuan.toString() : '-', currentX + 2, y + 5);
      currentX += colWidths[0];

      const materiLines = doc.splitTextToSize(item.materi_pokok || '-', colWidths[1] - 4);
      doc.text(materiLines, currentX + 2, y + 5);
      currentX += colWidths[1];

      const subMateriLines = doc.splitTextToSize(item.sub_materi || '-', colWidths[2] - 4);
      doc.text(subMateriLines, currentX + 2, y + 5);
      
      const maxLines = Math.max(materiLines.length, subMateriLines.length);
      const rowHeight = Math.max(10, (maxLines * 4.5) + 6);
      
      y += rowHeight;
      doc.line(margin, y, 210 - margin, y);
    }
  }

  // Footer Sign-Off (juga memperhitungkan tinggi footer)
  if (y + 35 > pageHeight - 35) {
    doc.addPage();
    await addBackground();
    y = 45;
  }
  y += 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Makassar, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 135, y);
  y += 5;
  doc.text('Divisi Akademik Triesakti Institute of Airlines', 135, y);
  y += 20;
  doc.setFont('Helvetica', 'bold');
  doc.text('Darwin S.Pd', 135, y);
  y += 4;
  doc.setFont('Helvetica', 'normal');
  doc.text('Manager Akademik', 135, y);

  const cleanName = (course.nama_mk || 'Mata_Kuliah').replace(/\s+/g, '_');
  doc.save(`silabus_${course.kode_mk || 'MK'}_${cleanName}.pdf`);
} 
