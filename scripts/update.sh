#!/bin/bash

# Central MCP Server Update Script
# This script handles updates for the Central MCP Server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Central MCP Server"
BACKUP_DIR="./backups"
LOG_FILE="./logs/update.log"
GIT_REPO="https://github.com/your-repo/central-mcp-server.git"
CURRENT_VERSION_FILE="./VERSION"

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
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        log_warning "No services appear to be running. Run deploy.sh first."
    fi
    
    log_success "Prerequisites check completed"
}

get_current_version() {
    if [ -f "$CURRENT_VERSION_FILE" ]; then
        cat "$CURRENT_VERSION_FILE"
    else
        echo "unknown"
    fi
}

get_latest_version() {
    # Try to get version from git tags
    if command -v git &> /dev/null && [ -d ".git" ]; then
        git describe --tags --abbrev=0 2>/dev/null || echo "latest"
    else
        echo "latest"
    fi
}

create_pre_update_backup() {
    log "Creating pre-update backup..."
    
    local backup_name="pre-update-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup configuration and data
    cp -r logs "$backup_path/" 2>/dev/null || true
    cp -r config "$backup_path/" 2>/dev/null || true
    cp .env "$backup_path/" 2>/dev/null || true
    cp "$CURRENT_VERSION_FILE" "$backup_path/" 2>/dev/null || true
    
    # Export Docker volumes if they exist
    if docker volume ls | grep -q "central-mcp-server"; then
        log "Backing up Docker volumes..."
        docker run --rm -v central-mcp-server_redis_data:/data -v "$PWD/$backup_path:/backup" alpine tar czf /backup/redis_data.tar.gz -C /data .
        docker run --rm -v central-mcp-server_grafana_data:/data -v "$PWD/$backup_path:/backup" alpine tar czf /backup/grafana_data.tar.gz -C /data .
    fi
    
    log_success "Backup created: $backup_path"
    echo "$backup_path" > .last_backup
}

stop_services() {
    log "Stopping services gracefully..."
    
    # Give services time to finish current requests
    docker-compose exec -T mcp-central-server pkill -SIGTERM node 2>/dev/null || true
    sleep 5
    
    # Stop all services
    docker-compose down
    
    log_success "Services stopped"
}

update_code() {
    log "Updating application code..."
    
    if [ -d ".git" ]; then
        # Git repository - pull latest changes
        log "Pulling latest changes from git..."
        git fetch origin
        git pull origin main
        
        # Update version file
        get_latest_version > "$CURRENT_VERSION_FILE"
    else
        log_warning "Not a git repository. Manual code update required."
    fi
    
    log_success "Code updated"
}

update_dependencies() {
    log "Updating dependencies..."
    
    # Pull latest base images
    docker-compose pull
    
    # Rebuild application image
    docker-compose build --no-cache mcp-central-server
    
    log_success "Dependencies updated"
}

run_migrations() {
    log "Running database migrations (if any)..."
    
    # Add migration logic here if needed
    # For now, just ensure directories exist
    mkdir -p logs config temp
    
    log_success "Migrations completed"
}

start_services() {
    log "Starting updated services..."
    
    # Start services
    docker-compose up -d
    
    log_success "Services started"
}

wait_for_services() {
    log "Waiting for services to be ready..."
    
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
}

run_health_checks() {
    log "Running post-update health checks..."
    
    local health_check_failed=false
    
    # Check main application
    if ! curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log_error "Main application health check failed"
        health_check_failed=true
    fi
    
    # Check API endpoints
    if ! curl -f http://localhost:3000/api/servers >/dev/null 2>&1; then
        log_error "API endpoints health check failed"
        health_check_failed=true
    fi
    
    # Check monitoring services
    if ! curl -f http://localhost:9090 >/dev/null 2>&1; then
        log_warning "Prometheus health check failed (non-critical)"
    fi
    
    if ! curl -f http://localhost:3001 >/dev/null 2>&1; then
        log_warning "Grafana health check failed (non-critical)"
    fi
    
    if [ "$health_check_failed" = true ]; then
        log_error "Critical health checks failed"
        return 1
    fi
    
    log_success "Health checks passed"
}

