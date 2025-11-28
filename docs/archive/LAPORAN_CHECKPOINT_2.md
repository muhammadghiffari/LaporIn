# Laporan Checkpoint Progres Kompetisi

**Nama Tim:** Weladalah  
**Kategori:** Hackathon  
**Persentase Progres Saat Ini:** 85%

---

## Permasalahan yang Diangkat

Sistem pelaporan warga di tingkat RT/RW di Indonesia saat ini masih sangat manual, terfragmentasi, dan tidak efisien. Laporan krusial dari warga seringkali tersebar melalui berbagai platform (seperti WhatsApp, telepon, atau lisan) sehingga sulit untuk dilacak dan ditindaklanjuti secara sistematis.

**Permasalahan utamanya adalah:**

1. **Inefisiensi:** Tidak ada sistem terpusat untuk melacak status laporan.
2. **Kurang Transparansi:** Warga tidak memiliki cara untuk memverifikasi apakah laporan mereka sedang ditangani atau siapa yang bertanggung jawab.
3. **Proses Manual:** Pengurus RT/RW harus memilah, mengkategorisasi, dan menentukan prioritas setiap laporan secara manual.
4. **Tidak Ada Analitik:** Ketiadaan data historis yang terstruktur menghalangi evaluasi kinerja dan perencanaan lingkungan berbasis data.
5. **Akses Terbatas:** Warga yang tidak memiliki akses ke komputer atau web browser kesulitan mengakses sistem pelaporan.

---

## Solusi yang Ditawarkan

Solusi LaporIn adalah sebuah inovasi layanan publik yang dirancang untuk merombak sistem pelaporan tradisional menjadi sistem yang real-time dan akuntabel. Dengan arsitektur yang menggabungkan kecerdasan buatan (AI) dan teknologi Distributed Ledger (Blockchain), LaporIn memberikan manfaat dan dampak sosial yang terukur, yaitu menciptakan sistem yang lebih efisien, aman, dan transparan.

LaporIn dibangun di atas pilihan teknologi kritis untuk memecahkan masalah inti:

### 1. Pemanfaatan AI (Analisis Data & Otomatisasi Layanan) untuk Efisiensi

Untuk menjawab masalah Proses Manual dan Tidak Ada Analitik, kami memilih AI sebagai fondasi utama:

**A. Otomatisasi Layanan (Smart Chatbot):**  
Untuk memastikan kemudahan proses bagi user awam, kami memprioritaskan alur pelaporan via chat. Warga tidak harus mengisi form; mereka bisa melapor menggunakan bahasa natural (NLP) seperti 'itu lampu jln mti dekat pos'. AI akan memandu percakapan, menanyakan detail yang dibutuhkan (lokasi, deskripsi, dll.) hingga data lengkap, lalu memberikan konfirmasi dan opsi edit manual di dalam chat sebelum laporan di-submit secara otomatis.

**B. Analisis Data (AI Processing):**  
Setelah laporan masuk, AI (Groq/OpenAI) melakukan analisis data otomatis untuk menentukan kategori (misal: Infrastruktur, Sosial), tingkat urgensi (misal: Rendah, Kritis), dan membuat ringkasan. Ini adalah automated data analysis yang membebaskan pengurus dari proses manual.

### 2. Pemanfaatan Blockchain (Keamanan, Transparansi & Kepercayaan) untuk Akuntabilitas

Untuk mengatasi masalah Kurang Transparansi dan Inefisiensi Pelacakan, kami mengimplementasikan Blockchain:

**A. Transparansi & Kepercayaan (Jejak Audit Immutable):**  
Setiap event penting dalam siklus hidup laporan (laporan dibuat, status diubah menjadi "Dikerjakan", laporan "Selesai") dicatat secara immutable di Smart Contract Polygon (Mumbai Testnet). Ini menciptakan sistem yang transparan dan dapat dipercaya oleh warga, karena data penanganan laporan tidak dapat dimanipulasi.

**B. Keamanan (Integritas Data & Autentikasi):**  
Blockchain menjamin keamanan integritas data audit. Platform juga didukung autentikasi JWT dan Role-Based Access Control (RBAC) untuk memastikan hanya user terotorisasi yang bisa mengakses atau mengubah data laporan.

### 3. Mobile-First Approach untuk Aksesibilitas

