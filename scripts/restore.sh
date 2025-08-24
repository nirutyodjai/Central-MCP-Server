#!/bin/bash

# Central MCP Server Restore Script
# This script restores backups created by backup.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Central MCP Server"
BACKUP_BASE_DIR="./backups"
LOG_FILE="./logs/restore.log"
TEMP_RESTORE_DIR="./temp_restore"

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
    
    log_success "Prerequisites check completed"
}

validate_backup() {
    local backup_path="$1"
    
    log "Validating backup: $backup_path"
    
    if [ ! -e "$backup_path" ]; then
        log_error "Backup not found: $backup_path"
        exit 1
    fi
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        # Validate compressed backup
        if ! tar -tzf "$backup_path" >/dev/null 2>&1; then
            log_error "Invalid or corrupted backup archive"
            exit 1
        fi
        
        # Check if manifest exists in archive
        if ! tar -tzf "$backup_path" | grep -q "MANIFEST.txt"; then
            log_error "Backup manifest not found in archive"
            exit 1
        fi
    else
        # Validate directory backup
        if [ ! -d "$backup_path" ]; then
            log_error "Backup directory not found: $backup_path"
            exit 1
        fi
        
        if [ ! -f "$backup_path/MANIFEST.txt" ]; then
            log_error "Backup manifest not found"
            exit 1
        fi
    fi
    
    log_success "Backup validation passed"
}