rollback() {
    log_error "Update failed. Starting rollback..."
    
    if [ -f ".last_backup" ]; then
        local backup_path=$(cat .last_backup)
        
        if [ -d "$backup_path" ]; then
            log "Restoring from backup: $backup_path"
            
            # Stop current services
            docker-compose down
            
            # Restore files
            cp -r "$backup_path/logs" ./ 2>/dev/null || true
            cp -r "$backup_path/config" ./ 2>/dev/null || true
            cp "$backup_path/.env" ./ 2>/dev/null || true
            cp "$backup_path/VERSION" ./ 2>/dev/null || true
            
            # Restore Docker volumes
            if [ -f "$backup_path/redis_data.tar.gz" ]; then
                docker run --rm -v central-mcp-server_redis_data:/data -v "$PWD/$backup_path:/backup" alpine tar xzf /backup/redis_data.tar.gz -C /data
            fi
            
            if [ -f "$backup_path/grafana_data.tar.gz" ]; then
                docker run --rm -v central-mcp-server_grafana_data:/data -v "$PWD/$backup_path:/backup" alpine tar xzf /backup/grafana_data.tar.gz -C /data
            fi
            
            # Start services with old version
            docker-compose up -d
            
            log_success "Rollback completed"
        else
            log_error "Backup not found. Manual recovery required."
        fi
    else
        log_error "No backup reference found. Manual recovery required."
    fi
}

cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old versions (keep last 3)
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
        grep "central-mcp-server" | \
        tail -n +4 | \
        awk '{print $1}' | \
        xargs -r docker rmi 2>/dev/null || true
    
    log_success "Old images cleaned up"
}

show_update_summary() {
    local old_version="$1"
    local new_version="$2"
    
    log_success "Update completed successfully!"
    echo
    echo -e "${GREEN}=== Update Summary ===${NC}"
    echo -e "${BLUE}Previous Version:${NC} $old_version"
    echo -e "${BLUE}Current Version:${NC} $new_version"
    echo -e "${BLUE}Update Time:${NC} $(date)"
    echo
    echo -e "${BLUE}Services Status:${NC}"
    docker-compose ps
    echo
    echo -e "${BLUE}Application URLs:${NC}"
    echo "  • Main Application: https://localhost"
    echo "  • Health Check: http://localhost:3000/health"
    echo "  • Monitoring: http://localhost:9090 (Prometheus), http://localhost:3001 (Grafana)"
    echo
}

# Main update process
main() {
    local current_version=$(get_current_version)
    
    log "Starting update of $APP_NAME"
    log "Current version: $current_version"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Trap to handle rollback on failure
    trap 'rollback; exit 1' ERR
    
    check_prerequisites
    create_pre_update_backup
    stop_services
    update_code
    update_dependencies
    run_migrations
    start_services
    wait_for_services
    run_health_checks
    cleanup_old_images
    
    # Remove error trap on success
    trap - ERR
    
    local new_version=$(get_current_version)
    show_update_summary "$current_version" "$new_version"
    
    log_success "Update process completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "--help" | "-h")
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --check-version     Check current and available versions"
        echo "  --rollback          Rollback to last backup"
        echo "  --force             Force update even if versions are the same"
        exit 0
        ;;
    "--check-version")
        echo "Current version: $(get_current_version)"
        echo "Latest version: $(get_latest_version)"
        exit 0
        ;;
    "--rollback")
        rollback
        exit 0
        ;;
    "--force")
        # Continue with update regardless of version
        ;;
    *)
        # Check if update is needed
        current_version=$(get_current_version)
        latest_version=$(get_latest_version)
        
        if [ "$current_version" = "$latest_version" ] && [ "$current_version" != "unknown" ]; then
            log "Already up to date (version: $current_version)"
            exit 0
        fi
        ;;
esac

# Run main update
main