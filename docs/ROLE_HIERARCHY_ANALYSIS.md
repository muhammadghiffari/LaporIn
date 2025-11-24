# 📊 Analisis Role Hierarchy & Best Practice

## 🏗️ Struktur Role Saat Ini

```
Super Admin (admin/admin_sistem)
    └── Admin RW (admin_rw)
            └── Ketua RT (ketua_rt)
                    └── Sekretaris RT (sekretaris_rt)
                            └── Pengurus (pengurus)
                                    └── Warga (warga)
```

## ❓ Pertanyaan

1. **RT bisa buat akun pengurusnya sendiri?**
2. **RW bisa buat akun RT dan pengurusnya sendiri?**

## ✅ **REKOMENDASI BEST PRACTICE: YA, INI ADALAH BEST PRACTICE!**

### 🎯 Alasan:

#### 1. **Prinsip Delegasi & Otonomi**
- ✅ RW memiliki otonomi untuk mengelola RT di bawahnya
- ✅ RT memiliki otonomi untuk mengelola pengurus di RT-nya
- ✅ Mengurangi beban Super Admin
- ✅ Mempercepat proses onboarding

#### 2. **Scalability**
- ✅ Sistem bisa berkembang tanpa bottleneck di Super Admin
- ✅ RW bisa langsung setup RT baru tanpa menunggu Super Admin
- ✅ RT bisa langsung assign pengurus tanpa menunggu RW

#### 3. **Real-world Workflow**
- ✅ Sesuai dengan struktur organisasi RT/RW di Indonesia
- ✅ RW biasanya yang tahu siapa yang jadi Ketua RT
- ✅ Ketua RT yang tahu siapa yang jadi Pengurus

#### 4. **Security & Control**
- ✅ RW hanya bisa buat RT di RW-nya sendiri
- ✅ RT hanya bisa buat pengurus di RT-nya sendiri
- ✅ Tetap ada audit trail (siapa yang create user)

## 📋 Implementasi yang Disarankan

### **Hierarchy Permission:**

```
Super Admin (admin)
  └── Bisa buat: Semua role (admin, admin_rw, ketua_rt, sekretaris_rt, pengurus, warga)
  └── Bisa manage: Semua user di semua RT/RW

Admin RW (admin_rw)
  └── Bisa buat: ketua_rt, sekretaris_rt, pengurus, warga (di RW-nya saja)
  └── Bisa manage: User di RT/RW-nya sendiri
  └── Bisa verifikasi: Warga di RW-nya

Ketua RT (ketua_rt)
  └── Bisa buat: sekretaris_rt, pengurus, warga (di RT-nya saja)
  └── Bisa manage: User di RT-nya sendiri
  └── Bisa verifikasi: Warga di RT-nya

Sekretaris RT (sekretaris_rt)
  └── Bisa buat: pengurus, warga (di RT-nya saja)
  └── Bisa manage: User di RT-nya sendiri
  └── Bisa verifikasi: Warga di RT-nya

Pengurus (pengurus)
  └── Bisa verifikasi: Warga di RT/RW-nya
  └── Tidak bisa buat user (hanya bisa manage laporan)

Warga (warga)
  └── Tidak bisa buat user
  └── Tidak bisa verifikasi
```

### **Validasi yang Perlu:**

1. **RT/RW Boundary Check**
   - RW hanya bisa buat user dengan RT/RW yang sesuai (misal: RW005 hanya bisa buat RT001/RW005, RT002/RW005, dst)
   - RT hanya bisa buat user dengan RT/RW yang sama persis

2. **Role Hierarchy Check**
   - RW tidak bisa buat admin atau admin_rw lain
   - RT tidak bisa buat admin, admin_rw, atau ketua_rt lain
   - Sekretaris RT tidak bisa buat ketua_rt

3. **Auto Verification**
   - User yang dibuat oleh RT/RW/Pengurus otomatis `isVerified: true` (karena sudah di-approve oleh atasan)
   - Warga yang registrasi sendiri tetap `isVerified: false` (perlu verifikasi manual)

## 🔒 Security Considerations

### **Yang Perlu Diperhatikan:**

1. **Audit Trail**
   - Simpan `createdBy` (siapa yang create user)
   - Log semua action create user

2. **Rate Limiting**
   - Limit jumlah user yang bisa dibuat per hari (prevent abuse)
   - Misal: RW max 10 user/hari, RT max 5 user/hari

3. **Email Verification**
   - Tetap wajibkan email verification untuk user yang dibuat oleh RT/RW
   - Atau set password temporary yang harus diubah saat first login

4. **Notification**
   - Notifikasi ke Super Admin jika RW/RT create user baru (untuk monitoring)

## 📝 Contoh Implementasi

### **Endpoint: POST /api/auth/users/create**

**Permission Matrix:**

| Creator Role | Can Create Roles | RT/RW Restriction |
|------------|------------------|-------------------|
| `admin` | Semua role | Semua RT/RW |
| `admin_rw` | `ketua_rt`, `sekretaris_rt`, `pengurus`, `warga` | Hanya RT di RW-nya |
| `ketua_rt` | `sekretaris_rt`, `pengurus`, `warga` | Hanya RT-nya sendiri |
| `sekretaris_rt` | `pengurus`, `warga` | Hanya RT-nya sendiri |
| `pengurus` | ❌ Tidak bisa | - |
| `warga` | ❌ Tidak bisa | - |

### **Validasi Logic:**

```javascript
// Pseudo-code
function canCreateUser(creatorRole, creatorRtRw, targetRole, targetRtRw) {
  // Super Admin bisa semua
  if (creatorRole === 'admin') return true;
  
  // Admin RW
  if (creatorRole === 'admin_rw') {
    const allowedRoles = ['ketua_rt', 'sekretaris_rt', 'pengurus', 'warga'];
    if (!allowedRoles.includes(targetRole)) return false;
    
    // Cek RT/RW: target harus di RW yang sama
    const creatorRw = creatorRtRw.split('/')[1]; // "RT001/RW005" -> "RW005"
    const targetRw = targetRtRw.split('/')[1];
    return creatorRw === targetRw;
  }
  
  // Ketua RT
  if (creatorRole === 'ketua_rt') {
    const allowedRoles = ['sekretaris_rt', 'pengurus', 'warga'];
    if (!allowedRoles.includes(targetRole)) return false;
    
    // Target harus RT/RW yang sama persis
    return creatorRtRw === targetRtRw;
  }
  
  // Sekretaris RT
  if (creatorRole === 'sekretaris_rt') {
    const allowedRoles = ['pengurus', 'warga'];
    if (!allowedRoles.includes(targetRole)) return false;
    
    return creatorRtRw === targetRtRw;
  }
  
  return false;
}
```

## 🎯 Kesimpulan

**YA, ini adalah BEST PRACTICE!** 

Implementasi hierarchical user creation akan:
- ✅ Meningkatkan efisiensi operasional
- ✅ Mengurangi beban Super Admin
- ✅ Mempercepat onboarding
- ✅ Sesuai dengan struktur organisasi real-world
- ✅ Tetap aman dengan validasi yang tepat

**Rekomendasi:** Implementasikan fitur ini dengan:
1. Validasi RT/RW boundary
2. Role hierarchy check
3. Audit trail (createdBy)
4. Auto-verification untuk user yang dibuat oleh atasan
5. Rate limiting untuk prevent abuse

