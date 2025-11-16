/* Seed initial users for LaporIn */
const bcrypt = require('bcryptjs');
const pool = require('../database/db');

async function run() {
  const users = [
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

  // Generate 100 warga accounts with variasi RT/RW dan gender
  for (let i = 1; i <= 100; i++) {
    const rt = String(((i - 1) % 5) + 1).padStart(3, '0'); // RT001-RT005
    const rw = '005';
    users.push({
      email: `warga${i}@example.com`,
      name: `Warga ${i}`,
      role: 'warga',
      rt_rw: `RT${rt}/RW${rw}`,
      jenis_kelamin: i % 2 === 0 ? 'laki_laki' : 'perempuan',
      password: 'Warga123!',
    });
  }

  try {
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role, rt_rw, jenis_kelamin)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [u.email, hash, u.name, u.role, u.rt_rw, u.jenis_kelamin]
      );
      console.log(`Seeded user: ${u.email} (${u.role})`);
    }

    // Fetch some user ids for reports
    const wargaRes = await pool.query(
      `SELECT id, rt_rw FROM users WHERE role = 'warga' ORDER BY id LIMIT 100`
    );
    const pengurusRes = await pool.query(
      `SELECT id FROM users WHERE role IN ('pengurus','sekretaris_rt','ketua_rt','admin_rw','admin') ORDER BY id LIMIT 1`
    );
    const pengurusId = pengurusRes.rows[0]?.id || wargaRes.rows[0]?.id;

    // Seed reports across a date range up to 2025-11-17
    const titles = [
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
    const categories = ['infrastruktur', 'sosial', 'administrasi', 'bantuan'];
    const urgencies = ['low', 'medium', 'high'];
    const statuses = ['pending', 'in_progress', 'resolved'];

    const end = new Date('2025-11-17T10:00:00.000Z');
    const start = new Date(end);
    start.setDate(end.getDate() - 28); // 4 minggu ke belakang

    let createdCount = 0;
    for (let i = 0; i < 60 && wargaRes.rows.length; i++) {
      const warga = wargaRes.rows[i % wargaRes.rows.length];
      const title = titles[i % titles.length];
      const description =
        'Laporan otomatis (seed) untuk keperluan demo. Mohon tindak lanjut sesuai prioritas.';
      const location = warga.rt_rw || 'RT001/RW005';
      const category = categories[i % categories.length];
      const urgency = urgencies[i % urgencies.length];
      const status = statuses[i % statuses.length];
      const createdAt = new Date(start.getTime() + ((end - start) / 60) * i);

      const reportInsert = await pool.query(
        `INSERT INTO reports (user_id, title, description, location, category, urgency, ai_summary, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING id`,
        [
          warga.id,
          title,
          description,
          location,
          category,
          urgency,
          `Ringkasan AI: ${title}`,
          status,
          createdAt
        ]
      );
      const reportId = reportInsert.rows[0].id;

      // Initial history: pending at createdAt
      await pool.query(
        `INSERT INTO report_status_history (report_id, status, notes, updated_by, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [reportId, 'pending', 'Laporan dibuat', warga.id, createdAt]
      );

      // If moved forward, add additional history
      if (status === 'in_progress' || status === 'resolved') {
        const t1 = new Date(createdAt.getTime() + 1000 * 60 * 60 * 6);
        await pool.query(
          `INSERT INTO report_status_history (report_id, status, notes, updated_by, created_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [reportId, 'in_progress', 'Penanganan dimulai', pengurusId, t1]
        );
      }
      if (status === 'resolved') {
        const t2 = new Date(createdAt.getTime() + 1000 * 60 * 60 * 24);
        await pool.query(
          `INSERT INTO report_status_history (report_id, status, notes, updated_by, created_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [reportId, 'resolved', 'Selesai ditangani', pengurusId, t2]
        );
      }

      // Log AI processing
      await pool.query(
        `INSERT INTO ai_processing_log (report_id, original_text, ai_summary, ai_category, ai_urgency, processing_time_ms, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          reportId,
          `${title}. ${description}`,
          `Ringkasan AI: ${title}`,
          category,
          urgency,
          Math.floor(Math.random() * 300) + 120,
          createdAt
        ]
      );
      createdCount++;
    }
    console.log(`Seeded reports: ${createdCount}`);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();


