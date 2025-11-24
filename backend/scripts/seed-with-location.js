/**
 * Seeder dengan struktur hierarki RT/RW lengkap
 * - 4 RW (RW005, RW006, RW007, RW009)
 * - Beberapa RT di bawah setiap RW
 * - Pengurus yang di-assign ke RT/RW tertentu
 * - Lokasi (latitude/longitude) sebagai referensi
 */

const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');

// Data lokasi RT/RW (Jakarta area)
// Format: { rtRw, latitude, longitude, radius (meter) }
const RT_RW_LOCATIONS = {
  'RT001/RW005': { lat: -6.2088, lng: 106.8456, radius: 500 }, // Jakarta Pusat
  'RT002/RW005': { lat: -6.2090, lng: 106.8458, radius: 500 },
  'RT003/RW005': { lat: -6.2092, lng: 106.8460, radius: 500 },
  'RT001/RW006': { lat: -6.2144, lng: 106.8451, radius: 500 }, // Jakarta Selatan
  'RT002/RW006': { lat: -6.2146, lng: 106.8453, radius: 500 },
  'RT003/RW006': { lat: -6.2148, lng: 106.8455, radius: 500 },
  'RT001/RW007': { lat: -6.2297, lng: 106.8044, radius: 500 }, // Jakarta Barat
  'RT002/RW007': { lat: -6.2299, lng: 106.8046, radius: 500 },
  'RT003/RW007': { lat: -6.2301, lng: 106.8048, radius: 500 },
  'RT001/RW009': { lat: -6.1944, lng: 106.8229, radius: 500 }, // Jakarta Timur
  'RT002/RW009': { lat: -6.1946, lng: 106.8231, radius: 500 },
  'RT003/RW009': { lat: -6.1948, lng: 106.8233, radius: 500 },
};

// Struktur hierarki RT/RW
const RT_RW_STRUCTURE = {
  'RW005': ['RT001', 'RT002', 'RT003'],
  'RW006': ['RT001', 'RT002', 'RT003'],
  'RW007': ['RT001', 'RT002', 'RT003'],
  'RW009': ['RT001', 'RT002', 'RT003'],
};

// Helper function untuk generate tanggal random dalam rentang
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function untuk generate tanggal dengan distribusi natural (lebih banyak di akhir)
function naturalDate(start, end, index, total) {
  // Distribusi eksponensial: lebih banyak data di akhir periode
  const progress = index / total;
  const exponential = Math.pow(progress, 0.7); // 0.7 membuat distribusi lebih natural
  return new Date(start.getTime() + exponential * (end.getTime() - start.getTime()));
}

