const prisma = require('../database/prisma');
const { sendVerificationCodeEmail } = require('./emailService');

/**
 * Generate random 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification code via email
 * @param {string} email - Email address
 * @param {string} type - 'registration' | 'change_email'
 * @param {number|null} userId - User ID (null for registration, set for change email)
 * @returns {Promise<{success: boolean, codeId?: number, error?: string}>}
 */
async function sendVerificationCode(email, type = 'registration', userId = null) {
  try {
    // Validate type
    if (!['registration', 'change_email'].includes(type)) {
      return { success: false, error: 'Invalid verification type' };
    }

    // Check if email already exists (for registration only)
    if (type === 'registration') {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
      if (existingUser) {
        return { success: false, error: 'Email sudah terdaftar' };
      }
    }

    // Check for existing unverified code (within 1 minute) - prevent spam
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const existingCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        type,
        verified: false,
        createdAt: { gte: oneMinuteAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingCode) {
      return { 
        success: false, 
        error: 'Kode verifikasi sudah dikirim. Silakan cek email Anda. Tunggu 1 menit sebelum meminta kode baru.' 
      };
    }

    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old codes for this email+type
    await prisma.emailVerificationCode.updateMany({
      where: {
        email,
        type,
        verified: false
      },
      data: {
        verified: true // Mark as used/invalid
      }
    });

    // Create new verification code
    const verificationCode = await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        type,
        userId,
        expiresAt,
        verified: false
      }
    });

    // Send email
    const emailSent = await sendVerificationCodeEmail(email, code, type);

    if (!emailSent.success) {
      // Delete code if email failed
      await prisma.emailVerificationCode.delete({
        where: { id: verificationCode.id }
      });
      return { success: false, error: emailSent.error || 'Gagal mengirim email' };
    }

    console.log(`[Email Verification] Code sent to ${email} (${type}) - Code ID: ${verificationCode.id}`);

    return { 
      success: true, 
      codeId: verificationCode.id,
      message: 'Kode verifikasi telah dikirim ke email Anda'
    };

  } catch (error) {
    console.error('[Email Verification] Error sending code:', error);
    return { success: false, error: error.message || 'Gagal mengirim kode verifikasi' };
  }
}

/**
 * Verify code
 * @param {string} email - Email address
 * @param {string} code - 6-digit code
 * @param {string} type - 'registration' | 'change_email'
 * @returns {Promise<{success: boolean, codeId?: number, error?: string}>}
 */
async function verifyCode(email, code, type = 'registration') {
  try {
    // Find valid code
    const verificationCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        code,
        type,
        verified: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verificationCode) {
      // Check if code exists but expired
      const expiredCode = await prisma.emailVerificationCode.findFirst({
        where: {
          email,
          code,
          type
        },
        orderBy: { createdAt: 'desc' }
      });

      if (expiredCode && expiredCode.expiresAt < new Date()) {
        return { success: false, error: 'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.' };
      }

      return { success: false, error: 'Kode verifikasi tidak valid' };
    }

    // Mark as verified
    await prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { verified: true }
    });

    console.log(`[Email Verification] Code verified for ${email} (${type}) - Code ID: ${verificationCode.id}`);

    return { 
      success: true, 
      codeId: verificationCode.id,
      userId: verificationCode.userId
    };

  } catch (error) {
    console.error('[Email Verification] Error verifying code:', error);
    return { success: false, error: error.message || 'Gagal memverifikasi kode' };
  }
}

/**
 * Clean up expired codes (cron job)
 */
async function cleanupExpiredCodes() {
  try {
    const result = await prisma.emailVerificationCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        verified: false
      }
    });

    if (result.count > 0) {
      console.log(`[Email Verification] Cleaned up ${result.count} expired codes`);
    }

    return { success: true, deleted: result.count };
  } catch (error) {
    console.error('[Email Verification] Error cleaning up codes:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  verifyCode,
  cleanupExpiredCodes
};

