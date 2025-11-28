/**
 * Frontend Permission Utilities
 * 
 * Helper functions untuk check permission di frontend
 */

export const PERMISSIONS = {
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
} as const;

// Role permissions mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
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
  admin_rw: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    // PERMISSIONS.REPORT_UPDATE_STATUS, // Hanya pengurus yang bisa approve
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
  ketua_rt: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    // PERMISSIONS.REPORT_UPDATE_STATUS, // Hanya pengurus yang bisa approve
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
  sekretaris_rt: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    // PERMISSIONS.REPORT_UPDATE_STATUS, // Hanya pengurus yang bisa approve
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
  sekretaris: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    // PERMISSIONS.REPORT_UPDATE_STATUS, // Hanya pengurus yang bisa approve
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
  pengurus: [
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_UPDATE_STATUS,
    PERMISSIONS.RT_RW_VIEW_MAP,
    PERMISSIONS.DASHBOARD_VIEW_RT_RW,
    PERMISSIONS.CHATBOT_USE,
    PERMISSIONS.BLOCKCHAIN_VIEW_ALL_LOGS,
  ],
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
 */
export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Cek apakah role memiliki salah satu dari permissions
 */
export function hasAnyPermission(role: string | undefined, permissions: string[]): boolean {
  if (!role || !permissions || permissions.length === 0) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Cek apakah role memiliki semua permissions
 */
export function hasAllPermissions(role: string | undefined, permissions: string[]): boolean {
  if (!role || !permissions || permissions.length === 0) return false;
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get semua permissions untuk role tertentu
 */
export function getRolePermissions(role: string | undefined): string[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

