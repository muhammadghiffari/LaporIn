/**
 * Preview Email Templates
 * 
 * Script untuk melihat contoh email yang akan dikirim
 * Tanpa kirim email real, hanya preview template
 */

require('dotenv').config();

// Simulasi data laporan
const mockReport = {
  id: 1,
  title: 'Got Mampet di Jl. Kebon Jeruk',
  description: 'Selokan di depan rumah no 45 mampet karena sampah menumpuk. Air tidak bisa mengalir dan mulai bau tidak sedap.',
  location: 'Jl. Kebon Jeruk, Pondok Pinang, Jakarta Selatan',
  category: 'infrastruktur',
  urgency: 'high',
  status: 'pending',
  createdAt: new Date(),
  user: {
    rtRw: 'RT001/RW001'
  }
};

const mockReporter = {
  name: 'Suroprikitiw (RT001/RW001)',
  email: 'suroprikitiw@gmail.com',
  rtRw: 'RT001/RW001'
};

const mockAdmins = [
  { name: 'Admin RW001', email: 'wadidawcihuy@gmail.com' },
  { name: 'Ketua RT001/RW001', email: 'arythegodhand@gmail.com' },
  { name: 'Sekretaris RT001/RW001', email: 'syncrazelled@gmail.com' },
  { name: 'Pengurus RT001/RW001', email: 'gampanggaming20@gmail.com' }
];

// Template functions (dari emailService)
function replaceTemplateVariables(template, data) {
  let result = template;
  const variables = {
    '{nama_warga}': data.namaWarga || data.name || 'Warga',
    '{judul_laporan}': data.judulLaporan || data.title || 'Laporan',
    '{deskripsi}': data.deskripsi || data.description || '',
    '{lokasi}': data.lokasi || data.location || '',
    '{status}': data.status || 'pending',
    '{tanggal}': data.tanggal || new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    '{rt_rw}': data.rtRw || '',
    '{link_detail}': data.linkDetail || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${data.reportId || ''}`
  };
  
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  
  return result;
}

function getTemplateLaporanBaru() {
  return `
🔔 *Laporan Baru dari {nama_warga}*

📋 *Judul:* {judul_laporan}
📍 *Lokasi:* {lokasi}
📝 *Deskripsi:* {deskripsi}
📅 *Tanggal:* {tanggal}

🔗 Lihat detail: {link_detail}

RT/RW {rt_rw}
  `.trim();
}

function getTemplateStatusUpdate() {
  return `
✅ *Update Status Laporan*

📋 Judul: {judul_laporan}
📊 Status: *{status}*

📍 Lokasi: {lokasi}
👤 Pelapor: {nama_warga}

🔗 Lihat detail: {link_detail}

RT/RW {rt_rw}
  `.trim();
}

function getTemplateLaporanSelesai() {
  return `
🎉 *Laporan Selesai*

📋 Judul: {judul_laporan}
✅ Status: *Selesai*

📍 Lokasi: {lokasi}
👤 Pelapor: {nama_warga}

🔗 Lihat detail: {link_detail}

Terima kasih atas partisipasi Anda!
RT/RW {rt_rw}
  `.trim();
}

console.log('📧 PREVIEW EMAIL TEMPLATES\n');
console.log('='.repeat(60));

// 1. Email Laporan Baru
console.log('\n1️⃣  EMAIL: Laporan Baru (ke Admin/Pengurus)\n');
console.log('─'.repeat(60));
console.log('From: LaporIn System <your-email@gmail.com>');
console.log('To:', mockAdmins.map(a => a.email).join(', '));
console.log('Subject: 📋 Laporan Baru dari', mockReporter.name);
console.log('\nContent (Text):\n');

const templateLaporanBaru = getTemplateLaporanBaru();
const contentLaporanBaru = replaceTemplateVariables(templateLaporanBaru, {
  namaWarga: mockReporter.name,
  judulLaporan: mockReport.title,
  deskripsi: mockReport.description,
  lokasi: mockReport.location,
  tanggal: new Date(mockReport.createdAt).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }),
  rtRw: mockReport.user.rtRw,
  linkDetail: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${mockReport.id}`,
  reportId: mockReport.id
});

console.log(contentLaporanBaru);

// 2. Email Status Update
console.log('\n\n2️⃣  EMAIL: Status Update (ke Warga)\n');
console.log('─'.repeat(60));
console.log('From: LaporIn System <your-email@gmail.com>');
console.log('To:', mockReporter.email);
console.log('Subject: ✅ Update Status Laporan Anda');
console.log('\nContent (Text):\n');

const templateStatusUpdate = getTemplateStatusUpdate();
const contentStatusUpdate = replaceTemplateVariables(templateStatusUpdate, {
  namaWarga: mockReporter.name,
  judulLaporan: mockReport.title,
  deskripsi: mockReport.description,
  lokasi: mockReport.location,
  status: 'Sedang Diproses',
  rtRw: mockReport.user.rtRw,
  linkDetail: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${mockReport.id}`,
  reportId: mockReport.id
});

console.log(contentStatusUpdate);

// 3. Email Laporan Selesai
console.log('\n\n3️⃣  EMAIL: Laporan Selesai (ke Warga)\n');
console.log('─'.repeat(60));
console.log('From: LaporIn System <your-email@gmail.com>');
console.log('To:', mockReporter.email);
console.log('Subject: 🎉 Laporan Anda Telah Diselesaikan!');
console.log('\nContent (Text):\n');

const templateSelesai = getTemplateLaporanSelesai();
const contentSelesai = replaceTemplateVariables(templateSelesai, {
  namaWarga: mockReporter.name,
  judulLaporan: mockReport.title,
  deskripsi: mockReport.description,
  lokasi: mockReport.location,
  status: 'Selesai',
  rtRw: mockReport.user.rtRw,
  linkDetail: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${mockReport.id}`,
  reportId: mockReport.id
});

console.log(contentSelesai);

console.log('\n\n' + '='.repeat(60));
console.log('✅ Preview selesai!');
console.log('💡 Untuk melihat versi HTML, cek file CONTOH_EMAIL_NOTIFIKASI.md');
console.log('💡 Untuk test email real, buat laporan baru di aplikasi');