Untuk mengatasi masalah Akses Terbatas, kami mengembangkan aplikasi mobile native (Flutter) yang memungkinkan warga mengakses sistem pelaporan langsung dari smartphone mereka, tanpa perlu akses ke komputer atau browser web.

---

## Deskripsi Progres Saat Ini

Hingga checkpoint 85% ini, kami telah menyelesaikan fungsionalitas inti aplikasi baik untuk platform web maupun mobile, memastikan sistem 'dapat berfungsi dengan baik sebagaimana mestinya' dan dapat diakses oleh semua pengguna.

### Yang Sudah Selesai Dikerjakan (Core Function - 85%):

#### **Fungsionalitas AI (Analisis Data & Otomatisasi):**

✅ **aiService (Groq/OpenAI)** sudah berfungsi penuh. Layanan ini dapat menerima teks laporan dan mengembalikan hasil analisis (kategori, urgensi, ringkasan).

✅ **Smart Chatbot** telah diimplementasikan di web dan mobile:
- **Web App:** Chat widget terintegrasi dengan AI untuk memandu pelaporan via percakapan natural language
- **Mobile App:** Chat screen lengkap dengan quick suggestions, image upload, dan draft report preview
- AI memproses bahasa natural dan menanyakan detail yang kurang secara proaktif
- Konfirmasi dan opsi edit manual tersedia di dalam chat sebelum submit

#### **Fungsionalitas Blockchain (Transparansi):**

✅ **blockchainService dan Smart Contract WargaLapor.sol** sudah berfungsi penuh. Sistem dapat mencatat event penting (pembuatan laporan, perubahan status) ke Polygon Mumbai Testnet.

✅ **Blockchain Verification:**
- Web: Link verifikasi ke Polygonscan ditampilkan di detail laporan
- Mobile: Link verifikasi dapat dibuka langsung dari aplikasi mobile

#### **Fungsionalitas Platform Web (Kesiapan Aplikasi):**

✅ **Arsitektur Backend (Express.js)** - Lengkap dengan:
- Database PostgreSQL dengan schema lengkap
- Autentikasi & RBAC (JWT) dengan role hierarchy
- API utama (CRUD Laporan)
- Socket.IO untuk real-time updates
- Location validation service
- Reverse geocoding service

✅ **Frontend Web (Next.js)** - Lengkap dengan:
- Dashboard Analitik untuk Admin/Pengurus (KPI cards, charts)
- Halaman Laporan Pengurus dengan filter & search
- Halaman Laporan Saya untuk Warga
- Detail Laporan dengan Blockchain Verification
- Smart Chatbot Widget
- Face Recognition untuk 2FA
- Real-time updates via Socket.IO

#### **Fungsionalitas Platform Mobile (Flutter - Android):**

✅ **Mobile App Native (Flutter)** - Lengkap dengan fitur-fitur berikut:

**1. Authentication & Security:**
- ✅ Login dengan Email & Password
- ✅ Face Recognition 2FA menggunakan Google ML Kit
- ✅ Register user baru dengan validasi lengkap
- ✅ Session management dengan SharedPreferences
- ✅ Auto-logout on token expired

**2. Dashboard & Navigation:**
- ✅ Home screen dengan welcome card dan quick actions
- ✅ Recent reports list (5 terbaru)
- ✅ Bottom navigation bar (Dashboard, Laporan, Analytics)
- ✅ Navigation drawer dengan user profile
- ✅ Role-based menu (admin vs warga)

**3. Reports Management:**
- ✅ Create Report dengan form lengkap:
  - Judul, Deskripsi, Lokasi (required)
  - Image capture dengan camera integration
  - GPS Location picker dengan validasi RT/RW
  - Warning dialog untuk location mismatch
  - Kategori & Urgensi ditangani otomatis oleh AI
- ✅ Reports List dengan:
  - Card design dengan status badges (color-coded)
  - Filter by status, kategori, urgensi
  - Search functionality
  - Pull to refresh
  - Auto-refresh setiap 10 detik
- ✅ Report Detail dengan:
  - Informasi lengkap laporan
  - Blockchain transaction hash display
  - Link ke Polygonscan (dapat dibuka)
  - Cancel report untuk pending reports

