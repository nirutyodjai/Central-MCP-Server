# Central MCP Server - Installation Guide

## ความต้องการของระบบ

### Software Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git (สำหรับ clone repository)

### Optional Requirements
- Docker (สำหรับ containerized deployment)
- HashiCorp Vault (สำหรับ secrets management)
- PostgreSQL/MySQL (สำหรับ persistent storage - future feature)

## การติดตั้ง

### 1. Clone Repository

```bash
git clone <repository-url>
cd "Central MCP Server"
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. การตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์หลัก:

```env
# Server Configuration
PORT=5050
NODE_ENV=production

# Authentication
CENTRAL_MCP_SERVER_TOKEN=your-secure-server-token
CENTRAL_MCP_JWT_SECRET=your-jwt-secret-key

# Vault Configuration (Optional)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=your-vault-token
VAULT_MOUNT=secret

# Logging
LOG_LEVEL=info
LOG_FILE=logs/central-mcp-server.log
```

### 4. การตั้งค่า Local Config (Optional)

สร้างไฟล์ `central-mcp-config.json`:

```json
{
  "centralMcpServerUrl": "http://localhost:5050",
  "centralMcpServerToken": "your-shared-token",
  "secrets": {
    "api_key": "your-api-key",
    "database_url": "your-database-url"
  },
  "loadBalancer": {
    "defaultStrategy": "round-robin",
    "healthCheckInterval": 30000,
    "healthCheckTimeout": 5000
  },
  "monitoring": {
    "alertThresholds": {
      "responseTime": 2000,
      "errorRate": 0.05,
      "memoryUsage": 0.8
    }
  }
}
```

## การเริ่มต้นใช้งาน

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### การใช้งาน PM2 (แนะนำสำหรับ Production)

```bash
# ติดตั้ง PM2
npm install -g pm2

# เริ่ม server ด้วย PM2
pm2 start server.js --name "central-mcp-server"

# ดู logs
pm2 logs central-mcp-server

# Restart server
pm2 restart central-mcp-server

# Stop server
pm2 stop central-mcp-server
```

## การตั้งค่า Reverse Proxy (Nginx)

สำหรับ production deployment แนะนำให้ใช้ Nginx เป็น reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Dashboard static files
    location /dashboard {
        proxy_pass http://localhost:5050/dashboard;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## การตั้งค่า SSL/TLS

### ใช้ Let's Encrypt

```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx

# รับ SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# เพิ่มบรรทัด: 0 12 * * * /usr/bin/certbot renew --quiet
```

## การตั้งค่า HashiCorp Vault

### 1. ติดตั้ง Vault

```bash
# Download และติดตั้ง Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/
```

### 2. เริ่ม Vault Server

```bash
# Development mode (ไม่แนะนำสำหรับ production)
vault server -dev

# Production mode
vault server -config=vault-config.hcl
```

### 3. ตั้งค่า Vault

```bash
# Set environment variables
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='your-vault-token'

# Enable KV secrets engine
vault secrets enable -path=secret kv-v2

# เพิ่ม secrets
vault kv put secret/api_key value="your-api-key"
vault kv put secret/database_url value="your-database-url"
```

## การตั้งค่า Monitoring

### 1. Log Files

Logs จะถูกเก็บใน:
- `logs/central-mcp-server.log` - Application logs
- `logs/error.log` - Error logs
- `logs/access.log` - Access logs

### 2. Health Check Endpoint

ตรวจสอบสถานะ server:

```bash
curl http://localhost:5050/health
```

### 3. Metrics Endpoint

ดู metrics:

```bash
curl http://localhost:5050/metrics
```

## การตั้งค่า Firewall

### Ubuntu/Debian (UFW)

```bash
# เปิด port สำหรับ HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# เปิด port สำหรับ Central MCP Server (ถ้าต้องการ direct access)
sudo ufw allow 5050

# เปิด port สำหรับ Vault (ถ้าใช้)
sudo ufw allow 8200
```

### CentOS/RHEL (firewalld)

```bash
# เปิด ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=5050/tcp
sudo firewall-cmd --reload
```

## การ Backup และ Recovery

### 1. Backup Configuration

```bash
# สร้าง backup script
#!/bin/bash
BACKUP_DIR="/backup/central-mcp-server"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration files
cp central-mcp-config.json $BACKUP_DIR/config_$DATE.json
cp .env $BACKUP_DIR/env_$DATE.backup

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz logs/

echo "Backup completed: $DATE"
```

### 2. Recovery

```bash
# Restore configuration
cp /backup/central-mcp-server/config_YYYYMMDD_HHMMSS.json central-mcp-config.json
cp /backup/central-mcp-server/env_YYYYMMDD_HHMMSS.backup .env

# Restart service
pm2 restart central-mcp-server
```

## การ Troubleshooting

### 1. ตรวจสอบ Logs

```bash
# ดู logs แบบ real-time
tail -f logs/central-mcp-server.log

# ค้นหา errors
grep "ERROR" logs/central-mcp-server.log

# ดู PM2 logs
pm2 logs central-mcp-server
```

### 2. ตรวจสอบ Port

```bash
# ตรวจสอบว่า port 5050 ถูกใช้งาน
netstat -tlnp | grep 5050
# หรือ
ss -tlnp | grep 5050
```

### 3. ตรวจสอบ Memory Usage

```bash
# ดู memory usage ของ Node.js process
ps aux | grep node

# ดู system memory
free -h
```

### 4. Common Issues

#### Port Already in Use
```bash
# หา process ที่ใช้ port 5050
lsof -i :5050

# Kill process
kill -9 <PID>
```

#### Permission Denied
```bash
# ตรวจสอบ file permissions
ls -la server.js

# เปลี่ยน permissions
chmod 755 server.js
```

#### JWT Secret Not Set
```bash
# ตั้งค่า environment variable
export CENTRAL_MCP_JWT_SECRET="your-secret-key"

# หรือเพิ่มใน .env file
echo "CENTRAL_MCP_JWT_SECRET=your-secret-key" >> .env
```

## Performance Tuning

### 1. Node.js Optimization

```bash
# เพิ่ม memory limit
node --max-old-space-size=4096 server.js

# เปิด cluster mode ด้วย PM2
pm2 start server.js -i max --name "central-mcp-server"
```

### 2. OS Level Optimization

```bash
# เพิ่ม file descriptor limit
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# เพิ่ม TCP connection limit
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
sysctl -p
```

## Security Best Practices

1. **ใช้ HTTPS เสมอใน production**
2. **เปลี่ยน default tokens และ secrets**
3. **ใช้ strong JWT secrets**
4. **อัปเดต dependencies เป็นประจำ**
5. **ตั้งค่า rate limiting**
6. **ใช้ Vault สำหรับ sensitive data**
7. **Monitor logs สำหรับ suspicious activities**
8. **ใช้ firewall และ restrict access**

## การอัปเดต

```bash
# Backup ก่อนอัปเดต
./backup.sh

# Pull latest changes
git pull origin main

# อัปเดต dependencies
npm install

# Restart service
pm2 restart central-mcp-server

# ตรวจสอบสถานะ
curl http://localhost:5050/health
```

## การติดต่อและ Support

- GitHub Issues: [Repository Issues]
- Documentation: [API Documentation](./API.md)
- Health Check: `GET /health`
- Metrics: `GET /metrics`