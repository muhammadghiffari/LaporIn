const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');

const DEFAULT_PASSWORD = 'demo123';
const PASSWORD_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const SUPER_ADMIN_EMAIL = 'kepodehlol54@gmail.com';

const STRUCTURE = [
  {
    rw: 'RW001',
    adminEmail: 'arythegodhand@gmail.com',
    rtCount: 2,
    rtEmails: ['suroprikitiw@gmail.com', 'gaminggampang20@gmail.com']
  },
  {
    rw: 'RW002',
    adminEmail: 'syncrazelled@gmail.com',
    rtCount: 2,
    rtEmails: []
  }
];

async function upsertUser(data) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      ...data,
      passwordHash: PASSWORD_HASH,
      isVerified: true
    }
  });
}

async function main() {
  console.log('🌱 Seeding RT/RW structure...');

  const superAdmin = await upsertUser({
    email: SUPER_ADMIN_EMAIL,
    name: 'Admin Kelurahan',
    role: 'admin'
  });

  for (const rwData of STRUCTURE) {
    const adminRw = await upsertUser({
      email: rwData.adminEmail,
      name: `Admin ${rwData.rw}`,
      role: 'admin_rw',
      rtRw: `RT000/${rwData.rw}`,
      createdBy: superAdmin.id
    });

    for (let i = 1; i <= rwData.rtCount; i++) {
      const rtCode = `RT00${i}`;
      const rtRw = `${rtCode}/${rwData.rw}`;

      const customEmail = rwData.rtEmails?.[i - 1];
      const ketuaRt = await upsertUser({
        email: customEmail || `rt${i.toString().padStart(2, '0')}@${rwData.rw.toLowerCase()}.com`,
        name: `Ketua ${rtCode} ${rwData.rw}`,
        role: 'ketua_rt',
        rtRw,
        createdBy: adminRw.id
      });

      for (let w = 1; w <= 10; w++) {
        await upsertUser({
          email: `warga${w}@${rtCode.toLowerCase()}${rwData.rw.toLowerCase()}.com`,
          name: `Warga ${w} ${rtCode} ${rwData.rw}`,
          role: 'warga',
          rtRw,
          createdBy: ketuaRt.id
        });
      }
    }
  }

  console.log('✅ Seeder finished.');
  console.log(`Semua akun menggunakan password default: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