**4. AI Chatbot:**
- ✅ Chat screen dengan UI modern
- ✅ Quick suggestions untuk memudahkan interaksi
- ✅ Image upload dari gallery
- ✅ Draft report preview card
- ✅ "Create Report" button langsung dari chat
- ✅ Auto-navigation ke create report form dengan data dari chat

**5. Location Services:**
- ✅ GPS integration dengan Geolocator
- ✅ Permission handling untuk location access
- ✅ Reverse geocoding untuk mendapatkan alamat dari koordinat
- ✅ Location validation untuk memastikan laporan dalam RT/RW yang benar
- ✅ "Use Current Location" button di create report form

**6. Settings:**
- ✅ Settings screen dengan:
  - Profile section (nama, email, role)
  - Account settings (Profil Saya, Ubah Password - placeholder)
  - App settings
  - About section
  - Logout button

**7. UI/UX:**
- ✅ Material Design 3 dengan konsistensi web app
- ✅ Google Fonts (Inter) - sama dengan web
- ✅ Color scheme konsisten (Blue primary, Indigo secondary)
- ✅ Status badges dengan color coding
- ✅ Loading states dan error handling
- ✅ Empty states
- ✅ Splash screen dengan logo LaporIn

**8. State Management & API Integration:**
- ✅ Riverpod untuk state management
- ✅ Dio HTTP client dengan auto token injection
- ✅ SharedPreferences untuk local storage
- ✅ Error handling dan network timeout
- ✅ All main endpoints terintegrasi

#### **Fungsionalitas Real-time:**

✅ **Socket.IO Integration:**
- Backend: Socket.IO server dengan authentication middleware
- Web: Real-time updates untuk report status changes
- Mobile: Ready untuk implementasi (infrastructure sudah ada)

#### **Fungsionalitas Location & Validation:**

✅ **Location Services:**
- Reverse geocoding service aktif
- Location validation untuk RT/RW boundaries
- GPS integration di mobile app
- Location mismatch warning system

---

### Kekurangan & Rencana Peningkatan (Sisa 15%):

Sisa 15% pengerjaan akan difokuskan untuk menyempurnakan pengalaman pengguna dan persiapan untuk presentasi akhir.

**1. Real-time Updates di Mobile App (5%):**
- Implementasi Socket.IO client di Flutter untuk real-time updates
- Auto-refresh reports list saat ada update baru
- Push notifications untuk status changes

**2. Profile Edit Screen (3%):**
- Screen untuk edit profil user
- Change password functionality
- Update avatar/profile picture

**3. Finalisasi & Polish (7%):**
- Testing comprehensive untuk semua fitur
- Performance optimization
- Bug fixes dan edge case handling
- Dokumentasi teknis lengkap
- Demo video dan screenshots untuk presentasi
- Preparation untuk final presentation

---

## Dokumentasi / Tampilan Progres

### Tampilan Antarmuka (UI) Aplikasi

#### **1. Mobile App - Splash Screen**

Splash screen dengan logo LaporIn yang menampilkan:
- Logo LaporIn dengan design modern (light cyan/blue)
- Animasi fade-in dan scale
- Tagline aplikasi
- Loading indicator
- Auto-navigation setelah 3 detik

#### **2. Mobile App - Login & Face Recognition**

- Login screen dengan email & password
- Face verification screen dengan camera integration
- Real-time face detection menggunakan Google ML Kit
- Visual feedback untuk face detection

#### **3. Mobile App - Dashboard**

- Welcome card dengan nama user dan role badge
- Quick actions (Buat Laporan, Lihat Semua)
- Recent reports list (5 terbaru)
- Bottom navigation bar
- Floating chatbot button untuk warga (purple)
- Floating "Create Report" button di reports tab

#### **4. Mobile App - Create Report**

- Form lengkap dengan validasi
- Image capture dengan camera
- GPS location picker dengan "Use Current Location" button
- Location validation dengan warning dialog
- Submit dengan loading indicator

#### **5. Mobile App - Reports List**

- Card design dengan status badges
- Filter options (Status, Kategori, Urgensi)
- Search bar
- Pull to refresh
- Empty state dan loading state

#### **6. Mobile App - Report Detail**

- Informasi lengkap laporan
- Status badge dengan color coding
- Blockchain transaction hash
- Link ke Polygonscan
- Cancel button untuk pending reports

