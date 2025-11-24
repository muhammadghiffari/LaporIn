/**
 * Test Script untuk User Verification Feature
 * 
 * Cara menjalankan:
 * 1. Pastikan backend server sudah running
 * 2. Pastikan database sudah ter-setup
 * 3. Jalankan: node backend/test-user-verification.js
 */

const axios = require('axios');
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

// Test data
let adminToken = '';
let wargaToken = '';
let wargaId = null;
let testWargaEmail = `test-warga-${Date.now()}@test.com`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testStep(stepName, testFn) {
  logInfo(`\n[TEST] ${stepName}`);
  try {
    await testFn();
    logSuccess(`${stepName} - PASSED`);
    return true;
  } catch (error) {
    logError(`${stepName} - FAILED`);
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

async function main() {
  log('\n========================================');
  log('🧪 USER VERIFICATION FEATURE TEST');
  log('========================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Login sebagai Admin RW
  const test1 = await testStep('1. Login sebagai Admin RW', async () => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com', // Ganti dengan email admin yang ada
      password: 'admin123' // Ganti dengan password admin yang benar
    });
    
    if (!response.data.token) {
      throw new Error('Token tidak diterima');
    }
    
    adminToken = response.data.token;
    logInfo(`Admin token: ${adminToken.substring(0, 20)}...`);
  });

  if (!test1) {
    logWarning('Test 1 gagal. Pastikan ada user admin dengan email admin@example.com dan password admin123');
    logWarning('Atau ubah credentials di test script sesuai dengan data yang ada.');
    return;
  }
  passed++;

  // Test 2: Registrasi warga baru (belum diverifikasi)
  const test2 = await testStep('2. Registrasi warga baru', async () => {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: testWargaEmail,
      password: 'warga123',
      name: 'Test Warga',
      role: 'warga',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'laki_laki',
      faceDescriptor: JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5]) // Mock face descriptor
    });
    
    if (!response.data.token) {
      throw new Error('Token tidak diterima');
    }
    
    wargaToken = response.data.token;
    wargaId = response.data.user.id;
    logInfo(`Warga ID: ${wargaId}, Email: ${testWargaEmail}`);
  });

  if (!test2) {
    failed++;
    return;
  }
  passed++;

  // Test 3: Cek status verifikasi warga (harus false)
  const test3 = await testStep('3. Cek status verifikasi warga baru (harus false)', async () => {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${wargaToken}` }
    });
    
    if (response.data.is_verified !== false) {
      throw new Error(`Expected is_verified: false, got: ${response.data.is_verified}`);
    }
    
    logInfo(`Status verifikasi: ${response.data.is_verified}`);
  });

  if (test3) passed++; else failed++;

  // Test 4: Warga belum diverifikasi tidak bisa membuat laporan
  const test4 = await testStep('4. Warga belum diverifikasi tidak bisa membuat laporan', async () => {
    try {
      await axios.post(`${BASE_URL}/reports`, {
        title: 'Test Laporan',
        description: 'Ini adalah test laporan',
        location: 'Jl Test No 123',
        category: 'infrastruktur',
        urgency: 'medium'
      }, {
        headers: { Authorization: `Bearer ${wargaToken}` }
      });
      
      throw new Error('Seharusnya gagal membuat laporan karena belum diverifikasi');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        logInfo('Validasi bekerja: Warga tidak bisa membuat laporan');
        return; // Expected error
      }
      throw error;
    }
  });

  if (test4) passed++; else failed++;

  // Test 5: Admin melihat daftar warga yang perlu diverifikasi
  const test5 = await testStep('5. Admin melihat daftar warga pending verification', async () => {
    const response = await axios.get(`${BASE_URL}/auth/warga/pending-verification`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!Array.isArray(response.data.pendingWarga)) {
      throw new Error('Response bukan array');
    }
    
    const foundWarga = response.data.pendingWarga.find(w => w.id === wargaId);
    if (!foundWarga) {
      throw new Error('Warga baru tidak ditemukan di daftar pending');
    }
    
    logInfo(`Ditemukan ${response.data.total} warga yang perlu diverifikasi`);
  });

  if (test5) passed++; else failed++;

  // Test 6: Admin memverifikasi warga (approve)
  const test6 = await testStep('6. Admin memverifikasi warga (approve)', async () => {
    const response = await axios.post(`${BASE_URL}/auth/warga/${wargaId}/verify`, {
      approved: true,
      notes: 'Warga sudah diverifikasi melalui test script'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!response.data.success) {
      throw new Error('Verifikasi gagal');
    }
    
    if (!response.data.warga.isVerified) {
      throw new Error('Status isVerified masih false setelah verifikasi');
    }
    
    logInfo(`Warga ${response.data.warga.name} berhasil diverifikasi`);
  });

  if (test6) passed++; else failed++;

  // Test 7: Cek status verifikasi setelah approve (harus true)
  const test7 = await testStep('7. Cek status verifikasi setelah approve (harus true)', async () => {
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${wargaToken}` }
    });
    
    if (response.data.is_verified !== true) {
      throw new Error(`Expected is_verified: true, got: ${response.data.is_verified}`);
    }
    
    if (!response.data.verified_at) {
      throw new Error('verified_at tidak ada');
    }
    
    logInfo(`Status verifikasi: ${response.data.is_verified}`);
    logInfo(`Diverifikasi pada: ${response.data.verified_at}`);
  });

  if (test7) passed++; else failed++;

  // Test 8: Warga sudah diverifikasi bisa membuat laporan
  const test8 = await testStep('8. Warga sudah diverifikasi bisa membuat laporan', async () => {
    const response = await axios.post(`${BASE_URL}/reports`, {
      title: 'Test Laporan Setelah Verifikasi',
      description: 'Ini adalah test laporan setelah verifikasi',
      location: 'Jl Test No 123',
      category: 'infrastruktur',
      urgency: 'medium'
    }, {
      headers: { Authorization: `Bearer ${wargaToken}` }
    });
    
    if (!response.data.id) {
      throw new Error('Laporan tidak berhasil dibuat');
    }
    
    logInfo(`Laporan berhasil dibuat dengan ID: ${response.data.id}`);
  });

  if (test8) passed++; else failed++;

  // Test 9: Admin tidak bisa verifikasi warga yang sudah diverifikasi lagi
  const test9 = await testStep('9. Admin tidak bisa verifikasi warga yang sudah diverifikasi lagi', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/warga/${wargaId}/verify`, {
        approved: true
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      throw new Error('Seharusnya gagal karena warga sudah diverifikasi');
    } catch (error) {
      if (error.response?.status === 400) {
        logInfo('Validasi bekerja: Tidak bisa verifikasi ulang');
        return; // Expected error
      }
      throw error;
    }
  });

  if (test9) passed++; else failed++;

  // Test 10: Test reject verification
  const test10 = await testStep('10. Test reject verification (buat warga baru lagi)', async () => {
    // Buat warga baru untuk test reject
    const rejectWargaEmail = `test-reject-${Date.now()}@test.com`;
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: rejectWargaEmail,
      password: 'warga123',
      name: 'Test Warga Reject',
      role: 'warga',
      rt_rw: 'RT001/RW005',
      jenis_kelamin: 'perempuan',
      faceDescriptor: JSON.stringify([0.6, 0.7, 0.8, 0.9, 1.0])
    });
    
    const rejectWargaId = registerResponse.data.user.id;
    
    // Reject verification
    const rejectResponse = await axios.post(`${BASE_URL}/auth/warga/${rejectWargaId}/verify`, {
      approved: false,
      notes: 'Test reject - data tidak valid'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (rejectResponse.data.warga.isVerified !== false) {
      throw new Error('Status isVerified harus false setelah reject');
    }
    
    logInfo(`Warga ${rejectWargaId} ditolak dengan alasan: ${rejectResponse.data.warga.verificationNotes}`);
  });

  if (test10) passed++; else failed++;

  // Summary
  log('\n========================================');
  log('📊 TEST SUMMARY');
  log('========================================');
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  logInfo(`Total: ${passed + failed}`);
  log('\n');

  if (failed === 0) {
    logSuccess('🎉 Semua test berhasil!');
  } else {
    logError('⚠️  Beberapa test gagal. Silakan periksa error di atas.');
  }
}

// Run tests
main().catch(error => {
  logError('Fatal error:', error);
  process.exit(1);
});

