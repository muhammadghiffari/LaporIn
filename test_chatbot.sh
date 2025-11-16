#!/bin/bash

# Test Chatbot Script
API_URL="http://localhost:3001"
EMAIL="warga1@example.com"
PASSWORD="Warga123!"

echo "🧪 Testing Chatbot API..."
echo "================================"
echo ""

# 1. Login untuk mendapatkan token
echo "1️⃣  Login untuk mendapatkan token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$TOKEN" ]; then
  echo "❌ Login gagal!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login berhasil! Token: ${TOKEN:0:20}..."
echo ""

# 2. Test: Pertanyaan kemampuan
echo "2️⃣  Test: Pertanyaan kemampuan ('apakah kamu bisa buat laporan otomatis?')"
RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"apakah kamu bisa buat laporan otomatis?\"}
    ]
  }")
echo "Response:"
echo $RESPONSE | jq -r '.reply // .error // .' | head -10
echo ""

# 3. Test: Preview mode (review dulu)
echo "3️⃣  Test: Preview mode ('tolong buatin laporan tentang jalan rusak di depan rumah saya dan kamu berikan isinya aku review dulu')"
RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"tolong buatin laporan tentang jalan rusak di depan rumah saya dan kamu berikan isinya aku review dulu\"}
    ]
  }")
echo "Response:"
echo $RESPONSE | jq -r '.reply // .error // .' | head -15
echo "Preview Mode: $(echo $RESPONSE | jq -r '.previewMode // false')"
echo ""

# 4. Test: Create report langsung
echo "4️⃣  Test: Create report langsung ('pohon runtuh di lapangan basket bisa tolong perbaiki')"
RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"pohon runtuh di lapangan basket bisa tolong perbaiki\"}
    ]
  }")
echo "Response:"
echo $RESPONSE | jq -r '.reply // .error // .' | head -15
echo "Report Created: $(echo $RESPONSE | jq -r '.reportCreated // false')"
if [ "$(echo $RESPONSE | jq -r '.reportCreated // false')" = "true" ]; then
  echo "Report ID: $(echo $RESPONSE | jq -r '.reportId // "N/A"')"
fi
echo ""

# 5. Test: Negasi (belum minta)
echo "5️⃣  Test: Negasi ('perasaan saya belum minta dibuatkan deh')"
RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"perasaan saya belum minta dibuatkan deh\"}
    ]
  }")
echo "Response:"
echo $RESPONSE | jq -r '.reply // .error // .' | head -10
echo ""

# 6. Test: Prioritas pesan terakhir (masalah spesifik di pesan terakhir)
echo "6️⃣  Test: Prioritas pesan terakhir ('tolong buatin laporan tentang masalah jalan rusak di depan rumah saya')"
RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"messages\": [
      {\"role\": \"assistant\", \"content\": \"Halo! Ada yang bisa dibantu?\"},
      {\"role\": \"user\", \"content\": \"pohon runtuh di lapangan\"},
      {\"role\": \"user\", \"content\": \"tolong buatin laporan tentang masalah jalan rusak di depan rumah saya\"}
    ]
  }")
echo "Response:"
echo $RESPONSE | jq -r '.reply // .error // .' | head -15
echo "Report Created: $(echo $RESPONSE | jq -r '.reportCreated // false')"
if [ "$(echo $RESPONSE | jq -r '.reportCreated // false')" = "true" ]; then
  echo "Report ID: $(echo $RESPONSE | jq -r '.reportId // "N/A"')"
  echo "Report Title: $(echo $RESPONSE | jq -r '.report.title // "N/A"')"
  echo "Report Location: $(echo $RESPONSE | jq -r '.report.location // "N/A"')"
fi
echo ""

echo "✅ Testing selesai!"
