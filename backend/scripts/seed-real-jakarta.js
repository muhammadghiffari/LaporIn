/**
 * Seed Database dengan Data Real Jakarta
 * 
 * Lokasi: Area Jakarta sekitar -6.263185, 106.798882
 * - RT/RW dengan boundary real
 * - Warga dengan lokasi di area RT/RW
 * - Laporan dengan koordinat GPS real
 */

const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');

// Koordinat center area Kelurahan Cipete, Jakarta Selatan
// Fokus demo seluruh sistem dikunci ke wilayah Cipete
const AREA_CENTER_LAT = -6.2746;
const AREA_CENTER_LNG = 106.8023;

// Struktur RT/RW dengan lokasi real di dalam Kelurahan Cipete, Jakarta Selatan
// Hanya RW001 dan RW002 (RW002 full generate, RW001 ada data asli)
const RT_RW_LOCATIONS = {
  'RT001/RW001': {
    center: { lat: -6.2735, lng: 106.8005 }, // Cipete area
    radius: 250, // 250 meter radius
    address: 'Jl. Cipete Raya No. 1-50, Cipete, Jakarta Selatan'
  },
  'RT002/RW001': {
    center: { lat: -6.2745, lng: 106.8020 },
    radius: 250,
    address: 'Jl. Cipete Raya No. 51-100, Cipete, Jakarta Selatan'
  },
  'RT003/RW001': {
    center: { lat: -6.2755, lng: 106.8035 },
    radius: 250,
    address: 'Jl. Cipete Raya No. 101-150, Cipete, Jakarta Selatan'
  },
  'RT001/RW002': {
    center: { lat: -6.2760, lng: 106.8010 },
    radius: 250,
    address: 'Jl. Pangeran Antasari No. 1-50, Cipete, Jakarta Selatan'
  },
  'RT002/RW002': {
    center: { lat: -6.2770, lng: 106.8025 },
    radius: 250,
    address: 'Jl. Pangeran Antasari No. 51-100, Cipete, Jakarta Selatan'
  },
  'RT003/RW002': {
    center: { lat: -6.2780, lng: 106.8040 },
    radius: 250,
    address: 'Jl. Pangeran Antasari No. 101-150, Cipete, Jakarta Selatan'
  }
};

// Nama-nama real Indonesia untuk warga
const NAMES_MALE = [
  'Budi Santoso', 'Ahmad Hidayat', 'Surya Wijaya', 'Rudi Kurniawan', 'Dedi Prasetyo',
  'Agus Setiawan', 'Bambang Sugianto', 'Eko Prayitno', 'Fajar Nugroho', 'Gunawan Sari',
  'Hendro Wibowo', 'Indra Kusuma', 'Joko Susilo', 'Kurniawan Hadi', 'Lukman Hakim',
  'Mochammad Ali', 'Nurhadi Wijaya', 'Oktavianus', 'Pandu Pratama', 'Qomarudin'
];

const NAMES_FEMALE = [
  'Siti Nurhaliza', 'Dewi Sartika', 'Rina Wati', 'Maya Sari', 'Linda Permata',
  'Endang Lestari', 'Fitri Rahayu', 'Gita Maharani', 'Heni Wulandari', 'Indah Sari',
  'Jihan Asyifa', 'Kartika Dewi', 'Lina Marlina', 'Mega Wulandari', 'Nina Suryani',
  'Oktavia Putri', 'Putri Indah', 'Rahma Aulia', 'Sinta Dewi', 'Tita Maharani'
];

