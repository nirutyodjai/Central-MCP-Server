# Central MCP Server API Documentation

## Overview

Central MCP Server เป็นระบบจัดการ MCP (Model Context Protocol) servers หลายตัว พร้อมด้วยระบบ load balancing, service discovery, และ monitoring

## Base URL

```
http://localhost:5050
```

## Authentication

API endpoints ที่ต้องการ authentication จะใช้ JWT token ใน Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication

#### POST /token
รับ JWT token สำหรับ authentication

**Request Body:**
```json
{
  "token": "your-server-token"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "expiresIn": "1h"
}
```

### Server Management

#### POST /mcp/servers
ลงทะเบียน MCP server ใหม่ (ต้อง authentication)

**Request Body:**
```json
{
  "name": "My MCP Server",
  "url": "http://localhost:3000",
  "description": "Description of the server",
  "capabilities": ["chat", "search", "analysis"],
  "metadata": {
    "version": "1.0.0",
    "author": "Developer Name"
  }
}
```

**Response:**
```json
{
  "success": true,
  "serverId": "abc123def456",
  "message": "Server registered successfully"
}
```

#### GET /mcp/servers
ดึงรายการ MCP servers ทั้งหมด

**Response:**
```json
{
  "servers": [
    {
      "id": "abc123def456",
      "name": "My MCP Server",
      "url": "http://localhost:3000",
      "description": "Description of the server",
      "capabilities": ["chat", "search"],
      "status": "healthy",
      "lastHealthCheck": "2024-01-15T10:30:00Z",
      "registeredAt": "2024-01-15T09:00:00Z",
      "metadata": {}
    }
  ]
}
```

#### GET /mcp/servers/:serverId
ดึงข้อมูล MCP server ตาม ID

**Response:**
```json
{
  "server": {
    "id": "abc123def456",
    "name": "My MCP Server",
    "url": "http://localhost:3000",
    "status": "healthy",
    "capabilities": ["chat", "search"],
    "lastHealthCheck": "2024-01-15T10:30:00Z"
  }
}
```

#### DELETE /mcp/servers/:serverId
ยกเลิกการลงทะเบียน MCP server (ต้อง authentication)

**Response:**
```json
{
  "success": true,
  "message": "Server unregistered successfully"
}
```

#### GET /mcp/servers/healthy
ดึงรายการ MCP servers ที่มีสถานะ healthy

**Response:**
```json
{
  "servers": [
    {
      "id": "abc123def456",
      "name": "My MCP Server",
      "status": "healthy"
    }
  ]
}
```

#### GET /mcp/servers/capability/:capability
ดึงรายการ MCP servers ที่มี capability ที่ระบุ

**Response:**
```json
{
  "capability": "chat",
  "servers": [
    {
      "id": "abc123def456",
      "name": "Chat Server",
      "status": "healthy"
    }
  ]
}
```

#### POST /mcp/servers/:serverId/health-check
ทำ health check สำหรับ server ที่ระบุ (ต้อง authentication)

