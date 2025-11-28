## Backend Docs

### Stack
- Node.js 18+, Express, Prisma (PostgreSQL), Socket.IO, Redis (optional cache), Groq/OpenAI/NLP services.
- Face recognition via `face-api.js` + `@tensorflow/tfjs-node`.
- Blockchain helpers (Polygon testnet) via `ethers`.

### Quick Start
```bash
cd backend
cp .env.example .env             # pastikan file ini tidak di-commit
npm install
npx prisma generate
npx prisma migrate deploy        # atau migrate dev di lokal
npm run dev                      # nodemon server.js
```

**Env var minimum** (lengkap di `.env.example`):
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL` (opsional)
- `NODE_ENV`
- `GROQ_API_KEY` / `OPENAI_API_KEY`
- `GOOGLE_MAPS_KEY`, `WHATSAPP_*`, `EMAIL_*` jika perlu.

### Scripts
| Script | Fungsi |
| --- | --- |
| `npm run dev` | Start server (nodemon) |
| `npm run seed`, `seed:location`, `seed:real` | Seeder dataset |
| `clear-*` | Membersihkan data (lihat `scripts/`) |
| `test`, `test:watch` | Jest tests |
| `download:face-models`, `setup:face-models` | Setup model vision |

### Project Layout
- `server.js` – bootstrap Express + Socket.IO + middleware.
- `routes/` – modul API (auth, reports, chat, nlp).
- `services/` – integrasi (AI, blockchain, email, face recognition, geocoding).
- `middleware/` – auth, permission guard.
- `prisma/` + `generated/` – schema & client.
- `scripts/` – CLI utilities (seeding, diagnostics).
- `public/` – static assets (email templates, etc).
- `tests/` – Jest suites.

### Dev Notes
- Ikuti `CARA_PENGGUNAAN_PERMISSION.md` & `PERMISSION_MATRIX.md`.
- Simpan secret di `.env` dan jangan pernah commit (cek `.gitignore` sudah menutup `.env`, `uploads/`, dll).
- Gunakan `docs/` folder ini untuk menulis SOP opsional (btw, banyak catatan historis di root `.md`; pindahkan bila perlu).

### Observasi Kebersihan
- `scripts/` punya banyak dokumen *.md; gunakan README ini sebagai indeks dan hapus dokumen yang sudah digantikan jika yakin.
- `public/email-templates` berisi output yang sebaiknya tidak di-commit kalau bisa di-build otomatis.
- Periksa `uploads/` sebelum push (seharusnya di-ignore).

### API Reference
- `/auth/*` – auth dasar + face register/verify.
- `/reports/*` – CRUD + stats + map data.
- `/chat/*` – AI assistant hooks (Groq + fallback).
- `/nlp/*` – internal NLP endpoints.

Saat menambah route, extend `docs` ini agar tim lain tahu dependensi env & prosedur. 

