const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

/**
 * Script untuk update EMAIL_PASS di .env file
 * App Password: gwxrwnsznzveylwf (tanpa spasi)
 */
function updateEmailPassword() {
  const appPassword = 'gwxrwnsznzveylwf'; // App Password tanpa spasi
  const envPath = path.join(__dirname, '../.env');

  console.log('🔧 Update EMAIL_PASS di .env file\n');
  console.log('='.repeat(80));

  try {
    // Baca file .env
    if (!fs.existsSync(envPath)) {
      console.log('❌ File .env tidak ditemukan!');
      console.log('💡 File .env harus ada di: backend/.env');
      return false;
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    let updated = false;

    // Cek apakah EMAIL_PASS sudah ada
    if (envContent.includes('EMAIL_PASS=')) {
      // Update existing EMAIL_PASS
      const regex = /EMAIL_PASS=.*/g;
      envContent = envContent.replace(regex, `EMAIL_PASS=${appPassword}`);
      updated = true;
      console.log('✅ EMAIL_PASS diupdate\n');
    } else {
      // Tambahkan EMAIL_PASS jika belum ada
      console.log('⚠️  EMAIL_PASS belum ada, menambahkan...\n');
      
      // Cek apakah EMAIL_USER atau EMAIL_HOST sudah ada
      if (!envContent.includes('EMAIL_HOST')) {
        envContent += '\n# Email Configuration\n';
        envContent += 'EMAIL_HOST=smtp.gmail.com\n';
        envContent += 'EMAIL_PORT=587\n';
      }
      
      if (!envContent.includes('EMAIL_USER')) {
        // Ambil dari environment atau gunakan default
        const currentEmail = process.env.EMAIL_USER || 'abhisuryanu9roho@gmail.com';
        envContent += `EMAIL_USER=${currentEmail}\n`;
      }
      
      envContent += `EMAIL_PASS=${appPassword}\n`;
      updated = true;
      console.log('✅ EMAIL_PASS ditambahkan\n');
    }

    // Simpan file .env
    fs.writeFileSync(envPath, envContent, 'utf8');

    // Verifikasi
    console.log('📋 Verifikasi konfigurasi email:\n');
    const updatedEnv = require('dotenv').config({ path: envPath }).parsed || {};
    
    console.log(`   EMAIL_HOST: ${updatedEnv.EMAIL_HOST || process.env.EMAIL_HOST || 'N/A'}`);
    console.log(`   EMAIL_PORT: ${updatedEnv.EMAIL_PORT || process.env.EMAIL_PORT || 'N/A'}`);
    console.log(`   EMAIL_USER: ${updatedEnv.EMAIL_USER || process.env.EMAIL_USER || 'N/A'}`);
    console.log(`   EMAIL_PASS: ${updatedEnv.EMAIL_PASS ? '✅ Set (16 karakter)' : '❌ Not set'}`);
    
    if (updatedEnv.EMAIL_PASS) {
      console.log(`   Password length: ${updatedEnv.EMAIL_PASS.length} karakter\n`);
    }

    console.log('='.repeat(80));
    console.log('\n✅ EMAIL_PASS berhasil diupdate!\n');
    console.log('💡 Langkah selanjutnya:');
    console.log('   1. Restart backend server (jika sedang berjalan)');
    console.log('   2. Test email: node scripts/test-email-real.js\n');

    return true;

  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return false;
  }
}

if (require.main === module) {
  const success = updateEmailPassword();
  process.exit(success ? 0 : 1);
}

module.exports = { updateEmailPassword };

