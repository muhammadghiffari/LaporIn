# 📊 Database Chat: Kegunaan & Cara Melihat Data

## 🎯 Kegunaan Database Chat di PostgreSQL

Database chat (`chatbot_conversations`) digunakan untuk:

### 1. **Supervised Learning / Training Data** 📚
- Menyimpan semua percakapan user dengan chatbot
- Data ini bisa digunakan untuk **improve AI model** di masa depan
- Bisa di-label manual untuk training dataset yang lebih akurat

### 2. **Analytics & Monitoring** 📈
- Melihat **response time** chatbot (berapa cepat AI merespons)
- Melihat **intent detection accuracy** (seberapa akurat AI mendeteksi intent)
- Melihat **model yang digunakan** (groq, openai, gemini)
- Melihat **user feedback** (apakah user puas dengan respons)

### 3. **Debugging & Troubleshooting** 🐛
- Melihat **pesan user** yang menyebabkan error
- Melihat **detected intent** vs **actual intent**
- Melihat **context percakapan** untuk memahami masalah

### 4. **User Experience Improvement** ✨
- Melihat **pola percakapan** user (apa yang sering ditanyakan)
- Melihat **intent yang paling sering** digunakan
- Melihat **response time** untuk optimize performance

---

## 📋 Struktur Tabel `chatbot_conversations`

```sql
CREATE TABLE chatbot_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_role VARCHAR(50),                    -- 'warga', 'admin', 'pengurus', dll
  messages JSONB NOT NULL,                  -- Array of {role, content}
  detected_intent VARCHAR(50),             -- CREATE_REPORT, ASK_CAPABILITY, dll
  ai_model_used VARCHAR(100),              -- 'groq', 'openai', 'gemini'
  response_time_ms INTEGER,                 -- Waktu respons dalam milidetik
  user_feedback INTEGER,                    -- 1=good, -1=bad, 0=no feedback
  feedback_notes TEXT,                      -- Catatan feedback user
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Contoh Data:**
```json
{
  "id": 1,
  "user_id": 74,
  "user_role": "warga",
  "messages": [
    {"role": "user", "content": "tolong ada got mampet di jl digidaw nomr 121"},
    {"role": "assistant", "content": "Baik, draft laporan sudah dibuat..."}
  ],
  "detected_intent": "CREATE_REPORT",
  "ai_model_used": "groq",
  "response_time_ms": 523,
  "user_feedback": null,
  "created_at": "2024-12-19T10:30:00Z"
}
```

---

## 🛠️ Cara Melihat Data di PostgreSQL (Seperti phpMyAdmin untuk MySQL)

### **Opsi 1: Command Line (psql)** 💻

**1. Connect ke PostgreSQL:**
```bash
# Masuk ke PostgreSQL
psql -h localhost -U postgres -d wargalapor

# Atau jika menggunakan user default
psql -h 127.0.0.1 -p 5432 -U $(whoami) -d wargalapor
```

**2. Query Data Chat:**
```sql
-- Lihat semua percakapan
SELECT * FROM chatbot_conversations ORDER BY created_at DESC LIMIT 10;

-- Lihat percakapan dengan detail user
SELECT 
  cc.id,
  u.name as user_name,
  u.email,
  cc.user_role,
  cc.detected_intent,
  cc.ai_model_used,
  cc.response_time_ms,
  cc.created_at
FROM chatbot_conversations cc
LEFT JOIN users u ON cc.user_id = u.id
ORDER BY cc.created_at DESC
LIMIT 20;

-- Lihat messages (JSON)
SELECT 
  id,
  user_id,
  detected_intent,
  messages->0->>'content' as first_user_message,
  messages->-1->>'content' as last_assistant_message,
  created_at
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 10;

-- Statistik intent
SELECT 
  detected_intent,
  COUNT(*) as count,
  AVG(response_time_ms) as avg_response_time_ms
FROM chatbot_conversations
WHERE detected_intent IS NOT NULL
GROUP BY detected_intent
ORDER BY count DESC;

-- Statistik model yang digunakan
SELECT 
  ai_model_used,
  COUNT(*) as count,
  AVG(response_time_ms) as avg_response_time_ms
