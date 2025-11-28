# ⚠️ PERHATIAN: Seeder untuk Demo Video

## 📝 Catatan Penting

**Seeder (`seed-real-jakarta.js`) TIDAK membuat blockchain hash untuk laporan sample.**

### Alasan:
1. ✅ **Hemat Gas Fee** - Tidak perlu bayar gas untuk setiap laporan sample
2. ✅ **Tidak Limit** - Bisa create banyak laporan tanpa hit rate limit
3. ✅ **Faster Seeding** - Proses seeding lebih cepat
4. ✅ **Demo Friendly** - Perfect untuk demo video tanpa worry blockchain limits

### Apa yang Dilakukan Seeder:
- ✅ Create users (warga, admin, pengurus)
- ✅ Create reports dengan data real Jakarta
- ✅ Create AI Processing Logs
- ✅ Create Report Status History
- ✅ **TIDAK create blockchain hash** (blockchainTxHash = null)

### Laporan Real (dari User):
- ✅ Laporan yang dibuat via API `/api/reports` POST **akan otomatis** create blockchain hash
- ✅ Blockchain integration hanya untuk laporan real dari user

---

## 🎬 Untuk Demo Video

Seeder sudah perfect untuk demo karena:
- Banyak laporan sample (tanpa blockchain hash)
- Realistic data
- Berbagai status (pending, in_progress, resolved)
- GPS coordinates real Jakarta

**Laporan dengan blockchain hash hanya muncul saat user create report real via form/chatbot.**

---

## ✅ Cara Test Blockchain Hash

Jika ingin test blockchain hash di demo:
1. Login sebagai warga
2. Buat laporan baru via form atau chatbot
3. Laporan tersebut akan otomatis dapat blockchain hash

---

**Seeder sengaja tidak create blockchain hash - ini design yang benar untuk demo!** ✅

