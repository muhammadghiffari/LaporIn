# 🔐 Cara Penggunaan Permission System

## 📋 Overview

Sistem permission di LaporIn menggunakan **Role-Based Access Control (RBAC)** dengan dukungan **RT/RW boundary** untuk akses geografis.

---

## 🎯 Alur Permission System

### **1. Definisi Permission**

Semua permission didefinisikan di `backend/utils/permissions.js`:

```javascript
const PERMISSIONS = {
  REPORT_CREATE: 'report:create',
  REPORT_VIEW_ALL: 'report:view:all',
  USER_VERIFY: 'user:verify',
  // ... dll
};
```

### **2. Role Permissions Mapping**

Setiap role memiliki daftar permission yang diizinkan:

```javascript
const ROLE_PERMISSIONS = {
  admin: [PERMISSIONS.REPORT_VIEW_ALL, ...],
  warga: [PERMISSIONS.REPORT_CREATE, ...],
  // ... dll
};
```

### **3. Permission Check di Backend**

#### **A. Menggunakan Middleware `requirePermission`**

```javascript
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissions');

// Single permission
router.post('/reports', 
  authenticate, 
  requirePermission(PERMISSIONS.REPORT_CREATE), 
  async (req, res) => {
    // Handler
  }
);

// Multiple permissions (OR - salah satu cukup)
router.get('/reports', 
  authenticate, 
  requirePermission([
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_VIEW_RT_RW
  ]), 
  async (req, res) => {
    // Handler
  }
);

// Multiple permissions (AND - semua harus ada)
router.delete('/reports/:id', 
  authenticate, 
  requirePermission([
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.REPORT_VIEW_ALL
  ], { requireAll: true }), 
  async (req, res) => {
    // Handler
  }
);
```

#### **B. Manual Permission Check di Handler**

```javascript
const { hasPermission } = require('../utils/permissions');
const { PERMISSIONS } = require('../utils/permissions');

router.get('/reports/:id', authenticate, async (req, res) => {
  const role = req.user.role;
  const report = await getReport(req.params.id);
  
  // Check permission
  if (!hasPermission(role, PERMISSIONS.REPORT_VIEW_ALL)) {
    // Check RT/RW access
    if (report.rtRw !== req.user.rtRw) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  
  res.json(report);
});
```

### **4. RT/RW Boundary Check**

Untuk akses berdasarkan RT/RW:

```javascript
const { requireRtRwAccess } = require('../middleware/permissions');

router.get('/reports/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.REPORT_VIEW_RT_RW),
  requireRtRwAccess(async (req) => {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      select: { user: { select: { rtRw: true } } }
    });
    return report?.user?.rtRw;
  }),
  async (req, res) => {
    // Handler
  }
);
```

### **5. Permission Check di Frontend**

```typescript
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import useAuthStore from '@/store/authStore';

const MyComponent = () => {
  const { user } = useAuthStore();
  
  // Check single permission
  if (!hasPermission(user?.role, PERMISSIONS.REPORT_CREATE)) {
    return <div>Akses ditolak</div>;
  }
  
  // Conditional rendering
  return (
    <div>
      {hasPermission(user?.role, PERMISSIONS.REPORT_UPDATE_STATUS) && (
        <button>Update Status</button>
      )}
      
      {hasPermission(user?.role, PERMISSIONS.USER_VERIFY) && (
        <UserVerificationPanel />
      )}
    </div>
  );
};
```

---

## 📝 Contoh Implementasi

### **Contoh 1: Create Report (Warga Only)**

**Backend:**
```javascript
router.post('/reports', 
  authenticate, 
  requirePermission(PERMISSIONS.REPORT_CREATE),
  async (req, res) => {
    // Hanya warga yang bisa create report
    // Permission check sudah dilakukan di middleware
    // ...
  }
);
```

**Frontend:**
```typescript
const CreateReportForm = () => {
  const { user } = useAuthStore();
  
  if (!hasPermission(user?.role, PERMISSIONS.REPORT_CREATE)) {
    return <div>Hanya warga yang bisa membuat laporan</div>;
  }
  
  return <form>...</form>;
};
```

### **Contoh 2: View Reports (Role-Based)**

