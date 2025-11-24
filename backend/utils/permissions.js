/**
 * Permission System untuk LaporIn
 * 
 * Definisi semua permission berdasarkan role
 */

// Permission constants
const PERMISSIONS = {
  // Report Permissions
  REPORT_CREATE: 'report:create',
  REPORT_VIEW_OWN: 'report:view:own',
  REPORT_VIEW_RT_RW: 'report:view:rt_rw',
  REPORT_VIEW_ALL: 'report:view:all',
  REPORT_UPDATE_STATUS: 'report:update:status',
  REPORT_DELETE: 'report:delete',
  REPORT_CANCEL: 'report:cancel',
  
  // User Management Permissions
  USER_CREATE: 'user:create',
  USER_VIEW_OWN: 'user:view:own',
  USER_VIEW_RT_RW: 'user:view:rt_rw',
  USER_VIEW_ALL: 'user:view:all',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_VERIFY: 'user:verify',
  
  // RT/RW Management Permissions
  RT_RW_SET_LOCATION: 'rt_rw:set:location',
  RT_RW_VIEW_MAP: 'rt_rw:view:map',
  RT_RW_VIEW_STATS: 'rt_rw:view:stats',
  
  // Dashboard Permissions
  DASHBOARD_VIEW_OWN: 'dashboard:view:own',
  DASHBOARD_VIEW_RT_RW: 'dashboard:view:rt_rw',
  DASHBOARD_VIEW_ALL: 'dashboard:view:all',
  
  // Analytics Permissions
  ANALYTICS_VIEW_RT_RW: 'analytics:view:rt_rw',
  ANALYTICS_VIEW_ALL: 'analytics:view:all',
  
  // Blockchain Permissions
  BLOCKCHAIN_VIEW_LOGS: 'blockchain:view:logs',
  BLOCKCHAIN_VIEW_ALL_LOGS: 'blockchain:view:all_logs',
  
  // Chatbot Permissions
  CHATBOT_USE: 'chatbot:use',
  CHATBOT_VIEW_STATS: 'chatbot:view:stats',
  
  // Bantuan (Bansos) Permissions
  BANTUAN_CREATE: 'bantuan:create',
  BANTUAN_VIEW_OWN: 'bantuan:view:own',
  BANTUAN_VIEW_RT_RW: 'bantuan:view:rt_rw',
  BANTUAN_VIEW_ALL: 'bantuan:view:all',
  BANTUAN_APPROVE: 'bantuan:approve',
  BANTUAN_DISTRIBUTE: 'bantuan:distribute',
};