// Daftar laporan real dengan kategori dan lokasi (semua di kawasan Cipete, Jakarta Selatan)
const REAL_REPORTS = [
  {
    title: 'Got Mampet di Jl. Cipete Raya',
    description: 'Selokan di depan rumah no 45 mampet karena sampah menumpuk. Air tidak bisa mengalir dan mulai bau tidak sedap.',
    category: 'infrastruktur',
    urgency: 'high',
    locations: ['Jl. Cipete Raya', 'Cipete']
  },
  {
    title: 'Lampu Jalan Mati',
    description: 'Beberapa lampu jalan di sepanjang Jl. Cipete Raya mati total sejak kemarin malam, membuat area gelap dan rawan.',
    category: 'infrastruktur',
    urgency: 'medium',
    locations: ['Jl. Cipete Raya', 'Cipete']
  },
  {
    title: 'Sampah Menumpuk di TPS',
    description: 'Sampah di TPS depan komplek sudah menumpuk dan belum diangkut selama 3 hari. Menimbulkan bau tidak sedap dan mengganggu warga.',
    category: 'infrastruktur',
    urgency: 'high',
    locations: ['TPS', 'Cipete']
  },
  {
    title: 'Jalan Berlubang',
    description: 'Ada beberapa lubang di jalan depan gang, sudah cukup dalam dan membahayakan pengendara terutama saat malam hari.',
    category: 'infrastruktur',
    urgency: 'medium',
    locations: ['Gang', 'Cipete']
  },
  {
    title: 'Air PAM Tidak Mengalir',
    description: 'Sejak pagi tadi air PAM tidak mengalir sama sekali. Warga terpaksa menggunakan air sumur atau membeli air galon.',
    category: 'infrastruktur',
    urgency: 'high',
    locations: ['Komplek', 'Cipete']
  },
  {
    title: 'Kebisingan dari Tempat Karaoke',
    description: 'Tempat karaoke di dekat komplek berisik sampai larut malam, mengganggu warga yang sedang istirahat.',
    category: 'sosial',
    urgency: 'medium',
    locations: ['Jl. Pangeran Antasari', 'Cipete']
  },
  {
    title: 'Pohon Tumbang Menutup Jalan',
    description: 'Ada pohon besar tumbang menutup jalan gang setelah hujan deras kemarin. Perlu segera dibersihkan karena menghalangi akses warga.',
    category: 'infrastruktur',
    urgency: 'high',
    locations: ['Gang', 'Cipete']
  },
  {
    title: 'Gangguan Listrik Sebagian Blok',
    description: 'Listrik di blok C sering mati mendadak, terutama saat hujan. Perlu dicek instalasi listriknya.',
    category: 'infrastruktur',
    urgency: 'high',
    locations: ['Blok C', 'Cipete']
  },
  {
    title: 'Saluran Air Bocor',
    description: 'Ada saluran air yang bocor di dekat tiang listrik, airnya menggenang dan mulai meresap ke jalan.',
    category: 'infrastruktur',
    urgency: 'medium',
    locations: ['Jl. Cipete Raya', 'Cipete']
  },
  {
    title: 'Parkir Liar di Sisi Jalan',
    description: 'Banyak kendaraan parkir liar di sisi jalan, menyempitkan jalan dan mengganggu lalu lintas terutama saat jam sibuk.',
    category: 'sosial',
    urgency: 'low',
    locations: ['Jl. Pangeran Antasari', 'Cipete']
  },
  {
    title: 'TPS Tidak Terurus',
    description: 'TPS di ujung gang sudah penuh dan sampah berserakan. Perlu koordinasi dengan petugas kebersihan untuk pengangkutan rutin.',
    category: 'infrastruktur',
    urgency: 'medium',
    locations: ['TPS', 'Gang', 'Cipete']
  },
  {
    title: 'Warga Meninggal Butuh Bantuan',
    description: 'Ada warga yang meninggal dunia, keluarga membutuhkan bantuan untuk biaya pemakaman dan dukungan moral.',
    category: 'sosial',
    urgency: 'high',
    locations: ['Komplek', 'Cipete']
  }
];

// Generate random point within radius dari center
function randomPointInRadius(center, radiusMeters) {
  const radiusInDegrees = radiusMeters / 111000; // Approx 111km per degree
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusInDegrees;
  
  return {
    lat: center.lat + distance * Math.cos(angle),
    lng: center.lng + distance * Math.sin(angle)
  };
}

// Generate random date in range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function untuk generate tanggal dengan distribusi natural (lebih banyak di akhir periode)
// Cocok untuk grafik yang menunjukkan growth/trend naik
function naturalDate(start, end, index, total) {
  // Distribusi eksponensial: lebih banyak data di akhir periode
  // index: urutan data (0, 1, 2, ...)
  // total: total data yang akan dibuat
  const progress = index / total;
  const exponential = Math.pow(progress, 0.7); // 0.7 membuat distribusi lebih natural (bisa di-adjust)
  return new Date(start.getTime() + exponential * (end.getTime() - start.getTime()));
}

