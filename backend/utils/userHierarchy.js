/**
 * Helper functions untuk validasi hierarchical user creation
 */

/**
 * Cek apakah creator bisa membuat user dengan role tertentu
 * @param {string} creatorRole - Role dari user yang membuat
 * @param {string} targetRole - Role yang ingin dibuat
 * @returns {boolean} - true jika bisa, false jika tidak
 */
function canCreateRole(creatorRole, targetRole) {
  // Super Admin bisa buat semua role
  if (creatorRole === 'admin' || creatorRole === 'admin_sistem') {
    return true;
  }
  
  // Admin RW bisa buat: ketua_rt, sekretaris_rt, pengurus, warga
  if (creatorRole === 'admin_rw') {
    const allowedRoles = ['ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus', 'warga'];
    return allowedRoles.includes(targetRole);
  }
  
  // Ketua RT bisa buat: sekretaris_rt, pengurus, warga
  if (creatorRole === 'ketua_rt') {
    const allowedRoles = ['sekretaris_rt', 'sekretaris', 'pengurus', 'warga'];
    return allowedRoles.includes(targetRole);
  }
  
  // Sekretaris RT bisa buat: pengurus, warga
  if (creatorRole === 'sekretaris_rt' || creatorRole === 'sekretaris') {
    const allowedRoles = ['pengurus', 'warga'];
    return allowedRoles.includes(targetRole);
  }
  
  // Pengurus dan warga tidak bisa buat user
  return false;
}

/**
 * Cek apakah RT/RW boundary valid
 * @param {string} creatorRole - Role dari user yang membuat
 * @param {string} creatorRtRw - RT/RW dari creator (format: "RT001/RW005")
 * @param {string} targetRtRw - RT/RW yang ingin dibuat (format: "RT001/RW005")
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateRtRwBoundary(creatorRole, creatorRtRw, targetRtRw) {
  // Super Admin tidak ada batasan RT/RW
  if (creatorRole === 'admin' || creatorRole === 'admin_sistem') {
    return { valid: true };
  }
  
  // Jika creator atau target tidak punya RT/RW, invalid
  if (!creatorRtRw || !targetRtRw) {
    return { 
      valid: false, 
      error: 'RT/RW harus diisi untuk role ini' 
    };
  }
  
  // Parse RT/RW
  const parseRtRw = (rtRw) => {
    const parts = rtRw.split('/');
    if (parts.length !== 2) return null;
    return {
      rt: parts[0].trim().toUpperCase(), // "RT001"
      rw: parts[1].trim().toUpperCase()  // "RW005"
    };
  };
  
  const creatorParts = parseRtRw(creatorRtRw);
  const targetParts = parseRtRw(targetRtRw);
  
  if (!creatorParts || !targetParts) {
    return { 
      valid: false, 
      error: 'Format RT/RW tidak valid. Gunakan format: RT001/RW005' 
    };
  }
  
  // Admin RW: target harus di RW yang sama
  if (creatorRole === 'admin_rw') {
    if (creatorParts.rw !== targetParts.rw) {
      return { 
        valid: false, 
        error: `Anda hanya bisa membuat user di RW ${creatorParts.rw}. Target RT/RW: ${targetRtRw}` 
      };
    }
    return { valid: true };
  }
  
  // Ketua RT dan Sekretaris RT: target harus RT/RW yang sama persis
  if (creatorRole === 'ketua_rt' || creatorRole === 'sekretaris_rt' || creatorRole === 'sekretaris') {
    if (creatorRtRw.toUpperCase() !== targetRtRw.toUpperCase()) {
      return { 
        valid: false, 
        error: `Anda hanya bisa membuat user di RT/RW ${creatorRtRw}. Target: ${targetRtRw}` 
      };
    }
    return { valid: true };
  }
  
  return { valid: false, error: 'Role tidak memiliki permission untuk membuat user' };
}

/**
 * Tentukan apakah user yang dibuat harus auto-verified
 * User yang dibuat oleh atasan (bukan self-registration) otomatis verified
 * @param {string} creatorRole - Role dari user yang membuat
 * @param {string} targetRole - Role yang dibuat
 * @returns {boolean} - true jika auto-verified
 */
function shouldAutoVerify(creatorRole, targetRole) {
  // Jika dibuat oleh admin/atasan (bukan self-registration), auto-verify
  if (creatorRole === 'admin' || creatorRole === 'admin_sistem' || 
      creatorRole === 'admin_rw' || creatorRole === 'ketua_rt' || 
      creatorRole === 'sekretaris_rt' ||
      creatorRole === 'sekretaris') {
    // Auto-verify untuk semua role yang dibuat oleh atasan
    return true;
  }
  
  // Self-registration (warga) tidak auto-verify
  return false;
}

module.exports = {
  canCreateRole,
  validateRtRwBoundary,
  shouldAutoVerify
};

