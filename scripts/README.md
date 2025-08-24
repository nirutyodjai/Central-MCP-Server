# Central MCP Server Scripts

This directory contains various scripts to help you deploy, manage, and maintain the Central MCP Server.

## Available Scripts

### Deployment Scripts

#### `deploy.sh` (Linux/macOS)
Automated deployment script for Unix-based systems.

```bash
# Basic deployment
./scripts/deploy.sh

# Show help
./scripts/deploy.sh --help

# Create backup only
./scripts/deploy.sh --backup-only

# Deploy without creating backup
./scripts/deploy.sh --no-backup
```

**Features:**
- Prerequisites checking (Docker, Docker Compose)
- Automatic .env file generation with random secrets
- SSL certificate generation
- Service deployment and health checking
- Backup creation and cleanup
- Comprehensive logging

#### `deploy.ps1` (Windows)
PowerShell deployment script for Windows systems.

```powershell
# Basic deployment
.\scripts\deploy.ps1

# Show help
.\scripts\deploy.ps1 -Help

# Create backup only
.\scripts\deploy.ps1 -BackupOnly

# Deploy without creating backup
.\scripts\deploy.ps1 -NoBackup
```

### Update Scripts

#### `update.sh` (Linux/macOS)
Handles updates for the Central MCP Server with automatic rollback on failure.

```bash
# Update to latest version
./scripts/update.sh

# Check current and available versions
./scripts/update.sh --check-version

# Force update even if versions are the same
./scripts/update.sh --force

# Rollback to last backup
./scripts/update.sh --rollback
```

**Features:**
- Git-based updates
- Automatic backup before update
- Health checks after update
- Automatic rollback on failure
- Docker image updates
- Service restart with verification

### Backup Scripts

#### `backup.sh` (Linux/macOS)
Comprehensive backup solution for all server components.

```bash
# Full backup (default)
./scripts/backup.sh

# Configuration backup only
./scripts/backup.sh config

# Data backup only
./scripts/backup.sh data

# Backup without compression
./scripts/backup.sh full --no-compress

# List existing backups
./scripts/backup.sh --list

# Clean up old backups
./scripts/backup.sh --cleanup
```

**Backup Types:**
- **Full**: Complete backup including application files, configuration, data, logs, and SSL certificates
- **Config**: Configuration files, environment settings, and SSL certificates only
- **Data**: Docker volumes, database dumps, and logs only

**Features:**
- Docker volume backup
- Database dumps (Redis)
- SSL certificate backup
- Automatic compression
- Backup verification
- Old backup cleanup
- Detailed manifest creation

### Restore Scripts

#### `restore.sh` (Linux/macOS)
Restore from backups created by the backup script.

```bash
# Restore from backup
./scripts/restore.sh ./backups/full-20240101-120000.tar.gz

# Force restore without confirmation
./scripts/restore.sh ./backups/config-20240101-120000 --force

# List available backups
./scripts/restore.sh --list
```

**Features:**
- Backup validation and verification
- Pre-restore backup creation
- Service management during restore
- Automatic rollback on failure
- Health checks after restore
- Support for all backup types

## Prerequisites

Before using these scripts, ensure you have:

### For Linux/macOS Scripts
- Docker and Docker Compose installed
- Bash shell
- `curl` command available
- `openssl` for SSL certificate generation
- `git` for updates (optional)

### For Windows Scripts
- Docker Desktop installed and running
- PowerShell 5.0 or later
- Internet connection for Docker image downloads

## Script Permissions

Make sure the scripts have execute permissions:

```bash
# Linux/macOS
chmod +x scripts/*.sh
```

For Windows, you may need to adjust the PowerShell execution policy:

```powershell
# Allow local scripts to run
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Configuration

### Environment Variables

The deployment scripts will create a `.env` file with random passwords. **Important security note**: Change these default passwords before production use!

Key environment variables:
- `JWT_SECRET`: Secret key for JWT token generation
- `SERVER_TOKEN`: Authentication token for server registration
- `REDIS_PASSWORD`: Redis database password
- `GRAFANA_PASSWORD`: Grafana admin password
- `VAULT_ROOT_TOKEN`: HashiCorp Vault root token (if enabled)

### Backup Configuration

Backup settings can be modified in the scripts:
- `MAX_BACKUPS`: Number of backups to keep (default: 10)
- `BACKUP_BASE_DIR`: Directory for storing backups (default: ./backups)
- `COMPRESSION_LEVEL`: Compression level for backups (default: 6)

## Logging

All scripts create detailed logs:
- Deployment: `./logs/deployment.log`
- Updates: `./logs/update.log`
- Backups: `./logs/backup.log`
- Restores: `./logs/restore.log`

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Linux/macOS
   sudo systemctl start docker
   
   # Windows
   # Start Docker Desktop application
   ```

2. **Permission denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

3. **Port conflicts**
   - Check if ports 3000, 9090, 3001 are already in use
   - Modify `docker-compose.yml` to use different ports if needed

4. **SSL certificate issues**
   - Scripts generate self-signed certificates for development
   - For production, replace with proper SSL certificates

5. **Backup/Restore failures**
   - Check disk space availability
   - Ensure Docker volumes exist
   - Verify backup file integrity

### Debug Mode

For detailed debugging, you can:

1. **Enable verbose logging**:
   ```bash
   # Add debug flag to scripts
   bash -x ./scripts/deploy.sh
   ```

2. **Check Docker logs**:
   ```bash
   docker-compose logs -f
   ```

3. **Monitor system resources**:
   ```bash
   # Check disk space
   df -h
   
   # Check memory usage
   free -h
   
   # Check running containers
   docker ps
   ```

## Best Practices

1. **Regular Backups**
   - Schedule daily backups using cron (Linux/macOS) or Task Scheduler (Windows)
   - Test restore procedures regularly
   - Store backups in multiple locations

2. **Security**
   - Change default passwords immediately after deployment
   - Use proper SSL certificates in production
   - Regularly update the system and Docker images
   - Monitor logs for suspicious activity

3. **Monitoring**
   - Set up alerts for service failures
   - Monitor disk space and system resources
   - Review logs regularly

4. **Updates**
   - Test updates in a staging environment first
   - Always backup before updating
   - Monitor services after updates

## Automation

### Cron Jobs (Linux/macOS)

Example crontab entries:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/central-mcp-server/scripts/backup.sh full

# Weekly cleanup at 3 AM on Sundays
0 3 * * 0 /path/to/central-mcp-server/scripts/backup.sh --cleanup

# Check for updates daily at 4 AM
0 4 * * * /path/to/central-mcp-server/scripts/update.sh --check-version
```

### Task Scheduler (Windows)

Create scheduled tasks for:
- Daily backups
- Weekly cleanup
- Update checks

## Support

If you encounter issues with these scripts:

1. Check the logs in the `./logs/` directory
2. Verify all prerequisites are installed
3. Ensure Docker is running and accessible
4. Check the GitHub repository for updates and known issues
5. Review the troubleshooting section above

For additional help, refer to:
- [Installation Guide](../INSTALLATION.md)
- [User Guide](../USER_GUIDE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [API Documentation](../API.md)