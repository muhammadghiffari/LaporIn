# 📚 API Documentation - LaporIn

Dokumentasi lengkap untuk semua API endpoints di LaporIn.

**Base URL**: `http://localhost:3001/api`

---

## 📋 Table of Contents

- [Authentication](#authentication)
- [Reports](#reports)
- [Chat](#chat)
- [NLP](#nlp)
- [Health Check](#health-check)

---

## 🔐 Authentication

### Register User

Mendaftarkan user baru.

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "warga",
  "rt_rw": "RT001/RW005",
  "jenis_kelamin": "laki_laki"
}
```

**Fields:**
- `email` (string, required): Email user (must be unique)
- `password` (string, required): Password (min 6 chars)
- `name` (string, required): Nama lengkap
- `role` (string, required): `warga` | `pengurus` | `admin` | `admin_rw` | `ketua_rt` | `sekretaris_rt`
- `rt_rw` (string, optional): Format "RT001/RW005"
- `jenis_kelamin` (string, optional): `laki_laki` | `perempuan`

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "warga",
    "rt_rw": "RT001/RW005",
    "jenis_kelamin": "laki_laki"
  }
}
```

---

### Login

Login user dan dapatkan JWT token.

**Endpoint:** `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "warga",
    "rt_rw": "RT001/RW005"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### Get Warga Stats

Mendapatkan statistik warga berdasarkan gender.

**Endpoint:** `GET /api/auth/stats/warga`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "total_warga": 100,
  "by_gender": [
    {
      "jenis_kelamin": "laki_laki",
      "count": 52
    },
    {
      "jenis_kelamin": "perempuan",
      "count": 48
    }
  ],
  "persentase": {
    "laki_laki": 52,
    "perempuan": 48
  }
}
```

---

### List Users

Mendapatkan daftar users (Admin Sistem only).

**Endpoint:** `GET /api/auth/users`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (string, optional): Filter by role
- `search` (string, optional): Search by name or email
- `limit` (number, optional, default: 50): Limit results
- `offset` (number, optional, default: 0): Offset for pagination

**Example:**
```
GET /api/auth/users?role=warga&search=john&limit=10&offset=0
```

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "warga",
    "rt_rw": "RT001/RW005",
    "jenis_kelamin": "laki_laki",
    "created_at": "2025-11-17T10:00:00.000Z"
  }
]
```

**Error (403):**
```json
{
  "error": "Insufficient permissions"
}
```

---

### Delete User

Menghapus user (Admin/RT/RW only).

**Endpoint:** `DELETE /api/auth/users/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (number): User ID

**Response (200):**
```json
{
  "success": true
}
```

**Error (403):**
```json
{
  "error": "Insufficient permissions"
}
```

---

## 📋 Reports

### Create Report

Membuat laporan baru. Otomatis diproses oleh AI dan di-log ke blockchain.

**Endpoint:** `POST /api/reports`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Lampu Jalan Mati di Blok C",
  "description": "Lampu jalan di depan rumah blok C sudah mati selama 3 hari. Kondisi gelap dan berbahaya untuk warga yang pulang malam.",
  "location": "RT001/RW005, Blok C, Jalan Utama"
}
```

**Fields:**
- `title` (string, required): Judul laporan (max 255 chars)
- `description` (string, required): Deskripsi lengkap
- `location` (string, required): Lokasi spesifik

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "title": "Lampu Jalan Mati di Blok C",
  "description": "Lampu jalan di depan rumah blok C sudah mati selama 3 hari...",
  "location": "RT001/RW005, Blok C, Jalan Utama",
  "category": "infrastruktur",
  "urgency": "medium",
  "status": "pending",
  "ai_summary": "Lampu jalan mati di blok C selama 3 hari, kondisi gelap berbahaya.",
  "blockchain_tx_hash": "0x1234...abcd",
  "created_at": "2025-11-17T10:00:00.000Z",
  "updated_at": "2025-11-17T10:00:00.000Z"
}
```

**Note:** 
- AI otomatis menentukan `category` (infrastruktur, sosial, administrasi, bantuan) dan `urgency` (high, medium, low)
- AI membuat `ai_summary` dari title + description
- Blockchain transaction hash di-generate otomatis
- Status default: `pending`

---

### Get Reports

Mendapatkan daftar laporan dengan filter.

**Endpoint:** `GET /api/reports`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status (`pending`, `in_progress`, `resolved`, `rejected`)
- `category` (string, optional): Filter by category
- `urgency` (string, optional): Filter by urgency (`high`, `medium`, `low`)
- `user_id` (number, optional): Filter by user ID (default: current user untuk warga)
- `limit` (number, optional, default: 50): Limit results
- `offset` (number, optional, default: 0): Offset for pagination

**Example:**
```
GET /api/reports?status=pending&category=infrastruktur&limit=10
```

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "Lampu Jalan Mati di Blok C",
    "description": "...",
    "category": "infrastruktur",
    "urgency": "medium",
    "status": "pending",
    "location": "RT001/RW005, Blok C",
    "blockchain_tx_hash": "0x1234...abcd",
    "created_at": "2025-11-17T10:00:00.000Z"
  }
]
```

---

### Get Report Detail

Mendapatkan detail laporan dengan timeline.

**Endpoint:** `GET /api/reports/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (number): Report ID

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "title": "Lampu Jalan Mati di Blok C",
  "description": "...",
  "category": "infrastruktur",
  "urgency": "medium",
  "status": "pending",
  "location": "RT001/RW005, Blok C",
  "ai_summary": "...",
  "blockchain_tx_hash": "0x1234...abcd",
  "created_at": "2025-11-17T10:00:00.000Z",
  "updated_at": "2025-11-17T10:00:00.000Z",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com"
  },
  "status_history": [
    {
      "id": 1,
      "status": "pending",
      "notes": null,
      "blockchain_tx_hash": "0x1234...abcd",
      "created_at": "2025-11-17T10:00:00.000Z",
      "updated_by": 1
    }
  ]
}
```

---

### Get Reports Stats

Mendapatkan statistik analytics untuk dashboard (Pengurus/Admin only).

**Endpoint:** `GET /api/reports/stats`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "total_reports": 150,
  "pending": 45,
  "in_progress": 30,
  "resolved": 70,
  "rejected": 5,
  "weekly_counts": [
    { "week": "2025-W46", "count": 20 },
    { "week": "2025-W47", "count": 25 }
  ],
  "monthly_counts": [
    { "month": "2025-10", "count": 60 },
    { "month": "2025-11", "count": 90 }
  ],
  "by_category": {
    "infrastruktur": 80,
    "sosial": 30,
    "administrasi": 25,
    "bantuan": 15
  },
  "by_urgency": {
    "high": 40,
    "medium": 70,
    "low": 40
  },
  "by_status": {
    "pending": 45,
    "in_progress": 30,
    "resolved": 70,
    "rejected": 5
  }
}
```

