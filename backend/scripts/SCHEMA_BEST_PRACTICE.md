# 📋 Schema Database Best Practice - LaporIn

## ✅ Analisis Schema Saat Ini

### 1. Naming Convention ✅

**Sudah Mengikuti Best Practice:**

- **Prisma Model:** camelCase (PascalCase untuk model name)
  - Contoh: `User`, `Report`, `ReportStatusHistory`
  
- **Prisma Fields:** camelCase
  - Contoh: `userId`, `createdAt`, `rtRw`

- **Database Tables:** snake_case (via `@@map`)
  - Contoh: `users`, `reports`, `report_status_history`

- **Database Columns:** snake_case (via `@map`)
  - Contoh: `user_id`, `created_at`, `rt_rw`

**Ini sudah benar!** Tidak ada duplikasi field. Yang ada adalah:
- `Report.id` = Primary Key (wajib)
- `Report.userId` = Foreign Key ke `User.id` (wajib)

### 2. Primary Keys ✅

Semua tabel memiliki primary key dengan `@id @default(autoincrement())`:
- ✅ `User.id`
- ✅ `Report.id`
- ✅ `ReportStatusHistory.id`
- ✅ `AiProcessingLog.id`
- ✅ `FaceVerificationLog.id`

### 3. Foreign Keys ✅

Semua foreign key sudah benar dan menggunakan relation:
- ✅ `Report.userId → User.id`
- ✅ `ReportStatusHistory.reportId → Report.id`
- ✅ `ReportStatusHistory.updatedBy → User.id`
- ✅ `AiProcessingLog.reportId → Report.id`
- ✅ `FaceVerificationLog.userId → User.id`

### 4. Indexes ✅

Index sudah ditambahkan untuk performa:
- ✅ `FaceVerificationLog`: `userId`, `createdAt`, `verified`
- ✅ Foreign keys otomatis di-index oleh PostgreSQL

### 5. Data Types ✅

Penggunaan tipe data sudah sesuai:
- ✅ `Int` untuk IDs
- ✅ `String` dengan `@db.VarChar(n)` untuk text terbatas
- ✅ `String` dengan `@db.Text` untuk text panjang
- ✅ `DateTime` untuk timestamps
- ✅ `Boolean` untuk flags
- ✅ `Float` untuk koordinat GPS
- ✅ `Decimal` untuk nominal/uang
- ✅ `Json` untuk data fleksibel (polygon coordinates)

---

## 🔍 Tidak Ada Masalah id vs user_id

**Kesimpulan:** Tidak ada duplikasi atau masalah dengan id vs user_id.

Yang benar:
- `Report.id` = Primary key laporan (unik, auto increment)
- `Report.userId` = Foreign key ke user yang membuat laporan

Ini adalah **standar database design** yang benar.

---

## 📊 Struktur Tabel (Best Practice)

### User Table
```prisma
model User {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  passwordHash   String
  name           String
  role           String
  rtRw           String?   @map("rt_rw")
  // ... fields lainnya
  
  reports              Report[]
  reportStatusHistory  ReportStatusHistory[]
  // ... relations lainnya
}
```

### Report Table
```prisma
model Report {
  id                 Int      @id @default(autoincrement())
  userId             Int      @map("user_id")  // FK ke User.id
  title              String
  description        String
  // ... fields lainnya
  
  user                User                  @relation(...)
  reportStatusHistory ReportStatusHistory[]
  aiProcessingLog     AiProcessingLog[]
}
```

**Penjelasan:**
- `id` = Primary key (otomatis)
- `userId` = Foreign key (reference ke User.id)

**Tidak ada masalah!** Ini adalah pola standar.

---

## ✅ Best Practices yang Sudah Diterapkan

1. **✅ Naming Convention:**
   - Prisma: camelCase
   - Database: snake_case
   - Mapping: `@map("snake_case")`

2. **✅ Primary Keys:**
   - Semua tabel punya PK
   - Auto-increment untuk IDs

3. **✅ Foreign Keys:**
   - Semua FK punya relation
   - Cascade delete di tempat yang tepat

4. **✅ Timestamps:**
   - `createdAt` dengan `@default(now())`
   - `updatedAt` dengan `@updatedAt`

5. **✅ Nullable Fields:**
   - Menggunakan `?` untuk optional fields
   - Contoh: `rtRw?`, `latitude?`

6. **✅ Indexes:**
   - Index untuk foreign keys (otomatis)
   - Index tambahan untuk query yang sering

7. **✅ Data Integrity:**
   - Unique constraints (`@unique`)
   - Foreign key constraints
   - Default values

---

## 🔧 Rekomendasi (Opsional)

### 1. Tambahkan Index untuk Query Sering

```prisma
model Report {
  // ... fields
  
  @@index([status])
  @@index([createdAt])
  @@index([userId, status])
}
```

### 2. Soft Delete (Opsional)

Jika ingin soft delete (tidak hapus data, hanya flag):

```prisma
model Report {
  // ... fields
  deletedAt  DateTime? @map("deleted_at")
  
  @@index([deletedAt])
}
```

### 3. Audit Trail (Sudah Ada!)

Sudah ada di beberapa tabel:
- `ReportStatusHistory` - Track perubahan status
- `FaceVerificationLog` - Track face verification
- `AiProcessingLog` - Track AI processing

---

## 📝 Kesimpulan

**Schema sudah mengikuti best practices!**

✅ Tidak ada masalah dengan id vs user_id
✅ Naming convention sudah benar
✅ Foreign keys sudah benar
✅ Indexes sudah cukup
✅ Data types sudah sesuai

**Tidak perlu perubahan schema!** Yang perlu diperbaiki hanya:
1. ✅ Pastikan logs dibuat saat create reports (sudah diperbaiki)
2. ✅ Test email notification (sedang di-test)

---

**File terkait:**
- `backend/prisma/schema.prisma` - Schema definition
- `backend/scripts/analyze-schema-and-logs.js` - Script analisis

