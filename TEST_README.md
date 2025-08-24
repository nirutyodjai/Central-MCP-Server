# 📋 คู่มือการทดสอบ Central MCP Server

คู่มือนี้อธิบายวิธีการใช้งานไฟล์ทดสอบต่างๆ สำหรับ Central MCP Server

## 📁 ไฟล์ทดสอบที่มีอยู่

### 1. `test-example.js` - การทดสอบพื้นฐาน
ทดสอบการทำงานพื้นฐานของระบบ รวมถึง:
- การเชื่อมต่อเซิร์ฟเวอร์
- การลงทะเบียน MCP Server
- การดึงรายการเซิร์ฟเวอร์
- Service Discovery
- Load Balancer
- Monitoring
- การยกเลิกการลงทะเบียน

### 2. `performance-test.js` - การทดสอบประสิทธิภาพ
ทดสอบประสิทธิภาพและความสามารถในการรับโหลด:
- Load testing สำหรับ Health Check
- Concurrent server registration
- การทดสอบ API endpoints แบบ concurrent
- การวัดเวลาตอบสนอง
- สถิติประสิทธิภาพ

### 3. `security-test.js` - การทดสอบความปลอดภัย
ทดสอบความปลอดภัยของระบบ:
- การเข้าถึงโดยไม่ได้รับอนุญาต
- การใช้ token ที่ไม่ถูกต้อง
- การป้องกัน SQL Injection
- การป้องกัน XSS
- Rate Limiting
- CORS Headers

### 4. `ui-test.js` - การทดสอบ UI และ Dashboard
ทดสอบส่วนติดต่อผู้ใช้:
- การโหลดหน้า Dashboard
- โครงสร้าง HTML
- Dashboard Components
- API Endpoints สำหรับ Dashboard
- Static Files
- Responsive Design
- Accessibility

### 5. `run-all-tests.js` - ตัวรันการทดสอบหลัก
รันการทดสอบทั้งหมดและแสดงสรุปผล:
- รันการทดสอบทุกประเภท
- แสดงสถิติรวม
- บันทึกผลการทดสอบ
- รองรับการข้ามการทดสอบบางประเภท

## 🚀 วิธีการใช้งาน

### การเตรียมความพร้อม

1. **ติดตั้ง Dependencies**
   ```bash
   npm install axios jsdom
   ```

2. **เริ่มเซิร์ฟเวอร์**
   ```bash
   npm start
   # หรือ
   node server.js
   ```

3. **ตั้งค่า Environment Variables (ถ้าต้องการ)**
   ```bash
   # Windows (PowerShell)
   $env:ADMIN_TOKEN="your-admin-token"
   $env:SERVER_TOKEN="your-server-token"
   $env:BASE_URL="http://localhost:3000"
   
   # Linux/macOS
   export ADMIN_TOKEN="your-admin-token"
   export SERVER_TOKEN="your-server-token"
   export BASE_URL="http://localhost:3000"
   ```

### การรันการทดสอบ

#### รันการทดสอบทั้งหมด
```bash
node run-all-tests.js
```

#### รันการทดสอบแยกประเภท
```bash
# การทดสอบพื้นฐาน
node test-example.js

# การทดสอบประสิทธิภาพ
node performance-test.js

# การทดสอบความปลอดภัย
node security-test.js

# การทดสอบ UI
node ui-test.js
```

#### การข้ามการทดสอบบางประเภท
```bash
# ข้ามการทดสอบประสิทธิภาพ
SKIP_PERFORMANCE=true node run-all-tests.js

# ข้ามการทดสอบความปลอดภัย
SKIP_SECURITY=true node run-all-tests.js

# ข้ามการทดสอบ UI
SKIP_UI=true node run-all-tests.js

# ข้ามหลายประเภท
SKIP_PERFORMANCE=true SKIP_SECURITY=true node run-all-tests.js
```

## ⚙️ การกำหนดค่า

### Environment Variables

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---------|-------------|----------|
| `BASE_URL` | `http://localhost:3000` | URL ของเซิร์ฟเวอร์ที่จะทดสอบ |
| `ADMIN_TOKEN` | `your-admin-token-here` | Token สำหรับ admin authentication |
| `SERVER_TOKEN` | `your-server-token-here` | Token สำหรับ server authentication |
| `TEST_TIMEOUT` | `30000` | Timeout สำหรับการทดสอบ (milliseconds) |
| `SKIP_PERFORMANCE` | `false` | ข้ามการทดสอบประสิทธิภาพ |
| `SKIP_SECURITY` | `false` | ข้ามการทดสอบความปลอดภัย |
| `SKIP_UI` | `false` | ข้ามการทดสอบ UI |

### ตัวอย่างการใช้งาน

```bash
# การทดสอบแบบเต็ม
BASE_URL=http://localhost:3000 ADMIN_TOKEN=abc123 SERVER_TOKEN=xyz789 node run-all-tests.js

# การทดสอบเฉพาะพื้นฐานและ UI
SKIP_PERFORMANCE=true SKIP_SECURITY=true node run-all-tests.js

# การทดสอบกับเซิร์ฟเวอร์ remote
BASE_URL=https://your-server.com node run-all-tests.js
```

## 📊 การอ่านผลการทดสอบ

### สัญลักษณ์ที่ใช้
- ✅ ผ่าน - การทดสอบสำเร็จ
- ❌ ไม่ผ่าน - การทดสอบล้มเหลว
- ⏭️ ข้าม - การทดสอบถูกข้าม
- 🔍 ตรวจสอบ - กำลังตรวจสอบ
- 📊 สถิติ - ข้อมูลสถิติ
- 💡 คำแนะนำ - คำแนะนำสำหรับการแก้ไข