---

### Update Report Status

Update status laporan (Pengurus/Admin only). Otomatis di-log ke blockchain.

**Endpoint:** `PATCH /api/reports/:id/status`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `id` (number): Report ID

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Sedang menghubungi PLN untuk perbaikan"
}
```

**Fields:**
- `status` (string, required): `pending` | `in_progress` | `resolved` | `rejected`
- `notes` (string, optional): Catatan perubahan status

**Response (200):**
```json
{
  "id": 1,
  "status": "in_progress",
  "blockchain_tx_hash": "0x5678...efgh",
  "updated_at": "2025-11-17T11:00:00.000Z"
}
```

**Error (403):**
```json
{
  "error": "Insufficient permissions"
}
```

---

## 💬 Chat

### Chat with AI Assistant

Chat dengan AI assistant. Bisa auto-generate laporan dari natural language.

**Endpoint:** `POST /api/chat`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "lampu depan portal itu mati"
    }
  ]
}
```

**Fields:**
- `messages` (array, required): Array of messages dengan `role` (`user` | `assistant`) dan `content`

**Response (200) - Auto-created report:**
```json
{
  "reply": "✅ **Laporan berhasil dibuat otomatis!**\n\n📋 **ID Laporan:** #123\n...",
  "reportCreated": true,
  "reportId": 123,
  "report": {
    "id": 123,
    "title": "Lampu Depan Portal Mati",
    ...
  }
}
```

**Response (200) - General chat:**
```json
{
  "reply": "Baik, saya akan membantu Anda..."
}
```

**Response (200) - Report data for form pre-fill:**
```json
{
  "reply": "Baik, saya sudah siapkan data laporan...",
  "reportData": {
    "title": "Lampu Depan Portal Mati",
    "description": "...",
    "location": "...",
    "category": "infrastruktur",
    "urgency": "medium"
  },
  "autoCreateFailed": true
}
```

---

## 🤖 NLP

### Detect Intent

Deteksi intent dari text.

**Endpoint:** `POST /api/nlp/intent`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "lampu jalan mati di blok c"
}
```

**Response (200):**
```json
{
  "intent": "CREATE_REPORT",
  "confidence": 0.95,
  "looksLikeReport": true,
  "detectedLocation": "blok c",
  "detectedProblem": "lampu mati"
}
```

**Intents:**
- `CREATE_REPORT`: User ingin membuat laporan
- `CHECK_STATUS`: User ingin cek status laporan
- `ASK_FAQ`: User bertanya FAQ

---

### Classify Report

Klasifikasi category dan urgency dari text laporan.

**Endpoint:** `POST /api/nlp/classify`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "lampu jalan mati di blok c selama 3 hari"
}
```

**Response (200):**
```json
{
  "category": "infrastruktur",
  "urgency": "medium"
}
```

**Categories:**
- `infrastruktur`: Jalan, lampu, got, drainase, listrik, air
- `sosial`: Keributan, tetangga, keamanan, konflik
- `administrasi`: Surat, domisili, pengantar, KTP, KK
- `bantuan`: Bansos, sembako, bantuan sosial

**Urgency:**
- `high`: Kebakaran, listrik, bocor, darurat
- `medium`: Mampet, rusak, gangguan
- `low`: Permintaan, surat, informasi

---

### Redact PII

Redaksi data sensitif (PII) dari text.

**Endpoint:** `POST /api/nlp/redact`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Nama saya John Doe, NIK saya 1234567890123456, alamat Jl. Contoh No. 123"
}
```

**Response (200):**
```json
{
  "redacted": "Nama saya [nama], NIK saya [nik], alamat [alamat]"
}
```

---

## ❤️ Health Check

### Health Check

Cek status API server.

**Endpoint:** `GET /api/health`

**Response (200):**
```json
{
  "status": "ok",
  "message": "LaporIn API is running"
}
```

---

## 🔒 Authentication

Semua endpoint kecuali `/api/auth/register` dan `/api/auth/login` memerlukan JWT token.

**How to use:**
1. Login via `/api/auth/login` untuk mendapatkan token
2. Set header: `Authorization: Bearer <token>`
3. Token expires dalam 7 hari

**Error (401):**
```json
{
  "error": "Unauthorized"
}
```

---

## 🚨 Error Responses

Semua error mengikuti format:

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error, etc.)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

**Last Updated:** November 17, 2025