// Role definitions dengan permissions
const ROLE_PERMISSIONS = {
  // Super Admin - Full access
  admin: [
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW_ALL,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_VERIFY,
    PERMISSIONS.RT_RW_SET_LOCATION,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.RT_RW_VIEW_STATS,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.ANALYTICS_VIEW_ALL,
    PERMISSIONS.BLOCKCHAIN_VIEW_LOGS,
    PERMISSIONS.BLOCKCHAIN_VIEW_ALL_LOGS,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.CHATBOT_VIEW_STATS,
    PERMISSIONS.BANTUAN_VIEW_ALL,
    PERMISSIONS.BANTUAN_APPROVE,
    PERMISSIONS.BANTUAN_DISTRIBUTE,
  ],
  
  // Alias untuk admin_sistem
  admin_sistem: [
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW_ALL,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_VERIFY,
    PERMISSIONS.RT_RW_SET_LOCATION,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.RT_RW_VIEW_STATS,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.ANALYTICS_VIEW_ALL,
    PERMISSIONS.BLOCKCHAIN_VIEW_LOGS,
    PERMISSIONS.BLOCKCHAIN_VIEW_ALL_LOGS,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.CHATBOT_VIEW_STATS,
    PERMISSIONS.BANTUAN_VIEW_ALL,
    PERMISSIONS.BANTUAN_APPROVE,
    PERMISSIONS.BANTUAN_DISTRIBUTE,
  ],
  
  // Admin RW - Manage RT/RW mereka
  admin_rw: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW_RT_RW,
    PERMISSIONS.USER_VERIFY,
    PERMISSIONS.RT_RW_SET_LOCATION,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.RT_RW_VIEW_STATS,
    PERMISSIONS.DASHBOARD_VIEW_RT_RW,
    PERMISSIONS.ANALYTICS_VIEW_RT_RW,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.CHATBOT_VIEW_STATS,
    PERMISSIONS.BANTUAN_VIEW_RT_RW,
    PERMISSIONS.BANTUAN_APPROVE,
    PERMISSIONS.BANTUAN_DISTRIBUTE,
  ],
  
  // Ketua RT - Manage RT mereka
  ketua_rt: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW_RT_RW,
    PERMISSIONS.USER_VERIFY,
    PERMISSIONS.RT_RW_SET_LOCATION,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.RT_RW_VIEW_STATS,
    PERMISSIONS.DASHBOARD_VIEW_RT_RW,
    PERMISSIONS.ANALYTICS_VIEW_RT_RW,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.CHATBOT_VIEW_STATS,
    PERMISSIONS.BANTUAN_VIEW_RT_RW,
    PERMISSIONS.BANTUAN_APPROVE,
  ],
  
  // Sekretaris RT - Manage RT mereka
  sekretaris_rt: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW_RT_RW,
    PERMISSIONS.USER_VERIFY,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.RT_RW_VIEW_STATS,
    PERMISSIONS.DASHBOARD_VIEW_RT_RW,
    PERMISSIONS.ANALYTICS_VIEW_RT_RW,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.CHATBOT_VIEW_STATS,
    PERMISSIONS.BANTUAN_VIEW_RT_RW,
  ],
  
  // Sekretaris (alias) - sama seperti Sekretaris RT namun nama role general
  sekretaris: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_VIEW_RT_RW,
    PERMISSIONS.USER_VERIFY,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.RT_RW_VIEW_STATS,
    PERMISSIONS.DASHBOARD_VIEW_RT_RW,
    PERMISSIONS.ANALYTICS_VIEW_RT_RW,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.CHATBOT_VIEW_STATS,
    PERMISSIONS.BANTUAN_VIEW_RT_RW,
  ],
  
  // Pengurus - Manage laporan di RT/RW mereka
  pengurus: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.DASHBOARD_VIEW_RT_RW,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.BLOCKCHAIN_VIEW_ALL_LOGS,
  ],
  
  // Warga - Hanya bisa create dan view laporan sendiri
  warga: [
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_VIEW_OWN,
    PERMISSIONS.REPORT_CANCEL,
    PERMISSIONS.DASHBOARD_VIEW_OWN,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.BANTUAN_CREATE,
    PERMISSIONS.BANTUAN_VIEW_OWN,
  ],
};

/**
 * Cek apakah role memiliki permission tertentu
 * @param {string} role - Role user
 * @param {string} permission - Permission yang dicek
 * @returns {boolean} - true jika punya permission
 */
