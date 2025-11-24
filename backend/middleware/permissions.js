/**
 * Permission Middleware
 * 
 * Middleware untuk check permission berdasarkan role
 */

const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRtRw } = require('../utils/permissions');

/**
 * Middleware untuk require permission tertentu
 * @param {string|string[]} permissions - Permission atau array permissions
 * @param {object} options - Options
 * @param {boolean} options.requireAll - Jika true, require semua permissions. Jika false, require salah satu (default: false)
 * @returns {function} - Express middleware
 */
const requirePermission = (permissions, options = {}) => {
  const { requireAll = false } = options;
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req, res, next) => {
    const role = req.user?.role;
    
    if (!role) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User role tidak ditemukan' 
      });
    }
    
    // Check permission
    let hasAccess = false;
    if (requireAll) {
      hasAccess = hasAllPermissions(role, permissionArray);
    } else {
      hasAccess = hasAnyPermission(role, permissionArray);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Anda tidak memiliki permission untuk mengakses resource ini',
        required: permissionArray,
        role: role
      });
    }
    
    next();
  };
};

/**
 * Middleware untuk require RT/RW access
 * @param {function} getResourceRtRw - Function untuk get RT/RW dari resource (req) => string
 * @returns {function} - Express middleware
 */
const requireRtRwAccess = (getResourceRtRw) => {
  return async (req, res, next) => {
    try {
      const role = req.user?.role;
      const userId = req.user?.userId;
      
      if (!role || !userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User tidak terautentikasi' 
        });
      }
      
      // Super Admin bisa akses semua
      if (role === 'admin' || role === 'admin_sistem') {
        return next();
      }
      
      // Get user RT/RW
      const prisma = require('../database/prisma');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rtRw: true }
      });
      
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }
      
      // Get resource RT/RW
      const resourceRtRw = await getResourceRtRw(req);
      
      if (!resourceRtRw) {
        return res.status(404).json({ 
          error: 'Resource not found' 
        });
      }
      
      // Check access
      const hasAccess = canAccessRtRw(role, user.rtRw, resourceRtRw);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Anda tidak memiliki akses ke resource di RT/RW ini',
          yourRtRw: user.rtRw,
          resourceRtRw: resourceRtRw
        });
      }
      
      next();
    } catch (error) {
      console.error('[requireRtRwAccess] Error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Gagal memverifikasi akses RT/RW' 
      });
    }
  };
};

/**
 * Middleware untuk require ownership atau RT/RW access
 * @param {function} getResourceOwner - Function untuk get owner ID dari resource (req) => number
 * @param {function} getResourceRtRw - Function untuk get RT/RW dari resource (req) => string
 * @returns {function} - Express middleware
 */
const requireOwnershipOrRtRw = (getResourceOwner, getResourceRtRw) => {
  return async (req, res, next) => {
    try {
      const role = req.user?.role;
      const userId = req.user?.userId;
      
      if (!role || !userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User tidak terautentikasi' 
        });
      }
      
      // Super Admin bisa akses semua
      if (role === 'admin' || role === 'admin_sistem') {
        return next();
      }
      
      // Get resource owner dan RT/RW
      const resourceOwnerId = await getResourceOwner(req);
      const resourceRtRw = await getResourceRtRw(req);
      
      // Check ownership
      if (resourceOwnerId === userId) {
        return next();
      }
      
      // Check RT/RW access
      const prisma = require('../database/prisma');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rtRw: true }
      });
      
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }
      
      if (resourceRtRw && canAccessRtRw(role, user.rtRw, resourceRtRw)) {
        return next();
      }
      
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Anda tidak memiliki akses ke resource ini' 
      });
    } catch (error) {
      console.error('[requireOwnershipOrRtRw] Error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Gagal memverifikasi akses' 
      });
    }
  };
};

module.exports = {
  requirePermission,
  requireRtRwAccess,
  requireOwnershipOrRtRw,
};

