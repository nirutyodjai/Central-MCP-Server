# Central MCP Server - User Guide

## บทนำ

Central MCP Server เป็นระบบจัดการ MCP (Model Context Protocol) servers หลายตัวในที่เดียว พร้อมด้วยคุณสมบัติขั้นสูงสำหรับ load balancing, service discovery, monitoring และ security

## การเริ่มต้นใช้งาน

### 1. การเข้าถึง Dashboard

เปิดเว็บเบราว์เซอร์และไปที่:
```
http://localhost:5050/dashboard
```

Dashboard จะแสดงข้อมูล:
- สถานะของ Central Server
- รายการ MCP Servers ที่ลงทะเบียน
- Metrics และ Performance
- Alerts และ Notifications

### 2. การลงทะเบียน MCP Server แรก

#### ผ่าน API
```bash
curl -X POST http://localhost:5050/mcp/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My First MCP Server",
    "url": "http://localhost:3000",
    "description": "A sample MCP server for testing",
    "capabilities": ["chat", "search"],
    "metadata": {
      "version": "1.0.0",
      "author": "Your Name"
    }
  }'
```

#### ผ่าน Dashboard
1. คลิกปุ่ม "Add Server" ใน Dashboard
2. กรอกข้อมูล server
3. คลิก "Register Server"

## การจัดการ MCP Servers

### การดู Server List

```bash
# ดู servers ทั้งหมด
curl http://localhost:5050/mcp/servers

# ดูเฉพาะ healthy servers
curl http://localhost:5050/mcp/servers/healthy

# ดู servers ที่มี capability ที่ต้องการ
curl http://localhost:5050/mcp/servers/capability/chat
```

### การตรวจสอบสถานะ Server

```bash
# ดูข้อมูล server ตาม ID
curl http://localhost:5050/mcp/servers/abc123def456

# ทำ health check manual
curl -X POST http://localhost:5050/mcp/servers/abc123def456/health-check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### การยกเลิกการลงทะเบียน Server

```bash
curl -X DELETE http://localhost:5050/mcp/servers/abc123def456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Load Balancing

### การใช้งาน Load Balancer

Central MCP Server รองรับ load balancing strategies หลายแบบ:

#### 1. Round Robin (Default)
```bash
curl http://localhost:5050/mcp/servers/next/chat
```

#### 2. Least Connections
```bash
curl -X POST http://localhost:5050/loadbalancer/next/chat \
  -H "Content-Type: application/json" \
  -d '{"strategy": "least-connections"}'
```

#### 3. Weighted Round Robin
```bash
curl -X POST http://localhost:5050/loadbalancer/next/chat \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "weighted-round-robin",
    "options": {
      "weights": {
        "server1": 3,
        "server2": 1
      }
    }
  }'
```

#### 4. Health-Based Selection
```bash
curl -X POST http://localhost:5050/loadbalancer/next/chat \
  -H "Content-Type: application/json" \
  -d '{"strategy": "health-based"}'
```

#### 5. Response Time Based
```bash
curl -X POST http://localhost:5050/loadbalancer/next/chat \
  -H "Content-Type: application/json" \
  -d '{"strategy": "response-time"}'
```

### การปล่อย Connection

หลังจากใช้งาน server เสร็จแล้ว ควรปล่อย connection:

```bash
curl -X POST http://localhost:5050/loadbalancer/release/abc123def456
```

## Service Discovery

### การค้นหา Services

```bash
# ค้นหา services ตาม capability
curl http://localhost:5050/discovery/services/chat

# ดู capabilities ทั้งหมดที่มี
curl http://localhost:5050/discovery/capabilities

# ค้นหา server ที่ดีที่สุดสำหรับ capability
curl -X POST http://localhost:5050/discovery/best-server/chat \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "responseTime": true,
      "healthScore": true,
      "connectionCount": true
    }
  }'
```

### การ Subscribe/Unsubscribe

