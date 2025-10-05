# 🚀 MCP Platform - คู่มือการติดตั้งเบื้องต้น

## 📋 ข้อกำหนดของระบบ

- **Node.js** เวอร์ชัน 16 หรือสูงกว่า
- **npm** หรือ **yarn** สำหรับจัดการ packages
- **Git** (สำหรับ version control)

## ⚡ การติดตั้งอย่างรวดเร็ว

### Windows
```bash
# รันสคริปต์ติดตั้งอัตโนมัติ
.\install-mcp.bat
```

### Linux/macOS
```bash
# ให้สิทธิ์การทำงานและรันสคริปต์
chmod +x install-mcp.sh
./install-mcp.sh
```

## 🔧 การติดตั้งแบบ Manual

ถ้าต้องการติดตั้งแบบละเอียด:

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ compiled
npm run build

# 3. ทดสอบ MCP servers
npm run test:mcp

# 4. เริ่มพัฒนา
npm run dev:watch
```

## 🎯 การใช้งานพื้นฐาน

### เริ่มต้นพัฒนา
```bash
npm run dev:watch    # พัฒนาด้วย hot reload (เร็วที่สุด)
npm run dev          # พัฒนาแบบปกติ
```

### ทดสอบ MCP Servers
```bash
npm run test:mcp     # ทดสอบการทำงานของ MCP servers
```

### Production
```bash
npm run build        # สร้างไฟล์สำหรับ production
npm run serve        # รันเซิร์ฟเวอร์ production
```

## 📁 โครงสร้างโปรเจค

```
ultimate-mcp-platform/
├── src/                    # Source code
│   ├── core/              # Core MCP functionality
│   ├── integrations/      # MCP server integrations
│   ├── services/          # Business logic
│   └── utils/             # Utilities
├── test/                  # Test files
├── dist/                  # Compiled JavaScript (auto-generated)
├── *.ts                   # TypeScript configuration files
└── package.json           # Project configuration
```

## 🔗 MCP Servers ที่พร้อมใช้งาน

### 1. **Filesystem MCP Server**
- จัดการไฟล์และโฟลเดอร์
- อ่านเขียนไฟล์อัตโนมัติ

### 2. **Multi-Fetch MCP Server**
- ดึงข้อมูลจากหลายแหล่ง
- HTTP requests พร้อมกัน

### 3. **Trading AI MCP Server**
- วิเคราะห์ข้อมูลการซื้อขาย
- AI-powered insights

## 🛠️ การพัฒนา

### เพิ่ม MCP Server ใหม่
1. สร้างไฟล์ใน `src/integrations/`
2. Implement MCP protocol
3. เพิ่มการลงทะเบียนใน platform
4. ทดสอบด้วย `npm run test:mcp`

### Debugging
```bash
# ดู logs แบบ real-time
npm run dev:watch

# Debug ด้วย VS Code
# กด F5 เพื่อเริ่ม debugging
```

## 🚨 การแก้ไขปัญหา

### ถ้าเจอข้อผิดพลาด:

1. **ลบ node_modules และติดตั้งใหม่**
   ```bash
   npm run fresh-install
   ```

2. **เคลียร์ cache**
   ```bash
   npm run clean
   ```

3. **ตรวจสอบการทำงานของแต่ละส่วน**
   ```bash
   npm run type-check
   npm run lint
   ```

## 📞 การสนับสนุน

ถ้ามีปัญหาในการติดตั้งหรือใช้งาน สามารถตรวจสอบ:
- ไฟล์ `FAST_DEV_README.md` สำหรับเคล็ดลับการพัฒนา
- ไฟล์ `PERFORMANCE_README.md` สำหรับการปรับแต่งประสิทธิภาพ

---

🎉 **พร้อมเริ่มต้นใช้งาน MCP Platform แล้ว!**

รัน `npm run dev:watch` เพื่อเริ่มพัฒนาเลยครับ! 🚀