extract_backup() {
    local backup_path="$1"
    local extract_dir="$2"
    
    log "Extracting backup..."
    
    # Clean up any existing temp directory
    rm -rf "$extract_dir"
    mkdir -p "$extract_dir"
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        # Extract compressed backup
        tar -xzf "$backup_path" -C "$extract_dir" --strip-components=1
    else
        # Copy directory backup
        cp -r "$backup_path"/* "$extract_dir"/
    fi
    
    log_success "Backup extracted to: $extract_dir"
}

show_backup_info() {
    local extract_dir="$1"
    
    if [ -f "$extract_dir/MANIFEST.txt" ]; then
        echo
        echo -e "${BLUE}=== Backup Information ===${NC}"
        cat "$extract_dir/MANIFEST.txt"
        echo
    fi
}

confirm_restore() {
    local backup_type="$1"
    local force="$2"
    
    if [ "$force" != "true" ]; then
        echo
        echo -e "${YELLOW}WARNING: This will restore the $backup_type backup and may overwrite current data!${NC}"
        echo -e "${YELLOW}Current services will be stopped during the restore process.${NC}"
        echo
        read -p "Are you sure you want to continue? (yes/no): " -r
        
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
}

create_pre_restore_backup() {
    log "Creating pre-restore backup of current state..."
    
    local pre_restore_backup="$BACKUP_BASE_DIR/pre-restore-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$pre_restore_backup"
    
    # Backup current configuration and data
    cp -r config "$pre_restore_backup/" 2>/dev/null || true
    cp -r logs "$pre_restore_backup/" 2>/dev/null || true
    cp .env "$pre_restore_backup/" 2>/dev/null || true
    cp docker-compose.yml "$pre_restore_backup/" 2>/dev/null || true
    cp VERSION "$pre_restore_backup/" 2>/dev/null || true
    
    log_success "Pre-restore backup created: $pre_restore_backup"
    echo "$pre_restore_backup" > .pre_restore_backup
}

stop_services() {
    log "Stopping services..."
    
    # Gracefully stop services
    docker-compose down || true
    
    # Wait a moment for services to fully stop
    sleep 5
    
    log_success "Services stopped"
}

restore_application_files() {
    local extract_dir="$1"
    
    log "Restoring application files..."
    
    if [ -d "$extract_dir/app" ]; then
        # Restore application files
        cp -r "$extract_dir/app"/* ./ 2>/dev/null || true
        log_success "Application files restored"
    else
        log_warning "No application files found in backup"
    fi
}

restore_configuration() {
    local extract_dir="$1"
    
    log "Restoring configuration files..."
    
    if [ -d "$extract_dir/config" ]; then
        # Restore configuration
        mkdir -p config
        cp -r "$extract_dir/config"/* config/ 2>/dev/null || true
        
        # Restore other config files
        cp "$extract_dir/config/nginx.conf" ./ 2>/dev/null || true
        cp -r "$extract_dir/config/monitoring" ./ 2>/dev/null || true
        
        log_success "Configuration files restored"
    else
        log_warning "No configuration files found in backup"
    fi
}

restore_ssl_certificates() {
    local extract_dir="$1"
    
    log "Restoring SSL certificates..."
    
    if [ -d "$extract_dir/ssl" ]; then
        mkdir -p nginx/ssl
        cp -r "$extract_dir/ssl"/* nginx/ssl/ 2>/dev/null || true
        log_success "SSL certificates restored"
    else
        log_warning "No SSL certificates found in backup"
    fi
}

restore_docker_volumes() {
    local extract_dir="$1"
    
    log "Restoring Docker volumes..."
    
    if [ -d "$extract_dir/volumes" ]; then
        for volume_backup in "$extract_dir/volumes"/*.tar.gz; do
            if [ -f "$volume_backup" ]; then
                local volume_name=$(basename "$volume_backup" .tar.gz)
                log "Restoring volume: $volume_name"
                
                # Create volume if it doesn't exist
                docker volume create "$volume_name" >/dev/null 2>&1 || true
                
                # Restore volume data
                docker run --rm \
                    -v "$volume_name:/data" \
                    -v "$PWD/$extract_dir/volumes:/backup" \
                    alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$volume_backup") -C /data"
                
                log_success "Volume $volume_name restored"
            fi
        done
    else
        log_warning "No Docker volumes found in backup"
    fi
}

restore_database() {
    local extract_dir="$1"
    
    log "Restoring database..."
    
    if [ -d "$extract_dir/database" ]; then
        # Start Redis temporarily for restore
        if [ -f "$extract_dir/database/redis-dump.rdb" ]; then
            log "Restoring Redis database..."
            
            # Start Redis service
            docker-compose up -d redis
            sleep 10  # Wait for Redis to start
            
            # Stop Redis to replace dump file
            docker-compose stop redis
            
            # Copy dump file to Redis volume
            docker cp "$extract_dir/database/redis-dump.rdb" $(docker-compose ps -q redis):/data/dump.rdb 2>/dev/null || true
            
            log_success "Redis database restored"
        fi
    else
        log_warning "No database backups found"
    fi
}

restore_logs() {
    local extract_dir="$1"
    
    log "Restoring logs..."
    
    if [ -d "$extract_dir/logs" ]; then
        mkdir -p logs
        cp -r "$extract_dir/logs"/* logs/ 2>/dev/null || true
        log_success "Logs restored"
    else
        log_warning "No logs found in backup"
    fi
}

start_services() {
    log "Starting services..."
    
    # Start all services
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

verify_restore() {
    log "Verifying restore..."
    
    local verification_failed=false
    
    # Check main application
    if ! curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log_error "Main application health check failed"
        verification_failed=true
    fi
    
    # Check configuration files
    if [ ! -f ".env" ]; then
        log_error "Environment configuration missing"
        verification_failed=true
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "Docker Compose configuration missing"
        verification_failed=true
    fi
    
    if [ "$verification_failed" = true ]; then
        log_error "Restore verification failed"
        return 1
    fi
    
    log_success "Restore verification passed"
}

cleanup_temp_files() {
    log "Cleaning up temporary files..."
    
    rm -rf "$TEMP_RESTORE_DIR"
    rm -f .pre_restore_backup
    
    log_success "Cleanup completed"
}

rollback_restore() {
    log_error "Restore failed. Attempting rollback..."
    
    if [ -f ".pre_restore_backup" ]; then
        local pre_restore_backup=$(cat .pre_restore_backup)
        
        if [ -d "$pre_restore_backup" ]; then
            log "Rolling back to pre-restore state..."
            
            # Stop services
            docker-compose down
            
            # Restore previous state
            cp -r "$pre_restore_backup"/* ./ 2>/dev/null || true
            
            # Start services
            docker-compose up -d
            
            log_success "Rollback completed"
        else
            log_error "Pre-restore backup not found. Manual recovery required."
        fi
    else
        log_error "No rollback information available. Manual recovery required."
    fi
}

show_restore_summary() {
    local backup_path="$1"
    local backup_type="$2"
    
    log_success "Restore completed successfully!"
    echo
    echo -e "${GREEN}=== Restore Summary ===${NC}"
    echo -e "${BLUE}Restored From:${NC} $backup_path"
    echo -e "${BLUE}Backup Type:${NC} $backup_type"
    echo -e "${BLUE}Restore Time:${NC} $(date)"
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

# Main restore process
main() {
    local backup_path="$1"
    local force="$2"
    
    if [ -z "$backup_path" ]; then
        log_error "Backup path not specified"
        echo "Usage: $0 <backup_path> [--force]"
        exit 1
    fi
    
    log "Starting restore of $APP_NAME from: $backup_path"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Trap to handle rollback on failure
    trap 'rollback_restore; cleanup_temp_files; exit 1' ERR
    
    check_prerequisites
    validate_backup "$backup_path"
    extract_backup "$backup_path" "$TEMP_RESTORE_DIR"
    show_backup_info "$TEMP_RESTORE_DIR"
    
    # Determine backup type from manifest
    local backup_type="unknown"
    if [ -f "$TEMP_RESTORE_DIR/MANIFEST.txt" ]; then
        backup_type=$(grep "^Backup Type:" "$TEMP_RESTORE_DIR/MANIFEST.txt" | cut -d' ' -f3 || echo "unknown")
    fi
    
    confirm_restore "$backup_type" "$force"
    create_pre_restore_backup
    stop_services
    
    # Restore based on backup type
    case "$backup_type" in
        "full")
            restore_application_files "$TEMP_RESTORE_DIR"
            restore_configuration "$TEMP_RESTORE_DIR"
            restore_ssl_certificates "$TEMP_RESTORE_DIR"
            restore_docker_volumes "$TEMP_RESTORE_DIR"
            restore_database "$TEMP_RESTORE_DIR"
            restore_logs "$TEMP_RESTORE_DIR"
            ;;
        "config")
            restore_configuration "$TEMP_RESTORE_DIR"
            restore_ssl_certificates "$TEMP_RESTORE_DIR"
            ;;
        "data")
            restore_docker_volumes "$TEMP_RESTORE_DIR"
            restore_database "$TEMP_RESTORE_DIR"
            restore_logs "$TEMP_RESTORE_DIR"
            ;;
        *)
            log_warning "Unknown backup type, attempting full restore..."
            restore_application_files "$TEMP_RESTORE_DIR"
            restore_configuration "$TEMP_RESTORE_DIR"
            restore_ssl_certificates "$TEMP_RESTORE_DIR"
            restore_docker_volumes "$TEMP_RESTORE_DIR"
            restore_database "$TEMP_RESTORE_DIR"
            restore_logs "$TEMP_RESTORE_DIR"
            ;;
    esac
    
    start_services
    wait_for_services
    verify_restore
    
    # Remove error trap on success
    trap - ERR
    
    cleanup_temp_files
    show_restore_summary "$backup_path" "$backup_type"
    
    log_success "Restore process completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "--help" | "-h")
        echo "Usage: $0 <backup_path> [options]"
        echo
        echo "Arguments:"
        echo "  backup_path     Path to backup file or directory"
        echo
        echo "Options:"
        echo "  --force         Skip confirmation prompts"
        echo "  --list          List available backups"
        echo "  --help, -h      Show this help message"
        echo
        echo "Examples:"
        echo "  $0 ./backups/full-20240101-120000.tar.gz"
        echo "  $0 ./backups/config-20240101-120000 --force"
        exit 0
        ;;
    "--list")
        echo "Available backups:"
        if [ -d "$BACKUP_BASE_DIR" ]; then
            ls -la "$BACKUP_BASE_DIR"
        else
            echo "No backups found"
        fi
        exit 0
        ;;
    "")
        echo "Error: Backup path not specified"
        echo "Usage: $0 <backup_path> [--force]"
        echo "Use --help for more information"
        exit 1
        ;;
esac

# Parse arguments
backup_path="$1"
force="false"

if [ "$2" = "--force" ]; then
    force="true"
fi

# Run main restore
main "$backup_path" "$force"