```bash
# Subscribe เพื่อรับ notifications เมื่อมี server ใหม่
curl -X POST http://localhost:5050/discovery/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "clientId": "my-client-123",
    "capabilities": ["chat", "search"],
    "callbackUrl": "http://my-app.com/webhook"
  }'

# Unsubscribe
curl -X DELETE http://localhost:5050/discovery/subscribe/my-client-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring และ Metrics

### การดู Metrics

```bash
# ดู metrics ทั้งหมด
curl http://localhost:5050/metrics

# ดู metrics summary
curl http://localhost:5050/metrics/summary

# ดู response time metrics
curl http://localhost:5050/metrics/response-time

# ดู system metrics
curl http://localhost:5050/metrics/system
```

### การจัดการ Alerts

```bash
# ดู alerts ที่เปิดอยู่
curl http://localhost:5050/metrics/alerts

# ตั้งค่า alert thresholds
curl -X PATCH http://localhost:5050/metrics/alerts/thresholds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "responseTime": 3000,
    "errorRate": 0.1,
    "memoryUsage": 0.9
  }'
```

### การ Reset Metrics

```bash
curl -X POST http://localhost:5050/metrics/reset \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Authentication และ Security

### การรับ JWT Token

```bash
curl -X POST http://localhost:5050/token \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_SERVER_TOKEN"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

### การใช้ JWT Token

ใส่ token ใน Authorization header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:5050/protected-endpoint
```

## การจัดการ Context และ Secrets

### Shared Context

```bash
# ดู shared context
curl http://localhost:5050/context

# อัปเดต shared context
curl -X POST http://localhost:5050/context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "environment": "production",
    "version": "1.2.0",
    "feature_flags": {
      "new_ui": true,
      "beta_features": false
    }
  }'
```

### Secrets Management

```bash
# ดึง secret (ต้องมี authentication)
curl http://localhost:5050/secrets/api_key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Client Libraries

### Node.js Client

```javascript
const MCPClient = require('./client/node/mcp-client');

const client = new MCPClient({
  serverUrl: 'http://localhost:5050',
  token: 'your-client-token'
});

// ดึง configuration
const config = await client.getAll();
console.log(config);

// ดึง secret
const apiKey = await client.get('api_key');
console.log(apiKey);

// ลงทะเบียน server
const serverId = await client.registerServer({
  name: 'My Server',
  url: 'http://localhost:3000',
  capabilities: ['chat']
});

// ดึง server ถัดไป
const server = await client.getNextServer('chat');
console.log(server);
```

### Python Client

```python
from client.python.mcp_client import MCPClient

client = MCPClient(
    server_url='http://localhost:5050',
    token='your-client-token'
)

# ดึง configuration
config = client.get_all()
print(config)

# ลงทะเบียน server
server_id = client.register_server({
    'name': 'My Python Server',
    'url': 'http://localhost:4000',
    'capabilities': ['search', 'analysis']
})

