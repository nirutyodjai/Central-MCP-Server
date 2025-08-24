#!/bin/bash

# Central MCP Server Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Central MCP Server"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env file not found. Creating from template..."
        create_env_file
    fi
    
    log_success "Prerequisites check completed"
}

create_env_file() {
    log "Creating .env file from template..."
    
    cat > "$ENV_FILE" << EOF
# Central MCP Server Environment Configuration
# IMPORTANT: Change all default passwords and secrets before production deployment!

# Application Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Security Settings (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-change-this-$(openssl rand -hex 32)
SERVER_TOKEN=your-server-token-change-this-$(openssl rand -hex 16)

# Redis Settings
REDIS_PASSWORD=redis-password-change-this-$(openssl rand -hex 16)

# Monitoring Settings
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin-change-this-$(openssl rand -hex 12)

# Vault Settings (Optional)
VAULT_ENABLED=false
VAULT_URL=http://vault:8200
VAULT_ROOT_TOKEN=root-token-change-this-$(openssl rand -hex 16)

# Health Check Settings
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_DAYS=7

# CORS Settings
ENABLE_CORS=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOF
    
    log_success ".env file created with random passwords"
    log_warning "Please review and update the .env file with your specific configuration"
}

create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p config
    mkdir -p temp
    mkdir -p nginx/ssl
    mkdir -p monitoring/grafana/provisioning
    mkdir -p "$BACKUP_DIR"
    
    log_success "Directories created"
}

generate_ssl_certificates() {
    log "Generating self-signed SSL certificates..."
    
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        log_success "SSL certificates generated"
        log_warning "Using self-signed certificates. For production, use proper SSL certificates from a CA."
    else
        log "SSL certificates already exist"
    fi
}

create_monitoring_config() {
    log "Creating monitoring configuration..."
    
    # Prometheus configuration
    mkdir -p monitoring
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'mcp-central-server'
    static_configs:
      - targets: ['mcp-central-server:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF
    
    log_success "Monitoring configuration created"
}

backup_existing_deployment() {
    if [ -d "logs" ] && [ "$(ls -A logs)" ]; then
        log "Creating backup of existing deployment..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
        
        # Backup logs and config
        cp -r logs "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
        cp -r config "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
        cp "$ENV_FILE" "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
        
        log_success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    fi
}

build_and_deploy() {
    log "Building and deploying $APP_NAME..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose pull
    
    # Build the application
    log "Building application image..."
    docker-compose build --no-cache
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose down
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    log_success "Deployment completed"
}

wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for main application
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health >/dev/null 2>&1; then
            log_success "Central MCP Server is ready"
            break
        fi
        
        log "Waiting for Central MCP Server... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Central MCP Server failed to start within expected time"
        return 1
    fi
    
    # Check other services
    sleep 5
    
    if curl -f http://localhost:9090 >/dev/null 2>&1; then
        log_success "Prometheus is ready"
    else
        log_warning "Prometheus may not be ready yet"
    fi
    
    if curl -f http://localhost:3001 >/dev/null 2>&1; then
        log_success "Grafana is ready"
    else
        log_warning "Grafana may not be ready yet"
    fi
}

show_deployment_info() {
    log_success "Deployment completed successfully!"
    echo
    echo -e "${GREEN}=== Central MCP Server Deployment Information ===${NC}"
    echo
    echo -e "${BLUE}Application URLs:${NC}"
    echo "  • Main Application: https://localhost (HTTP redirects to HTTPS)"
    echo "  • Health Check: http://localhost/health"
    echo "  • API Documentation: https://localhost/api-docs"
    echo
    echo -e "${BLUE}Monitoring URLs:${NC}"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Grafana: http://localhost:3001"
    echo
    echo -e "${BLUE}Default Credentials:${NC}"
    echo "  • Grafana: admin / $(grep GRAFANA_PASSWORD $ENV_FILE | cut -d'=' -f2)"
    echo
    echo -e "${BLUE}Important Files:${NC}"
    echo "  • Environment: $ENV_FILE"
    echo "  • Logs: ./logs/"
    echo "  • Backups: $BACKUP_DIR/"
    echo
    echo -e "${YELLOW}Security Notes:${NC}"
    echo "  • Change default passwords in $ENV_FILE"
    echo "  • Replace self-signed SSL certificates for production"
    echo "  • Review firewall settings"
    echo "  • Configure proper DNS for your domain"
    echo
    echo -e "${BLUE}Management Commands:${NC}"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart services: docker-compose restart"
    echo "  • Update: ./scripts/update.sh"
    echo
}

cleanup_old_backups() {
    log "Cleaning up old backups (keeping last 5)..."
    
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        cd ..
        log_success "Old backups cleaned up"
    fi
}

# Main deployment process
main() {
    log "Starting deployment of $APP_NAME"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    check_prerequisites
    create_directories
    generate_ssl_certificates
    create_monitoring_config
    backup_existing_deployment
    build_and_deploy
    wait_for_services
    cleanup_old_backups
    show_deployment_info
    
    log_success "Deployment process completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "--help" | "-h")
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --backup-only  Only create backup, don't deploy"
        echo "  --no-backup    Skip backup creation"
        exit 0
        ;;
    "--backup-only")
        backup_existing_deployment
        exit 0
        ;;
    "--no-backup")
        # Skip backup in main function
        backup_existing_deployment() { :; }
        ;;
esac

# Run main deployment
main