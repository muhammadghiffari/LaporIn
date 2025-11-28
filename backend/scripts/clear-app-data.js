const prisma = require('../database/prisma');

/**
 * Truncate application tables while keeping AI training / log tables intact.
 * - Keeps: chatbot_conversations, chatbot_training_data, ai_processing_log, fraud_detection_logs
 * - Clears: users, reports, bantuan, report_status_history, email_verification_codes, face_verification_logs, etc.
 */
async function main() {
  console.log('🔄 Clearing application data (AI training tables preserved)...');

  const tables = [
    'report_status_history',
    'bantuan',
    'reports',
    'email_verification_codes',
    'face_verification_logs',
    'users'
  ];

  const truncateSql = `
    TRUNCATE TABLE
      ${tables.join(',\n      ')}
    RESTART IDENTITY CASCADE;
  `;

  await prisma.$executeRawUnsafe(truncateSql);

  console.log('✅ Done! Application data cleared, AI-related tables untouched.');
}

main()
  .catch((err) => {
    console.error('❌ Failed to clear data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

