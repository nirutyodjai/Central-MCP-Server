const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 5050;

const path = require("path");
app.use(helmet());
app.use(morgan("combined"));
app.use(cors());
app.use(express.json());

let sharedContext = {};

// PID file for process management
const PID_FILE = path.join(__dirname, "server.pid");

// Server token used to protect write/secret endpoints. Can be set via env or in local config file.
// Use a reloadable variable so the server can recover if the config was fixed while running.
let SERVER_TOKEN = process.env.CENTRAL_MCP_SERVER_TOKEN || null;

// JWT secret for signing short-lived access tokens (reloadable)
let JWT_SECRET = process.env.CENTRAL_MCP_JWT_SECRET || null;
function reloadJwtSecret() {
  if (process.env.CENTRAL_MCP_JWT_SECRET) {
    JWT_SECRET = process.env.CENTRAL_MCP_JWT_SECRET;
    try {
      fs.appendFileSync(
        path.join(__dirname, "auth-debug.log"),
        `reloadJwtSecret: loaded from ENV\n`
      );
    } catch {
      // ignore
    }
    return JWT_SECRET;
  }
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPath = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    JWT_SECRET = cfg.centralMcpJwtSecret || "dev-jwt-secret";
    try {
      fs.appendFileSync(
        path.join(__dirname, "auth-debug.log"),
        `reloadJwtSecret: secret present=${!!JWT_SECRET}\n`
      );
    } catch {
      // ignore
    }
  } catch (e) {
    try {
      fs.appendFileSync(
        path.join(__dirname, "auth-debug.log"),
        `reloadJwtSecret: error ${e && e.message}\n`
      );
    } catch {
      // ignore
    }
    JWT_SECRET = "dev-jwt-secret";
  }
  return JWT_SECRET;
}

// Optional Vault configuration (KV v2)
const VAULT_ADDR = process.env.VAULT_ADDR || null;
const VAULT_TOKEN = process.env.VAULT_TOKEN || null;
const VAULT_MOUNT = process.env.VAULT_MOUNT || "secret";
const vaultEnabled = !!(VAULT_ADDR && VAULT_TOKEN);

async function getSecretFromVault(name) {
  if (!vaultEnabled) return null;
  try {
    const base = VAULT_ADDR.replace(/\/$/, "");
    const url = `${base}/v1/${VAULT_MOUNT}/data/${encodeURIComponent(name)}`;
    const resp = await axios.get(url, {
      headers: { "X-Vault-Token": VAULT_TOKEN },
      timeout: 5000,
    });
    if (resp.data && resp.data.data && resp.data.data.data) {
      const data = resp.data.data.data;
      if (data.value) return data.value;
      const keys = Object.keys(data);
      if (keys.length) return data[keys[0]];
    }
  } catch (e) {
    console.error("Vault read failed for", name, e.message || e);
  }
  return null;
}

function requireAuth(req, res, next) {
  // Read token from env or file on every request to avoid stale in-memory state
  reloadJwtSecret();
  let cfgToken = process.env.CENTRAL_MCP_SERVER_TOKEN || null;
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    console.log(
      "requireAuth: checking cfgPathLocal=",
      cfgPathLocal,
      "exists=",
      fs.existsSync(cfgPathLocal)
    );
    const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
    console.log("requireAuth: cfg keys=", Object.keys(cfg));
    console.log(
      "requireAuth: cfg.centralMcpServerToken present=",
      !!cfg.centralMcpServerToken
    );
    cfgToken = cfg.centralMcpServerToken || cfgToken;
  } catch {
    // ignore and fall back to env
  }
  if (!cfgToken)
    return res.status(503).json({ error: "Server token not configured" });
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = auth.slice(7);
  // Accept either the static server token or a valid JWT
  if (token === cfgToken) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET || "dev-jwt-secret");
    req.jwt = payload;
    return next();
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
}

// Issue short-lived JWTs when client presents the server token
app.post("/token", (req, res) => {
  // Reload secret and read current server token from env or config on-demand
  reloadJwtSecret();
  let currentToken = process.env.CENTRAL_MCP_SERVER_TOKEN || null;
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
    currentToken = cfg.centralMcpServerToken || currentToken;
  } catch {
    // ignore
  }
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = auth.slice(7);
  if (!currentToken)
    return res.status(503).json({ error: "Server token not configured" });
  if (token !== currentToken)
    return res.status(403).json({ error: "Forbidden" });

  const accessToken = jwt.sign(
    { iss: "central-mcp" },
    JWT_SECRET || "dev-jwt-secret",
    {
      expiresIn: "15m",
    }
  );
  res.json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 900,
  });
});

