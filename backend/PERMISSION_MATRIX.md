# 🔐 Permission Matrix - LaporIn

## 📋 Daftar Role

1. **Super Admin** (`admin` / `admin_sistem`)
2. **Admin RW** (`admin_rw`)
3. **Ketua RT** (`ketua_rt`)
4. **Sekretaris RT** (`sekretaris_rt`)
5. **Pengurus** (`pengurus`)
6. **Warga** (`warga`)

---

## 📊 Permission Matrix

### **Report Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `report:create` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `report:view:own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `report:view:rt_rw` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `report:view:all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `report:update:status` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `report:delete` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `report:cancel` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Keterangan:**
- **Warga** hanya bisa membuat laporan, melihat laporan sendiri, dan membatalkan laporan sendiri
- **Pengurus** bisa melihat dan update status laporan di RT/RW mereka (hanya pengurus yang bisa approve laporan)
- **Ketua RT / Sekretaris RT** bisa melihat laporan di RT mereka, tapi tidak bisa update status (hanya monitor)
- **Admin RW** bisa melihat laporan di RW mereka, tapi tidak bisa update status (hanya monitor)
- **Super Admin** bisa melihat dan mengelola semua laporan (termasuk update status)

---

### **User Management Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `user:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `user:view:own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user:view:rt_rw` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `user:view:all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `user:update` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `user:delete` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `user:verify` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

**Keterangan:**
- **Super Admin** bisa membuat semua role
- **Admin RW** bisa membuat: `ketua_rt`, `sekretaris_rt`, `pengurus`, `warga` (di RW mereka)
- **Ketua RT** bisa membuat: `sekretaris_rt`, `pengurus`, `warga` (di RT mereka)
- **Sekretaris RT** bisa membuat: `pengurus`, `warga` (di RT mereka)
- **Pengurus** dan **Warga** tidak bisa membuat user
- **User Verification** hanya untuk Admin RT/RW dan Super Admin

---

### **RT/RW Management Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `rt_rw:set:location` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `rt_rw:view:map` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `rt_rw:view:stats` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Keterangan:**
- **Set Location** hanya untuk Admin RT/RW dan Super Admin
- **View Map** untuk semua role pengurus (kecuali warga)
- **View Stats** untuk semua role pengurus (kecuali warga)

---

### **Dashboard Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `dashboard:view:own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dashboard:view:rt_rw` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dashboard:view:all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Keterangan:**
- **Warga** melihat dashboard dengan laporan mereka sendiri dan laporan RT/RW mereka (untuk transparansi)
- **Pengurus** melihat dashboard dengan laporan di RT/RW mereka
- **Super Admin** melihat dashboard dengan semua data

---

### **Analytics Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `analytics:view:rt_rw` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `analytics:view:all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Keterangan:**
- **Analytics** hanya untuk role pengurus dan admin
- **Warga** tidak bisa akses analytics

---

### **Blockchain Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `blockchain:view:logs` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `blockchain:view:all_logs` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

**Keterangan:**
- **View Logs** hanya untuk Super Admin
- **View All Logs** untuk Super Admin dan Pengurus (untuk transparansi)

---

### **Chatbot Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `chatbot:use` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `chatbot:view:stats` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Keterangan:**
- **Semua role** bisa menggunakan chatbot
- **View Stats** hanya untuk role pengurus dan admin (untuk monitoring)

---

### **Bantuan (Bansos) Permissions**

| Permission | Super Admin | Admin RW | Ketua RT | Sekretaris RT | Pengurus | Warga |
|------------|-------------|----------|----------|---------------|----------|-------|
| `bantuan:create` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `bantuan:view:own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `bantuan:view:rt_rw` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `bantuan:view:all` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `bantuan:approve` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `bantuan:distribute` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Keterangan:**
- **Warga** hanya bisa membuat permohonan bantuan dan melihat bantuan sendiri
- **Ketua RT** bisa approve bantuan di RT mereka
- **Admin RW** bisa approve dan distribute bantuan di RW mereka
- **Super Admin** bisa approve dan distribute semua bantuan

---

## 🔒 RT/RW Access Rules

### **Super Admin**
- ✅ Akses semua RT/RW
- ✅ Tidak ada batasan geografis

### **Admin RW**
- ✅ Akses semua RT di RW mereka
- ❌ Tidak bisa akses RT di RW lain
- **Contoh**: Admin RW005 bisa akses RT001/RW005, RT002/RW005, RT003/RW005, tapi tidak bisa akses RT001/RW006

### **Ketua RT / Sekretaris RT**
- ✅ Akses hanya RT/RW mereka sendiri
- ❌ Tidak bisa akses RT/RW lain
- **Contoh**: Ketua RT001/RW005 hanya bisa akses RT001/RW005

### **Pengurus**
- ✅ Akses hanya RT/RW mereka sendiri
- ❌ Tidak bisa akses RT/RW lain
- **Contoh**: Pengurus RT001/RW005 hanya bisa akses RT001/RW005

### **Warga**
- ✅ Akses hanya resource mereka sendiri (ownership)
- ✅ Bisa melihat laporan RT/RW mereka (untuk transparansi)
- ❌ Tidak bisa akses resource warga lain

---

## 📝 Usage Examples

### **Backend (Express Route)**

```javascript
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissions');

// Require single permission
router.get('/reports', authenticate, requirePermission(PERMISSIONS.REPORT_VIEW_ALL), async (req, res) => {
  // ...
});

// Require any permission (OR)
router.post('/reports', authenticate, requirePermission([
  PERMISSIONS.REPORT_CREATE,
  PERMISSIONS.REPORT_UPDATE_STATUS
]), async (req, res) => {
  // ...
});

// Require all permissions (AND)
router.delete('/reports/:id', authenticate, requirePermission([
  PERMISSIONS.REPORT_DELETE,
  PERMISSIONS.REPORT_VIEW_ALL
], { requireAll: true }), async (req, res) => {
  // ...
});
```

### **Frontend (React Component)**

```typescript
import { hasPermission } from '@/utils/permissions';

const MyComponent = () => {
  const { user } = useAuthStore();
  
  if (!hasPermission(user?.role, PERMISSIONS.REPORT_CREATE)) {
    return <div>Akses ditolak</div>;
  }
  
  return <CreateReportForm />;
};
```

---

## 🎯 Best Practices

1. **Always Check Permission**
   - Jangan hanya mengandalkan UI untuk security
   - Selalu check permission di backend

2. **Principle of Least Privilege**
   - Berikan permission minimal yang diperlukan
   - Jangan berikan akses lebih dari yang dibutuhkan

3. **RT/RW Boundary**
   - Selalu validasi RT/RW boundary untuk resource access
   - Super Admin adalah exception (bisa akses semua)

4. **Audit Trail**
   - Log semua permission check
   - Track siapa yang akses resource apa

---

## 📚 Related Files

- `backend/utils/permissions.js` - Permission definitions
- `backend/middleware/permissions.js` - Permission middleware
- `backend/middleware/auth.js` - Authentication middleware
- `backend/utils/userHierarchy.js` - User hierarchy validation

---

## ✅ Checklist Implementation

- [x] Permission definitions
- [x] Permission middleware
- [x] RT/RW access validation
- [ ] Update routes untuk menggunakan permission system
- [ ] Frontend permission utilities
- [ ] Permission testing
- [ ] Documentation

