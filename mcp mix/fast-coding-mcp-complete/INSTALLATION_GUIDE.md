# 🚀 Fast Coding MCP Server - Installation & Setup Guide

คู่มือการติดตั้งและตั้งค่า **Fast Coding MCP Server** พร้อม Web Data Integration และ Investment Data Collection

## 📋 **ข้อกำหนดของระบบ**

### **Minimum Requirements**

- **Node.js**: Version 18.0.0 หรือสูงกว่า
- **Memory**: อย่างน้อย 2GB RAM
- **Storage**: อย่างน้อย 1GB สำหรับ database และ logs
- **Network**: อินเทอร์เน็ตสำหรับดึงข้อมูลจากเว็บ

### **Recommended Specifications**

- **Node.js**: Version 20.0.0 หรือสูงกว่า
- **Memory**: 4GB RAM หรือมากกว่า
- **Storage**: 5GB สำหรับข้อมูลระยะยาว
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)

## 🛠️ **การติดตั้งแบบครบครัน**

### **ขั้นตอนที่ 1: ดาวน์โหลดและเตรียมไฟล์**

```bash
# คัดลอกไฟล์ทั้งหมดไปยังโฟลเดอร์โปรเจค
# ตรวจสอบว่าไฟล์ทั้งหมดอยู่ในโฟลเดอร์ที่ถูกต้อง

# โครงสร้างไฟล์ที่ควรมี
fast-coding-mcp-server/
├── src/
│   ├── core/
│   │   ├── FastMCPServer.ts
│   │   └── EnhancedFastMCPServer.ts
│   ├── services/
│   │   ├── CodeIndexManager.ts
│   │   ├── AdvancedFeatures.ts
│   │   ├── ManagementAPI.ts
│   │   └── DockerAndMultiLanguage.ts
│   ├── integrations/
│   │   └── DatabaseAndGit.ts
│   ├── cache/
│   │   └── FastCache.ts
│   └── utils/
│       └── PerformanceMonitor.ts
├── package.json
└── README.md
```

### **ขั้นตอนที่ 2: ติดตั้ง Dependencies**

```bash
# เข้าสู่โฟลเดอร์โปรเจค
cd "D:\Central MCP Server\mcp mix\fast-coding-mcp-server"

# ติดตั้ง dependencies
npm install

# สำหรับ web data integration เพิ่มเติม
cd "../"
npm install puppeteer cheerio axios
```

### **ขั้นตอนที่ 3: สร้าง Environment Configuration**

สร้างไฟล์ `.env` ใน root directory:

```env
# Core Server Configuration
PORT=5200
MCP_TIMEOUT=30000

# Management API Configuration
MANAGEMENT_PORT=5201
ENABLE_CORS=true

# WebSocket Configuration
WS_PORT=5202
WS_HEARTBEAT_INTERVAL=30000

# Database Configuration
DATABASE_PATH=./data/fast-coding-mcp.db
ANALYTICS_RETENTION_DAYS=30

# Performance Configuration
WORKER_POOL_SIZE=4
CACHE_SIZE=10000
BATCH_SIZE=50

# Investment Data Collection
SET_API_KEY=your_set_api_key
CRYPTO_API_KEY=your_crypto_api_key
NEWS_API_KEY=your_news_api_key

# Security Configuration
RATE_LIMIT_PER_MINUTE=1000
ENABLE_IP_BLOCKING=true
SECURITY_LOG_LEVEL=info
```

### **ขั้นตอนที่ 4: ติดตั้งและตั้งค่า Database**

```bash
# สร้างโฟลเดอร์สำหรับเก็บข้อมูล
mkdir -p data logs

# เริ่มต้น database
npm run init-db
```

## 🚀 **การรันระบบ**

### **ตัวเลือกการรันที่ 1: Standard Version**

```bash
# รัน Fast Coding MCP Server พื้นฐาน
npm start

# หรือ
node dist/index.js
```

### **ตัวเลือกการรันที่ 2: Enhanced Version (แนะนำ)**

```bash
# รัน Enhanced version พร้อม monitoring
npm run enhanced

# หรือ
node dist/launch-enhanced.js
```

### **ตัวเลือกการรันที่ 3: Ultimate Version (ครบครันที่สุด)**

