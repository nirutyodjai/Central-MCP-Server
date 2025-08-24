#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

function loadConfig() {
  const cfg = {};
  if (process.env.CENTRAL_MCP_SERVER_URL)
    cfg.centralMcpServerUrl = process.env.CENTRAL_MCP_SERVER_URL;
  if (process.env.CENTRAL_MCP_SERVER_TOKEN)
    cfg.centralMcpServerToken = process.env.CENTRAL_MCP_SERVER_TOKEN;
  if (process.env.CENTRAL_MCP_JWT_SECRET)
    cfg.centralMcpJwtSecret = process.env.CENTRAL_MCP_JWT_SECRET;

  const candidates = [
    "C:/central-mcp-config.json",
    path.join(process.cwd(), "central-mcp-config.json"),
  ];
  for (const c of candidates) {
    if (fileExists(c)) {
      try {
        const raw = fs.readFileSync(c, "utf8");
        const parsed = JSON.parse(raw);
        // merge without overwriting env values
        if (!cfg.centralMcpServerUrl && parsed.centralMcpServerUrl)
          cfg.centralMcpServerUrl = parsed.centralMcpServerUrl;
        if (!cfg.centralMcpServerToken && parsed.centralMcpServerToken)
          cfg.centralMcpServerToken = parsed.centralMcpServerToken;
        if (!cfg.centralMcpJwtSecret && parsed.centralMcpJwtSecret)
          cfg.centralMcpJwtSecret = parsed.centralMcpJwtSecret;
        if (!cfg.secrets && parsed.secrets) cfg.secrets = parsed.secrets;
      } catch (e) {
        console.error("failed to read/parse", c, e && e.message);
      }
      break;
    }
  }
  return cfg;
}

function httpRequest(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + (u.search || ""),
        method: opts.method || "GET",
        headers: opts.headers || {},
        timeout: opts.timeout || 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d.toString()));
        res.on("end", () => {
          res.body = data;
          resolve(res);
        });
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function requestJwt(serverUrl, serverToken) {
  if (!serverUrl) throw new Error("serverUrl empty");
  if (!serverToken) throw new Error("serverToken empty");
  const url = serverUrl.replace(/\/+$/, "") + "/token";
  const res = await httpRequest(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + serverToken },
  });
  if (res.statusCode !== 200)
    throw new Error(`token request failed ${res.statusCode}: ${res.body}`);
  const parsed = JSON.parse(res.body);
  if (!parsed.access_token) throw new Error("no access_token in response");
  return parsed.access_token;
}

async function getSecret(serverUrl, jwt, name) {
  const url =
    serverUrl.replace(/\/+$/, "") + "/secrets/" + encodeURIComponent(name);
  const res = await httpRequest(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + jwt },
  });
  if (res.statusCode !== 200)
    throw new Error(`secret request failed ${res.statusCode}: ${res.body}`);
  const parsed = JSON.parse(res.body);
  return parsed.value;
}

(async function main() {
  const cfg = loadConfig();
  const secretName = process.argv[2] || "mySecretKey";

  if (!cfg.centralMcpServerUrl) {
    console.error(
      "no server URL configured. set CENTRAL_MCP_SERVER_URL or place central-mcp-config.json"
    );
    process.exit(2);
  }

  if (!cfg.centralMcpServerToken) {
    console.error(
      "no server token configured. set CENTRAL_MCP_SERVER_TOKEN or place central-mcp-config.json"
    );
    process.exit(2);
  }

  try {
    const jwt = await requestJwt(
      cfg.centralMcpServerUrl,
      cfg.centralMcpServerToken
    );
    // console.log('jwt', jwt);
    const val = await getSecret(cfg.centralMcpServerUrl, jwt, secretName);
    console.log(val);
  } catch (e) {
    console.error("failed:", e && e.message);
    process.exit(1);
  }
})();
