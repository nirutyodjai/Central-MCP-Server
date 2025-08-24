# Central MCP Server - Deployment Guide

## Overview

คู่มือนี้จะแนะนำการ deploy Central MCP Server ไปยัง production environments ต่างๆ รวมถึง best practices สำหรับ scalability, security และ monitoring

## Pre-deployment Checklist

### 1. System Requirements
- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] Minimum 2GB RAM
- [ ] Minimum 10GB disk space
- [ ] Network connectivity to MCP servers
- [ ] SSL certificates (for HTTPS)

### 2. Security Requirements
- [ ] Change default JWT_SECRET
- [ ] Change default SERVER_TOKEN
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting

### 3. Environment Configuration
- [ ] Create production .env file
- [ ] Configure HashiCorp Vault (optional)
- [ ] Set up reverse proxy (Nginx/Apache)
- [ ] Configure log rotation
- [ ] Set up backup strategy

## Deployment Methods

### Method 1: Traditional Server Deployment

#### 1.1 Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash mcpserver
sudo usermod -aG sudo mcpserver
```

#### 1.2 Application Deployment

```bash
# Switch to application user
sudo su - mcpserver

# Clone repository
git clone https://github.com/your-org/central-mcp-server.git
cd central-mcp-server

# Install dependencies
npm ci --production

# Create production environment file
cp .env.example .env.production

# Edit production configuration
nano .env.production
```

#### 1.3 Production Environment Configuration

```bash
# .env.production
NODE_ENV=production
PORT=5050
HOST=0.0.0.0

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SERVER_TOKEN=your-super-secure-server-token-here
JWT_EXPIRES_IN=1h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Check
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3

# Monitoring
METRICS_RETENTION_HOURS=24
ALERT_RESPONSE_TIME_THRESHOLD=3000
ALERT_ERROR_RATE_THRESHOLD=0.1
ALERT_MEMORY_THRESHOLD=0.9

# Logging
LOG_LEVEL=info
LOG_FILE=logs/central-mcp-server.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# HashiCorp Vault (optional)
VAULT_ENABLED=false
VAULT_URL=https://vault.example.com:8200
VAULT_TOKEN=your-vault-token
VAULT_MOUNT_PATH=secret
```

#### 1.4 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'central-mcp-server',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5050
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### 1.5 Start Application

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u mcpserver --hp /home/mcpserver
```

### Method 2: Docker Deployment

#### 2.1 Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcpserver -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R mcpserver:nodejs logs

# Switch to non-root user
USER mcpserver

# Expose port
EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]
```

#### 2.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  central-mcp-server:
    build: .
    container_name: central-mcp-server
    restart: unless-stopped
    ports:
      - "5050:5050"
    environment:
      - NODE_ENV=production
      - PORT=5050
      - HOST=0.0.0.0
    env_file:
      - .env.production
    volumes:
      - ./logs:/usr/src/app/logs
      - ./config:/usr/src/app/config
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: mcp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - central-mcp-server
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge

volumes:
  logs:
  config:
```

#### 2.3 Health Check Script

```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5050,
  path: '/health',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

#### 2.4 Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f central-mcp-server

# Scale application
docker-compose up -d --scale central-mcp-server=3

# Update application
docker-compose pull
docker-compose up -d
```

### Method 3: Kubernetes Deployment

#### 3.1 Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-system
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
  namespace: mcp-system
data:
  NODE_ENV: "production"
  PORT: "5050"
  HOST: "0.0.0.0"
  LOG_LEVEL: "info"
  HEALTH_CHECK_INTERVAL: "30000"
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-secrets
  namespace: mcp-system
type: Opaque
data:
  JWT_SECRET: <base64-encoded-jwt-secret>
  SERVER_TOKEN: <base64-encoded-server-token>
---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: central-mcp-server
  namespace: mcp-system
  labels:
    app: central-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: central-mcp-server
  template:
    metadata:
      labels:
        app: central-mcp-server
    spec:
      containers:
      - name: central-mcp-server
        image: your-registry/central-mcp-server:latest
        ports:
        - containerPort: 5050
        envFrom:
        - configMapRef:
            name: mcp-config
        - secretRef:
            name: mcp-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5050
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5050
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /usr/src/app/logs
      volumes:
      - name: logs
        emptyDir: {}
---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: central-mcp-server-service
  namespace: mcp-system
spec:
  selector:
    app: central-mcp-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5050
  type: ClusterIP
---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: central-mcp-server-ingress
  namespace: mcp-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - mcp.yourdomain.com
    secretName: mcp-tls
  rules:
  - host: mcp.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: central-mcp-server-service
            port:
              number: 80
```

#### 3.2 Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n mcp-system
kubectl get services -n mcp-system
kubectl get ingress -n mcp-system

# View logs
kubectl logs -f deployment/central-mcp-server -n mcp-system

# Scale deployment
kubectl scale deployment central-mcp-server --replicas=5 -n mcp-system
```

