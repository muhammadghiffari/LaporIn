# 🧹 Clear Seeder Data

Script untuk menghapus data dummy dari seeder yang tidak penting, sambil mempertahankan data training AI chatbot.

## 📋 Data yang Dihapus

- ✅ **Users dari seeder** (100 warga + admin dummy)
  - Pattern: `warga*@example.com`, `adminsistem@example.com`, dll
  - **Kecuali**: 1 admin user tetap dipertahankan untuk testing (opsional)

- ✅ **Reports dari seeder** (~60 laporan dummy)
  - Semua laporan yang dibuat oleh users dari seeder

- ✅ **ReportStatusHistory** dari reports seeder
  - History status dari laporan dummy

- ✅ **AiProcessingLog** dari reports seeder
  - Log AI processing dari laporan dummy

- ✅ **FaceVerificationLog** dari users seeder
  - Log verifikasi biometrik dari users dummy

- ✅ **Bantuan** dari users seeder (jika ada)
  - Data bantuan dari users dummy

## 🔒 Data yang Dipertahankan

- ✅ **ChatbotConversation** - Data training AI chatbot
- ✅ **ChatbotTrainingData** - Data training AI chatbot
- ✅ **Data yang dibuat user secara manual** (bukan dari seeder)
- ✅ **1 admin user** untuk testing (opsional)

## 🚀 Cara Menggunakan

### Opsi 1: Menggunakan npm script

```bash
cd backend
npm run clear-seeder
```

### Opsi 2: Langsung run script

```bash
cd backend
node scripts/clear-seeder-data.js
```

## ⚠️ Peringatan

- **Script ini akan menghapus data secara permanen!**
- Pastikan sudah backup database jika diperlukan
- Data training AI chatbot **TIDAK akan dihapus**
- 1 admin user akan tetap dipertahankan untuk testing

## 📊 Output

Script akan menampilkan:
- Jumlah users yang dihapus
- Jumlah reports yang dihapus
- Jumlah data terkait yang dihapus
- Verifikasi data yang dipertahankan (ChatbotConversation, ChatbotTrainingData)

## 🔍 Verifikasi

Setelah menjalankan script, verifikasi data:

```bash
# Login ke PostgreSQL
psql -U postgres -d wargalapor

# Cek jumlah data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM reports;
SELECT COUNT(*) FROM chatbot_conversations;
SELECT COUNT(*) FROM chatbot_training_data;

# Exit
\q
```

## 💡 Tips

- Jika ingin menghapus semua users termasuk admin, edit script `clear-seeder-data.js`:
  - Set `keepAdminForTesting = false`

- Jika ingin keep lebih banyak data untuk testing:
  - Edit pattern email di `SEEDER_EMAIL_PATTERNS`
  - Atau comment bagian penghapusan tertentu

---

**Selamat membersihkan data! 🧹✨**

