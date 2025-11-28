# 🏆 Rencana Improvement untuk Juara 1

## 📋 Overview

Implementasi fitur-fitur berikut untuk meningkatkan kualitas aplikasi:
1. ✅ Email Verification Code (Registrasi & Ubah Email)
2. ✅ MUI Tables dengan Sortable Headers & Filter
3. ✅ Peta Monitoring Full-Size dengan Kontrol & Statistik

---

## 1. Email Verification Code

### Backend Changes

#### A. Schema Update (EmailVerificationCode table)
```prisma
model EmailVerificationCode {
  id        Int      @id @default(autoincrement())
  email     String   @db.VarChar(255)
  code      String   @db.VarChar(6)  // 6-digit code
  type      String   @db.VarChar(50) // 'registration' | 'change_email'
  userId    Int?     @map("user_id") // Null untuk registrasi baru
  verified  Boolean  @default(false)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")
  
  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([email])
  @@index([code])
  @@index([expiresAt])
  @@map("email_verification_codes")
}
```

#### B. Service (emailVerificationService.js)
- `generateCode()` - Generate 6-digit random code
- `sendVerificationEmail()` - Kirim email dengan code
- `verifyCode()` - Verify code dan update status
- Auto-expire codes after 10 minutes

#### C. Endpoints
- `POST /api/auth/send-verification-code` - Send code untuk registrasi/ubah email
- `POST /api/auth/verify-code` - Verify code
- `POST /api/auth/register` - Update untuk require verification
- `PUT /api/auth/change-email` - Ubah email dengan verification

---

## 2. MUI Tables dengan Sortable Headers & Filter

### Components to Update

#### A. RTQueuePanel.tsx
- Replace HTML table dengan MUI Table
- Add sortable headers (Judul, Urgensi, Status, Waktu)
- Add filter dropdown per column
- Keep pagination

#### B. AdminSystemPanel.tsx
- Update dengan MUI Table
- Sortable headers
- Advanced filters

#### C. ReportsList.tsx (if exists)
- Update dengan MUI DataGrid atau Table
- Sort & filter capabilities

---

## 3. Peta Monitoring - Full-Size Enhancement

### Features to Add

#### A. Full-Size Layout
- Remove sidebar, make map full-screen
- Add floating control panel
- Responsive overlay panels

#### B. Kontrol RT/RW
- Dropdown untuk pilih RT/RW (Admin RW)
- Set boundary button (floating)
- Statistik per RT/RW

#### C. Statistik Laporan
- Floating stat card di atas peta
- Real-time counts per status
- Filter by status, urgency, category

#### D. Legend Marker Warna
- Floating legend panel
- Penjelasan warna marker:
  - 🟡 Kuning = Pending
  - 🔵 Biru = In Progress
  - 🟢 Hijau = Resolved
  - ⚫ Abu-abu = Cancelled
  - 🔴 Merah = Location Mismatch

---

## 📝 Implementation Steps

### Phase 1: Email Verification Code
1. ✅ Add schema migration
2. ✅ Create emailVerificationService
3. ✅ Update registration endpoint
4. ✅ Add change email endpoint
5. ✅ Frontend components untuk input code

### Phase 2: MUI Tables
1. ✅ Install MUI dependencies (if needed)
2. ✅ Update RTQueuePanel dengan MUI Table
3. ✅ Add sortable headers
4. ✅ Add column filters
5. ✅ Update AdminSystemPanel

### Phase 3: Peta Monitoring
1. ✅ Convert to full-size layout
2. ✅ Add floating control panel
3. ✅ Add RT/RW selector
4. ✅ Add statistics overlay
5. ✅ Add legend panel

---

## ✅ Status

- [ ] Phase 1: Email Verification Code
- [ ] Phase 2: MUI Tables
- [ ] Phase 3: Peta Monitoring

---

**Target: Semua fitur selesai untuk bisa juara 1!** 🏆