function hasPermission(role, permission) {
  if (!role || !permission) return false;
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Cek apakah role memiliki salah satu dari permissions
 * @param {string} role - Role user
 * @param {string[]} permissions - Array permissions
 * @returns {boolean} - true jika punya salah satu permission
 */
function hasAnyPermission(role, permissions) {
  if (!role || !permissions || permissions.length === 0) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Cek apakah role memiliki semua permissions
 * @param {string} role - Role user
 * @param {string[]} permissions - Array permissions
 * @returns {boolean} - true jika punya semua permissions
 */
function hasAllPermissions(role, permissions) {
  if (!role || !permissions || permissions.length === 0) return false;
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get semua permissions untuk role tertentu
 * @param {string} role - Role user
 * @returns {string[]} - Array permissions
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Cek apakah role bisa akses resource berdasarkan RT/RW
 * @param {string} role - Role user
 * @param {string} userRtRw - RT/RW dari user yang request
 * @param {string} resourceRtRw - RT/RW dari resource yang diakses
 * @returns {boolean} - true jika bisa akses
 */
function canAccessRtRw(role, userRtRw, resourceRtRw) {
  // Super Admin bisa akses semua
  if (role === 'admin' || role === 'admin_sistem') {
    return true;
  }
  
  // Jika tidak ada RT/RW info, tidak bisa akses
  if (!userRtRw || !resourceRtRw) {
    return false;
  }
  
  // Admin RW: bisa akses semua RT di RW mereka
  if (role === 'admin_rw') {
    const userRw = userRtRw.split('/')[1];
    const resourceRw = resourceRtRw.split('/')[1];
    return userRw === resourceRw;
  }
  
  // Ketua RT, Sekretaris RT, Pengurus: hanya bisa akses RT/RW mereka sendiri
if (['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'].includes(role)) {
    return userRtRw.toUpperCase() === resourceRtRw.toUpperCase();
  }
  
  // Warga: hanya bisa akses resource mereka sendiri (diperiksa di level route)
  return false;
}

/**
 * Get permission description untuk dokumentasi
 * @returns {object} - Object dengan semua permission dan deskripsi
 */
function getPermissionDescriptions() {
  return {
    [PERMISSIONS.REPORT_CREATE]: 'Membuat laporan baru',
    [PERMISSIONS.REPORT_VIEW_OWN]: 'Melihat laporan sendiri',
    [PERMISSIONS.REPORT_VIEW_RT_RW]: 'Melihat laporan di RT/RW mereka',
    [PERMISSIONS.REPORT_VIEW_ALL]: 'Melihat semua laporan',
    [PERMISSIONS.REPORT_UPDATE_STATUS]: 'Mengubah status laporan',
    [PERMISSIONS.REPORT_DELETE]: 'Menghapus laporan',
    [PERMISSIONS.REPORT_CANCEL]: 'Membatalkan laporan sendiri',
    
    [PERMISSIONS.USER_CREATE]: 'Membuat user baru',
    [PERMISSIONS.USER_VIEW_OWN]: 'Melihat profil sendiri',
    [PERMISSIONS.USER_VIEW_RT_RW]: 'Melihat user di RT/RW mereka',
    [PERMISSIONS.USER_VIEW_ALL]: 'Melihat semua user',
    [PERMISSIONS.USER_UPDATE]: 'Mengubah data user',
    [PERMISSIONS.USER_DELETE]: 'Menghapus user',
    [PERMISSIONS.USER_VERIFY]: 'Memverifikasi akun warga',
    
    [PERMISSIONS.RT_RW_SET_LOCATION]: 'Mengatur lokasi/boundary RT/RW',
    [PERMISSIONS.RT_RW_VIEW_MAP]: 'Melihat peta monitoring',
    [PERMISSIONS.RT_RW_VIEW_STATS]: 'Melihat statistik RT/RW',
    
    [PERMISSIONS.DASHBOARD_VIEW_OWN]: 'Melihat dashboard sendiri',
    [PERMISSIONS.DASHBOARD_VIEW_RT_RW]: 'Melihat dashboard RT/RW mereka',
    [PERMISSIONS.DASHBOARD_VIEW_ALL]: 'Melihat dashboard semua',
    
    [PERMISSIONS.ANALYTICS_VIEW_RT_RW]: 'Melihat analytics RT/RW mereka',
    [PERMISSIONS.ANALYTICS_VIEW_ALL]: 'Melihat analytics semua',
    
    [PERMISSIONS.BLOCKCHAIN_VIEW_LOGS]: 'Melihat log blockchain',
    [PERMISSIONS.BLOCKCHAIN_VIEW_ALL_LOGS]: 'Melihat semua log blockchain',
    
    [PERMISSIONS.CHATBOT_USE]: 'Menggunakan chatbot',
    [PERMISSIONS.CHATBOT_VIEW_STATS]: 'Melihat statistik chatbot',
    
    [PERMISSIONS.BANTUAN_CREATE]: 'Membuat permohonan bantuan',
    [PERMISSIONS.BANTUAN_VIEW_OWN]: 'Melihat bantuan sendiri',
    [PERMISSIONS.BANTUAN_VIEW_RT_RW]: 'Melihat bantuan di RT/RW mereka',
    [PERMISSIONS.BANTUAN_VIEW_ALL]: 'Melihat semua bantuan',
    [PERMISSIONS.BANTUAN_APPROVE]: 'Menyetujui permohonan bantuan',
    [PERMISSIONS.BANTUAN_DISTRIBUTE]: 'Mendistribusikan bantuan',
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessRtRw,
  getPermissionDescriptions,
};

