# 🗑️ Clear All Data (Preserve Chatbot Training)

Script untuk menghapus **SEMUA** data user dan laporan, tapi **PRESERVE** data training AI chatbot.

## ⚠️ WARNING

Script ini akan menghapus:
- ❌ **Semua user** (users)
- ❌ **Semua laporan** (reports)
- ❌ **Semua report status history** (report_status_history)
- ❌ **Semua AI processing logs** (ai_processing_log)
- ❌ **Semua bantuan** (bantuan)
- ❌ **Semua face verification logs** (face_verification_logs)

**TAPI PRESERVE:**
- ✅ **Chatbot conversations** (chatbot_conversations) - userId di-set menjadi null
- ✅ **Chatbot training data** (chatbot_training_data) - Tetap utuh

## 🚀 Cara Menjalankan

```bash
cd backend
npm run clear-all
```

Atau langsung:

```bash
cd backend
node scripts/clear-all-data-except-chatbot.js
```

## 📋 Proses yang Dilakukan

1. **Update chatbot_conversations**: Set `userId = null` untuk semua conversations (preserve data, hilangkan relasi)
2. **Hapus face_verification_logs**: Semua log verifikasi wajah
3. **Hapus report_status_history**: Semua history status laporan
4. **Hapus ai_processing_log**: Semua log processing AI
5. **Hapus bantuan**: Semua data bantuan sosial
6. **Hapus reports**: Semua laporan
7. **Hapus users**: Semua user (setelah relasi diputus)

## ✅ Setelah Script Selesai

1. **Buat user baru** untuk testing:
   - Super Admin
   - Admin RW
   - Ketua RT
   - Warga

2. **Data chatbot training masih tersedia**:
   - `chatbot_conversations` masih ada (userId = null)
   - `chatbot_training_data` masih utuh
   - Bisa digunakan untuk training AI di masa depan

## 🔍 Verifikasi

Setelah script selesai, cek database:

```sql
-- Cek chatbot conversations masih ada
SELECT COUNT(*) FROM chatbot_conversations;

-- Cek chatbot training data masih ada
SELECT COUNT(*) FROM chatbot_training_data;

-- Cek users sudah kosong
SELECT COUNT(*) FROM users;

-- Cek reports sudah kosong
SELECT COUNT(*) FROM reports;
```

## 📝 Catatan

- Script ini **TIDAK** bisa di-undo
- Pastikan sudah backup database jika perlu
- Data chatbot training akan tetap ada untuk training AI
- `chatbot_conversations.userId` akan di-set menjadi `null` untuk memutus relasi dengan user yang dihapus

