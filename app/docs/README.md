## Frontend Docs

### Overview
- Next.js 16 (App Router) + React 19 + TypeScript, UI kit MUI + Tailwind utility classes.
- Entry point `app/layout.tsx`, route segments per feature (dashboard, laporan, admin, dll).
- State & side-effects: hooks + local stores (`store/`, `hooks/useToast`).
- Consumes backend REST API (`/backend`) dan websocket (`socket.io-client`).

### Getting Started
1. `cd /Users/tpmgroup/Abhi/projects/LaporIn`
2. `npm install`
3. Set env (`.env.local`):
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
   ```
4. `npm run dev` → http://localhost:3000

### Common Commands
| Command | Deskripsi |
| --- | --- |
| `npm run dev` | Next dev server w/ Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve build output |
| `npm run lint` | ESLint (uses `eslint.config.mjs`) |

### Key Concepts
- **Auth Guard**: `useAuthStore` + `hasCheckedAuth` di setiap page client.
- **Notifications**: `hooks/useToast` + `<ToastContainer />`.
- **Maps**: `@react-google-maps/api`, pastikan API key ter-load sebelum render.
- **Shared Components**: `components/` → impor via alias `@/components/...`.
- **API Helper**: `lib/api.ts` (axios instance, interceptors).

### Folder Guide
- `app/` – route segments. Tiap folder punya `page.tsx` (client/server component).
- `components/` – reusable UI (Admin panels, forms, layout).
- `hooks/` – custom hooks (toast).
- `lib/` – api client, helpers (excel export).
- `store/` – Zustand store (auth, toast, realtime).

### Review Checklist
- Pastikan route client pakai `use client`.
- Jangan panggil hooks secara conditional (lihat `app/admin/peta-laporan` fix).
- Simpan credential di `.env`, jangan commit.
- Gunakan `shared docs` di folder ini untuk SOP develop front-end. 