FROM chatbot_conversations
WHERE ai_model_used IS NOT NULL
GROUP BY ai_model_used
ORDER BY count DESC;
```

**3. Export Data ke CSV:**
```sql
-- Export ke CSV
\copy (SELECT * FROM chatbot_conversations ORDER BY created_at DESC) TO '/tmp/chatbot_conversations.csv' WITH CSV HEADER;
```

---

### **Opsi 2: GUI Tools (Seperti phpMyAdmin)** 🖥️

#### **A. pgAdmin 4** (Recommended - Official PostgreSQL Tool)

**Install:**
```bash
# macOS
brew install --cask pgadmin4

# Atau download dari: https://www.pgadmin.org/download/
```

**Setup:**
1. Buka pgAdmin 4
2. Klik kanan "Servers" → "Create" → "Server"
3. Isi:
   - **Name**: LaporIn Local
   - **Host**: localhost (atau 127.0.0.1)
   - **Port**: 5432
   - **Database**: wargalapor
   - **Username**: postgres (atau user Anda)
   - **Password**: (password PostgreSQL Anda)
4. Klik "Save"

**Menggunakan:**
- Expand "LaporIn Local" → "Databases" → "wargalapor" → "Schemas" → "public" → "Tables"
- Klik kanan `chatbot_conversations` → "View/Edit Data" → "All Rows"
- Bisa edit, filter, sort, export data

#### **B. DBeaver** (Free & Cross-platform)

**Install:**
```bash
# macOS
brew install --cask dbeaver-community

# Atau download dari: https://dbeaver.io/download/
```

**Setup:**
1. Buka DBeaver
2. Klik "New Database Connection" → Pilih "PostgreSQL"
3. Isi:
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: wargalapor
   - **Username**: postgres
   - **Password**: (password PostgreSQL Anda)
4. Klik "Test Connection" → "Finish"

**Menggunakan:**
- Expand connection → "Databases" → "wargalapor" → "Schemas" → "public" → "Tables"
- Double-click `chatbot_conversations` untuk melihat data
- Bisa edit, filter, sort, export

#### **C. TablePlus** (Beautiful UI - macOS/Windows)

**Install:**
```bash
# macOS
brew install --cask tableplus

# Atau download dari: https://tableplus.com/
```

**Setup:**
1. Buka TablePlus
2. Klik "Create a new connection" → Pilih "PostgreSQL"
3. Isi:
   - **Name**: LaporIn
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: wargalapor
   - **User**: postgres
   - **Password**: (password PostgreSQL Anda)
4. Klik "Test" → "Connect"

**Menggunakan:**
- Pilih `chatbot_conversations` di sidebar
- Data akan muncul di tabel
- Bisa edit, filter, sort, export

#### **D. Postico** (macOS Only - Simple & Clean)

**Install:**
```bash
# macOS
brew install --cask postico

# Atau download dari: https://eggerapps.at/postico/
```

**Setup:**
1. Buka Postico
2. Klik "New Favorite"
3. Isi:
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: wargalapor
   - **User**: postgres
   - **Password**: (password PostgreSQL Anda)
4. Klik "Connect"

**Menggunakan:**
- Pilih `chatbot_conversations` di sidebar
- Data akan muncul di tabel
- Simple & clean interface

---

### **Opsi 3: Web-based (Seperti phpMyAdmin)** 🌐

#### **Adminer** (Single PHP File)

**Install:**
```bash
# Download adminer.php
curl -o adminer.php https://www.adminer.org/latest.php
```

**Setup:**
1. Letakkan `adminer.php` di folder web server
2. Buka browser: `http://localhost/adminer.php`
3. Isi:
   - **System**: PostgreSQL
   - **Server**: localhost:5432
   - **Username**: postgres
   - **Password**: (password PostgreSQL Anda)
   - **Database**: wargalapor
4. Klik "Login"

**Menggunakan:**
- Pilih `chatbot_conversations` di sidebar
- Bisa query, edit, export data

---

## 📊 Query Berguna untuk Analisis Chat

### **1. Lihat Percakapan Terbaru:**
```sql
SELECT 
  cc.id,
  u.name as user_name,
  cc.user_role,
  cc.detected_intent,
  cc.ai_model_used,
  cc.response_time_ms,
  cc.messages->0->>'content' as user_message,
  cc.created_at
FROM chatbot_conversations cc
LEFT JOIN users u ON cc.user_id = u.id
ORDER BY cc.created_at DESC
LIMIT 20;
```

