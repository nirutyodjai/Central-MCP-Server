# Central MCP Server Deployment Script for Windows
# This script automates the deployment process for production environments on Windows

param(
    [switch]$Help,
    [switch]$BackupOnly,
    [switch]$NoBackup
)

# Configuration
$AppName = "Central MCP Server"
$DockerComposeFile = "docker-compose.yml"
$EnvFile = ".env"
$BackupDir = "./backups"
$LogFile = "./logs/deployment.log"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Cyan"
    White = "White"
}

# Functions
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage -ForegroundColor $Colors[$Color]
    Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
}

function Write-Success {
    param([string]$Message)
    Write-Log "✓ $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-Log "⚠ $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-Log "✗ $Message" "Red"
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..." "Blue"
    
    # Check if Docker is installed
    try {
        $dockerVersion = docker --version
        Write-Log "Docker found: $dockerVersion"
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    # Check if Docker Compose is installed
    try {
        $composeVersion = docker-compose --version
        Write-Log "Docker Compose found: $composeVersion"
    }
    catch {
        Write-Error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    # Check if Docker is running
    try {
        docker info | Out-Null
    }
    catch {
        Write-Error "Docker is not running. Please start Docker Desktop first."
        exit 1
    }
    
    # Check if .env file exists
    if (-not (Test-Path $EnvFile)) {
        Write-Warning ".env file not found. Creating from template..."
        New-EnvFile
    }
    
    Write-Success "Prerequisites check completed"
}

function New-EnvFile {
    Write-Log "Creating .env file from template..." "Blue"
    
    # Generate random secrets
    $jwtSecret = "your-super-secret-jwt-key-change-this-" + [System.Web.Security.Membership]::GeneratePassword(32, 0)
    $serverToken = "your-server-token-change-this-" + [System.Web.Security.Membership]::GeneratePassword(16, 0)
    $redisPassword = "redis-password-change-this-" + [System.Web.Security.Membership]::GeneratePassword(16, 0)
    $grafanaPassword = "admin-change-this-" + [System.Web.Security.Membership]::GeneratePassword(12, 0)
    $vaultToken = "root-token-change-this-" + [System.Web.Security.Membership]::GeneratePassword(16, 0)
    
    $envContent = @"
# Central MCP Server Environment Configuration
# IMPORTANT: Change all default passwords and secrets before production deployment!

# Application Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Security Settings (CHANGE THESE!)
JWT_SECRET=$jwtSecret
SERVER_TOKEN=$serverToken

# Redis Settings
REDIS_PASSWORD=$redisPassword

# Monitoring Settings
GRAFANA_USER=admin
GRAFANA_PASSWORD=$grafanaPassword

# Vault Settings (Optional)
VAULT_ENABLED=false
VAULT_URL=http://vault:8200
VAULT_ROOT_TOKEN=$vaultToken

# Health Check Settings
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_DAYS=7

# CORS Settings
ENABLE_CORS=true

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
"@
    
    Set-Content -Path $EnvFile -Value $envContent
    Write-Success ".env file created with random passwords"
    Write-Warning "Please review and update the .env file with your specific configuration"
}

function New-Directories {
    Write-Log "Creating necessary directories..." "Blue"
    
    $directories = @(
        "logs",
        "config",
        "temp",
        "nginx/ssl",
        "monitoring/grafana/provisioning",
        $BackupDir
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-Success "Directories created"
}

function New-SSLCertificates {
    Write-Log "Generating self-signed SSL certificates..." "Blue"
    
    if (-not (Test-Path "nginx/ssl/cert.pem") -or -not (Test-Path "nginx/ssl/key.pem")) {
        try {
            # Use OpenSSL if available, otherwise use PowerShell certificate creation
            if (Get-Command openssl -ErrorAction SilentlyContinue) {
                openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
                    -keyout nginx/ssl/key.pem `
                    -out nginx/ssl/cert.pem `
                    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
            }
            else {
                # Create self-signed certificate using PowerShell
                $cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\LocalMachine\My"
                $certPath = "nginx/ssl/cert.pem"
                $keyPath = "nginx/ssl/key.pem"
                
                # Export certificate
                Export-Certificate -Cert $cert -FilePath $certPath -Type CERT
                
                Write-Warning "SSL certificate created using PowerShell. For production, use proper SSL certificates from a CA."
            }
            
            Write-Success "SSL certificates generated"
        }
        catch {
            Write-Warning "Failed to generate SSL certificates. You may need to create them manually."
        }
    }
    else {
        Write-Log "SSL certificates already exist"
    }
}

function New-MonitoringConfig {
    Write-Log "Creating monitoring configuration..." "Blue"
    
    # Create monitoring directory
    if (-not (Test-Path "monitoring")) {
        New-Item -ItemType Directory -Path "monitoring" -Force | Out-Null
    }
    
    # Prometheus configuration
    $prometheusConfig = @"
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
"@
    
    Set-Content -Path "monitoring/prometheus.yml" -Value $prometheusConfig
    Write-Success "Monitoring configuration created"
}

function Backup-ExistingDeployment {
    if ((Test-Path "logs") -and (Get-ChildItem "logs" -ErrorAction SilentlyContinue)) {
        Write-Log "Creating backup of existing deployment..." "Blue"
        
        $backupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        $backupPath = "$BackupDir/$backupName"
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        # Backup logs and config
        if (Test-Path "logs") { Copy-Item -Path "logs" -Destination $backupPath -Recurse -ErrorAction SilentlyContinue }
        if (Test-Path "config") { Copy-Item -Path "config" -Destination $backupPath -Recurse -ErrorAction SilentlyContinue }
        if (Test-Path $EnvFile) { Copy-Item -Path $EnvFile -Destination $backupPath -ErrorAction SilentlyContinue }
        
        Write-Success "Backup created: $backupPath"
    }
}

function Start-BuildAndDeploy {
    Write-Log "Building and deploying $AppName..." "Blue"
    
    # Pull latest images
    Write-Log "Pulling latest Docker images..."
    docker-compose pull
    
    # Build the application
    Write-Log "Building application image..."
    docker-compose build --no-cache
    
    # Stop existing containers
    Write-Log "Stopping existing containers..."
    docker-compose down
    
    # Start services
    Write-Log "Starting services..."
    docker-compose up -d
    
    Write-Success "Deployment completed"
}

function Wait-ForServices {
    Write-Log "Waiting for services to be ready..." "Blue"
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "Central MCP Server is ready"
                break
            }
        }
        catch {
            Write-Log "Waiting for Central MCP Server... (attempt $attempt/$maxAttempts)"
            Start-Sleep -Seconds 10
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Error "Central MCP Server failed to start within expected time"
        return $false
    }
    
    # Check other services
    Start-Sleep -Seconds 5
    
    try {
        Invoke-WebRequest -Uri "http://localhost:9090" -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Success "Prometheus is ready"
    }
    catch {
        Write-Warning "Prometheus may not be ready yet"
    }
    
    try {
        Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Success "Grafana is ready"
    }
    catch {
        Write-Warning "Grafana may not be ready yet"
    }
    
    return $true
}

function Show-DeploymentInfo {
    Write-Success "Deployment completed successfully!"
    Write-Host ""
    Write-Host "=== Central MCP Server Deployment Information ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URLs:" -ForegroundColor Cyan
    Write-Host "  • Main Application: https://localhost (HTTP redirects to HTTPS)"
    Write-Host "  • Health Check: http://localhost/health"
    Write-Host "  • API Documentation: https://localhost/api-docs"
    Write-Host ""
    Write-Host "Monitoring URLs:" -ForegroundColor Cyan
    Write-Host "  • Prometheus: http://localhost:9090"
    Write-Host "  • Grafana: http://localhost:3001"
    Write-Host ""
    Write-Host "Default Credentials:" -ForegroundColor Cyan
    if (Test-Path $EnvFile) {
        $grafanaPass = (Get-Content $EnvFile | Where-Object { $_ -match "GRAFANA_PASSWORD=" }) -replace "GRAFANA_PASSWORD=", ""
        Write-Host "  • Grafana: admin / $grafanaPass"
    }
    Write-Host ""
    Write-Host "Important Files:" -ForegroundColor Cyan
    Write-Host "  • Environment: $EnvFile"
    Write-Host "  • Logs: ./logs/"
    Write-Host "  • Backups: $BackupDir/"
    Write-Host ""
    Write-Host "Security Notes:" -ForegroundColor Yellow
    Write-Host "  • Change default passwords in $EnvFile"
    Write-Host "  • Replace self-signed SSL certificates for production"
    Write-Host "  • Review firewall settings"
    Write-Host "  • Configure proper DNS for your domain"
    Write-Host ""
    Write-Host "Management Commands:" -ForegroundColor Cyan
    Write-Host "  • View logs: docker-compose logs -f"
    Write-Host "  • Stop services: docker-compose down"
    Write-Host "  • Restart services: docker-compose restart"
    Write-Host "  • Update: .\scripts\update.ps1"
    Write-Host ""
}

function Remove-OldBackups {
    Write-Log "Cleaning up old backups (keeping last 5)..." "Blue"
    
    if (Test-Path $BackupDir) {
        $backups = Get-ChildItem -Path $BackupDir | Sort-Object CreationTime -Descending
        if ($backups.Count -gt 5) {
            $backupsToRemove = $backups | Select-Object -Skip 5
            foreach ($backup in $backupsToRemove) {
                Remove-Item -Path $backup.FullName -Recurse -Force
            }
            Write-Success "Old backups cleaned up"
        }
    }
}

# Main deployment process
function Start-Deployment {
    Write-Log "Starting deployment of $AppName" "Blue"
    
    # Create log directory if it doesn't exist
    $logDir = Split-Path -Path $LogFile -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Test-Prerequisites
    New-Directories
    New-SSLCertificates
    New-MonitoringConfig
    
    if (-not $NoBackup) {
        Backup-ExistingDeployment
    }
    
    if (-not $BackupOnly) {
        Start-BuildAndDeploy
        if (Wait-ForServices) {
            Remove-OldBackups
            Show-DeploymentInfo
        }
        else {
            Write-Error "Deployment failed - services did not start properly"
            exit 1
        }
    }
    
    Write-Success "Deployment process completed successfully!"
}

# Handle script arguments
if ($Help) {
    Write-Host "Usage: .\deploy.ps1 [options]"
    Write-Host "Options:"
    Write-Host "  -Help           Show this help message"
    Write-Host "  -BackupOnly     Only create backup, don't deploy"
    Write-Host "  -NoBackup       Skip backup creation"
    exit 0
}

# Add System.Web assembly for password generation
Add-Type -AssemblyName System.Web

# Run main deployment
Start-Deployment