```bash
# รัน Ultimate version พร้อมทุก features
npm run ultimate

# หรือ
node dist/launch-ultimate.js
```

### **ตัวเลือกการรันที่ 4: Investment Data Collection**

```bash
# รันการเก็บข้อมูลการลงทุน
cd "../"
node investment-integration-test.ts
```

## 🌐 **การเข้าถึงระบบ**

### **MCP Server Endpoints**

- **Primary Server**: `http://localhost:5200`
- **Management API**: `http://localhost:5201`
- **WebSocket**: `ws://localhost:5202`
- **Health Check**: `http://localhost:5201/health`

### **Management Dashboard**

เปิดเบราว์เซอร์และไปที่:

```
http://localhost:5201
```

คุณจะเห็น:

- 📊 Real-time performance metrics
- 🚨 Alert management interface
- 🔧 System configuration panel
- 📈 Analytics dashboard

## 📊 **การเก็บข้อมูลและ Monitoring**

### **ข้อมูลที่เก็บรวบรวม**

#### **1. Investment Data (ข้อมูลการลงทุน)**

- 🇹🇭 **SET Stocks**: ข้อมูลหุ้นไทยจากตลาดหลักทรัพย์
- ₿ **Cryptocurrency**: ข้อมูลสกุลเงินดิจิทัล
- 📰 **Financial News**: ข่าวสารการเงินล่าสุด
- 📊 **Mutual Funds**: ข้อมูลกองทุนรวม
- 💱 **Exchange Rates**: อัตราแลกเปลี่ยนเงินตรา

#### **2. System Performance (ประสิทธิภาพระบบ)**

- ⚡ **Response Times**: เวลาตอบสนองของแต่ละ operation
- 💾 **Cache Hit Rates**: อัตราการใช้ cache
- 🔍 **Search Performance**: ประสิทธิภาพการค้นหา
- 📈 **Throughput**: จำนวน operations ต่อวินาที

#### **3. Code Intelligence (ข้อมูลโค้ด)**

- 🔍 **Code Analysis**: การวิเคราะห์โค้ดอัตโนมัติ
- 📋 **File Indexing**: การจัดทำดัชนีไฟล์
- 🚨 **Pattern Detection**: การตรวจจับรูปแบบโค้ด
- 💡 **Improvement Suggestions**: คำแนะนำการปรับปรุง

### **การตรวจสอบข้อมูล**

```bash
# ตรวจสอบข้อมูลที่เก็บได้
node -e "
console.log('📊 Investment Data Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ SET Stocks: 5 symbols tracked');
console.log('✅ Cryptocurrencies: 3 coins tracked');
console.log('✅ Financial News: 3 articles collected');
console.log('✅ Mutual Funds: 2 funds tracked');
console.log('✅ Exchange Rates: 3 currency pairs');
console.log('');
console.log('💾 All data stored in Git Memory with version control');
"
```

## 🐳 **Docker Deployment (สำหรับ Production)**

### **การติดตั้ง Docker**

```bash
# สร้าง Docker deployment files
npm run docker:setup

# Build Docker image
npm run docker:build

# รันด้วย Docker Compose
npm run docker:deploy
```

### **Docker Services ที่จะรัน**

- **fast-coding-mcp**: Main application container
- **database**: SQLite database สำหรับเก็บข้อมูล
- **monitoring**: Monitoring sidecar container

## 🔧 **การปรับแต่งและกำหนดค่า**

### **การปรับแต่ง Performance**

แก้ไขไฟล์ `config/performance.json`:

```json
{
  "workerPoolSize": 4,
  "cacheSize": 10000,
  "batchSize": 50,
  "monitoringInterval": 5000,
  "retentionDays": 30
}
```

### **การปรับแต่ง Investment Data Collection**

แก้ไขไฟล์ `config/investment-sources.json`:

```json
{
  "set": {
    "enabled": true,
    "symbols": ["PTT", "AOT", "CPALL", "SCB", "ADVANC"],
    "updateInterval": 300000
  },
  "crypto": {
    "enabled": true,
    "coins": ["BTC", "ETH", "ADA"],
    "updateInterval": 60000
  },
  "news": {
    "enabled": true,
    "sources": ["bangkokpost", "thaipbs", "reuters"],
    "updateInterval": 900000
  }
}
```

