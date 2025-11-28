const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter (Gmail SMTP untuk demo)
let transporter = null;

function initEmailService() {
  try {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // App password untuk Gmail
        }
      });
      console.log('✅ Email service initialized successfully');
      return true;
    } else {
      console.warn('⚠️  Email service not configured - Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env');
      return false;
    }
  } catch (error) {
    console.error('❌ Email service initialization error:', error.message);
    return false;
  }
}

// Initialize on module load
const isEmailEnabled = initEmailService();

/**
 * Replace template variables dengan data real
 */
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

/**
 * Template: Laporan Baru (ke Admin/Pengurus)
 */
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

/**
 * Template: Status Update (ke Warga)
 */
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

/**
 * Template: Laporan Selesai (ke Warga)
 */
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

/**
 * Kirim email laporan baru ke admin/pengurus
 */
async function sendEmailLaporanBaru(report, reporter) {
  if (!isEmailEnabled || !transporter) {
    console.log('[Email] Service not enabled, skipping email notification');
    return { success: false, reason: 'Email service not configured' };
  }

  try {
    const prisma = require('../database/prisma');
    const rtRwLaporan = report.user?.rtRw || reporter.rtRw || null;
    
    // KEAMANAN: Cek apakah laporan sensitif
    const isSensitive = report.isSensitive === true || report.isSensitive === 'true' || false;
    
    if (isSensitive) {
      // Laporan sensitif: HANYA kirim ke Superadmin (admin/admin_sistem)
      // TIDAK kirim ke admin RT/RW untuk menjaga privasi
      console.log('[Email] ⚠️ Laporan SENSITIF terdeteksi - hanya mengirim ke Superadmin');
      
      const superAdmins = await prisma.user.findMany({
        where: {
          role: {
            in: ['admin', 'admin_sistem']
          },
          email: { not: null }
        },
        select: {
          email: true,
          name: true,
          role: true
        }
      });

      if (superAdmins.length === 0) {
        console.log('[Email] No superadmins found for sensitive report');
        return { success: false, reason: 'No superadmins found' };
      }

      console.log(`[Email] Sending SENSITIVE report notification to ${superAdmins.length} superadmin(s) only`);

      const template = getTemplateLaporanBaru();
      const emailContent = replaceTemplateVariables(template, {
        namaWarga: reporter.name,
        judulLaporan: report.title,
        deskripsi: report.description,
        lokasi: report.location,
        tanggal: new Date(report.createdAt).toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        rtRw: rtRwLaporan || '',
        linkDetail: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}`,
        reportId: report.id
      });

      // Send email hanya ke superadmin dengan peringatan SENSITIF
      const emailPromises = superAdmins.map(admin => {
        return transporter.sendMail({
          from: `"LaporIn System" <${process.env.EMAIL_USER}>`,
          to: admin.email,
          subject: `🔒 [SENSITIF] Laporan Baru dari ${reporter.name} - RT/RW ${rtRwLaporan || 'Tidak diketahui'}`,
          text: emailContent.replace(/<[^>]*>/g, ''),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
                <p style="color: #991B1B; font-weight: bold; margin: 0;">🔒 LAPORAN SENSITIF/RAHASIA</p>
                <p style="color: #7F1D1D; margin: 4px 0 0 0; font-size: 14px;">Laporan ini bersifat sensitif. Hanya Superadmin yang menerima notifikasi ini.</p>
              </div>
              <h2 style="color: #3B82F6;">🔔 Laporan Baru dari ${reporter.name}</h2>
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📋 Judul:</strong> ${report.title}</p>
                <p><strong>📍 Lokasi:</strong> ${report.location || 'Tidak disebutkan'}</p>
                <p><strong>📝 Deskripsi:</strong></p>
                <p>${report.description}</p>
                <p><strong>📅 Tanggal:</strong> ${new Date(report.createdAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                <p><strong>Kategori:</strong> ${report.category || 'Tidak disebutkan'}</p>
                <p><strong>Urgensi:</strong> ${report.urgency || 'Tidak disebutkan'}</p>
              </div>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}" 
                 style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Lihat Detail Laporan
              </a>
              <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
                Notifikasi untuk Superadmin - Laporan Sensitif
              </p>
            </div>
          `
        });
      });

      await Promise.all(emailPromises);
      console.log(`[Email] ✅ Sent SENSITIVE report notification to ${superAdmins.length} superadmin(s) only`);
      
      return { success: true, sentTo: superAdmins.length, isSensitive: true };
    }
    
    // Laporan NON-SENSITIF: Kirim ke semua admin RT/RW + Superadmin (normal flow)
    // Get semua admin/pengurus RT/RW yang sama
    const adminsRT_RW = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus']
        },
        rtRw: rtRwLaporan,
        email: { not: null }
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    });

    // Get semua superadmin (admin/admin_sistem) - terlepas dari RT/RW
    const superAdmins = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'admin_sistem']
        },
        email: { not: null }
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    });

    // Gabungkan semua penerima email
    const allRecipients = [...adminsRT_RW, ...superAdmins];
    
    // Hapus duplikat berdasarkan email (jika ada admin yang juga superadmin)
    const uniqueRecipients = Array.from(
      new Map(allRecipients.map(admin => [admin.email, admin])).values()
    );

    if (uniqueRecipients.length === 0) {
      console.log('[Email] No admins found for RT/RW:', rtRwLaporan);
      return { success: false, reason: 'No admins found' };
    }

    console.log(`[Email] Sending notification to ${uniqueRecipients.length} recipient(s):`, {
      rtRwAdmins: adminsRT_RW.length,
      superAdmins: superAdmins.length,
      total: uniqueRecipients.length
    });

    const template = getTemplateLaporanBaru();
    const emailContent = replaceTemplateVariables(template, {
      namaWarga: reporter.name,
      judulLaporan: report.title,
      deskripsi: report.description,
      lokasi: report.location,
      tanggal: new Date(report.createdAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      rtRw: rtRwLaporan || '',
      linkDetail: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}`,
      reportId: report.id
    });

    // Send email ke semua admin (RT/RW + Superadmin)
    const emailPromises = uniqueRecipients.map(admin => {
      const isSuperAdmin = admin.role === 'admin' || admin.role === 'admin_sistem';
      const roleLabel = isSuperAdmin ? 'Superadmin' : 
                       admin.role === 'admin_rw' ? 'Admin RW' :
                       admin.role === 'ketua_rt' ? 'Ketua RT' :
                       admin.role === 'sekretaris_rt' ? 'Sekretaris RT' :
                       admin.role === 'sekretaris' ? 'Sekretaris' :
                       admin.role === 'pengurus' ? 'Pengurus' : admin.role;
      
      return transporter.sendMail({
        from: `"LaporIn System" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: `📋 Laporan Baru dari ${reporter.name} - RT/RW ${rtRwLaporan || 'Tidak diketahui'}`,
        text: emailContent.replace(/<[^>]*>/g, ''), // Remove HTML tags for text version
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">🔔 Laporan Baru dari ${reporter.name}</h2>
            ${isSuperAdmin ? '<p style="background: #FEF3C7; padding: 8px; border-radius: 4px; color: #92400E;"><strong>📌 Notifikasi Superadmin:</strong> Laporan ini dikirim ke semua superadmin untuk monitoring.</p>' : ''}
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📋 Judul:</strong> ${report.title}</p>
              <p><strong>👤 Pelapor:</strong> ${reporter.name}</p>
              <p><strong>📍 Lokasi:</strong> ${report.location || 'Tidak disebutkan'}</p>
              <p><strong>🏘️ RT/RW:</strong> ${rtRwLaporan || 'Tidak diketahui'}</p>
              <p><strong>📝 Deskripsi:</strong></p>
              <p>${report.description}</p>
              <p><strong>📅 Tanggal:</strong> ${new Date(report.createdAt).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${report.category ? `<p><strong>🏷️ Kategori:</strong> ${report.category}</p>` : ''}
              ${report.urgency ? `<p><strong>⚡ Urgensi:</strong> ${report.urgency}</p>` : ''}
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}" 
               style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">
              Lihat Detail Laporan
            </a>
            <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
              Anda menerima email ini sebagai ${roleLabel}${rtRwLaporan ? ` untuk RT/RW ${rtRwLaporan}` : ''}
            </p>
          </div>
        `
      });
    });

    await Promise.all(emailPromises);
    console.log(`[Email] ✅ Sent new report notification to ${uniqueRecipients.length} recipient(s) (${adminsRT_RW.length} RT/RW admins + ${superAdmins.length} superadmins)`);
    
    return { success: true, sentTo: uniqueRecipients.length, rtRwAdmins: adminsRT_RW.length, superAdmins: superAdmins.length };
  } catch (error) {
    console.error('[Email] Error sending new report notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Kirim email status update ke warga
 */
async function sendEmailStatusUpdate(report, reporter, oldStatus, newStatus) {
  if (!isEmailEnabled || !transporter) {
    console.log('[Email] Service not enabled, skipping email notification');
    return { success: false, reason: 'Email service not configured' };
  }

  try {
    // Skip jika status sama atau tidak ada email
    if (!reporter.email || oldStatus === newStatus) {
      return { success: false, reason: 'No email or status unchanged' };
    }

    let template;
    let subject;

    if (newStatus === 'completed' || newStatus === 'resolved') {
      template = getTemplateLaporanSelesai();
      subject = `🎉 Laporan Anda Telah Diselesaikan!`;
    } else {
      template = getTemplateStatusUpdate();
      subject = `✅ Update Status Laporan Anda`;
    }

    const emailContent = replaceTemplateVariables(template, {
      namaWarga: reporter.name,
      judulLaporan: report.title,
      deskripsi: report.description,
      lokasi: report.location,
      status: newStatus === 'in_progress' ? 'Sedang Diproses' : 
              newStatus === 'completed' ? 'Selesai' :
              newStatus === 'resolved' ? 'Selesai' :
              newStatus === 'rejected' ? 'Ditolak' : newStatus,
      tanggal: new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      rtRw: report.user?.rtRw || reporter.rtRw || '',
      linkDetail: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}`,
      reportId: report.id
    });

    const statusLabel = newStatus === 'in_progress' ? 'Sedang Diproses' : 
                        newStatus === 'completed' ? 'Selesai' :
                        newStatus === 'resolved' ? 'Selesai' :
                        newStatus === 'rejected' ? 'Ditolak' : newStatus;

    await transporter.sendMail({
      from: `"LaporIn System" <${process.env.EMAIL_USER}>`,
      to: reporter.email,
      subject: subject,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">${subject}</h2>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📋 Judul:</strong> ${report.title}</p>
            <p><strong>📊 Status:</strong> <span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px;">${statusLabel}</span></p>
            <p><strong>📍 Lokasi:</strong> ${report.location || 'Tidak disebutkan'}</p>
            <p><strong>📝 Deskripsi:</strong></p>
            <p>${report.description}</p>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}" 
             style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Lihat Detail Laporan
          </a>
          <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
            RT/RW ${report.user?.rtRw || reporter.rtRw || ''}
          </p>
        </div>
      `
    });

    console.log(`[Email] ✅ Sent status update notification to ${reporter.email}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Error sending status update notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Broadcast email ke semua warga RT/RW (untuk update penting)
 */
async function broadcastEmailKeWarga(rtRw, subject, message) {
  if (!isEmailEnabled || !transporter) {
    console.log('[Email] Service not enabled, skipping broadcast');
    return { success: false, reason: 'Email service not configured' };
  }

  try {
    const prisma = require('../database/prisma');
    const wargas = await prisma.user.findMany({
      where: {
        role: 'warga',
        rtRw: rtRw,
        email: { not: null }
      },
      select: {
        email: true,
        name: true
      }
    });

    if (wargas.length === 0) {
      return { success: false, reason: 'No warga found' };
    }

    const emailPromises = wargas.map(warga => {
      const personalizedMessage = message.replace('{nama_warga}', warga.name);
      
      return transporter.sendMail({
        from: `"LaporIn System" <${process.env.EMAIL_USER}>`,
        to: warga.email,
        subject: subject,
        text: personalizedMessage,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">${subject}</h2>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>${personalizedMessage.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
              RT/RW ${rtRw}
            </p>
          </div>
        `
      });
    });

    await Promise.all(emailPromises);
    console.log(`[Email] ✅ Broadcast sent to ${wargas.length} warga(s)`);
    
    return { success: true, sentTo: wargas.length };
  } catch (error) {
    console.error('[Email] Error broadcasting email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send verification code email
 */
async function sendVerificationCodeEmail(email, code, type = 'registration') {
  if (!isEmailEnabled || !transporter) {
    console.log('[Email] Service not enabled, skipping email notification');
    return { success: false, reason: 'Email service not configured' };
  }

  try {
    const subject = type === 'registration' 
      ? '🔐 Kode Verifikasi Email - Registrasi LaporIn'
      : '🔐 Kode Verifikasi Email - Ubah Email LaporIn';

    const purpose = type === 'registration'
      ? 'mendaftarkan akun baru di LaporIn'
      : 'mengubah alamat email Anda di LaporIn';

    await transporter.sendMail({
      from: `"LaporIn System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: `
Kode Verifikasi Email LaporIn

Kode verifikasi Anda adalah: ${code}

Kode ini berlaku selama 10 menit.

Gunakan kode ini untuk ${purpose}.

Jika Anda tidak meminta kode ini, abaikan email ini.

Jangan bagikan kode ini kepada siapa pun.

---
LaporIn - Sistem Pelaporan Warga
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">${subject}</h2>
          <div style="background: #F3F4F6; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #6B7280; margin-bottom: 20px;">Kode verifikasi Anda:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; border: 2px dashed #3B82F6;">
              <p style="font-size: 32px; font-weight: bold; color: #3B82F6; letter-spacing: 8px; margin: 0;">${code}</p>
            </div>
            <p style="font-size: 12px; color: #9CA3AF; margin-top: 20px;">Kode ini berlaku selama 10 menit</p>
          </div>
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0; font-size: 14px; color: #92400E;">
              <strong>⚠️ Penting:</strong> Jangan bagikan kode ini kepada siapa pun. Tim LaporIn tidak akan pernah meminta kode verifikasi Anda.
            </p>
          </div>
          <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
            Gunakan kode ini untuk ${purpose}. Jika Anda tidak meminta kode ini, abaikan email ini.
          </p>
          <p style="color: #9CA3AF; margin-top: 20px; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
            LaporIn - Sistem Pelaporan Warga<br>
            Kode ini otomatis di-generate oleh sistem
          </p>
        </div>
      `
    });

    console.log(`[Email] ✅ Verification code sent to ${email}`);
    return { success: true };

  } catch (error) {
    console.error('[Email] Error sending verification code:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Kirim email notifikasi location mismatch ke admin RT/RW
 */
async function sendEmailLocationMismatch(report, reporter, distanceMeters) {
  if (!isEmailEnabled || !transporter) {
    console.log('[Email] Service not enabled, skipping location mismatch notification');
    return { success: false, reason: 'Email service not configured' };
  }

  try {
    // Get semua admin/pengurus RT/RW yang sama
    const prisma = require('../database/prisma');
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus', 'admin_sistem']
        },
        rtRw: report.user?.rtRw || reporter.rtRw || null
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    });

    if (admins.length === 0) {
      console.log('[Email] No admins found for RT/RW:', report.user?.rtRw);
      return { success: false, reason: 'No admins found' };
    }

    const reportLink = report.id 
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports/${report.id}`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;

    // Send email ke semua admin
    const emailPromises = admins.map(admin => {
      return transporter.sendMail({
        from: `"LaporIn System" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: `⚠️ Peringatan: Laporan di Luar Boundary RT/RW`,
        text: `
⚠️ PERINGATAN: Lokasi Laporan di Luar Boundary

Halo ${admin.name},

Sebuah laporan baru dari ${reporter.name} memiliki lokasi yang berada di luar boundary RT/RW ${report.user?.rtRw || reporter.rtRw || ''}.

📋 Detail Laporan:
- Judul: ${report.title}
- Lokasi: ${report.location || 'Tidak disebutkan'}
- Koordinat: ${report.latitude ? `${report.latitude}, ${report.longitude}` : 'Tidak tersedia'}
- Jarak dari center RT/RW: ${distanceMeters}m

⚠️ Tindakan yang Disarankan:
1. Verifikasi lokasi laporan apakah benar
2. Jika lokasi benar, pertimbangkan untuk memperluas boundary RT/RW
3. Jika lokasi salah, hubungi warga untuk memperbaiki lokasi

${report.id ? `Lihat detail laporan: ${reportLink}` : 'Laporan sedang dalam proses pembuatan.'}

---
Sistem LaporIn
        `.trim(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #92400E; margin: 0;">⚠️ Peringatan: Lokasi di Luar Boundary</h2>
            </div>
            
            <p>Halo <strong>${admin.name}</strong>,</p>
            
            <p>Sebuah laporan baru dari <strong>${reporter.name}</strong> memiliki lokasi yang berada di luar boundary RT/RW <strong>${report.user?.rtRw || reporter.rtRw || ''}</strong>.</p>
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #111827; margin-top: 0;">📋 Detail Laporan</h3>
              <p><strong>Judul:</strong> ${report.title}</p>
              <p><strong>Lokasi:</strong> ${report.location || 'Tidak disebutkan'}</p>
              ${report.latitude ? `<p><strong>Koordinat:</strong> ${report.latitude}, ${report.longitude}</p>` : ''}
              <p><strong>Jarak dari center RT/RW:</strong> <span style="color: #DC2626; font-weight: bold;">${distanceMeters}m</span></p>
            </div>
            
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400E; margin-top: 0;">⚠️ Tindakan yang Disarankan</h3>
              <ol style="color: #78350F;">
                <li>Verifikasi lokasi laporan apakah benar</li>
                <li>Jika lokasi benar, pertimbangkan untuk memperluas boundary RT/RW</li>
                <li>Jika lokasi salah, hubungi warga untuk memperbaiki lokasi</li>
              </ol>
            </div>
            
            ${report.id ? `
              <a href="${reportLink}" 
                 style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                Lihat Detail Laporan
              </a>
            ` : ''}
            
            <p style="color: #6B7280; margin-top: 20px; font-size: 14px;">
              RT/RW ${report.user?.rtRw || reporter.rtRw || ''}
            </p>
          </div>
        `
      });
    });

    await Promise.all(emailPromises);
    console.log(`[Email] ✅ Sent location mismatch notification to ${admins.length} admin(s)`);
    
    return { success: true, sentTo: admins.length };
  } catch (error) {
    console.error('[Email] Error sending location mismatch notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  isEmailEnabled: isEmailEnabled,
  sendEmailLaporanBaru,
  sendEmailStatusUpdate,
  broadcastEmailKeWarga,
  sendVerificationCodeEmail,
  sendEmailLocationMismatch,
  initEmailService
};

