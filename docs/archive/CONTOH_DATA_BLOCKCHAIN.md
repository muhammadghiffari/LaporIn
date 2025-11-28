# 📊 Contoh Konkret: Bagaimana Data Dikirim ke Blockchain

## 🎯 Scenario: User Membuat Laporan Baru

**Data Input dari User:**
```json
{
  "title": "Jalan Rusak di RT 05",
  "description": "Jalan di depan rumah Pak Budi berlubang besar, sangat berbahaya untuk kendaraan",
  "location": "Jl. Merdeka No. 15, RT 05/RW 02, Kelurahan Sukajadi",
  "latitude": -6.917464,
  "longitude": 107.619123
}
```

---

## 📝 Step-by-Step: Proses Pengiriman ke Blockchain

### **Step 1: Data Disimpan ke Database**

```javascript
// Di reports.routes.js - Laporan disimpan ke PostgreSQL
const laporan = await prisma.report.create({
  data: {
    userId: 1,
    title: "Jalan Rusak di RT 05",
    description: "Jalan di depan rumah Pak Budi berlubang besar...",
    location: "Jl. Merdeka No. 15, RT 05/RW 02...",
    category: "Infrastruktur",  // Dari AI
    urgency: "Tinggi",           // Dari AI
    status: "pending"
  }
});

// Hasil: Laporan dengan ID = 42 (contoh)
```

---

### **Step 2: Generate Metadata Hash**

```javascript
// Di reports.routes.js line 169
const teksLengkap = `${title} ${description} ${location}`;
// teksLengkap = "Jalan Rusak di RT 05 Jalan di depan rumah Pak Budi berlubang besar, sangat berbahaya untuk kendaraan Jl. Merdeka No. 15, RT 05/RW 02, Kelurahan Sukajadi"

const hashMeta = ethers.id(teksLengkap).substring(0, 10);
// hashMeta = "0x8a527b67" (contoh - 10 karakter pertama dari hash)
```

**Penjelasan:**
- `ethers.id()` membuat hash SHA-256 dari teks lengkap
- Diambil 10 karakter pertama sebagai identifier
- Hash ini unik untuk setiap laporan

---

### **Step 3: Enkripsi Data Sensitif**

```javascript
// Di blockchainService.js line 156-166
const dataLaporan = {
  title: "Jalan Rusak di RT 05",
  description: "Jalan di depan rumah Pak Budi berlubang besar...",
  location: "Jl. Merdeka No. 15, RT 05/RW 02..."
};

// Data sensitif di-encrypt
const sensitiveData = {
  description: dataLaporan.description,
  location: dataLaporan.location,
  encryptedAt: "2024-11-23T10:30:00.000Z"
};

// Encrypt menggunakan AES
const encrypted = encryptSensitiveData(JSON.stringify(sensitiveData));
// encrypted = "U2FsdGVkX1+abc123def456..." (contoh)

// Gabungkan hash dengan encrypted data
const encryptedMetaHash = ethers.id(`${hashMeta}:${encrypted}`).substring(0, 10);
// encryptedMetaHash = "0x9b3c4d5e" (contoh)
```

**Kenapa di-encrypt?**
- Data sensitif (deskripsi, lokasi) tidak langsung tersimpan di blockchain
- Hanya hash yang tersimpan (privacy)
- Data asli tetap aman di database

---

### **Step 4: Panggil Smart Contract**

```javascript
// Di blockchainService.js line 169
const contractInstance = await initContract();
// contractInstance = Contract object yang terhubung ke Polygon Amoy

// Panggil function logReportEvent di smart contract
const tx = await contractInstance.logReportEvent(
  42,                    // reportId (uint256)
  "pending",             // status (string)
  "0x9b3c4d5e"          // encryptedMetaHash (string)
);
```

**Yang Terjadi di Smart Contract:**

```solidity
// Di WargaLapor.sol line 40-62
function logReportEvent(
    uint256 reportId,      // 42
    string memory status,  // "pending"
    string memory metaHash // "0x9b3c4d5e"
) public {
    ReportEvent memory newEvent = ReportEvent({
        reportId: 42,
        status: "pending",
        actor: msg.sender,  // 0x8a527b67b88ff61393c19960408eD6d9464027d4 (wallet backend)
        timestamp: 1700734200,  // Unix timestamp dari blockchain
        metaHash: "0x9b3c4d5e"
    });
    
    reportEvents.push(newEvent);  // Simpan ke array di blockchain
    
    emit ReportEventCreated(     // Emit event untuk log
        42,
        "pending",
        0x8a527b67b88ff61393c19960408eD6d9464027d4,
        1700734200,
        "0x9b3c4d5e"
    );
}
```

