# Fast Coding MCP Server 🚀

MCP server ที่รวดเร็วและมีประสิทธิภาพสูง โดยใช้เทคนิคการพัฒนาจาก Kilo Code รวมกับ MCP servers ที่มีอยู่แล้วในระบบ

## 🌟 คุณสมบัติเด่น

### Performance Optimization

- **High-Performance Caching**: LRU Cache + Persistent Cache สำหรับการเข้าถึงข้อมูลที่รวดเร็ว
- **Debouncing & Throttling**: ป้องกันการเรียกซ้ำและจัดการ rate limiting
- **Batch Processing**: จัดการ multiple operations พร้อมกันอย่างมีประสิทธิภาพ
- **Code Indexing**: สร้าง index ของ codebase สำหรับการค้นหาที่รวดเร็ว

### Integration Features

- **รวมกับ MCP Servers ที่มีอยู่**: เชื่อมต่อกับ servers ทั้งหมดในระบบ
- **Load Balancing**: เลือก server ที่เหมาะสมที่สุดสำหรับแต่ละ task
- **Performance Monitoring**: ติดตามและวิเคราะห์ประสิทธิภาพแบบ real-time
- **Graceful Shutdown**: ปิดระบบอย่างปลอดภัย

### Advanced Techniques (จาก Kilo Code)

- **Worker Pool Management**: จัดการ concurrent tasks อย่างมีประสิทธิภาพ
- **File System Watching**: ติดตามการเปลี่ยนแปลงแบบ real-time
- **Memory Management**: จัดการหน่วยความจำอย่างชาญฉลาด
- **Async/Await Optimization**: จัดการ asynchronous operations ที่ดีที่สุด

## 🛠️ การติดตั้งและใช้งาน

### Prerequisites

```bash
Node.js 20.x+
TypeScript 5.x+
```

### Installation

```bash
cd fast-coding-mcp-server
npm install
npm run build
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## 📋 การใช้งาน

### Tools ที่มีให้ใช้งาน

#### `fast_code_search`

ค้นหาโค้ดอย่างรวดเร็วด้วย caching และ indexing

```json
{
  "query": "function",
  "fileType": ".ts",
  "maxResults": 50
}
```

#### `performance_analysis`

วิเคราะห์ประสิทธิภาพของโค้ด

```json
{
  "code": "function example() { ... }",
  "language": "typescript"
}
```

#### `cache_stats`

ดูสถิติการทำงานของ cache

```json
{}
```

## 🔧 การกำหนดค่า

### Environment Variables

```env
PORT=5050
CACHE_TTL=300
MAX_CONCURRENT_REQUESTS=10
```

### Configuration File

สร้าง `config.json` ใน root directory:

```json
{
  "cache": {
    "memoryMaxSize": 500,
    "persistentTTL": 3600,
    "batchSize": 10
  },
  "performance": {
    "enableMonitoring": true,
    "slowOperationThreshold": 1000
  }
}
```

## 🏗️ Architecture

```
fast-coding-mcp-server/
├── src/
│   ├── core/
│   │   └── FastMCPServer.ts      # MCP Server หลัก
│   ├── services/
│   │   └── CodeIndexManager.ts   # Code indexing system
│   ├── integrations/
│   │   └── MCPServerIntegration.ts # รวมกับ existing servers
│   ├── cache/
│   │   └── FastCache.ts          # High-performance caching
│   ├── utils/
│   │   └── PerformanceMonitor.ts # Performance monitoring
│   └── tools/                    # Additional tools
└── dist/                         # Compiled output
```

## 🔗 การรวมกับ Existing MCP Servers

Server นี้จะ:

1. โหลด configuration จาก `central-mcp-config.json`
2. รวม capabilities ของ servers ทั้งหมดที่มีอยู่
3. เพิ่มประสิทธิภาพการทำงานด้วย caching และ optimization
4. จัดการ load balancing ระหว่าง servers

## 📊 Monitoring

### Performance Metrics

- Response time tracking
- Cache hit/miss ratios
- Tool execution statistics
- Memory usage monitoring

### Health Checks

```bash
curl http://localhost:5050/health
```

## 🚀 การพัฒนาเพิ่มเติม

### Adding New Tools

1. เพิ่ม tool ใน `FastMCPServer.ts`
2. Implement logic ใน `executeTool` method
3. เพิ่ม caching ถ้าจำเป็น

### Adding New Integrations

1. เพิ่ม server ใน `MCPServerIntegration.ts`
2. Implement communication protocol
3. เพิ่ม performance monitoring

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Add tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details