# ดึง server ถัดไป
server = client.get_next_server('search')
print(server)
```

## Best Practices

### 1. Server Registration

- ใช้ชื่อ server ที่มีความหมายและไม่ซ้ำกัน
- ระบุ capabilities ที่ถูกต้องและครบถ้วน
- เพิ่ม metadata ที่เป็นประโยชน์ (version, author, description)
- ตรวจสอบให้แน่ใจว่า server URL สามารถเข้าถึงได้

### 2. Load Balancing

- เลือก strategy ที่เหมาะสมกับ use case
- ใช้ weighted round-robin สำหรับ servers ที่มี capacity ต่างกัน
- ปล่อย connection หลังใช้งานเสร็จ
- Monitor connection counts เป็นประจำ

### 3. Health Monitoring

- ตั้งค่า health check interval ที่เหมาะสม
- Monitor response time และ error rates
- ตั้งค่า alerts สำหรับ critical metrics
- ตรวจสอบ logs เป็นประจำ

### 4. Security

- ใช้ HTTPS ใน production
- เปลี่ยน default tokens
- ใช้ strong JWT secrets
- Rotate tokens เป็นประจำ
- Monitor suspicious activities

### 5. Performance

- Monitor memory usage และ CPU
- ใช้ connection pooling
- Cache responses เมื่อเป็นไปได้
- Optimize database queries (future feature)

## Troubleshooting

### Common Issues

#### 1. Server Registration Failed
```
Error: Server registration failed
```

**Solutions:**
- ตรวจสอบว่า server URL สามารถเข้าถึงได้
- ตรวจสอบ network connectivity
- ตรวจสอบ firewall settings
- ตรวจสอบ server logs

#### 2. Authentication Failed
```
Error: 401 Unauthorized
```

**Solutions:**
- ตรวจสอบ JWT token
- ตรวจสอบว่า token ยังไม่หมดอายุ
- ตรวจสอบ server token configuration
- Regenerate token ใหม่

#### 3. No Healthy Servers
```
Error: No healthy servers available
```

**Solutions:**
- ตรวจสอบสถานะ servers ใน dashboard
- ทำ manual health check
- ตรวจสอบ server logs
- Restart unhealthy servers

#### 4. High Response Time
```
Warning: Average response time is above threshold
```

**Solutions:**
- ตรวจสอบ server performance
- เพิ่ม servers เพื่อกระจายโหลด
- Optimize server code
- ตรวจสอบ network latency

### Debug Mode

เปิด debug mode เพื่อดู detailed logs:

```bash
# Set environment variable
export LOG_LEVEL=debug

# หรือใน .env file
LOG_LEVEL=debug

# Restart server
npm restart
```

### Log Analysis

```bash
# ดู error logs
grep "ERROR" logs/central-mcp-server.log

# ดู slow requests
grep "slow" logs/central-mcp-server.log

# ดู authentication failures
grep "401" logs/central-mcp-server.log

# Monitor real-time logs
tail -f logs/central-mcp-server.log | grep "ERROR\|WARN"
```

## Advanced Usage

### Custom Health Check

สร้าง custom health check endpoint สำหรับ MCP servers:

```javascript
// ใน MCP server ของคุณ
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    capabilities: ['chat', 'search'],
    metrics: {
      activeConnections: getActiveConnections(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  res.json(healthData);
});
```

### Webhook Integration

รับ notifications เมื่อมีเหตุการณ์สำคัญ:

```javascript
// Webhook endpoint ใน application ของคุณ
app.post('/webhook/mcp-events', (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'server_registered':
      console.log('New server registered:', data.serverId);
      break;
    case 'server_unhealthy':
      console.log('Server became unhealthy:', data.serverId);
      // Send alert to team
      break;
    case 'alert_triggered':
      console.log('Alert triggered:', data.alertKey);
      // Handle alert
      break;
  }
  
  res.status(200).send('OK');
});
```

### Batch Operations

```bash
# ลงทะเบียน servers หลายตัวพร้อมกัน
for server in server1 server2 server3; do
  curl -X POST http://localhost:5050/mcp/servers \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d "{
      \"name\": \"$server\",
      \"url\": \"http://$server:3000\",
      \"capabilities\": [\"chat\"]
    }"
done
```

## การ Migrate และ Backup

### Export Configuration

```bash
# Export servers configuration
curl http://localhost:5050/mcp/servers > servers_backup.json

# Export metrics
curl http://localhost:5050/metrics > metrics_backup.json
```

### Import Configuration

```bash
# Import servers จาก backup
while IFS= read -r server; do
  curl -X POST http://localhost:5050/mcp/servers \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d "$server"
done < servers_backup.json
```

## การติดต่อและ Support

- **Documentation**: [API Reference](./API.md)
- **Installation Guide**: [Installation](./INSTALLATION.md)
- **GitHub Issues**: [Report Issues]
- **Health Check**: `GET /health`
- **Dashboard**: `http://localhost:5050/dashboard`

---

*สำหรับข้อมูลเพิ่มเติมและ advanced features โปรดดู [API Documentation](./API.md)*