app.get("/context", (req, res) => {
  res.json(sharedContext);
});

// Lightweight health endpoint (no secrets)
app.get("/health", (req, res) => {
  try {
    // reload token presence
    const tokenPresent = !!(
      process.env.CENTRAL_MCP_SERVER_TOKEN ||
      (() => {
        try {
          const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
          const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
            ? "C:/central-mcp-config.json"
            : workspaceCfg;
          const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
          return cfg.centralMcpServerToken;
        } catch {
          return null;
        }
      })()
    );
    res.json({
      status: "ok",
      uptime: process.uptime(),
      tokenConfigured: !!tokenPresent,
      vaultEnabled: !!(VAULT_ADDR && VAULT_TOKEN),
    });
  } catch (e) {
    res.status(500).json({ status: "error", details: e && e.message });
  }
});

// Protected: only clients with correct token can update context
app.post("/context", requireAuth, (req, res) => {
  sharedContext = { ...sharedContext, ...req.body };
  res.json({ status: "ok", sharedContext });
});

// Protected secrets endpoint: returns a named secret from local config (or 404)
app.get("/secrets/:name", requireAuth, async (req, res) => {
  try {
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
    const name = req.params.name;
    // support cfg.secrets.{name} or top-level key
    if (
      cfg.secrets &&
      Object.prototype.hasOwnProperty.call(cfg.secrets, name)
    ) {
      return res.json({ name, value: cfg.secrets[name] });
    }
    if (Object.prototype.hasOwnProperty.call(cfg, name))
      return res.json({ name, value: cfg[name] });
    // try Vault if available
    const v = await getSecretFromVault(name);
    if (v) return res.json({ name, value: v, source: "vault" });
    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Failed to read config", details: e.message });
  }
});

app.get("/", (req, res) => {
  res.send("Central MCP Server is running.");
});

// Status endpoint: returns runtime info useful for monitoring
app.get("/status", (req, res) => {
  try {
    const info = {
      pid: process.pid,
      uptime: process.uptime(),
      node: process.version,
      memory: process.memoryUsage(),
      startTime: new Date(
        Date.now() - Math.floor(process.uptime() * 1000)
      ).toISOString(),
      configPath: fs.existsSync(path.join(__dirname, "central-mcp-config.json"))
        ? path.join(__dirname, "central-mcp-config.json")
        : fs.existsSync("C:/central-mcp-config.json")
        ? "C:/central-mcp-config.json"
        : null,
    };
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: "failed", details: e.message });
  }
});

app.listen(port, () => {
  console.log(`Central MCP Server listening at http://localhost:${port}`);
  try {
    // show diagnostic info at startup
    const workspaceCfg = path.join(__dirname, "central-mcp-config.json");
    const cfgPathLocal = fs.existsSync("C:/central-mcp-config.json")
      ? "C:/central-mcp-config.json"
      : workspaceCfg;
    console.log("startup: __dirname=", __dirname);
    console.log(
      "startup: cfgPathLocal=",
      cfgPathLocal,
      "exists=",
      fs.existsSync(cfgPathLocal)
    );
    // try to read token at startup
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPathLocal, "utf8"));
      console.log("startup: cfg keys=", Object.keys(cfg));
      console.log(
        "startup: server token present=",
        !!cfg.centralMcpServerToken
      );
    } catch (e) {
      console.log("startup: unable to read cfg at startup", e && e.message);
    }
  } catch (e) {
    console.error("startup diag failed", e && e.message);
  }
  if (SERVER_TOKEN) console.log("Auth token configured.");
  // write pid file so external tooling can find/stop this process
  try {
    fs.writeFileSync(PID_FILE, String(process.pid), { encoding: "utf8" });
    console.log("wrote pid to", PID_FILE);
  } catch (e) {
    console.error("failed to write pid file", e && e.message);
  }
  // graceful shutdown handlers
  function cleanupAndExit(code) {
    try {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch {
      // ignore
    }
    console.log("shutting down", code || 0);
    process.exit(code || 0);
  }
  process.on("SIGINT", () => cleanupAndExit(0));
  process.on("SIGTERM", () => cleanupAndExit(0));
});

module.exports = app;
