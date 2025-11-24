# 🚀 Quick Guide: Melihat Data Chat di PostgreSQL

## ⚡ Cara Tercepat (Command Line)

### **1. Connect ke Database:**
```bash
psql -h localhost -U postgres -d wargalapor
```

### **2. Lihat Data Chat:**
```sql
-- Lihat 10 percakapan terbaru
SELECT * FROM chatbot_conversations ORDER BY created_at DESC LIMIT 10;

-- Lihat dengan detail user
SELECT 
  cc.id,
  u.name as user_name,
  cc.detected_intent,
  cc.ai_model_used,
  cc.response_time_ms,
  cc.created_at
FROM chatbot_conversations cc
LEFT JOIN users u ON cc.user_id = u.id
ORDER BY cc.created_at DESC
LIMIT 20;
```

### **3. Lihat Messages (JSON):**
```sql
-- Lihat pesan pertama user
SELECT 
  id,
  user_id,
  detected_intent,
  messages->0->>'content' as user_message,
  created_at
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🖥️ Cara Visual (GUI Tools)

### **Option 1: pgAdmin 4** (Recommended)

**Install:**
```bash
brew install --cask pgadmin4
```

**Connect:**
1. Buka pgAdmin 4
2. Klik kanan "Servers" → "Create" → "Server"
3. Isi:
   - **Name**: LaporIn
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: wargalapor
   - **Username**: postgres
   - **Password**: (password Anda)
4. Klik "Save"

**Lihat Data:**
- Expand: `LaporIn` → `Databases` → `wargalapor` → `Schemas` → `public` → `Tables`
- Klik kanan `chatbot_conversations` → "View/Edit Data" → "All Rows"

---

### **Option 2: DBeaver** (Free & Powerful)

**Install:**
```bash
brew install --cask dbeaver-community
```

**Connect:**
1. Buka DBeaver
2. "New Database Connection" → "PostgreSQL"
3. Isi connection details
4. Klik "Test Connection" → "Finish"

**Lihat Data:**
- Expand connection → `wargalapor` → `public` → `Tables`
- Double-click `chatbot_conversations`

---

### **Option 3: TablePlus** (Beautiful UI)

**Install:**
```bash
brew install --cask tableplus
```

**Connect:**
1. Buka TablePlus
2. "Create a new connection" → "PostgreSQL"
3. Isi connection details
4. Klik "Connect"

**Lihat Data:**
- Pilih `chatbot_conversations` di sidebar

---

## 📊 Query Berguna

### **Statistik Intent:**
```sql
SELECT 
  detected_intent,
  COUNT(*) as total,
  ROUND(AVG(response_time_ms)) as avg_ms
FROM chatbot_conversations
WHERE detected_intent IS NOT NULL
GROUP BY detected_intent
ORDER BY total DESC;
```

### **Cari Keyword:**
```sql
SELECT * FROM chatbot_conversations
WHERE messages::text ILIKE '%got mampet%'
ORDER BY created_at DESC;
```

---

## 🎯 Quick Reference

| Tool | Install | Best For |
|------|---------|----------|
| **psql** | Built-in | Quick queries |
| **pgAdmin 4** | `brew install --cask pgadmin4` | Full-featured GUI |
| **DBeaver** | `brew install --cask dbeaver-community` | Cross-platform |
| **TablePlus** | `brew install --cask tableplus` | Beautiful UI |

---

**Pilih salah satu tool di atas dan mulai explore data chat Anda!** 🚀

