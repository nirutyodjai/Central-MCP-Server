# Bootstrap script for Central MCP Server
# - Ensures central-mcp-config.json has required keys
# - Generates server token and JWT secret if missing
# - Sets persistent environment variables (setx) and current session vars

$cfgPath = Join-Path $PSScriptRoot 'central-mcp-config.json'
if (Test-Path $cfgPath) {
  $raw = Get-Content $cfgPath -Raw
  try {
    $cfg = $raw | ConvertFrom-Json -ErrorAction Stop
    # convert to hashtable for mutability
    $cfg = @{}
    $j = $raw | ConvertFrom-Json
    foreach ($p in $j.psobject.properties) { $cfg[$p.Name] = $p.Value }
  } catch {
    $cfg = @{}
  }
} else {
  $cfg = @{}
}

if (-not $cfg.ContainsKey('centralMcpServerUrl')) { $cfg['centralMcpServerUrl'] = 'http://localhost:5050' }
if (-not $cfg.ContainsKey('centralMcpServerToken')) { $cfg['centralMcpServerToken'] = [guid]::NewGuid().ToString() }
if (-not $cfg.ContainsKey('centralMcpJwtSecret')) { $cfg['centralMcpJwtSecret'] = [guid]::NewGuid().ToString('N') }
if (-not $cfg.ContainsKey('secrets')) { $cfg['secrets'] = @{} }

# write back
$cfg | ConvertTo-Json -Depth 10 | Out-File -FilePath $cfgPath -Encoding UTF8

Write-Output "Updated config at: $cfgPath"
Write-Output "centralMcpServerUrl: $($cfg.centralMcpServerUrl)"
Write-Output "centralMcpServerToken: $($cfg.centralMcpServerToken)"
Write-Output "centralMcpJwtSecret: $($cfg.centralMcpJwtSecret)"

# set persistent environment variables
setx CENTRAL_MCP_SERVER_URL "$($cfg.centralMcpServerUrl)" | Out-Null
setx CENTRAL_MCP_SERVER_TOKEN "$($cfg.centralMcpServerToken)" | Out-Null
setx CENTRAL_MCP_CLIENT_TOKEN "$($cfg.centralMcpServerToken)" | Out-Null
setx CENTRAL_MCP_JWT_SECRET "$($cfg.centralMcpJwtSecret)" | Out-Null

# set for current session
$env:CENTRAL_MCP_SERVER_URL = $cfg.centralMcpServerUrl
$env:CENTRAL_MCP_SERVER_TOKEN = $cfg.centralMcpServerToken
$env:CENTRAL_MCP_CLIENT_TOKEN = $cfg.centralMcpServerToken
$env:CENTRAL_MCP_JWT_SECRET = $cfg.centralMcpJwtSecret

Write-Output "Environment variables set (session + persisted)."
Write-Output "You may need to re-open terminals to see persisted env vars in new shells."