### **2. Statistik Intent:**
```sql
SELECT 
  detected_intent,
  COUNT(*) as total,
  ROUND(AVG(response_time_ms)) as avg_response_ms,
  MIN(response_time_ms) as min_response_ms,
  MAX(response_time_ms) as max_response_ms
FROM chatbot_conversations
WHERE detected_intent IS NOT NULL
GROUP BY detected_intent
ORDER BY total DESC;
```

### **3. Statistik Model Performance:**
```sql
SELECT 
  ai_model_used,
  COUNT(*) as total,
  ROUND(AVG(response_time_ms)) as avg_response_ms,
  COUNT(CASE WHEN user_feedback = 1 THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN user_feedback = -1 THEN 1 END) as negative_feedback
FROM chatbot_conversations
WHERE ai_model_used IS NOT NULL
GROUP BY ai_model_used
ORDER BY total DESC;
```

### **4. Cari Percakapan dengan Keyword:**
```sql
SELECT 
  cc.id,
  u.name,
  cc.detected_intent,
  cc.messages->0->>'content' as user_message,
  cc.created_at
FROM chatbot_conversations cc
LEFT JOIN users u ON cc.user_id = u.id
WHERE cc.messages::text ILIKE '%got mampet%'
ORDER BY cc.created_at DESC;
```

### **5. Lihat Percakapan User Tertentu:**
```sql
SELECT 
  cc.id,
  cc.detected_intent,
  cc.messages,
  cc.response_time_ms,
  cc.created_at
FROM chatbot_conversations cc
WHERE cc.user_id = 74  -- Ganti dengan user_id yang diinginkan
ORDER BY cc.created_at DESC;
```

---

## 🔍 Tips & Tricks

### **1. Format JSON Messages:**
```sql
-- Lihat messages dengan format yang lebih readable
SELECT 
  id,
  jsonb_pretty(messages) as formatted_messages
FROM chatbot_conversations
WHERE id = 1;
```

### **2. Filter by Date:**
```sql
-- Percakapan hari ini
SELECT * FROM chatbot_conversations
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- Percakapan 7 hari terakhir
SELECT * FROM chatbot_conversations
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### **3. Export untuk Analisis:**
```sql
-- Export ke CSV dengan format yang lebih baik
\copy (
  SELECT 
    cc.id,
    u.name as user_name,
    cc.user_role,
    cc.detected_intent,
    cc.ai_model_used,
    cc.response_time_ms,
    cc.messages->0->>'content' as first_user_message,
    cc.created_at
  FROM chatbot_conversations cc
  LEFT JOIN users u ON cc.user_id = u.id
  ORDER BY cc.created_at DESC
) TO '/tmp/chatbot_analysis.csv' WITH CSV HEADER;
```

---

## 📝 Kesimpulan

**Database chat (`chatbot_conversations`) berguna untuk:**
1. ✅ **Training data** untuk improve AI model
2. ✅ **Analytics** untuk monitoring performance
3. ✅ **Debugging** untuk troubleshoot masalah
4. ✅ **User experience** improvement

**Cara melihat data:**
- **Command line**: `psql` (untuk quick query)
- **GUI tools**: pgAdmin, DBeaver, TablePlus, Postico (untuk visual interface)
- **Web-based**: Adminer (seperti phpMyAdmin)

**Recommended:**
- **Quick query**: `psql`
- **Visual interface**: **pgAdmin 4** atau **DBeaver** (gratis & powerful)
- **Simple & clean**: **TablePlus** atau **Postico** (macOS)

---

## 🚀 Quick Start

**1. Install pgAdmin 4:**
```bash
brew install --cask pgadmin4
```

**2. Connect ke database:**
- Host: `localhost`
- Port: `5432`
- Database: `wargalapor`
- User: `postgres` (atau user Anda)

**3. Lihat data:**
- Expand: `wargalapor` → `Schemas` → `public` → `Tables` → `chatbot_conversations`
- Klik kanan → "View/Edit Data" → "All Rows"

**Selesai!** 🎉