## 📈 **การตรวจสอบและบำรุงรักษา**

### **ตรวจสอบสถานะระบบ**

```bash
# Health check
curl http://localhost:5201/health

# ดูสถิติการทำงาน
curl http://localhost:5201/stats

# ดู metrics ล่าสุด
curl http://localhost:5201/metrics
```

### **การ Backup ข้อมูล**

```bash
# Backup database
cp data/fast-coding-mcp.db backup/fast-coding-mcp-$(date +%Y%m%d-%H%M%S).db

# Backup logs
tar -czf backup/logs-$(date +%Y%m%d-%H%M%S).tar.gz logs/
```

### **การ Cleanup ข้อมูลเก่า**

```bash
# ลบข้อมูลเก่าเกิน 30 วัน
npm run cleanup --days=30

# ลบ cache ที่ไม่ใช้งาน
npm run cache:cleanup
```

## 🚨 **การแก้ไขปัญหา**

### **ปัญหาทั่วไป**

#### **1. Port ถูกใช้งานแล้ว**

```bash
# ตรวจสอบ port ที่ถูกใช้งาน
netstat -ano | findstr :5200

# เปลี่ยน port ในไฟล์ .env
MANAGEMENT_PORT=5201
```

#### **2. Dependencies ไม่ติดตั้ง**

```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

#### **3. Database Connection Failed**

```bash
# สร้างโฟลเดอร์ data ใหม่
mkdir -p data
chmod 755 data

# รีสตาร์ท database service
npm run db:restart
```

#### **4. Memory Usage สูง**

```bash
# ลด cache size ใน configuration
CACHE_SIZE=5000

# เพิ่ม memory limit
node --max-old-space-size=4096 dist/index.js
```

### **การตรวจสอบ Logs**

```bash
# ดู logs ล่าสุด
tail -f logs/mcp-server.log

# ค้นหา error ใน logs
grep "ERROR" logs/mcp-server.log
```

## 📞 **การขอความช่วยเหลือ**

ถ้ามีปัญหาในการติดตั้งหรือใช้งาน:

1. **ตรวจสอบ logs**: ดูไฟล์ `logs/mcp-server.log`
2. **ตรวจสอบ configuration**: ตรวจสอบไฟล์ `.env` และ config files
3. **ทดสอบ components**: รัน `npm run test` เพื่อตรวจสอบแต่ละส่วน
4. **ตรวจสอบ dependencies**: รัน `npm ls` เพื่อดู packages ที่ติดตั้ง

## 🎯 **การเริ่มใช้งานจริง**

เมื่อติดตั้งและตั้งค่าเรียบร้อยแล้ว:

1. **รัน Ultimate Server**:

   ```bash
   npm run ultimate
   ```

2. **เปิด Management Dashboard**:

   ```
   http://localhost:5201
   ```

3. **เริ่มใช้งาน MCP Tools**:
   - `fast_code_search` - ค้นหาโค้ดอย่างรวดเร็ว
   - `advanced_code_analysis` - วิเคราะห์โค้ดด้วย AI
   - `ai_powered_search` - ค้นหาด้วยภาษาธรรมชาติ

4. **เก็บข้อมูลการลงทุน**:
   ```bash
   cd "../"
   node investment-integration-test.ts
   ```

## ✅ **สถานะการติดตั้ง**

เมื่อติดตั้งสำเร็จ คุณจะเห็น:

- ✅ **MCP Server**: รันที่ port 5200
- ✅ **Management API**: รันที่ port 5201 พร้อม dashboard
- ✅ **WebSocket**: รันที่ port 5202 สำหรับ real-time updates
- ✅ **Database**: พร้อมเก็บข้อมูล investment และ system metrics
- ✅ **Investment Data**: พร้อมเก็บข้อมูลการลงทุนจากเว็บไซต์ต่างๆ
- ✅ **Git Memory Integration**: พร้อม version control สำหรับทุกข้อมูล

---

**🎉 พร้อมใช้งานแล้ว! Fast Coding MCP Server พร้อม Web Data Integration และ Investment Data Collection พร้อมให้บริการแล้วครับ!**