#### **7. Mobile App - AI Chatbot**

- Modern chat UI dengan message bubbles
- Quick suggestions
- Image upload dari gallery
- Draft report preview card
- "Create Report" button dari chat

#### **8. Mobile App - Settings**

- Profile section
- Account settings
- App settings
- About section
- Logout button

#### **9. Web App - Dashboard Analitik (Admin/Pengurus)**

Fokus utama halaman ini adalah menyediakan dashboard utama bagi pengurus RT/RW. Fitur ini mencakup KPI cards (Total Laporan, Selesai, Diproses) dan visualisasi data (seperti Tren Laporan Harian, Distribusi Kategori, dan Urgensi) menggunakan Chart.js. Halaman ini secara langsung menjawab kebutuhan analisis data untuk perencanaan, mengurangi Proses Manual, dan memberikan insight yang belum pernah ada sebelumnya.

#### **10. Web App - Halaman Laporan Pengurus (Admin/Pengurus)**

Halaman ini memvisualisasikan daftar laporan yang perlu ditangani oleh pengurus RT/RW. Pengurus dapat melihat semua laporan, memfilter berdasarkan status, kategori, dan urgensi, serta mencari laporan tertentu. Fitur ini mengatasi masalah Inefisiensi dengan menyediakan sistem terpusat untuk melacak dan menangani laporan.

#### **11. Web App - Halaman Laporan Saya (Warga)**

Halaman ini memvisualisasikan daftar laporan yang telah dibuat oleh warga. Warga dapat melacak status setiap laporan (Pending, Diproses, Selesai, Dibatalkan) secara real-time. Terdapat juga fungsionalitas filter dan search untuk memudahkan pencarian. Fitur ini mengatasi masalah Inefisiensi dan Kurang Transparansi pelacakan.

#### **12. Web App - Detail Laporan & Verifikasi Blockchain**

Halaman ini menyajikan detail satu laporan, termasuk timeline riwayat status. Yang terpenting, di sini ditampilkan hash transaksi dan link verifikasi ke Polygonscan. Ini adalah implementasi langsung dari pilar Transparansi & Kepercayaan, di mana warga dapat memverifikasi jejak audit laporan secara independen, memastikan akuntabilitas pengurus.

#### **13. Web App - Smart Chatbot (Asisten LaporIn) Otomatisasi Laporan**

Fitur inti yang disajikan di sini adalah interaksi warga dengan AI Chatbot. Warga dapat mengetik dalam bahasa manusia (NLP), dan AI akan merespons untuk memandu proses pelaporan. Halaman ini adalah bukti kunci dari kemudahan pengguna dan otomatisasi layanan, mempercepat kebutuhan pengisian formulir yang kaku dan meningkatkan User Experience karena hanya dengan mengetik ke chatbot.

---

### Diagram Arsitektur & Alur Data

#### **Diagram Arsitektur Keseluruhan Sistem**

```
┌─────────────────┐         ┌─────────────────┐
│  Web Browser    │         │  Mobile App     │
│  (Next.js)      │         │  (Flutter)       │
└────────┬────────┘         └────────┬────────┘
         │                            │
         │  HTTP + JWT                │  HTTP + JWT
         │  Socket.IO                  │  Socket.IO (ready)
         │                            │
         └────────────┬───────────────┘
                      │
         ┌────────────▼────────────┐
         │   Express.js Backend    │
         │   (Node.js)             │
         └────────────┬────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
    │PostgreSQL│  │AI Service│  │Blockchain│
    │ Database │  │(Groq/   │  │(Polygon  │
    │          │  │OpenAI)  │  │Mumbai)   │
    └──────────┘  └─────────┘  └──────────┘
```

Diagram ini menunjukkan arsitektur lengkap LaporIn. Dari Web Browser dan Mobile App (klien), permintaan masuk ke Next.js Frontend (web) atau langsung ke Express.js Backend (mobile), yang kemudian berkomunikasi melalui API (HTTP + JWT) ke Express.js Backend. Backend mengkoordinasikan tiga layanan inti: Data Layer (PostgreSQL), External Services (AI via Groq/OpenAI), dan Blockchain (Smart Contract di Polygon).

#### **Diagram Alur (Sequence) Pembuatan Laporan**

