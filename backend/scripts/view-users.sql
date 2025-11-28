-- Query SQL untuk melihat data User di Workbench (pgAdmin, DBeaver, dll)
-- Jalankan query ini di PostgreSQL Workbench

-- ============================================
-- 1. Lihat semua user dengan detail lengkap
-- ============================================
SELECT 
    id,
    name,
    email,
    role,
    "rtRw" as rt_rw,
    "isVerified",
    "phoneNumber",
    "createdAt",
    "updatedAt"
FROM 
    "User"
ORDER BY 
    role, "rtRw", name;

-- ============================================
-- 2. Breakdown user per role
-- ============================================
SELECT 
    role,
    COUNT(*) as jumlah_user,
    COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified,
    COUNT(CASE WHEN "isVerified" = false THEN 1 END) as unverified
FROM 
    "User"
GROUP BY 
    role
ORDER BY 
    jumlah_user DESC;

-- ============================================
-- 3. User per RT/RW
-- ============================================
SELECT 
    "rtRw" as rt_rw,
    COUNT(*) as jumlah_warga,
    COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified,
    COUNT(CASE WHEN role = 'warga' THEN 1 END) as warga,
    COUNT(CASE WHEN role = 'ketua_rt' THEN 1 END) as ketua_rt,
    COUNT(CASE WHEN role = 'sekretaris_rt' THEN 1 END) as sekretaris_rt,
    COUNT(CASE WHEN role = 'pengurus' THEN 1 END) as pengurus
FROM 
    "User"
WHERE 
    "rtRw" IS NOT NULL
GROUP BY 
    "rtRw"
ORDER BY 
    "rtRw";

-- ============================================
-- 4. User dengan email real (bukan @example)
-- ============================================
SELECT 
    id,
    name,
    email,
    role,
    "rtRw" as rt_rw,
    "isVerified"
FROM 
    "User"
WHERE 
    email NOT LIKE '%@example%'
    AND email NOT LIKE '%@test%'
ORDER BY 
    role, email;

-- ============================================
-- 5. User dengan detail RT/RW dan jumlah laporan
-- ============================================
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u."rtRw" as rt_rw,
    u."isVerified",
    COUNT(r.id) as jumlah_laporan
FROM 
    "User" u
LEFT JOIN 
    "Report" r ON r."userId" = u.id
GROUP BY 
    u.id, u.name, u.email, u.role, u."rtRw", u."isVerified"
ORDER BY 
    jumlah_laporan DESC, u.role, u."rtRw";

-- ============================================
-- 6. User untuk RT001/RW001 khusus
-- ============================================
SELECT 
    id,
    name,
    email,
    role,
    "rtRw" as rt_rw,
    "isVerified",
    "phoneNumber"
FROM 
    "User"
WHERE 
    "rtRw" = 'RT001/RW001'
ORDER BY 
    role, name;