---

### **Step 5: Transaction Dikirim ke Network**

```javascript
// Transaction object yang dikirim
{
  "to": "0x660F55a5656123249e3A319C27150F199815c987",  // Contract address
  "from": "0x8a527b67b88ff61393c19960408eD6d9464027d4", // Wallet backend
  "data": "0x...",  // Encoded function call + parameters
  "gasLimit": 100000,
  "gasPrice": 1000000000,  // 1 gwei
  "nonce": 5
}
```

**Yang Terjadi:**
1. Transaction di-sign dengan private key backend
2. Dikirim ke Polygon Amoy network via RPC
3. Validator memproses transaction
4. Transaction di-confirm di block

---

### **Step 6: Menunggu Konfirmasi**

```javascript
// Di blockchainService.js line 175-180
const receipt = await tx.wait();
// Tunggu sampai transaction di-confirm di blockchain

// Receipt yang diterima:
{
  "transactionHash": "0xabc123def456...",
  "blockNumber": 29467851,
  "gasUsed": "45234",
  "status": 1,  // 1 = success, 0 = failed
  "logs": [
    {
      "event": "ReportEventCreated",
      "args": {
        "reportId": 42,
        "status": "pending",
        "actor": "0x8a527b67b88ff61393c19960408eD6d9464027d4",
        "timestamp": 1700734200,
        "metaHash": "0x9b3c4d5e"
      }
    }
  ]
}
```

---

### **Step 7: Simpan Transaction Hash ke Database**

```javascript
// Di reports.routes.js line 184-187
if (hashTransaksi && hashTransaksi.length === 66) {
  await prisma.report.update({
    where: { id: 42 },
    data: { 
      blockchainTxHash: "0xabc123def456..." 
    }
  });
}
```

**Database Update:**
```sql
UPDATE reports 
SET blockchain_tx_hash = '0xabc123def456...'
WHERE id = 42;
```

---

## 🔍 Data yang Tersimpan di Blockchain

### **Di Smart Contract Storage:**

```solidity
reportEvents[0] = {
    reportId: 42,
    status: "pending",
    actor: 0x8a527b67b88ff61393c19960408eD6d9464027d4,
    timestamp: 1700734200,  // Unix timestamp
    metaHash: "0x9b3c4d5e"
}
```

### **Di Transaction Log (Event):**

```json
{
  "event": "ReportEventCreated",
  "transactionHash": "0xabc123def456...",
  "blockNumber": 29467851,
  "blockHash": "0xdef789...",
  "logIndex": 0,
  "args": {
    "reportId": 42,
    "status": "pending",
    "actor": "0x8a527b67b88ff61393c19960408eD6d9464027d4",
    "timestamp": 1700734200,
    "metaHash": "0x9b3c4d5e"
  }
}
```

---

## 🌐 Contoh Transaction di Polygonscan

**URL:** https://amoy.polygonscan.com/tx/0xabc123def456...

**Detail Transaction:**
```
Transaction Hash: 0xabc123def456...
Status: Success ✅
Block: 29467851
From: 0x8a527b67b88ff61393c19960408eD6d9464027d4
To: 0x660F55a5656123249e3A319C27150F199815c987 (Contract)
Gas Used: 45,234
Gas Price: 1 Gwei
Transaction Fee: 0.000045234 MATIC
```

**Event Logs:**
```
Event: ReportEventCreated
├─ reportId: 42
├─ status: "pending"
├─ actor: 0x8a527b67b88ff61393c19960408eD6d9464027d4
├─ timestamp: 1700734200 (2024-11-23 10:30:00 UTC)
└─ metaHash: "0x9b3c4d5e"
```

---

## 📊 Perbandingan: Database vs Blockchain

