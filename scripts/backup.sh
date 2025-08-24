#!/bin/bash

# Central MCP Server Backup Script
# This script creates comprehensive backups of the Central MCP Server

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
LOG_FILE="./logs/backup.log"
MAX_BACKUPS=10
COMPRESSION_LEVEL=6

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
    
    # Check available disk space
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_warning "Low disk space. Available: ${available_space}KB, Recommended: ${required_space}KB"
    fi
    
    log_success "Prerequisites check completed"
}

create_backup_directory() {
    local backup_type="$1"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_name="${backup_type}-${timestamp}"
    local backup_dir="$BACKUP_BASE_DIR/$backup_name"
    
    mkdir -p "$backup_dir"
    echo "$backup_dir"
}

backup_application_files() {
    local backup_dir="$1"
    
    log "Backing up application files..."
    
    # Create subdirectories
    mkdir -p "$backup_dir/app"
    mkdir -p "$backup_dir/config"
    mkdir -p "$backup_dir/logs"
    mkdir -p "$backup_dir/scripts"
    
    # Backup application code
    cp -r src "$backup_dir/app/" 2>/dev/null || true
    cp package*.json "$backup_dir/app/" 2>/dev/null || true
    cp Dockerfile "$backup_dir/app/" 2>/dev/null || true
    cp docker-compose.yml "$backup_dir/app/" 2>/dev/null || true
    cp .env "$backup_dir/app/" 2>/dev/null || true
    cp VERSION "$backup_dir/app/" 2>/dev/null || true
    
    # Backup configuration files
    cp -r config/* "$backup_dir/config/" 2>/dev/null || true
    cp nginx.conf "$backup_dir/config/" 2>/dev/null || true
    cp -r monitoring "$backup_dir/config/" 2>/dev/null || true
    
    # Backup logs (last 7 days)
    find logs -name "*.log" -mtime -7 -exec cp {} "$backup_dir/logs/" \; 2>/dev/null || true
    
    # Backup scripts
    cp -r scripts "$backup_dir/" 2>/dev/null || true
    
    log_success "Application files backed up"
}

backup_docker_volumes() {
    local backup_dir="$1"
    
    log "Backing up Docker volumes..."
    
    mkdir -p "$backup_dir/volumes"
    
    # Get list of volumes
    local volumes=$(docker volume ls --format "{{.Name}}" | grep "central-mcp-server" || true)
    
    if [ -n "$volumes" ]; then
        for volume in $volumes; do
            log "Backing up volume: $volume"
            
            # Create volume backup
            docker run --rm \
                -v "$volume:/data:ro" \
                -v "$PWD/$backup_dir/volumes:/backup" \
                alpine tar czf "/backup/${volume}.tar.gz" -C /data .
            
            log_success "Volume $volume backed up"
        done
    else
        log_warning "No Docker volumes found to backup"
    fi
}

backup_database_dump() {
    local backup_dir="$1"
    
    log "Creating database dumps..."
    
    mkdir -p "$backup_dir/database"
    
    # Redis backup
    if docker-compose ps redis | grep -q "Up"; then
        log "Creating Redis backup..."
        
        # Create Redis dump
        docker-compose exec -T redis redis-cli BGSAVE
        sleep 5  # Wait for background save to complete
        
        # Copy dump file
        docker cp $(docker-compose ps -q redis):/data/dump.rdb "$backup_dir/database/redis-dump.rdb" 2>/dev/null || true
        
        log_success "Redis backup created"
    else
        log_warning "Redis container not running, skipping Redis backup"
    fi
    
    # If using other databases, add backup logic here
}

backup_ssl_certificates() {
    local backup_dir="$1"
    
    log "Backing up SSL certificates..."
    
    if [ -d "nginx/ssl" ]; then
        mkdir -p "$backup_dir/ssl"
        cp -r nginx/ssl/* "$backup_dir/ssl/" 2>/dev/null || true
        log_success "SSL certificates backed up"
    else
        log_warning "No SSL certificates found to backup"
    fi
}

create_backup_manifest() {
    local backup_dir="$1"
    local backup_type="$2"
    
    log "Creating backup manifest..."
    
    cat > "$backup_dir/MANIFEST.txt" << EOF
Central MCP Server Backup Manifest
==================================

Backup Type: $backup_type
Backup Date: $(date)
Backup Directory: $backup_dir
Hostname: $(hostname)
User: $(whoami)

Application Version: $(cat VERSION 2>/dev/null || echo "unknown")
Docker Compose Version: $(docker-compose --version 2>/dev/null || echo "unknown")
Docker Version: $(docker --version 2>/dev/null || echo "unknown")

Backup Contents:
$(find "$backup_dir" -type f | sort)

Backup Size:
$(du -sh "$backup_dir" | cut -f1)

Docker Containers Status at Backup Time:
$(docker-compose ps 2>/dev/null || echo "Docker Compose not available")

Docker Volumes:
$(docker volume ls --format "{{.Name}}" | grep "central-mcp-server" || echo "No volumes found")

Environment Variables (sanitized):
$(env | grep -E '^(NODE_ENV|PORT|LOG_LEVEL)=' || true)

System Information:
$(uname -a)
$(df -h . | tail -1)
EOF
    
    log_success "Backup manifest created"
}

compress_backup() {
    local backup_dir="$1"
    local compress="$2"
    
    if [ "$compress" = "true" ]; then
        log "Compressing backup..."
        
        local backup_name=$(basename "$backup_dir")
        local compressed_file="$BACKUP_BASE_DIR/${backup_name}.tar.gz"
        
        tar -czf "$compressed_file" -C "$BACKUP_BASE_DIR" "$backup_name"
        
        # Remove uncompressed directory
        rm -rf "$backup_dir"
        
        log_success "Backup compressed: $compressed_file"
        echo "$compressed_file"
    else
        echo "$backup_dir"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $MAX_BACKUPS)..."
    
    if [ -d "$BACKUP_BASE_DIR" ]; then
        # Count current backups
        local backup_count=$(ls -1 "$BACKUP_BASE_DIR" | wc -l)
        
        if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
            local to_remove=$((backup_count - MAX_BACKUPS))
            
            # Remove oldest backups
            ls -1t "$BACKUP_BASE_DIR" | tail -n "$to_remove" | while read backup; do
                log "Removing old backup: $backup"
                rm -rf "$BACKUP_BASE_DIR/$backup"
            done
            
            log_success "Removed $to_remove old backups"
        else
            log "No old backups to remove (current: $backup_count, max: $MAX_BACKUPS)"
        fi
    fi
}

verify_backup() {
    local backup_path="$1"
    
    log "Verifying backup integrity..."
    
    local verification_failed=false
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        # Verify compressed backup
        if ! tar -tzf "$backup_path" >/dev/null 2>&1; then
            log_error "Compressed backup verification failed"
            verification_failed=true
        fi
    else
        # Verify directory backup
        if [ ! -f "$backup_path/MANIFEST.txt" ]; then
            log_error "Backup manifest missing"
            verification_failed=true
        fi
        
        if [ ! -d "$backup_path/app" ]; then
            log_error "Application files missing from backup"
            verification_failed=true
        fi
    fi
    
    if [ "$verification_failed" = true ]; then
        log_error "Backup verification failed"
        return 1
    fi
    
    log_success "Backup verification passed"
}

show_backup_summary() {
    local backup_path="$1"
    local backup_type="$2"
    
    log_success "Backup completed successfully!"
    echo
    echo -e "${GREEN}=== Backup Summary ===${NC}"
    echo -e "${BLUE}Backup Type:${NC} $backup_type"
    echo -e "${BLUE}Backup Location:${NC} $backup_path"
    echo -e "${BLUE}Backup Size:${NC} $(du -sh "$backup_path" | cut -f1)"
    echo -e "${BLUE}Backup Time:${NC} $(date)"
    echo
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        echo -e "${BLUE}Backup Contents:${NC}"
        tar -tzf "$backup_path" | head -20
        if [ $(tar -tzf "$backup_path" | wc -l) -gt 20 ]; then
            echo "... and $(($(tar -tzf "$backup_path" | wc -l) - 20)) more files"
        fi
    else
        echo -e "${BLUE}Backup Contents:${NC}"
        find "$backup_path" -maxdepth 2 -type d | sort
    fi
    
    echo
    echo -e "${BLUE}Restore Command:${NC}"
    echo "  ./scripts/restore.sh \"$backup_path\""
    echo
}

# Backup functions for different types
full_backup() {
    local compress="$1"
    local backup_dir=$(create_backup_directory "full")
    
    log "Starting full backup..."
    
    backup_application_files "$backup_dir"
    backup_docker_volumes "$backup_dir"
    backup_database_dump "$backup_dir"
    backup_ssl_certificates "$backup_dir"
    create_backup_manifest "$backup_dir" "full"
    
    local final_backup_path=$(compress_backup "$backup_dir" "$compress")
    verify_backup "$final_backup_path"
    
    echo "$final_backup_path"
}

config_backup() {
    local compress="$1"
    local backup_dir=$(create_backup_directory "config")
    
    log "Starting configuration backup..."
    
    # Backup only configuration files
    mkdir -p "$backup_dir/config"
    cp -r config/* "$backup_dir/config/" 2>/dev/null || true
    cp .env "$backup_dir/" 2>/dev/null || true
    cp docker-compose.yml "$backup_dir/" 2>/dev/null || true
    cp nginx.conf "$backup_dir/" 2>/dev/null || true
    cp -r monitoring "$backup_dir/config/" 2>/dev/null || true
    
    backup_ssl_certificates "$backup_dir"
    create_backup_manifest "$backup_dir" "config"
    
    local final_backup_path=$(compress_backup "$backup_dir" "$compress")
    verify_backup "$final_backup_path"
    
    echo "$final_backup_path"
}

data_backup() {
    local compress="$1"
    local backup_dir=$(create_backup_directory "data")
    
    log "Starting data backup..."
    
    backup_docker_volumes "$backup_dir"
    backup_database_dump "$backup_dir"
    
    # Backup logs
    mkdir -p "$backup_dir/logs"
    cp -r logs/* "$backup_dir/logs/" 2>/dev/null || true
    
    create_backup_manifest "$backup_dir" "data"
    
    local final_backup_path=$(compress_backup "$backup_dir" "$compress")
    verify_backup "$final_backup_path"
    
    echo "$final_backup_path"
}

# Main backup process
main() {
    local backup_type="${1:-full}"
    local compress="${2:-true}"
    
    log "Starting $backup_type backup of $APP_NAME"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$BACKUP_BASE_DIR"
    
    check_prerequisites
    
    local backup_path
    case "$backup_type" in
        "full")
            backup_path=$(full_backup "$compress")
            ;;
        "config")
            backup_path=$(config_backup "$compress")
            ;;
        "data")
            backup_path=$(data_backup "$compress")
            ;;
        *)
            log_error "Unknown backup type: $backup_type"
            exit 1
            ;;
    esac
    
    cleanup_old_backups
    show_backup_summary "$backup_path" "$backup_type"
    
    log_success "Backup process completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "--help" | "-h")
        echo "Usage: $0 [backup_type] [options]"
        echo
        echo "Backup Types:"
        echo "  full     Complete backup (default)"
        echo "  config   Configuration files only"
        echo "  data     Data and logs only"
        echo
        echo "Options:"
        echo "  --no-compress    Don't compress the backup"
        echo "  --list          List existing backups"
        echo "  --cleanup       Clean up old backups only"
        echo "  --help, -h      Show this help message"
        exit 0
        ;;
    "--list")
        echo "Existing backups:"
        if [ -d "$BACKUP_BASE_DIR" ]; then
            ls -la "$BACKUP_BASE_DIR"
        else
            echo "No backups found"
        fi
        exit 0
        ;;
    "--cleanup")
        cleanup_old_backups
        exit 0
        ;;
esac

# Parse arguments
backup_type="${1:-full}"
compress="true"

if [ "$2" = "--no-compress" ] || [ "$3" = "--no-compress" ]; then
    compress="false"
fi

# Run main backup
main "$backup_type" "$compress"