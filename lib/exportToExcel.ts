import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the worksheet
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export',
  sheetName: string = 'Sheet1'
) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const maxWidth = 50;
  const columnWidths = Object.keys(data[0]).map((key) => ({
    wch: Math.min(
      Math.max(
        key.length,
        ...data.map((row) => String(row[key] || '').length)
      ),
      maxWidth
    )
  }));
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Format reports data for Excel export
 */
export function formatReportsForExcel(reports: any[]) {
  return reports.map((report) => ({
    'ID Laporan': report.id,
    'Judul': report.title,
    'Deskripsi': report.description || '',
    'Pelapor': report.user_name || report.user_name || '',
    'Email Pelapor': report.user_email || '',
    'RT/RW': report.rt_rw || '',
    'Kategori': report.category || '',
    'Urgensi': report.urgency || '',
    'Status': report.status || '',
    'Lokasi': report.location || '',
    'Tanggal Dibuat': report.created_at ? new Date(report.created_at).toLocaleString('id-ID') : '',
    'Blockchain Hash': report.blockchain_tx_hash || '',
  }));
}

/**
 * Format users data for Excel export
 */
export function formatUsersForExcel(users: any[]) {
  return users.map((user) => ({
    'ID': user.id,
    'Nama': user.name,
    'Email': user.email,
    'Peran': user.role,
    'RT/RW': user.rt_rw || '',
    'Jenis Kelamin': user.jenis_kelamin || '',
    'Verified': user.is_verified ? 'Ya' : 'Tidak',
    'Tanggal Dibuat': user.created_at ? new Date(user.created_at).toLocaleString('id-ID') : '',
  }));
}

