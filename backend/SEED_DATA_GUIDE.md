# Panduan Seed Data

## Struktur Data

### RW001 (Ada data asli)
- **Superadmin**: `abhisuryanu9roho@gmail.com` - Abhi Surya Nugroho
- **Admin RW001**: `kepodehlol54@gmail.com`
- **RT001/RW001**:
  - Ketua RT: `syncrazeled@gmail.com` - Dyandra (perempuan)
  - Pengurus: `syncrazelled@gmail.com` - Muhammad Alfarisi Setiyono (laki_laki)
  - Sekretaris: Generate
  - Warga: `wadidawcihuy@gmail.com` - Muhammad Ghiffari (laki_laki) + warga generate lainnya
- **RT002/RW001**: Semua generate
- **RT003/RW001**: Semua generate

### RW002 (Full generate)
- Semua data generate (admin RW, ketua RT, sekretaris, pengurus, warga)

## Password Default
Semua akun menggunakan password: `demo123`

## Cara Menggunakan

### 1. Clear Semua Data
```bash
# Hapus semua data (kecuali chatbot training data)
npm run clear-all-data
```

### 2. Seed Data
```bash
# Seed data real Jakarta (RW001 + RW002)
npm run seed:real
```

### 3. Clear + Reseed (Sekaligus)
```bash
# Clear semua data lalu seed ulang
npm run clear-all-data && npm run seed:real
```

## Catatan
- Data training chatbot (ChatbotConversation, ChatbotTrainingData) tetap dipertahankan saat clear data
- Semua user yang dibuat memiliki jenis kelamin (laki_laki/perempuan)
- RW002 full generate, RW001 ada beberapa data dengan email asli