**Response:**
```json
{
  "success": true,
  "serverId": "abc123def456",
  "status": "healthy",
  "responseTime": 150,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Load Balancer

#### GET /mcp/servers/next/:capability?
ดึง server ถัดไปสำหรับ capability ที่ระบุ (ใช้ round-robin strategy)

**Response:**
```json
{
  "server": {
    "id": "abc123def456",
    "name": "Selected Server",
    "url": "http://localhost:3000",
    "capabilities": ["chat"]
  },
  "strategy": "round-robin"
}
```

#### POST /loadbalancer/next/:capability
ดึง server ถัดไปด้วย load balancing strategy ที่ระบุ

**Request Body:**
```json
{
  "strategy": "least-connections",
  "options": {
    "weights": {
      "server1": 2,
      "server2": 1
    }
  }
}
```

**Response:**
```json
{
  "server": {
    "id": "abc123def456",
    "name": "Selected Server",
    "url": "http://localhost:3000"
  },
  "strategy": "least-connections",
  "connectionCount": 5
}
```

#### POST /loadbalancer/release/:serverId
ปล่อย connection สำหรับ server ที่ระบุ

**Response:**
```json
{
  "success": true,
  "serverId": "abc123def456",
  "connectionCount": 4
}
```

#### GET /loadbalancer/stats
ดึงสถิติของ load balancer

**Response:**
```json
{
  "totalRequests": 1500,
  "strategies": {
    "round-robin": 800,
    "least-connections": 700
  },
  "connectionCounts": {
    "server1": 10,
    "server2": 5
  },
  "averageResponseTime": 120
}
```

### Service Discovery

#### GET /discovery/services/:capability
ค้นหา services ที่มี capability ที่ระบุ

**Response:**
```json
{
  "capability": "chat",
  "services": [
    {
      "id": "abc123def456",
      "name": "Chat Service",
      "url": "http://localhost:3000",
      "status": "healthy",
      "responseTime": 100
    }
  ],
  "totalFound": 1
}
```

#### GET /discovery/capabilities
ดึงรายการ capabilities ทั้งหมดที่มีอยู่

**Response:**
```json
{
  "capabilities": [
    {
      "name": "chat",
      "serverCount": 3,
      "healthyCount": 2
    },
    {
      "name": "search",
      "serverCount": 2,
      "healthyCount": 2
    }
  ]
}
```

#### POST /discovery/best-server/:capability
ค้นหา server ที่ดีที่สุดสำหรับ capability ที่ระบุ

**Request Body:**
```json
{
  "criteria": {
    "responseTime": true,
    "healthScore": true,
    "connectionCount": true
  }
}
```

**Response:**
```json
{
  "server": {
    "id": "abc123def456",
    "name": "Best Server",
    "url": "http://localhost:3000",
    "healthScore": 95,
    "responseTime": 80,
    "connectionCount": 2
  },
  "score": 95
}
```

### Monitoring & Metrics

#### GET /metrics
ดึง metrics ทั้งหมด

**Response:**
```json
{
  "requests": {
    "total": 5000,
    "errors": 50,
    "avgResponseTime": 150
  },
  "servers": {
    "registrations": 10,
    "unregistrations": 2,
    "healthChecks": 1000,
    "failedHealthChecks": 20
  },
  "system": {
    "uptime": 86400000,
    "memoryUsage": {
      "used": 128000000,
      "total": 512000000
    }
  }
}
```

#### GET /metrics/alerts
ดึงรายการ alerts ที่เปิดอยู่

**Response:**
```json
{
  "alerts": [
    {
      "key": "high_response_time",
      "message": "Average response time is above threshold",
      "severity": "warning",
      "triggeredAt": "2024-01-15T10:30:00Z",
      "data": {
        "currentValue": 2500,
        "threshold": 2000
      }
    }
  ]
}
```

### Health Check

#### GET /health
ตรวจสอบสถานะของ Central MCP Server

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400000,
  "version": "1.0.0",
  "services": {
    "registry": "healthy",
    "loadBalancer": "healthy",
    "serviceDiscovery": "healthy",
    "monitoring": "healthy"
  },
  "stats": {
    "totalServers": 5,
    "healthyServers": 4,
    "totalRequests": 1000
  }
}
```

### Context & Secrets

#### GET /context
ดึง shared context

**Response:**
```json
{
  "context": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

#### POST /context
อัปเดต shared context (ต้อง authentication)

**Request Body:**
```json
{
  "key1": "new_value1",
  "key3": "value3"
}
```

#### GET /secrets/:name
ดึง secret ตามชื่อ (ต้อง authentication)

**Response:**
```json
{
  "name": "api_key",
  "value": "secret_value",
  "source": "vault"
}
```

## Error Responses

API จะส่ง error response ในรูปแบบ:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Load Balancing Strategies

1. **round-robin** - เลือก server ตามลำดับ
2. **least-connections** - เลือก server ที่มี connection น้อยที่สุด
3. **weighted-round-robin** - เลือกตามน้ำหนักที่กำหนด
4. **random** - เลือกแบบสุ่ม
5. **health-based** - เลือกตาม health score
6. **response-time** - เลือกตาม response time ที่ดีที่สุด

## Rate Limiting

API มี rate limiting:
- 1000 requests ต่อ 15 นาที ต่อ IP address
- เมื่อเกิน limit จะได้รับ HTTP 429 Too Many Requests

## Security

- ใช้ Helmet.js สำหรับ security headers
- รองรับ CORS
- JWT authentication สำหรับ protected endpoints
- รองรับ HashiCorp Vault สำหรับจัดการ secrets