const axios = require("axios");
const fs = require("fs");

class MCPClient {
  constructor(options = {}) {
    this.url = options.url || process.env.CENTRAL_MCP_SERVER_URL || null;
    this.token = options.token || process.env.CENTRAL_MCP_CLIENT_TOKEN || null;
    this.cacheTtl = options.cacheTtl || 30000; // ms
    this._cache = { data: null, ts: 0 };
  }

  _now() {
    return Date.now();
  }

  async _fetchRemote() {
    if (!this.url) throw new Error("MCP URL not configured");
    const headers = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const resp = await axios.get(`${this.url.replace(/\/$/, "")}/context`, {
      headers,
      timeout: 5000,
    });
    return resp.data;
  }

  _readLocal() {
    try {
      const content = fs.readFileSync("C:/central-mcp-config.json", "utf8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async getAll() {
    // use cache
    if (this._cache.data && this._now() - this._cache.ts < this.cacheTtl)
      return this._cache.data;

    // 1) env vars -> build object of any CENTRAL_* envs
    const envObj = {};
    Object.keys(process.env).forEach((k) => {
      if (k.startsWith("CENTRAL_")) envObj[k.toLowerCase()] = process.env[k];
    });
    if (Object.keys(envObj).length) {
      this._cache = { data: envObj, ts: this._now() };
      return envObj;
    }

    // 2) local file
    const local = this._readLocal();
    if (local) {
      this._cache = { data: local, ts: this._now() };
      return local;
    }

    // 3) remote
    try {
      const remote = await this._fetchRemote();
      this._cache = { data: remote, ts: this._now() };
      return remote;
    } catch (e) {
      throw new Error(
        "Failed to load config from env/local/remote: " + e.message
      );
    }
  }

  async get(key) {
    const all = await this.getAll();
    return all ? all[key] : undefined;
  }

  async getSecret(name) {
    // 1) direct env checks
    if (process.env[name]) return process.env[name];
    const up = name.toUpperCase();
    if (process.env[up]) return process.env[up];

    // 2) local file
    try {
      const content = fs.readFileSync("C:/central-mcp-config.json", "utf8");
      const cfg = JSON.parse(content);
      if (
        cfg.secrets &&
        Object.prototype.hasOwnProperty.call(cfg.secrets, name)
      )
        return cfg.secrets[name];
      if (Object.prototype.hasOwnProperty.call(cfg, name)) return cfg[name];
    } catch {
      // try workspace file
      try {
        const content = fs.readFileSync(
          require("path").join(
            __dirname,
            "..",
            "..",
            "central-mcp-config.json"
          ),
          "utf8"
        );
        const cfg = JSON.parse(content);
        if (
          cfg.secrets &&
          Object.prototype.hasOwnProperty.call(cfg.secrets, name)
        )
          return cfg.secrets[name];
        if (Object.prototype.hasOwnProperty.call(cfg, name)) return cfg[name];
      } catch {
        // ignore
      }
    }

    // 3) remote via /secrets (try direct token first)
    if (!this.url) throw new Error("MCP URL not configured");
    const base = this.url.replace(/\/$/, "");
    const headers = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    try {
      if (this.token) {
        const resp = await axios.get(
          `${base}/secrets/${encodeURIComponent(name)}`,
          { headers, timeout: 5000 }
        );
        if (resp && resp.data && resp.data.value) return resp.data.value;
      }
    } catch {
      // fallthrough to token exchange
    }

    // obtain short-lived JWT
    try {
      if (this.token) {
        const t = await axios.post(`${base}/token`, null, {
          headers,
          timeout: 5000,
        });
        const access = t.data && t.data.access_token;
        if (access) {
          const resp2 = await axios.get(
            `${base}/secrets/${encodeURIComponent(name)}`,
            { headers: { Authorization: `Bearer ${access}` }, timeout: 5000 }
          );
          if (resp2 && resp2.data && resp2.data.value) return resp2.data.value;
        }
      }
    } catch {
      // ignore
    }

    return undefined;
  }
}

module.exports = MCPClient;
