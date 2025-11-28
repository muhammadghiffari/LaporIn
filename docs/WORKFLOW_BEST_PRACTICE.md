# 📋 Best Practice Workflow Laporan - LaporIn

## 🎯 Rekomendasi Workflow

### **Opsi 1: Pengurus → RT/RW (Recommended) ✅**

**Alur:**
1. **Warga** membuat laporan → Status: `pending`
2. **Pengurus** meninjau dan memproses laporan → Status: `in_progress`
3. Setelah pengurus selesai memproses, laporan diteruskan ke **RT/RW** → Status: `resolved` atau tetap `in_progress` dengan catatan

**Keuntungan:**
- ✅ Quality control: Pengurus memastikan laporan valid dan lengkap sebelum ke RT/RW
- ✅ Mengurangi beban RT/RW dengan laporan yang sudah terverifikasi
- ✅ RT/RW fokus pada eksekusi, bukan validasi
- ✅ Lebih efisien untuk RT/RW yang memiliki banyak laporan

**Implementasi:**
- Pengurus memiliki permission `report:update:status` untuk mengubah status dari `pending` → `in_progress` → `resolved`
- RT/RW hanya melihat laporan dengan status `in_progress` atau `resolved` (bukan `pending`)
- Notifikasi otomatis ke RT/RW ketika pengurus mengubah status menjadi `in_progress`

---

### **Opsi 2: Langsung ke RT/RW (Alternatif)**

**Alur:**
1. **Warga** membuat laporan → Status: `pending`
2. **RT/RW** langsung melihat dan memproses → Status: `in_progress` → `resolved`

**Keuntungan:**
- ✅ Lebih cepat, tanpa tahap intermediate
- ✅ RT/RW memiliki kontrol penuh sejak awal
- ✅ Cocok untuk RT/RW kecil dengan sedikit laporan

**Kekurangan:**
- ❌ RT/RW harus memvalidasi semua laporan sendiri
- ❌ Bisa membebani RT/RW dengan laporan yang tidak valid/spam

---

## 🔄 Status Flow yang Disarankan

```
pending → in_progress → resolved
   ↓           ↓
cancelled  cancelled
```

**Penjelasan:**
- `pending`: Laporan baru dibuat, menunggu review
- `in_progress`: Sedang diproses (oleh pengurus atau RT/RW)
- `resolved`: Selesai ditangani
- `cancelled`: Dibatalkan (bisa dari status manapun)

---

## 📊 Rekomendasi untuk Sistem LaporIn

### **Untuk RT/RW Besar (Banyak Warga):**
Gunakan **Opsi 1** (Pengurus → RT/RW):
- Pengurus sebagai filter pertama
- RT/RW hanya terima laporan yang sudah divalidasi
- Efisiensi lebih tinggi

### **Untuk RT/RW Kecil (Sedikit Warga):**
Bisa gunakan **Opsi 2** (Langsung ke RT/RW):
- RT/RW bisa langsung handle
- Tidak perlu tahap intermediate

---

## 🛠️ Implementasi Teknis

### **Permission Matrix:**
- **Warga**: Hanya bisa membuat laporan (`report:create`)
- **Pengurus**: Bisa update status semua laporan di RT/RW mereka (`report:update:status`)
- **RT/RW**: Bisa update status semua laporan di wilayah mereka (`report:update:status`)

### **Filter Laporan:**
- **Pengurus**: Lihat semua laporan dengan status `pending` dan `in_progress`
- **RT/RW**: Lihat laporan dengan status `in_progress` dan `resolved` (skip `pending`)

### **Notifikasi:**
- Email ke RT/RW ketika pengurus mengubah status menjadi `in_progress`
- Email ke warga ketika status berubah

---

## 💡 Kesimpulan

**Rekomendasi Utama: Pengurus → RT/RW**

Alasan:
1. Quality control lebih baik
2. RT/RW fokus pada eksekusi, bukan validasi
3. Skalabilitas lebih baik untuk RT/RW besar
4. Mengurangi beban administratif RT/RW

**Catatan:** Sistem saat ini sudah mendukung kedua workflow. Admin bisa mengatur preferensi per RT/RW melalui konfigurasi atau kebijakan internal.

