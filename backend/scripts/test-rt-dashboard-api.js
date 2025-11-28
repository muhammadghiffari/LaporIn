/**
 * Test RT Dashboard API
 * 
 * Simulate API call sebagai Ketua RT dan lihat response
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

async function testRTDashboard() {
  try {
    console.log('🧪 Testing RT Dashboard API...\n');
    
    // 1. Login sebagai Ketua RT
    console.log('1️⃣  Login sebagai Ketua RT...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'arythegodhand@gmail.com',
      password: 'demo123'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login berhasil\n');
    
    // 2. Get reports sebagai Ketua RT
    console.log('2️⃣  Get reports sebagai Ketua RT...');
    const reportsResponse = await axios.get(`${API_BASE_URL}/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('   Response structure:', typeof reportsResponse.data);
    
    let reports = [];
    if (Array.isArray(reportsResponse.data)) {
      reports = reportsResponse.data;
    } else if (reportsResponse.data?.data) {
      reports = reportsResponse.data.data;
    }
    
    console.log(`   Total reports received: ${reports.length}\n`);
    
    if (reports.length > 0) {
      console.log('3️⃣  Sample reports:');
      reports.slice(0, 5).forEach((r, idx) => {
        console.log(`\n   Report #${idx + 1}:`);
        console.log(`   - ID: ${r.id}`);
        console.log(`   - Title: ${r.title}`);
        console.log(`   - Status: ${r.status}`);
        console.log(`   - RT/RW: ${r.rt_rw || 'N/A'}`);
        console.log(`   - User: ${r.user_name || 'N/A'}`);
      });
      
      // 4. Filter pending/in_progress
      const pendingReports = reports.filter(r => {
        const status = (r.status || '').toLowerCase();
        return status === 'pending' || status === 'in_progress';
      });
      
      console.log(`\n4️⃣  Reports dengan status pending/in_progress: ${pendingReports.length}`);
      if (pendingReports.length > 0) {
        pendingReports.forEach(r => {
          console.log(`   - Report #${r.id}: ${r.title} (${r.status})`);
        });
      }
    } else {
      console.log('3️⃣  ❌ Tidak ada reports!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testRTDashboard();