async function seed() {
  console.log('🌱 Memulai seeding dengan data real Jakarta...\n');
  console.log(`📍 Area center: ${AREA_CENTER_LAT}, ${AREA_CENTER_LNG}`);
  console.log(`📍 Lokasi: Kelurahan Cipete, Jakarta Selatan\n`);

  const DEMO_PASSWORD = 'demo123';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  
  const createdUsers = {};
  const rtRwList = Object.keys(RT_RW_LOCATIONS);
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  // 1. Super Admin (email asli untuk notifikasi)
  console.log('1️⃣  Membuat Super Admin...');
  const admin = await prisma.user.upsert({
    where: { email: 'abhisuryanu9roho@gmail.com' },
    update: {
      passwordHash,
      name: 'Abhi Surya Nugroho',
      role: 'admin',
      rtRw: null,
      jenisKelamin: 'laki_laki',
      isVerified: true
    },
    create: {
      email: 'abhisuryanu9roho@gmail.com', // Email asli untuk notifikasi
      passwordHash,
      name: 'Abhi Surya Nugroho',
      role: 'admin',
      rtRw: null,
      jenisKelamin: 'laki_laki',
      isVerified: true,
      createdAt: threeMonthsAgo
    }
  });
  createdUsers['admin'] = admin;
  console.log(`   ✅ ${admin.email} (${admin.role}) - Email asli untuk notifikasi\n`);

  // 2. Admin RW untuk setiap RW (email asli untuk RW001)
  // Hitung lokasi RW yang menaungi semua RT di dalamnya
  console.log('2️⃣  Membuat Admin RW...');
  const rwNumbers = [...new Set(rtRwList.map(rtRw => rtRw.split('/')[1]))];
  const realEmails = {
    'RW001': 'kepodehlol54@gmail.com', // Email asli untuk Admin RW001
  };
  
  // Hitung center dan radius RW untuk setiap RW
  const rwLocations = {};
  for (const rw of rwNumbers) {
    const rtsInRw = rtRwList.filter(rtRw => rtRw.split('/')[1] === rw);
    if (rtsInRw.length === 0) continue;
    
    // Ambil semua center RT di RW ini
    const rtCenters = rtsInRw.map(rtRw => RT_RW_LOCATIONS[rtRw].center);
    const rtRadii = rtsInRw.map(rtRw => RT_RW_LOCATIONS[rtRw].radius);
    
    // Hitung center RW (rata-rata dari semua center RT)
    const avgLat = rtCenters.reduce((sum, c) => sum + c.lat, 0) / rtCenters.length;
    const avgLng = rtCenters.reduce((sum, c) => sum + c.lng, 0) / rtCenters.length;
    
    // Hitung radius RW (jarak terjauh dari center RW ke edge RT terjauh + buffer)
    // Pastikan radius RW lebih besar dari radius RT manapun
    let maxDistance = 0;
    let maxRtRadius = 0;
    for (let i = 0; i < rtCenters.length; i++) {
      const rtCenter = rtCenters[i];
      const rtRadius = rtRadii[i];
      if (rtRadius > maxRtRadius) {
        maxRtRadius = rtRadius;
      }
      // Jarak dari center RW ke center RT (dalam meter)
      const latDiff = rtCenter.lat - avgLat;
      const lngDiff = rtCenter.lng - avgLng;
      // Konversi derajat ke meter (1 derajat lat ≈ 111320m, 1 derajat lng ≈ 111320m * cos(lat))
      const latDiffMeters = latDiff * 111320;
      const lngDiffMeters = lngDiff * 111320 * Math.cos(avgLat * Math.PI / 180);
      const distanceToCenter = Math.sqrt(latDiffMeters * latDiffMeters + lngDiffMeters * lngDiffMeters);
      // Jarak ke edge RT (center RW to RT center + RT radius)
      const distanceToEdge = distanceToCenter + rtRadius;
      if (distanceToEdge > maxDistance) {
        maxDistance = distanceToEdge;
      }
    }
    // Tambah buffer 150m untuk memastikan semua RT tertutup dengan aman
    // Pastikan radius RW minimal 1.5x dari radius RT terbesar
    const minRwRadius = Math.ceil(maxRtRadius * 1.5);
    const calculatedRwRadius = Math.ceil(maxDistance + 150);
    const rwRadius = Math.max(minRwRadius, calculatedRwRadius);
    
    rwLocations[rw] = {
      center: { lat: avgLat, lng: avgLng },
      radius: rwRadius
    };
    
    console.log(`   📍 ${rw}: Center (${avgLat.toFixed(6)}, ${avgLng.toFixed(6)}), Radius: ${rwRadius}m (menaungi ${rtsInRw.length} RT)`);
    console.log(`      - RT radius maksimal: ${maxRtRadius}m`);
    console.log(`      - RW radius: ${rwRadius}m (${rwRadius > maxRtRadius ? '✓' : '✗'} lebih besar dari RT)`);
    console.log(`      - Semua RT berada di kawasan Cipete, Jakarta Selatan`);
  }
  
  for (let rwIndex = 0; rwIndex < rwNumbers.length; rwIndex++) {
    const rw = rwNumbers[rwIndex];
    const email = realEmails[rw] || `admin${rw.toLowerCase()}@example.com`;
    const isRealEmail = realEmails[rw] ? true : false;
    const rwLocation = rwLocations[rw];
    
    // Nama untuk RW001 pakai nama asli, lainnya generate
    const adminRwName = isRealEmail ? 'Admin RW 001' : `Admin ${rw}`;
    const adminRwJenisKelamin = isRealEmail ? 'laki_laki' : (Math.random() > 0.5 ? 'laki_laki' : 'perempuan');
    
    const adminRw = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        name: adminRwName,
        role: 'admin_rw',
        rtRw: null,
        jenisKelamin: adminRwJenisKelamin,
        isVerified: true,
        rtRwLatitude: rwLocation?.center.lat || null,
        rtRwLongitude: rwLocation?.center.lng || null,
        rtRwRadius: rwLocation?.radius || null
      },
      create: {
        email,
        passwordHash,
        name: adminRwName,
        role: 'admin_rw',
        rtRw: null, // Admin RW tidak punya RT spesifik
        jenisKelamin: adminRwJenisKelamin,
        isVerified: true,
        rtRwLatitude: rwLocation?.center.lat || null,
        rtRwLongitude: rwLocation?.center.lng || null,
        rtRwRadius: rwLocation?.radius || null,
        createdAt: randomDate(threeMonthsAgo, new Date(threeMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000))
      }
    });
    createdUsers[`admin_${rw}`] = adminRw;
    console.log(`   ✅ ${adminRw.email}${isRealEmail ? ' - Email asli untuk notifikasi' : ''}`);
  }
  console.log('');

  // 3. Buat struktur RT/RW dengan lokasi (email asli untuk RT001/RW001)
  console.log('3️⃣  Membuat struktur RT/RW dengan lokasi real...');
  
  const realEmailsRT = {
    'RT001/RW001': {
      ketua: { email: 'gaminggampang20@gmail.com', name: 'Dyandra', jenisKelamin: 'laki_laki' },
      pengurus: { email: 'syncrazelled@gmail.com', name: 'Muhammad Alfarisi Setiyono', jenisKelamin: 'laki_laki' }
      // Sekretaris: generate (tidak perlu email asli)
    }
  };
  
  for (const [rtRw, locationData] of Object.entries(RT_RW_LOCATIONS)) {
    const realEmailsForRT = realEmailsRT[rtRw] || {};
    const rtRwKey = rtRw.replace(/\//g, '').toLowerCase();
    
    // Ketua RT
    const ketuaData = realEmailsForRT.ketua;
    const ketuaEmail = ketuaData?.email || `ketua${rtRwKey}@example.com`;
    const ketuaName = ketuaData?.name || `Ketua ${rtRw}`;
    const ketuaJenisKelamin = ketuaData?.jenisKelamin || 'laki_laki';
    
    const ketua = await prisma.user.upsert({
      where: { email: ketuaEmail },
      update: {
        passwordHash,
        name: ketuaName,
        role: 'ketua_rt',
        rtRw,
        jenisKelamin: ketuaJenisKelamin,
        isVerified: true,
        rtRwLatitude: locationData.center.lat,
        rtRwLongitude: locationData.center.lng,
        rtRwRadius: locationData.radius
      },
      create: {
        email: ketuaEmail,
        passwordHash,
        name: ketuaName,
        role: 'ketua_rt',
        rtRw,
        jenisKelamin: ketuaJenisKelamin,
        isVerified: true,
        rtRwLatitude: locationData.center.lat,
        rtRwLongitude: locationData.center.lng,
        rtRwRadius: locationData.radius,
        createdAt: randomDate(threeMonthsAgo, new Date(threeMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000))
      }
    });
    createdUsers[`ketua_${rtRw}`] = ketua;
    
    // Sekretaris RT (generate, tidak perlu email asli)
    const sekretarisEmail = `sekretaris${rtRwKey}@example.com`;
    const sekretarisJenisKelamin = Math.random() > 0.5 ? 'laki_laki' : 'perempuan';
    const sekretaris = await prisma.user.upsert({
      where: { email: sekretarisEmail },
      update: {
        passwordHash,
        name: `Sekretaris ${rtRw}`,
        role: 'sekretaris_rt',
        rtRw,
        jenisKelamin: sekretarisJenisKelamin,
        isVerified: true,
        rtRwLatitude: locationData.center.lat,
        rtRwLongitude: locationData.center.lng,
        rtRwRadius: locationData.radius
      },
      create: {
        email: sekretarisEmail,
        passwordHash,
        name: `Sekretaris ${rtRw}`,
        role: 'sekretaris_rt',
        rtRw,
        jenisKelamin: sekretarisJenisKelamin,
        isVerified: true,
        rtRwLatitude: locationData.center.lat,
        rtRwLongitude: locationData.center.lng,
        rtRwRadius: locationData.radius,
        createdAt: randomDate(threeMonthsAgo, new Date(threeMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000))
      }
    });
    createdUsers[`sekretaris_${rtRw}`] = sekretaris;
    
    // Pengurus RT
    const pengurusData = realEmailsForRT.pengurus;
    const pengurusEmail = pengurusData?.email || `pengurus${rtRwKey}@example.com`;
    const pengurusName = pengurusData?.name || `Pengurus ${rtRw}`;
    const pengurusJenisKelamin = pengurusData?.jenisKelamin || (Math.random() > 0.5 ? 'laki_laki' : 'perempuan');
    
    const pengurus = await prisma.user.upsert({
      where: { email: pengurusEmail },
      update: {
        passwordHash,
        name: pengurusName,
        role: 'pengurus',
        rtRw,
        jenisKelamin: pengurusJenisKelamin,
        isVerified: true,
        rtRwLatitude: locationData.center.lat,
        rtRwLongitude: locationData.center.lng,
        rtRwRadius: locationData.radius
      },
      create: {
        email: pengurusEmail,
        passwordHash,
        name: pengurusName,
        role: 'pengurus',
        rtRw,
        jenisKelamin: pengurusJenisKelamin,
        isVerified: true,
        rtRwLatitude: locationData.center.lat,
        rtRwLongitude: locationData.center.lng,
        rtRwRadius: locationData.radius,
        createdAt: randomDate(threeMonthsAgo, new Date(threeMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000))
      }
    });
    createdUsers[`pengurus_${rtRw}`] = pengurus;
    
    const hasRealEmails = realEmailsForRT.ketua || realEmailsForRT.pengurus;
    console.log(`   ✅ ${rtRw} - Center: ${locationData.center.lat}, ${locationData.center.lng}, Radius: ${locationData.radius}m${hasRealEmails ? ' - Email asli digunakan' : ''}`);
  }
  console.log('');

  // 4. Buat warga (10-15 warga per RT) - warga pertama di RT001/RW001 pakai email asli
  console.log('4️⃣  Membuat warga dengan lokasi di area RT/RW...');
  let wargaIndex = 1;
  // Warga khusus dengan data lengkap dan email asli (RT001/RW001)
  const specialWarga = {
    email: 'wadidawcihuy@gmail.com',
    name: 'Muhammad Ghiffari',
    rtRw: 'RT001/RW001',
    jenisKelamin: 'laki_laki'
  };
  
  // Hitung total warga dulu untuk distribusi waktu yang natural
  let totalWargaCount = 0;
  const rtRwWargaCounts = {};
  for (const [rtRw, locationData] of Object.entries(RT_RW_LOCATIONS)) {
    const numWarga = Math.floor(Math.random() * 6) + 10; // 10-15 warga per RT
    rtRwWargaCounts[rtRw] = numWarga;
    totalWargaCount += numWarga;
  }
  
  let globalWargaIndex = 0; // Index global untuk distribusi waktu natural
  
  for (const [rtRw, locationData] of Object.entries(RT_RW_LOCATIONS)) {
    const numWarga = rtRwWargaCounts[rtRw];
    const isFirstRT = rtRw === specialWarga.rtRw; // RT khusus pakai email dan data asli untuk warga pertama
    
    for (let i = 0; i < numWarga; i++) {
      const isMale = Math.random() > 0.5;
      const name = isMale 
        ? NAMES_MALE[Math.floor(Math.random() * NAMES_MALE.length)]
        : NAMES_FEMALE[Math.floor(Math.random() * NAMES_FEMALE.length)];
      
      const isSpecialFirst = isFirstRT && i === 0;
      
      // Warga pertama di RT khusus pakai email & data asli
      const email = isSpecialFirst ? specialWarga.email : `warga${wargaIndex}@example.com`;
      
      // Generate lokasi warga di sekitar center RT/RW (dalam radius)
      const wargaLocation = randomPointInRadius(locationData.center, locationData.radius * 0.8);
      
      const displayName = isSpecialFirst ? `${specialWarga.name} (${rtRw})` : `${name} (${rtRw})`;
      const jenisKelamin = isSpecialFirst ? specialWarga.jenisKelamin : (isMale ? 'laki_laki' : 'perempuan');
      
      // Gunakan naturalDate untuk distribusi waktu yang natural (lebih banyak di akhir periode)
      // Ini akan membuat grafik lebih menarik dengan trend naik
      const wargaCreatedAt = naturalDate(threeMonthsAgo, now, globalWargaIndex, totalWargaCount);
      
      const warga = await prisma.user.upsert({
        where: { email },
        update: {
          passwordHash,
          name: displayName,
          role: 'warga',
          rtRw,
          jenisKelamin,
          isVerified: isSpecialFirst ? true : Math.random() > 0.3 // 70% verified, warga spesial pasti verified
        },
        create: {
          email,
          passwordHash,
          name: displayName,
          role: 'warga',
          rtRw,
          jenisKelamin,
          isVerified: isSpecialFirst ? true : Math.random() > 0.3, // 70% verified, warga spesial pasti verified
          createdAt: wargaCreatedAt
        }
      });
      
      createdUsers[`warga_${rtRw}_${i}`] = warga;
      wargaIndex++;
      globalWargaIndex++;
    }
    const emailNote = isFirstRT ? ' (email asli untuk warga pertama)' : '';
    console.log(`   ✅ ${rtRw}: ${numWarga} warga dibuat${emailNote}`);
  }
  console.log(`\n   ✅ Total warga: ${wargaIndex - 1}\n`);

  // 5. Buat laporan dengan koordinat GPS real
  console.log('5️⃣  Membuat laporan dengan koordinat GPS real...');
  
  const allWarga = await prisma.user.findMany({
    where: { role: 'warga', isVerified: true },
    select: { id: true, rtRw: true }
  });
  
  if (allWarga.length === 0) {
    console.log('   ⚠️  Tidak ada warga verified, skip laporan');
  } else {
    let reportCount = 0;
    const statuses = ['pending', 'in_progress', 'resolved'];
    
    // Hitung total laporan dulu untuk distribusi waktu yang natural
    let totalReportsCount = 0;
    const rtRwReportCounts = {};
    for (const [rtRw, locationData] of Object.entries(RT_RW_LOCATIONS)) {
      const wargasInRtRw = allWarga.filter(w => w.rtRw === rtRw);
      if (wargasInRtRw.length > 0) {
        const minReports = rtRw === 'RT001/RW001' ? 5 : Math.floor(Math.random() * 2) + 2;
        rtRwReportCounts[rtRw] = minReports;
        totalReportsCount += minReports;
      }
    }
    
    let globalReportIndex = 0; // Index global untuk distribusi waktu natural
    
    // PRIORITAS: Pastikan setiap RT/RW punya minimal 2-3 laporan (terutama RT001/RW001)
    console.log('   Membuat minimal laporan per RT/RW...');
    
    for (const [rtRw, locationData] of Object.entries(RT_RW_LOCATIONS)) {
      const wargasInRtRw = allWarga.filter(w => w.rtRw === rtRw);
      if (wargasInRtRw.length === 0) {
        console.log(`   ⚠️  ${rtRw}: Tidak ada warga verified, skip`);
        continue;
      }
      
      // Minimal 2-3 laporan per RT/RW, lebih banyak untuk RT001/RW001 (untuk demo)
      const minReports = rtRwReportCounts[rtRw] || (rtRw === 'RT001/RW001' ? 5 : Math.floor(Math.random() * 2) + 2);
      
      for (let i = 0; i < minReports; i++) {
        const warga = wargasInRtRw[Math.floor(Math.random() * wargasInRtRw.length)];
        const reportTemplate = REAL_REPORTS[reportCount % REAL_REPORTS.length];
        
        // Generate koordinat laporan di sekitar center RT/RW
        const reportLocation = randomPointInRadius(locationData.center, locationData.radius * 0.9);
        
        // Generate alamat
        const locationName = reportTemplate.locations[Math.floor(Math.random() * reportTemplate.locations.length)];
        const address = `${locationName}, ${locationData.address.split(', ')[1]}`;
        
        // Gunakan naturalDate untuk distribusi waktu yang natural (lebih banyak di akhir periode)
        // Ini akan membuat grafik lebih menarik dengan trend naik
        const reportCreatedAt = naturalDate(threeMonthsAgo, now, globalReportIndex, totalReportsCount);
        
        // Untuk RT001/RW001, pastikan ada laporan pending dan in_progress (untuk demo)
        let status;
        if (rtRw === 'RT001/RW001') {
          if (i === 0) status = 'pending';
          else if (i === 1) status = 'in_progress';
          else status = statuses[Math.floor(Math.random() * statuses.length)];
        } else {
          status = statuses[Math.floor(Math.random() * statuses.length)];
        }
        
        const report = await prisma.report.create({
          data: {
            userId: warga.id,
            title: `${reportTemplate.title} (${rtRw})`,
            description: reportTemplate.description,
            location: address,
            latitude: reportLocation.lat,
            longitude: reportLocation.lng,
            category: reportTemplate.category,
            urgency: reportTemplate.urgency,
            aiSummary: reportTemplate.description.substring(0, 200), // Dummy AI summary
            status,
            createdAt: reportCreatedAt,
            updatedAt: reportCreatedAt
          }
        });
        
        // Create AI Processing Log
        await prisma.aiProcessingLog.create({
          data: {
            reportId: report.id,
            originalText: `${reportTemplate.title}. ${reportTemplate.description}`,
            aiSummary: reportTemplate.description.substring(0, 200),
            aiCategory: reportTemplate.category,
            aiUrgency: reportTemplate.urgency,
            processingTimeMs: Math.floor(Math.random() * 500) + 100, // 100-600ms
            createdAt: reportCreatedAt
          }
        });
        
        // Create Status History
        await prisma.reportStatusHistory.create({
          data: {
            reportId: report.id,
            status: 'pending',
            updatedBy: warga.id,
            createdAt: reportCreatedAt
          }
        });
        
        // Add additional status history if status is not pending
        if (status === 'in_progress') {
          const inProgressDate = new Date(reportCreatedAt.getTime() + 24 * 60 * 60 * 1000); // 1 day later
          await prisma.reportStatusHistory.create({
            data: {
              reportId: report.id,
              status: 'in_progress',
              updatedBy: warga.id,
              createdAt: inProgressDate
            }
          });
        } else if (status === 'resolved') {
          const inProgressDate = new Date(reportCreatedAt.getTime() + 24 * 60 * 60 * 1000);
          const resolvedDate = new Date(reportCreatedAt.getTime() + 48 * 60 * 60 * 1000);
          
          await prisma.reportStatusHistory.create({
            data: {
              reportId: report.id,
              status: 'in_progress',
              updatedBy: warga.id,
              createdAt: inProgressDate
            }
          });
          
          await prisma.reportStatusHistory.create({
            data: {
              reportId: report.id,
              status: 'resolved',
              updatedBy: warga.id,
              createdAt: resolvedDate
            }
          });
        }
        
        reportCount++;
        globalReportIndex++;
      }
      console.log(`   ✅ ${rtRw}: ${minReports} laporan dibuat (total: ${reportCount})`);
    }
    
    // Tambahan: Buat laporan random untuk variasi
    const additionalReports = 10;
    console.log(`\n   Membuat ${additionalReports} laporan tambahan secara random...`);
    
    for (let i = 0; i < additionalReports; i++) {
      const reportTemplate = REAL_REPORTS[i % REAL_REPORTS.length];
      const warga = allWarga[Math.floor(Math.random() * allWarga.length)];
      const rtRw = warga.rtRw;
      
      if (!rtRw || !RT_RW_LOCATIONS[rtRw]) continue;
      
      const locationData = RT_RW_LOCATIONS[rtRw];
      const reportLocation = randomPointInRadius(locationData.center, locationData.radius * 0.9);
      const locationName = reportTemplate.locations[Math.floor(Math.random() * reportTemplate.locations.length)];
      const address = `${locationName}, ${locationData.address.split(', ')[1]}`;
      
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const report = await prisma.report.create({
        data: {
          userId: warga.id,
          title: reportTemplate.title,
          description: reportTemplate.description,
          location: address,
          latitude: reportLocation.lat,
          longitude: reportLocation.lng,
          category: reportTemplate.category,
          urgency: reportTemplate.urgency,
          aiSummary: reportTemplate.description.substring(0, 200),
          status,
          createdAt,
          updatedAt: createdAt
        }
      });
      
      // Create AI Processing Log
      await prisma.aiProcessingLog.create({
        data: {
          reportId: report.id,
          originalText: `${reportTemplate.title}. ${reportTemplate.description}`,
          aiSummary: reportTemplate.description.substring(0, 200),
          aiCategory: reportTemplate.category,
          aiUrgency: reportTemplate.urgency,
          processingTimeMs: Math.floor(Math.random() * 500) + 100,
          createdAt
        }
      });
      
      // Create Status History
      await prisma.reportStatusHistory.create({
        data: {
          reportId: report.id,
          status: 'pending',
          updatedBy: warga.id,
          createdAt
        }
      });
      
      reportCount++;
    }
    
    console.log(`\n   ✅ Total ${reportCount} laporan dibuat dengan koordinat GPS real\n`);
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(60));
  
  const userCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });
  
  userCounts.forEach(({ role, _count }) => {
    console.log(`   ${role}: ${_count.id} users`);
  });
  
  const reportCount = await prisma.report.count();
  console.log(`\n   Reports: ${reportCount} laporan`);
  
  console.log(`\n✅ Seeding selesai!`);
  console.log(`\n🔑 Login dengan password: ${DEMO_PASSWORD}`);
  console.log(`\n📧 Akun dengan Email Asli (untuk notifikasi):`);
  console.log(`   Admin Sistem: kepodehlol54@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`   Admin RW001: wadidawcihuy@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`   Ketua RT001/RW001: arythegodhand@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`   Sekretaris RT001/RW001: syncrazelled@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`   Pengurus RT001/RW001: gampanggaming20@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`   Warga (RT001/RW001): suroprikitiw@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`\n📧 Akun lainnya (contoh):`);
  console.log(`   warga1@example.com / ${DEMO_PASSWORD}`);
  console.log(`   (dan lainnya dengan pattern @example.com)`);
  console.log(`\n💡 Email notifikasi sistem akan dikirim ke email asli di atas!`);
  
  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error('❌ Error seeding:', error);
  process.exit(1);
});