### ตัวอย่างผลการทดสอบ
```
📊 สรุปผลการทดสอบทั้งหมด:
======================================================================
⏱️ เวลาที่ใช้ทั้งหมด: 45230ms (45.23s)
🕐 เริ่มเวลา: 2024-01-15T10:30:00.000Z
🕐 สิ้นสุดเวลา: 2024-01-15T10:30:45.230Z

📋 ผลการทดสอบแต่ละประเภท:
✅ FUNCTIONAL: completed (8500ms)
✅ PERFORMANCE: completed (15200ms)
❌ SECURITY: failed (12300ms)
✅ UI: completed (9230ms)

📈 สถิติรวม:
✅ ผ่าน: 3
❌ ล้มเหลว: 1
⏭️ ข้าม: 0
📊 รวม: 4
🎯 อัตราความสำเร็จ: 75.00%
```

## 🔧 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
```
❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: connect ECONNREFUSED
```
**วิธีแก้:**
- ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่: `node server.js`
- ตรวจสอบ URL และ port ที่ถูกต้อง
- ตรวจสอบ firewall settings

#### 2. Authentication ล้มเหลว
```
❌ การทดสอบ token ล้มเหลว (401)
```
**วิธีแก้:**
- ตั้งค่า `ADMIN_TOKEN` และ `SERVER_TOKEN` ที่ถูกต้อง
- ตรวจสอบการกำหนดค่า authentication ในเซิร์ฟเวอร์

#### 3. Dependencies ขาดหาย
```
Error: Cannot find module 'jsdom'
```
**วิธีแก้:**
```bash
npm install jsdom axios
```

#### 4. Timeout
```
❌ เกิดข้อผิดพลาด: timeout of 30000ms exceeded
```
**วิธีแก้:**
- เพิ่มค่า `TEST_TIMEOUT`: `TEST_TIMEOUT=60000 node run-all-tests.js`
- ตรวจสอบประสิทธิภาพของเซิร์ฟเวอร์

### การ Debug

1. **เปิด Debug Mode**
   ```bash
   DEBUG=* node run-all-tests.js
   ```

2. **รันการทดสอบทีละประเภท**
   ```bash
   node test-example.js
   ```

3. **ตรวจสอบ Log ของเซิร์ฟเวอร์**
   ```bash
   tail -f logs/app.log
   ```

## 📝 การเพิ่มการทดสอบใหม่

### โครงสร้างการทดสอบ
```javascript
// ฟังก์ชันทดสอบ
async function testNewFeature() {
    try {
        // ทำการทดสอบ
        const result = await someAPICall();
        
        if (result.success) {
            console.log('✅ การทดสอบสำเร็จ');
        } else {
            console.log('❌ การทดสอบล้มเหลว');
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
}

// Export สำหรับใช้ในไฟล์อื่น
module.exports = {
    testNewFeature
};
```

### การเพิ่มใน run-all-tests.js
```javascript
const { testNewFeature } = require('./new-test-file');

// เพิ่มใน runAllTestSuites function
await runTestSuite('NewFeature', testNewFeature);
```

## 🤖 การใช้งานใน CI/CD

### GitHub Actions
```yaml
name: Test Central MCP Server

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Start server
      run: npm start &
      
    - name: Wait for server
      run: sleep 10
    
    - name: Run tests
      run: node run-all-tests.js
      env:
        ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}
        SERVER_TOKEN: ${{ secrets.SERVER_TOKEN }}
```

### Docker
```dockerfile
# Dockerfile.test
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# รันเซิร์ฟเวอร์และการทดสอบ
CMD ["sh", "-c", "npm start & sleep 10 && node run-all-tests.js"]
```

```bash
# รันการทดสอบใน Docker
docker build -f Dockerfile.test -t mcp-server-test .
docker run --rm mcp-server-test
```

## 📈 การตีความผลการทดสอบ

### อัตราความสำเร็จ
- **100%** - ระบบทำงานได้อย่างสมบูรณ์
- **90-99%** - ระบบทำงานได้ดี มีปัญหาเล็กน้อย
- **70-89%** - ระบบทำงานได้ แต่มีปัญหาที่ควรแก้ไข
- **50-69%** - ระบบมีปัญหาหลายอย่าง ต้องแก้ไขด่วน
- **<50%** - ระบบมีปัญหาร้ายแรง ไม่ควรใช้งาน

### การวิเคราะห์ประสิทธิภาพ
- **เวลาตอบสนอง < 100ms** - ดีเยี่ยม
- **เวลาตอบสนอง 100-500ms** - ดี
- **เวลาตอบสนอง 500-1000ms** - ปานกลาง
- **เวลาตอบสนอง > 1000ms** - ช้า ควรปรับปรุง

## 📞 การขอความช่วยเหลือ

หากพบปัญหาในการใช้งานไฟล์ทดสอบ:

1. ตรวจสอบ log files ใน `logs/` directory
2. ตรวจสอบผลการทดสอบใน `test-results/` directory
3. รันการทดสอบทีละประเภทเพื่อระบุปัญหา
4. ตรวจสอบการกำหนดค่า environment variables
5. ตรวจสอบว่าเซิร์ฟเวอร์ทำงานปกติ

---

**หมายเหตุ:** ไฟล์ทดสอบเหล่านี้ออกแบบมาเพื่อทดสอบระบบในสภาพแวดล้อมการพัฒนา หากต้องการใช้ในสภาพแวดล้อม production ควรปรับแต่งค่าต่างๆ ให้เหมาะสม