async function jalankan() {
  console.log('🌱 Memulai seeding dengan struktur hierarki RT/RW...\n');

  const createdUsers = {};
  
  // Tanggal referensi untuk variasi
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  // Password demo untuk semua user
  const DEMO_PASSWORD = 'demo123';
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  
  // 1. Super Admin (dibuat 6 bulan lalu)
  console.log('1️⃣  Membuat Super Admin...');
  const adminCreatedAt = sixMonthsAgo;
  const admin = await prisma.user.upsert({
    where: { email: 'adminsistem@example.com' },
    update: {},
      create: {
        email: 'adminsistem@example.com',
        passwordHash: demoPasswordHash,
      name: 'Admin Sistem',
      role: 'admin',
      rtRw: null, // Super Admin tidak punya RT/RW
      jenisKelamin: 'laki_laki',
      isVerified: true, // Auto verified
      createdAt: adminCreatedAt,
    }
  });
  createdUsers['admin'] = admin;
  console.log(`   ✅ ${admin.email} (${admin.role}) - Created: ${adminCreatedAt.toISOString().split('T')[0]}\n`);

  // 2. Admin RW untuk setiap RW (dibuat 5-6 bulan lalu, bertahap)
  console.log('2️⃣  Membuat Admin RW...');
  const rwList = Object.keys(RT_RW_STRUCTURE);
  let rwIndex = 0;
  for (const rw of rwList) {
    const rwNumber = rw.replace('RW', '');
    // Admin RW dibuat bertahap dalam 1 bulan (5-6 bulan lalu)
    const adminRwCreatedAt = new Date(sixMonthsAgo);
    adminRwCreatedAt.setDate(sixMonthsAgo.getDate() + (rwIndex * 7)); // Setiap minggu
    const adminRw = await prisma.user.upsert({
      where: { email: `adminrw${rwNumber}@example.com` },
      update: {},
      create: {
        email: `adminrw${rwNumber}@example.com`,
        passwordHash: demoPasswordHash,
        name: `Admin RW ${rwNumber}`,
        role: 'admin_rw',
        rtRw: `RT001/${rw}`, // Admin RW punya RT/RW untuk filter
        jenisKelamin: rwNumber === '005' ? 'laki_laki' : 'perempuan',
        isVerified: true,
        createdAt: adminRwCreatedAt,
      }
    });
    createdUsers[`admin_rw_${rwNumber}`] = adminRw;
    rwIndex++;
    console.log(`   ✅ ${adminRw.email} (${adminRw.role}) - ${adminRw.rtRw} - Created: ${adminRwCreatedAt.toISOString().split('T')[0]}`);
  }
  console.log('');

  // 3. Ketua RT untuk setiap RT (dibuat 4-5 bulan lalu, bertahap)
  console.log('3️⃣  Membuat Ketua RT...');
  let ketuaRtCounter = 0;
  for (const [rw, rtList] of Object.entries(RT_RW_STRUCTURE)) {
    for (const rt of rtList) {
      const rtRw = `${rt}/${rw}`;
      const rtNumber = rt.replace('RT', '');
      const rwNumber = rw.replace('RW', '');
      // Ketua RT dibuat bertahap dalam 2 bulan (4-5 bulan lalu)
      const ketuaRtCreatedAt = new Date(sixMonthsAgo);
      ketuaRtCreatedAt.setMonth(sixMonthsAgo.getMonth() + 1); // Mulai dari 5 bulan lalu
      ketuaRtCreatedAt.setDate(ketuaRtCreatedAt.getDate() + (ketuaRtCounter * 4)); // Setiap 4 hari
      const ketuaRt = await prisma.user.upsert({
        where: { email: `ketuart${rtNumber}rw${rwNumber}@example.com` },
        update: {},
        create: {
          email: `ketuart${rtNumber}rw${rwNumber}@example.com`,
          passwordHash: demoPasswordHash,
          name: `Ketua ${rt}/${rw}`,
          role: 'ketua_rt',
          rtRw: rtRw,
          jenisKelamin: (parseInt(rtNumber) + parseInt(rwNumber)) % 2 === 0 ? 'laki_laki' : 'perempuan',
          isVerified: true,
          createdAt: ketuaRtCreatedAt,
        }
      });
      createdUsers[`ketua_rt_${rtRw}`] = ketuaRt;
      ketuaRtCounter++;
      console.log(`   ✅ ${ketuaRt.email} (${ketuaRt.role}) - ${ketuaRt.rtRw} - Created: ${ketuaRtCreatedAt.toISOString().split('T')[0]}`);
    }
  }
  console.log('');

  // 4. Sekretaris RT untuk setiap RT (dibuat 3-4 bulan lalu, bertahap)
  console.log('4️⃣  Membuat Sekretaris RT...');
  let sekretarisCounter = 0;
  for (const [rw, rtList] of Object.entries(RT_RW_STRUCTURE)) {
    for (const rt of rtList) {
      const rtRw = `${rt}/${rw}`;
      const rtNumber = rt.replace('RT', '');
      const rwNumber = rw.replace('RW', '');
      // Sekretaris dibuat bertahap dalam 2 bulan (3-4 bulan lalu)
      const sekretarisCreatedAt = new Date(sixMonthsAgo);
      sekretarisCreatedAt.setMonth(sixMonthsAgo.getMonth() + 2); // Mulai dari 4 bulan lalu
      sekretarisCreatedAt.setDate(sekretarisCreatedAt.getDate() + (sekretarisCounter * 4)); // Setiap 4 hari
      const sekretaris = await prisma.user.upsert({
        where: { email: `sekretaris${rtNumber}rw${rwNumber}@example.com` },
        update: {},
        create: {
          email: `sekretaris${rtNumber}rw${rwNumber}@example.com`,
          passwordHash: demoPasswordHash,
          name: `Sekretaris ${rt}/${rw}`,
          role: 'sekretaris_rt',
          rtRw: rtRw,
          jenisKelamin: (parseInt(rtNumber) + parseInt(rwNumber)) % 2 === 1 ? 'laki_laki' : 'perempuan',
          isVerified: true,
          createdAt: sekretarisCreatedAt,
        }
      });
      createdUsers[`sekretaris_rt_${rtRw}`] = sekretaris;
      sekretarisCounter++;
      console.log(`   ✅ ${sekretaris.email} (${sekretaris.role}) - ${sekretaris.rtRw} - Created: ${sekretarisCreatedAt.toISOString().split('T')[0]}`);
    }
  }
  console.log('');

  // 5. Pengurus untuk setiap RT (1-2 pengurus per RT, dibuat 2-3 bulan lalu)
  console.log('5️⃣  Membuat Pengurus...');
  let pengurusCounter = 0;
  for (const [rw, rtList] of Object.entries(RT_RW_STRUCTURE)) {
    for (const rt of rtList) {
      const rtRw = `${rt}/${rw}`;
      const rtNumber = rt.replace('RT', '');
      const rwNumber = rw.replace('RW', '');
      
      // 1-2 pengurus per RT
      const numPengurus = rtNumber === '001' ? 2 : 1; // RT001 punya 2 pengurus, lainnya 1
      
      for (let i = 1; i <= numPengurus; i++) {
        // Pengurus dibuat bertahap dalam 1 bulan (2-3 bulan lalu)
        const pengurusCreatedAt = new Date(threeMonthsAgo);
        pengurusCreatedAt.setDate(threeMonthsAgo.getDate() - 30 + (pengurusCounter * 2)); // Setiap 2 hari
        const pengurus = await prisma.user.upsert({
          where: { email: `pengurus${rtNumber}rw${rwNumber}${i}@example.com` },
          update: {},
          create: {
            email: `pengurus${rtNumber}rw${rwNumber}${i}@example.com`,
            passwordHash: demoPasswordHash,
            name: `Pengurus ${i} ${rt}/${rw}`,
            role: 'pengurus',
            rtRw: rtRw, // Pengurus di-assign ke RT/RW tertentu
            jenisKelamin: i % 2 === 0 ? 'laki_laki' : 'perempuan',
            isVerified: true,
            createdAt: pengurusCreatedAt,
          }
        });
        createdUsers[`pengurus_${rtRw}_${i}`] = pengurus;
        pengurusCounter++;
        console.log(`   ✅ ${pengurus.email} (${pengurus.role}) - ${pengurus.rtRw} - Created: ${pengurusCreatedAt.toISOString().split('T')[0]}`);
      }
    }
  }
  console.log('');

  // 6. Warga untuk setiap RT (8 warga per RT, dibuat dalam 3 bulan terakhir dengan distribusi natural)
  console.log('6️⃣  Membuat Warga...');
  let wargaCounter = 1;
  const totalWarga = 96; // 12 RT * 8 warga
  for (const [rw, rtList] of Object.entries(RT_RW_STRUCTURE)) {
    for (const rt of rtList) {
      const rtRw = `${rt}/${rw}`;
      const rtNumber = rt.replace('RT', '');
      const rwNumber = rw.replace('RW', '');
      const numWarga = 8; // 8 warga per RT
      
      for (let i = 1; i <= numWarga; i++) {
        // Warga dibuat dengan distribusi natural (lebih banyak di akhir periode)
        const wargaCreatedAt = naturalDate(threeMonthsAgo, now, wargaCounter - 1, totalWarga);
        const warga = await prisma.user.upsert({
          where: { email: `warga${wargaCounter}@example.com` },
          update: {},
          create: {
            email: `warga${wargaCounter}@example.com`,
            passwordHash: demoPasswordHash,
            name: `Warga ${wargaCounter} (${rt}/${rw})`,
            role: 'warga',
            rtRw: rtRw,
            jenisKelamin: wargaCounter % 2 === 0 ? 'laki_laki' : 'perempuan',
            isVerified: false, // Warga perlu diverifikasi oleh Admin RT/RW
            createdAt: wargaCreatedAt,
          }
        });
        wargaCounter++;
        if (wargaCounter % 10 === 0) {
          console.log(`   ✅ Created ${wargaCounter - 1} warga...`);
        }
      }
    }
  }
  console.log(`   ✅ Total ${wargaCounter - 1} warga dibuat\n`);

  // 7. Verifikasi beberapa warga sebagai contoh (dengan variasi tanggal verifikasi)
  console.log('7️⃣  Verifikasi beberapa warga (contoh)...');
  const sampleWarga = await prisma.user.findMany({
    where: { 
      role: 'warga',
      isVerified: false 
    },
    take: 20, // Verifikasi 20 warga sebagai contoh
    orderBy: { createdAt: 'asc' } // Verifikasi yang lebih lama terdaftar
  });

  const adminRw005 = createdUsers['admin_rw_005'];
  if (adminRw005 && sampleWarga.length > 0) {
    for (let i = 0; i < sampleWarga.length; i++) {
      const warga = sampleWarga[i];
      // Verifikasi dilakukan beberapa hari setelah registrasi (1-7 hari)
      const verifiedAt = new Date(warga.createdAt);
      verifiedAt.setDate(verifiedAt.getDate() + Math.floor(Math.random() * 7) + 1);
      
      await prisma.user.update({
        where: { id: warga.id },
        data: {
          isVerified: true,
          verifiedBy: adminRw005.id,
          verifiedAt: verifiedAt,
        }
      });
    }
    console.log(`   ✅ ${sampleWarga.length} warga telah diverifikasi oleh Admin RW 005\n`);
  }

  // 8. Seed Reports dengan variasi tanggal (4 minggu terakhir dengan distribusi natural)
  console.log('8️⃣  Membuat Laporan dengan variasi tanggal...');
  const daftarWarga = await prisma.user.findMany({
    where: { 
      role: 'warga',
      isVerified: true // Hanya warga yang sudah diverifikasi bisa buat laporan
    },
    select: { id: true, rtRw: true },
    orderBy: { id: 'asc' }
  });

  const pengurus = await prisma.user.findFirst({
    where: { role: 'pengurus' },
    select: { id: true },
    orderBy: { id: 'asc' }
  });
  const idPengurus = pengurus?.id || adminRw005?.id;

  const daftarJudul = [
    'Selokan mampet di Blok C3',
    'Lampu jalan mati',
    'Sampah menumpuk di TPS',
    'Air PAM tidak mengalir',
    'Kebisingan malam hari',
    'Pohon tumbang menutup jalan',
    'Jalan berlubang',
    'Kebakaran kecil di dapur warga',
    'Gangguan listrik sebagian blok',
    'Saluran air bocor',
    'Banjir di depan rumah',
    'Tikus berkeliaran di kompleks',
    'Parkir liar di jalan utama',
    'Fasilitas umum rusak',
    'Kebersihan lingkungan menurun'
  ];
  const daftarKategori = ['infrastruktur', 'sosial', 'administrasi', 'bantuan'];
  const daftarUrgensi = ['low', 'medium', 'high'];
  const daftarStatus = ['pending', 'in_progress', 'resolved'];

  // Rentang 3 bulan terakhir untuk variasi tanggal yang lebih menarik
  const tanggalAkhir = new Date(now);
  const tanggalAwal = new Date(now);
  tanggalAwal.setMonth(tanggalAkhir.getMonth() - 3); // 3 bulan ke belakang untuk statistik yang lebih menarik

  // Buat 5 laporan pending khusus untuk antrian (dibuat hari ini)
  console.log('   📋 Membuat 5 laporan pending untuk antrian...');
  const antrianJudul = [
    'Lampu jalan mati di depan rumah',
    'Selokan mampet di gang sempit',
    'Sampah menumpuk di TPS',
    'Jalan berlubang di depan sekolah',
    'Air PAM tidak mengalir sejak pagi'
  ];
  const antrianUrgensi = ['high', 'high', 'medium', 'medium', 'high'];
  
  for (let i = 0; i < 5 && daftarWarga.length > 0; i++) {
    const warga = daftarWarga[i % daftarWarga.length];
    const judul = antrianJudul[i];
    const deskripsi = `Laporan antrian untuk demo. ${judul}. Mohon segera ditindaklanjuti.`;
    const lokasi = warga.rtRw || 'RT001/RW005';
    const kategori = 'infrastruktur';
    const urgensi = antrianUrgensi[i];
    const status = 'pending'; // Status pending untuk antrian
    const waktuDibuat = new Date(now);
    waktuDibuat.setHours(waktuDibuat.getHours() - (i * 2)); // Dibuat 2 jam terakhir, bertahap

    const laporan = await prisma.report.create({
      data: {
        userId: warga.id,
        title: judul,
        description: deskripsi,
        location: lokasi,
        category: kategori,
        urgency: urgensi,
        aiSummary: `Ringkasan AI: ${judul}`,
        status,
        createdAt: waktuDibuat,
        updatedAt: waktuDibuat
      }
    });

    // Riwayat awal: pending saat dibuat
    await prisma.reportStatusHistory.create({
      data: {
        reportId: laporan.id,
        status: 'pending',
        notes: 'Laporan dibuat',
        updatedBy: warga.id,
        createdAt: waktuDibuat
      }
    });

    // Catat proses AI
    await prisma.aiProcessingLog.create({
      data: {
        reportId: laporan.id,
        originalText: `${judul}. ${deskripsi}`,
        aiSummary: `Ringkasan AI: ${judul}`,
        aiCategory: kategori,
        aiUrgency: urgensi,
        processingTimeMs: Math.floor(Math.random() * 300) + 120,
        createdAt: waktuDibuat
      }
    });
  }
  console.log(`   ✅ 5 laporan pending untuk antrian dibuat\n`);

  const totalReports = 80; // Total laporan yang akan dibuat (termasuk yang sudah dibuat di atas)
  let jumlahDibuat = 5; // Sudah membuat 5 laporan pending

  for (let i = 0; i < totalReports && daftarWarga.length > 0; i++) {
    const warga = daftarWarga[i % daftarWarga.length];
    const judul = daftarJudul[i % daftarJudul.length];
    const deskripsi = `Laporan otomatis (seed) untuk keperluan demo. Mohon tindak lanjut sesuai prioritas.`;
    const lokasi = warga.rtRw || 'RT001/RW005';
    const kategori = daftarKategori[i % daftarKategori.length];
    const urgensi = daftarUrgensi[i % daftarUrgensi.length];
    const status = daftarStatus[i % daftarStatus.length];
    
    // Distribusi natural: lebih banyak laporan di akhir periode
    const waktuDibuat = naturalDate(tanggalAwal, tanggalAkhir, i, totalReports);

    const laporan = await prisma.report.create({
      data: {
        userId: warga.id,
        title: judul,
        description: deskripsi,
        location: lokasi,
        category: kategori,
        urgency: urgensi,
        aiSummary: `Ringkasan AI: ${judul}`,
        status,
        createdAt: waktuDibuat,
        updatedAt: waktuDibuat
      }
    });
    const idLaporan = laporan.id;

    // Riwayat awal: pending saat dibuat
    await prisma.reportStatusHistory.create({
      data: {
        reportId: idLaporan,
        status: 'pending',
        notes: 'Laporan dibuat',
        updatedBy: warga.id,
        createdAt: waktuDibuat
      }
    });

    // Jika status sudah berubah, tambahkan riwayat tambahan dengan delay
    if (status === 'in_progress' || status === 'resolved') {
      const waktuInProgress = new Date(waktuDibuat);
      waktuInProgress.setHours(waktuInProgress.getHours() + Math.floor(Math.random() * 48) + 6); // 6-54 jam setelah dibuat
      
      await prisma.reportStatusHistory.create({
        data: {
          reportId: idLaporan,
          status: 'in_progress',
          notes: 'Penanganan dimulai',
          updatedBy: idPengurus,
          createdAt: waktuInProgress
        }
      });
    }
    if (status === 'resolved') {
      const waktuResolved = new Date(waktuDibuat);
      waktuResolved.setDate(waktuResolved.getDate() + Math.floor(Math.random() * 5) + 1); // 1-6 hari setelah dibuat
      
      await prisma.reportStatusHistory.create({
        data: {
          reportId: idLaporan,
          status: 'resolved',
          notes: 'Selesai ditangani',
          updatedBy: idPengurus,
          createdAt: waktuResolved
        }
      });
    }

    // Catat proses AI
    await prisma.aiProcessingLog.create({
      data: {
        reportId: idLaporan,
        originalText: `${judul}. ${deskripsi}`,
        aiSummary: `Ringkasan AI: ${judul}`,
        aiCategory: kategori,
        aiUrgency: urgensi,
        processingTimeMs: Math.floor(Math.random() * 300) + 120,
        createdAt: waktuDibuat
      }
    });
    jumlahDibuat++;
  }
  console.log(`   ✅ ${jumlahDibuat} laporan dibuat dengan variasi tanggal (4 minggu terakhir)\n`);

  // 9. Summary
  console.log('📊 SUMMARY SEEDING:\n');
  const stats = await prisma.user.groupBy({
    by: ['role'],
    _count: true
  });
  
  for (const stat of stats) {
    console.log(`   ${stat.role}: ${stat._count} user`);
  }
  
  console.log('\n📍 Struktur RT/RW:');
  for (const [rw, rtList] of Object.entries(RT_RW_STRUCTURE)) {
    console.log(`   ${rw}:`);
    for (const rt of rtList) {
      const rtRw = `${rt}/${rw}`;
      const location = RT_RW_LOCATIONS[rtRw];
      if (location) {
        console.log(`     - ${rt}: Lat ${location.lat}, Lng ${location.lng}, Radius ${location.radius}m`);
      } else {
        console.log(`     - ${rt}`);
      }
    }
  }

  console.log('\n✅ Seeding selesai!');
  console.log('\n📝 Catatan Lokasi:');
  console.log('   - Koordinat lokasi disimpan sebagai referensi di script');
  console.log('   - Untuk implementasi penuh, tambahkan field ke schema:');
  console.log('     * rtRwLatitude, rtRwLongitude, rtRwRadius, rtRwPolygon');
  console.log('   - Atau buat tabel terpisah untuk RT/RW boundaries\n');

  console.log('🔑 Credentials untuk Testing (DEMO MODE):');
  console.log('   ⚠️  SEMUA USER MENGGUNAKAN PASSWORD YANG SAMA: demo123');
  console.log('   Super Admin: adminsistem@example.com / demo123');
  for (const rw of rwList) {
    const rwNumber = rw.replace('RW', '');
    console.log(`   Admin RW ${rwNumber}: adminrw${rwNumber}@example.com / demo123`);
  }
  console.log('   Ketua RT: ketuart001rw005@example.com / demo123');
  console.log('   Sekretaris RT: sekretaris001rw005@example.com / demo123');
  console.log('   Pengurus: pengurus001rw0051@example.com / demo123');
  console.log('   Warga: warga1@example.com - warga96@example.com / demo123');
  console.log('   (Beberapa warga sudah diverifikasi, beberapa belum)\n');
}

// Run seeder
if (require.main === module) {
  jalankan()
    .then(() => {
      console.log('✨ Seeder selesai!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeder gagal:', error);
      process.exit(1);
    });
}

module.exports = { jalankan, RT_RW_LOCATIONS, RT_RW_STRUCTURE };

