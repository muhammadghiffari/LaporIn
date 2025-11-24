/* Seed data awal untuk LaporIn */
const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');

async function jalankan() {
  const daftarUser = [
    {
      email: 'adminsistem@example.com',
      name: 'Admin Sistem',
      role: 'admin',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'laki_laki',
      password: 'AdminSistem123!',
    },
    {
      email: 'adminrw@example.com',
      name: 'Admin RW 005',
      role: 'admin_rw',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'perempuan',
      password: 'AdminRw123!',
    },
    {
      email: 'ketuart@example.com',
      name: 'Ketua RT 001',
      role: 'ketua_rt',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'laki_laki',
      password: 'KetuaRt123!',
    },
    {
      email: 'sekretarisrt@example.com',
      name: 'Sekretaris RT 001',
      role: 'sekretaris_rt',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'perempuan',
      password: 'Sekretaris123!',
    },
    {
      email: 'pengurus@example.com',
      name: 'Petugas Lapangan',
      role: 'pengurus',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'laki_laki',
      password: 'Pengurus123!',
    },
  ];

  // Generate 100 akun warga dengan variasi RT/RW dan jenis kelamin
  for (let i = 1; i <= 100; i++) {
    const rt = String(((i - 1) % 5) + 1).padStart(3, '0'); // RT001-RT005
    const rw = '005';
    daftarUser.push({
      email: `warga${i}@example.com`,
      name: `Warga ${i}`,
      role: 'warga',
      rt_rw: `RT${rt}/RW${rw}`,
      jenis_kelamin: i % 2 === 0 ? 'laki_laki' : 'perempuan',
      password: 'Warga123!',
    });
  }

  try {
    for (const user of daftarUser) {
      const hashPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          passwordHash: hashPassword,
          name: user.name,
          role: user.role,
          rtRw: user.rt_rw,
          jenisKelamin: user.jenis_kelamin
        }
      });
      console.log(`Seeded user: ${user.email} (${user.role})`);
    }

    // Ambil beberapa ID user untuk laporan
    const daftarWarga = await prisma.user.findMany({
      where: { role: 'warga' },
      select: { id: true, rtRw: true },
      orderBy: { id: 'asc' },
      take: 100
    });
    const pengurus = await prisma.user.findFirst({
      where: { role: { in: ['pengurus', 'sekretaris_rt', 'ketua_rt', 'admin_rw', 'admin'] } },
      select: { id: true },
      orderBy: { id: 'asc' }
    });
    const idPengurus = pengurus?.id || daftarWarga[0]?.id;

    // Seed laporan dalam rentang tanggal hingga 2025-11-17
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
      'Saluran air bocor'
    ];
    const daftarKategori = ['infrastruktur', 'sosial', 'administrasi', 'bantuan'];
    const daftarUrgensi = ['low', 'medium', 'high'];
    const daftarStatus = ['pending', 'in_progress', 'resolved'];

    const tanggalAkhir = new Date('2025-11-17T10:00:00.000Z');
    const tanggalAwal = new Date(tanggalAkhir);
    tanggalAwal.setDate(tanggalAkhir.getDate() - 28); // 4 minggu ke belakang

    let jumlahDibuat = 0;
    for (let i = 0; i < 60 && daftarWarga.length; i++) {
      const warga = daftarWarga[i % daftarWarga.length];
      const judul = daftarJudul[i % daftarJudul.length];
      const deskripsi =
        'Laporan otomatis (seed) untuk keperluan demo. Mohon tindak lanjut sesuai prioritas.';
      const lokasi = warga.rtRw || 'RT001/RW005';
      const kategori = daftarKategori[i % daftarKategori.length];
      const urgensi = daftarUrgensi[i % daftarUrgensi.length];
      const status = daftarStatus[i % daftarStatus.length];
      const waktuDibuat = new Date(tanggalAwal.getTime() + ((tanggalAkhir - tanggalAwal) / 60) * i);

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

      // Jika status sudah berubah, tambahkan riwayat tambahan
      if (status === 'in_progress' || status === 'resolved') {
        const waktuInProgress = new Date(waktuDibuat.getTime() + 1000 * 60 * 60 * 6);
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
        const waktuResolved = new Date(waktuDibuat.getTime() + 1000 * 60 * 60 * 24);
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
    console.log(`Seeded reports: ${jumlahDibuat}`);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

jalankan();
