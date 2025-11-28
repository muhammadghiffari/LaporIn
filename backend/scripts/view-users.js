require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function viewUsers() {
  console.log('👥 Melihat Data User di Database\n');
  console.log('='.repeat(80));

  try {
    // 1. Total users
    const totalUsers = await prisma.user.count();
    console.log(`\n📊 Total User: ${totalUsers}\n`);

    // 2. Breakdown per role
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    console.log('📋 Breakdown User per Role:');
    roleCounts.forEach(({ role, _count }) => {
      console.log(`   ${role.padEnd(20)}: ${_count.id} user`);
    });
    console.log('');

    // 3. Breakdown per RT/RW
    const rtRwCounts = await prisma.user.groupBy({
      by: ['rtRw'],
      _count: { id: true },
      where: {
        rtRw: { not: null }
      },
      orderBy: { rtRw: 'asc' }
    });

    console.log('📍 Breakdown User per RT/RW:');
    rtRwCounts.forEach(({ rtRw, _count }) => {
      console.log(`   ${rtRw.padEnd(15)}: ${_count.id} user`);
    });
    console.log('');

    // 4. User dengan email real
    const realEmailUsers = await prisma.user.findMany({
      where: {
        email: {
          not: { contains: '@example' }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rtRw: true,
        isVerified: true
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }]
    });

    console.log(`📧 User dengan Email Real (${realEmailUsers.length} user):`);
    realEmailUsers.forEach((user, index) => {
      console.log(`\n   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      Role: ${user.role}`);
      console.log(`      RT/RW: ${user.rtRw || 'N/A'}`);
      console.log(`      Verified: ${user.isVerified ? '✅' : '❌'}`);
    });
    console.log('');

    // 5. Detail semua user
    console.log('\n📝 Detail Semua User:\n');
    const allUsers = await prisma.user.findMany({
      include: {
        _count: {
          select: { reports: true }
        }
      },
      orderBy: [
        { role: 'asc' },
        { rtRw: 'asc' },
        { name: 'asc' }
      ]
    });

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   RT/RW: ${user.rtRw || 'N/A'}`);
      console.log(`   Verified: ${user.isVerified ? '✅' : '❌'}`);
      console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
      console.log(`   Jumlah Laporan: ${user._count.reports}`);
      console.log(`   Created: ${user.createdAt.toLocaleString('id-ID')}`);
      console.log('');
    });

    // 6. User untuk RT001/RW001
    console.log('\n🏘️  User untuk RT001/RW001:\n');
    const rt001Users = await prisma.user.findMany({
      where: {
        rtRw: 'RT001/RW001'
      },
      include: {
        _count: {
          select: { reports: true }
        }
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }]
    });

    rt001Users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Verified: ${user.isVerified ? '✅' : '❌'}`);
      console.log(`   Jumlah Laporan: ${user._count.reports}`);
      console.log('');
    });

    // 7. Info koneksi untuk Workbench
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Info Koneksi untuk Workbench (pgAdmin, DBeaver, dll):\n');
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
      if (match) {
        const [, user, password, host, port, database] = match;
        console.log(`   Host: ${host}`);
        console.log(`   Port: ${port}`);
        console.log(`   Database: ${database}`);
        console.log(`   Username: ${user}`);
        console.log(`   Password: ${password}`);
        console.log(`\n   📄 File SQL tersedia di: backend/scripts/view-users.sql`);
        console.log(`   Jalankan query dari file tersebut di Workbench Anda!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  viewUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { viewUsers };

