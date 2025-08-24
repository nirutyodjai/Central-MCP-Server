# Central MCP Server

This repo provides a minimal Central MCP Server and a tiny Node client to read shared config/context.

## Quick start

1. Prepare local config (optional): create `C:/central-mcp-config.json` with keys like `centralMcpServerUrl` and optionally `centralMcpServerToken` and `secrets`.

2. Install dependencies and start the server:

```powershell
cd "C:\Central MCP Server"
npm install
node server.js
```

3. Example: set environment token for clients and server

```powershell
setx CENTRAL_MCP_SERVER_URL "http://localhost:5050"
setx CENTRAL_MCP_SERVER_TOKEN "your-shared-token"
setx CENTRAL_MCP_CLIENT_TOKEN "your-shared-token"
```

## Node client usage

```js
const MCPClient = require("./client/node/mcp-client");
const client = new MCPClient();

(async () => {
  const cfg = await client.getAll();
  console.log(cfg);
  const secret = await client.get("mySecretKey");
  console.log(secret);
})();
```

## Security note

For production, use a secure secret store (Vault/KeyVault/Secrets Manager), TLS, and short-lived tokens. This example is for local/offline development and demos.