## Reverse Proxy Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/central-mcp-server
upstream mcp_backend {
    least_conn;
    server 127.0.0.1:5050 max_fails=3 fail_timeout=30s;
    # Add more servers for load balancing
    # server 127.0.0.1:5051 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:5052 max_fails=3 fail_timeout=30s;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=dashboard:10m rate=5r/s;

server {
    listen 80;
    server_name mcp.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/mcp_access.log;
    error_log /var/log/nginx/mcp_error.log;

    # Dashboard (rate limited)
    location /dashboard {
        limit_req zone=dashboard burst=10 nodelay;
        proxy_pass http://mcp_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints (rate limited)
    location /mcp/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://mcp_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://mcp_backend;
        proxy_set_header Host $host;
        access_log off;
    }

    # Static files
    location /public/ {
        proxy_pass http://mcp_backend;
        proxy_set_header Host $host;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Default location
    location / {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://mcp_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Nginx Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/central-mcp-server /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mcp.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## Monitoring and Logging

### Log Rotation Setup

```bash
# /etc/logrotate.d/central-mcp-server
/home/mcpserver/central-mcp-server/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mcpserver mcpserver
    postrotate
        pm2 reloadLogs
    endscript
}
```

### System Monitoring with Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'central-mcp-server'
    static_configs:
      - targets: ['localhost:5050']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Central MCP Server Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Servers",
        "type": "singlestat",
        "targets": [
          {
            "expr": "mcp_servers_healthy_total",
            "legendFormat": "Healthy Servers"
          }
        ]
      }
    ]
  }
}
```

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/central-mcp-server"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/mcpserver/central-mcp-server"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# Backup configuration
cp $APP_DIR/.env.production $BACKUP_DIR/env_$DATE.backup

# Backup logs (last 7 days)
find $APP_DIR/logs -name "*.log" -mtime -7 -exec cp {} $BACKUP_DIR/ \;

# Export server registry (if using file-based storage)
curl -s http://localhost:5050/mcp/servers > $BACKUP_DIR/servers_$DATE.json

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete
find $BACKUP_DIR -name "*.json" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Recovery Procedure

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
APP_DIR="/home/mcpserver/central-mcp-server"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Stop application
pm2 stop central-mcp-server

# Backup current state
mv $APP_DIR $APP_DIR.backup.$(date +%Y%m%d_%H%M%S)

# Create new directory
mkdir -p $APP_DIR

# Extract backup
tar -xzf $BACKUP_FILE -C $APP_DIR

# Restore permissions
chown -R mcpserver:mcpserver $APP_DIR

# Start application
pm2 start central-mcp-server

echo "Recovery completed"
```

## Performance Tuning

### Node.js Optimization

```bash
# .env.production additions
NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
UV_THREADPOOL_SIZE=16
```

### PM2 Optimization

```javascript
// ecosystem.config.js additions
module.exports = {
  apps: [{
    // ... existing config
    node_args: [
      '--max-old-space-size=2048',
      '--optimize-for-size',
      '--gc-interval=100'
    ],
    max_memory_restart: '2G',
    kill_timeout: 5000,
    listen_timeout: 8000,
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
```

### System Optimization

```bash
# /etc/security/limits.conf
mcpserver soft nofile 65536
mcpserver hard nofile 65536
mcpserver soft nproc 32768
mcpserver hard nproc 32768

# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 30
```

## Security Hardening

### Firewall Configuration

```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Allow specific IPs for management
sudo ufw allow from YOUR_MANAGEMENT_IP to any port 22
```

### Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install fail2ban

# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/mcp_error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/mcp_error.log
maxretry = 10
```

## Troubleshooting

### Common Deployment Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :5050

# Kill process
sudo kill -9 <PID>
```

#### 2. Permission Issues
```bash
# Fix ownership
sudo chown -R mcpserver:mcpserver /home/mcpserver/central-mcp-server

# Fix permissions
chmod +x /home/mcpserver/central-mcp-server/server.js
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/mcp.yourdomain.com/cert.pem -text -noout

# Renew certificate
sudo certbot renew --force-renewal
```

### Health Check Commands

```bash
# Application health
curl -f http://localhost:5050/health || echo "Application unhealthy"

# PM2 status
pm2 status
pm2 logs central-mcp-server --lines 50

# System resources
top -p $(pgrep -f "central-mcp-server")

# Network connectivity
netstat -tlnp | grep :5050

# Disk space
df -h

# Log analysis
tail -f /home/mcpserver/central-mcp-server/logs/central-mcp-server.log | grep ERROR
```

## Maintenance

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh - Run weekly

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /home/mcpserver/central-mcp-server
npm audit fix

# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete

# Restart application
pm2 restart central-mcp-server

# Check health
sleep 10
curl -f http://localhost:5050/health

echo "Maintenance completed: $(date)"
```

### Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Run every 5 minutes via cron

HEALTH_URL="http://localhost:5050/health"
ALERT_EMAIL="admin@yourdomain.com"

if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "Central MCP Server is down!" | mail -s "MCP Server Alert" $ALERT_EMAIL
    pm2 restart central-mcp-server
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "High memory usage: ${MEM_USAGE}%" | mail -s "MCP Server Memory Alert" $ALERT_EMAIL
fi
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer Setup**: Use Nginx, HAProxy, or cloud load balancers
2. **Session Management**: Implement Redis for shared sessions
3. **Database**: Move to external database (PostgreSQL/MongoDB)
4. **File Storage**: Use shared storage (NFS/S3)

### Vertical Scaling

1. **CPU**: Monitor CPU usage and upgrade as needed
2. **Memory**: Increase RAM for better caching
3. **Storage**: Use SSD for better I/O performance
4. **Network**: Ensure adequate bandwidth

---

*สำหรับข้อมูลเพิ่มเติมเกี่ยวกับการ deploy และ maintenance โปรดดู [Installation Guide](./INSTALLATION.md) และ [API Documentation](./API.md)*