**Backend:**
```javascript
router.get('/reports', 
  authenticate, 
  requirePermission([
    PERMISSIONS.REPORT_VIEW_ALL,
    PERMISSIONS.REPORT_VIEW_RT_RW,
    PERMISSIONS.REPORT_VIEW_OWN
  ]),
  async (req, res) => {
    const role = req.user.role;
    let whereClause = {};
    
    if (hasPermission(role, PERMISSIONS.REPORT_VIEW_ALL)) {
      // Super Admin - lihat semua
      whereClause = {};
    } else if (hasPermission(role, PERMISSIONS.REPORT_VIEW_RT_RW)) {
      // Admin/Pengurus - lihat RT/RW mereka
      whereClause = { user: { rtRw: req.user.rtRw } };
    } else if (hasPermission(role, PERMISSIONS.REPORT_VIEW_OWN)) {
      // Warga - lihat sendiri
      whereClause = { userId: req.user.userId };
    }
    
    const reports = await prisma.report.findMany({ where: whereClause });
    res.json(reports);
  }
);
```

### **Contoh 3: Update Report Status (Pengurus Only)**

**Backend:**
```javascript
router.patch('/reports/:id/status', 
  authenticate, 
  requirePermission(PERMISSIONS.REPORT_UPDATE_STATUS),
  async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { rtRw: true } } }
    });
    
    // Check RT/RW access
    if (!canAccessRtRw(req.user.role, req.user.rtRw, report.user.rtRw)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Update status
    // ...
  }
);
```

---

## 🔒 Best Practices

### **1. Always Check Permission di Backend**
- ❌ Jangan hanya mengandalkan frontend untuk security
- ✅ Selalu check permission di backend route handler

### **2. Principle of Least Privilege**
- Berikan permission minimal yang diperlukan
- Jangan berikan akses lebih dari yang dibutuhkan

### **3. RT/RW Boundary Validation**
- Selalu validasi RT/RW boundary untuk resource access
- Super Admin adalah exception (bisa akses semua)

### **4. Error Messages yang Jelas**
```javascript
if (!hasPermission(role, PERMISSIONS.REPORT_CREATE)) {
  return res.status(403).json({ 
    error: 'Forbidden',
    message: 'Anda tidak memiliki permission untuk membuat laporan',
    required: PERMISSIONS.REPORT_CREATE,
    role: role
  });
}
```

### **5. Audit Trail**
- Log semua permission check untuk debugging
- Track siapa yang akses resource apa

---

## 🧪 Testing Permission

### **Unit Test Example**

```javascript
const { hasPermission, PERMISSIONS } = require('../utils/permissions');

describe('Permission System', () => {
  test('Warga bisa create report', () => {
    expect(hasPermission('warga', PERMISSIONS.REPORT_CREATE)).toBe(true);
  });
  
  test('Warga tidak bisa update status', () => {
    expect(hasPermission('warga', PERMISSIONS.REPORT_UPDATE_STATUS)).toBe(false);
  });
  
  test('Admin bisa view all reports', () => {
    expect(hasPermission('admin', PERMISSIONS.REPORT_VIEW_ALL)).toBe(true);
  });
});
```

---

## 📚 Related Files

- `backend/utils/permissions.js` - Permission definitions
- `backend/middleware/permissions.js` - Permission middleware
- `lib/permissions.ts` - Frontend permission utilities
- `backend/PERMISSION_MATRIX.md` - Permission matrix documentation

---

## ✅ Checklist Implementation

- [x] Permission definitions
- [x] Permission middleware
- [x] RT/RW access validation
- [x] Frontend permission utilities
- [x] Update beberapa routes untuk contoh
- [ ] Update semua routes untuk menggunakan permission system
- [ ] Update frontend components untuk permission checks
- [ ] Permission testing
- [ ] Documentation

---

## 🚀 Quick Start

1. **Import permission utilities:**
   ```javascript
   const { PERMISSIONS, hasPermission } = require('../utils/permissions');
   ```

2. **Gunakan middleware:**
   ```javascript
   router.get('/endpoint', 
     authenticate, 
     requirePermission(PERMISSIONS.REPORT_VIEW_ALL),
     handler
   );
   ```

3. **Check di frontend:**
   ```typescript
   if (hasPermission(user?.role, PERMISSIONS.REPORT_CREATE)) {
     // Show create button
   }
   ```

**Selesai!** 🎉

