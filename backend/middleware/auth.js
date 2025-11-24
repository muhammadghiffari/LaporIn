const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Middleware untuk require verified user (khusus untuk role warga)
const requireVerified = async (req, res, next) => {
  try {
    const prisma = require('../database/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        role: true,
        isVerified: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Jika role adalah warga dan belum diverifikasi, block akses
    if (user.role === 'warga' && !user.isVerified) {
      return res.status(403).json({ 
        error: 'Akun Anda belum diverifikasi oleh Admin RT/RW. Silakan hubungi Admin RT/RW untuk melakukan verifikasi akun Anda terlebih dahulu.',
        requiresVerification: true
      });
    }
    
    next();
  } catch (error) {
    console.error('[requireVerified] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { authenticate, requireRole, requireVerified };