```
User (Warga)
    │
    ├─> [Web/Mobile] Form atau Chatbot
    │
    ├─> POST /api/reports
    │       │
    │       ├─> Backend Validasi
    │       │
    │       ├─> AI Service (Analisis: Kategori, Urgensi)
    │       │
    │       ├─> Location Validation (RT/RW)
    │       │
    │       ├─> Simpan ke PostgreSQL
    │       │       ├─> Tabel: reports
    │       │       ├─> Tabel: report_status_history
    │       │       └─> Tabel: blockchain_transactions
    │       │
    │       └─> Blockchain Service
    │               └─> Smart Contract (Polygon Mumbai)
    │                       └─> Event: ReportCreated
    │
    └─> Response Success
            ├─> Display Report Detail
            └─> Show Polygonscan Link
```

Diagram sekuens ini menunjukkan alur lengkap saat pengguna membuat laporan. Dimulai dari User (Warga) mengisi form atau berinteraksi dengan chatbot, Frontend mengirim POST /api/reports, Backend memvalidasi, memanggil aiService untuk analisis, memvalidasi lokasi RT/RW, menyimpan hasil ke PostgreSQL (3 tabel), dan memanggil blockchainService untuk mencatat di WargaLapor.sol. Akhirnya, Frontend menerima respons sukses dan menampilkan link Polygonscan.

---

## Fitur Utama yang Telah Diimplementasi

### **Web Application:**

1. ✅ **Authentication dengan Face Recognition 2FA**
2. ✅ **Dashboard Analitik untuk Admin/Pengurus**
3. ✅ **Create Report dengan Form Lengkap**
4. ✅ **Reports List dengan Filter & Search**
5. ✅ **Report Detail dengan Blockchain Verification**
6. ✅ **Smart Chatbot dengan AI**
7. ✅ **Real-time Updates via Socket.IO**
8. ✅ **Location Validation & Reverse Geocoding**

### **Mobile Application (Flutter - Android):**

1. ✅ **Splash Screen dengan Logo LaporIn**
2. ✅ **Authentication dengan Face Recognition 2FA**
3. ✅ **Dashboard dengan Quick Actions**
4. ✅ **Create Report dengan GPS Location**
5. ✅ **Reports List dengan Filter & Search**
6. ✅ **Report Detail dengan Blockchain Link**
7. ✅ **AI Chatbot dengan Image Upload**
8. ✅ **Settings Screen**
9. ✅ **Location Services & Validation**
10. ✅ **Camera Integration untuk Foto**

---

## Teknologi yang Digunakan

### **Backend:**
- Node.js dengan Express.js
- PostgreSQL Database
- JWT Authentication
- Socket.IO untuk Real-time
- Groq/OpenAI untuk AI Processing
- Polygon Mumbai Testnet untuk Blockchain

### **Web Frontend:**
- Next.js (React)
- TypeScript
- Chart.js untuk Visualisasi
- Socket.IO Client
- face-api.js untuk Face Recognition

### **Mobile Frontend:**
- Flutter (Dart)
- Riverpod untuk State Management
- Google ML Kit untuk Face Recognition
- Geolocator untuk GPS
- Dio untuk HTTP Client
- Socket.IO Client (ready)
- Camera & Image Picker

---

## Link Proyek / Prototype

**Repository:** https://github.com/muhammadghiffari/LaporIn

**Demo:**
- Web App: [URL jika sudah di-deploy]
- Mobile App: APK dapat di-build dari repository

---

## Kesimpulan

Dengan progres 85%, LaporIn telah mencapai milestone signifikan dalam pengembangan platform pelaporan warga yang inovatif. Kami telah berhasil mengimplementasikan:

1. **AI-powered automation** untuk efisiensi proses pelaporan
2. **Blockchain transparency** untuk akuntabilitas dan kepercayaan
3. **Mobile-first approach** untuk aksesibilitas yang lebih luas
4. **Real-time updates** untuk transparansi yang lebih baik
5. **Location validation** untuk memastikan akurasi laporan

Sisa 15% akan difokuskan pada penyempurnaan fitur real-time di mobile, profile management, dan finalisasi untuk presentasi akhir kompetisi.

---

**Tim Weladalah**  
*Membangun sistem pelaporan yang lebih efisien, transparan, dan dapat diakses oleh semua warga.*