| Data | Database (PostgreSQL) | Blockchain (Polygon) |
|------|----------------------|---------------------|
| **Report ID** | ✅ 42 | ✅ 42 |
| **Title** | ✅ "Jalan Rusak di RT 05" | ❌ Tidak (hanya hash) |
| **Description** | ✅ Full text | ❌ Tidak (di-encrypt, hanya hash) |
| **Location** | ✅ Full address | ❌ Tidak (di-encrypt, hanya hash) |
| **Status** | ✅ "pending" | ✅ "pending" |
| **Timestamp** | ✅ 2024-11-23 10:30:00 | ✅ 1700734200 (Unix) |
| **Actor** | ✅ User ID: 1 | ✅ Wallet: 0x8a5... |
| **Transaction Hash** | ✅ 0xabc123... | ✅ 0xabc123... |
| **Block Number** | ❌ Tidak | ✅ 29467851 |
| **Immutable** | ❌ Bisa diubah | ✅ Tidak bisa diubah |

---

## 🔄 Contoh: Perubahan Status Laporan

**User mengubah status dari "pending" → "processing":**

```javascript
// Di reports.routes.js line 1224
const hashTransaksi = await logReportToBlockchain(
  42,              // reportId (sama)
  "processing",    // status baru
  "0x8a527b67"     // hashMeta baru
);
```

**Transaction Baru di Blockchain:**
```
Transaction Hash: 0xdef789ghi012...
Block: 29467855
Event: ReportEventCreated
├─ reportId: 42
├─ status: "processing"  ← Status baru
├─ actor: 0x8a527b67b88ff61393c19960408eD6d9464027d4
├─ timestamp: 1700734500  ← Timestamp baru
└─ metaHash: "0x8a527b67"
```

**Hasil:**
- Sekarang ada **2 events** untuk report ID 42 di blockchain
- History lengkap perubahan status tersimpan
- Audit trail immutable

---

## 💡 Key Points

### **1. Data yang Tersimpan di Blockchain:**
- ✅ Report ID
- ✅ Status
- ✅ Timestamp (dari blockchain)
- ✅ Actor (wallet address)
- ✅ Metadata Hash (encrypted)

### **2. Data yang TIDAK Tersimpan di Blockchain:**
- ❌ Title lengkap
- ❌ Description lengkap
- ❌ Location lengkap
- ❌ Image/photo

**Kenapa?**
- Privacy: Data sensitif tidak perlu publik di blockchain
- Cost: Menyimpan data besar di blockchain mahal
- Efficiency: Hash sudah cukup untuk verifikasi

### **3. Data Lengkap Tetap di Database:**
- Database tetap menjadi source of truth
- Blockchain hanya untuk audit trail dan transparansi
- Kombinasi keduanya = optimal

---

## 🧪 Test: Lihat Data di Blockchain

### **Via Code:**

```javascript
// Query events dari blockchain
const events = await contractInstance.queryFilter(
  contractInstance.filters.ReportEventCreated(42)
);

console.log(events);
// Output:
// [
//   {
//     reportId: 42,
//     status: "pending",
//     actor: "0x8a527b67b88ff61393c19960408eD6d9464027d4",
//     timestamp: 1700734200,
//     metaHash: "0x9b3c4d5e",
//     txHash: "0xabc123def456...",
//     blockNumber: 29467851
//   },
//   {
//     reportId: 42,
//     status: "processing",
//     actor: "0x8a527b67b88ff61393c19960408eD6d9464027d4",
//     timestamp: 1700734500,
//     metaHash: "0x8a527b67",
//     txHash: "0xdef789ghi012...",
//     blockNumber: 29467855
//   }
// ]
```

### **Via Polygonscan:**

1. Buka: https://amoy.polygonscan.com/address/0x660F55a5656123249e3A319C27150F199815c987
2. Klik tab "Events"
3. Filter by `ReportEventCreated`
4. Lihat semua events untuk report ID 42

---

## ✅ Summary

**Flow Lengkap:**
```
User Input → Database (PostgreSQL) → Generate Hash → Encrypt Data 
→ Call Smart Contract → Transaction Broadcast → Network Confirm 
→ Save TX Hash to Database → Verifiable di Polygonscan
```

**Yang Terjadi:**
1. ✅ Data lengkap tersimpan di database
2. ✅ Hash/metadata tersimpan di blockchain
3. ✅ Setiap perubahan status di-log ke blockchain
4. ✅ Semua transaksi bisa di-verifikasi publik
5. ✅ Audit trail immutable dan transparan

**Hasil:**
- Transparansi: Semua bisa verifikasi di Polygonscan
- Keamanan: Data sensitif di-encrypt
- Immutability: Tidak bisa diubah setelah terkonfirmasi
- Audit Trail: History lengkap perubahan status

---

**Sekarang Anda tahu persis bagaimana data dikirim dan ditanam di blockchain! 🎉**

