# 📸 Cara Menambahkan Logo LaporIn ke README.md

## ⚠️ File gambar belum ditambahkan!

File `laporin-logo.png` belum ada di folder ini. Ikuti langkah berikut:

## 📋 Langkah-langkah:

### Opsi 1: Upload via GitHub Web Interface (Paling Mudah)

1. Buka repository di GitHub: https://github.com/muhammadghiffari/LaporIn
2. Navigate ke folder `assets/images/`
3. Klik "Add file" → "Upload files"
4. Drag & drop atau pilih file gambar logo Anda
5. Nama file harus: `laporin-logo.png`
6. Commit dengan message: "Add LaporIn logo"
7. Push ke main branch

### Opsi 2: Via Terminal/Command Line

1. Simpan gambar logo dengan nama `laporin-logo.png`
2. Letakkan di folder ini: `assets/images/laporin-logo.png`
3. Jalankan command:
   ```bash
   git add assets/images/laporin-logo.png
   git commit -m "Add LaporIn logo"
   git push ghiffari main
   ```

### Opsi 3: Gunakan URL Gambar (Jika sudah di-host)

Jika gambar sudah di-host di tempat lain (Imgur, GitHub, dll), edit `README.md`:

1. Buka `README.md`
2. Cari baris: `![LaporIn Logo](./assets/images/laporin-logo.png)`
3. Ganti dengan URL gambar:
   ```markdown
   ![LaporIn Logo](https://your-image-url.com/laporin-logo.png)
   ```

## 📐 Spesifikasi Gambar:

- **Format**: PNG (recommended) atau JPG
- **Ukuran**: 
  - Width: 800-1200px (recommended)
  - Atau square: 1024x1024px
- **Background**: Transparan atau sesuai kebutuhan
- **Nama file**: `laporin-logo.png` (harus sesuai)

## ✅ Setelah Menambahkan:

Logo akan otomatis muncul di bagian atas README.md di GitHub!

## 🔍 Cek Apakah Sudah Berhasil:

Setelah push, buka README.md di GitHub. Jika gambar muncul, berarti sudah berhasil! 🎉

