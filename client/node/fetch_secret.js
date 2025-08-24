const http = require("http");
const https = require("https");
const url = require("url");

function request(options, body) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === "https:" ? https : http;
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        res.body = data;
        resolve(res);
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const server = process.env.CENTRAL_MCP_SERVER_URL || "http://localhost:5050";
  const token = process.env.CENTRAL_MCP_SERVER_TOKEN || "dev-token-123";
  try {
    const tu = new url.URL(server + "/token");
    const resp = await request({
      protocol: tu.protocol,
      hostname: tu.hostname,
      port: tu.port,
      path: tu.pathname,
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });
    if (resp.statusCode !== 200) {
      console.error("token request failed", resp.statusCode, resp.body);
      process.exit(1);
    }
    const jb = JSON.parse(resp.body);
    const jwt = jb.access_token;
    console.log("got jwt:", jwt.substring(0, 20) + "...");

    const su = new url.URL(server + "/secrets/mySecretKey");
    const r2 = await request({
      protocol: su.protocol,
      hostname: su.hostname,
      port: su.port,
      path: su.pathname,
      method: "GET",
      headers: { Authorization: "Bearer " + jwt },
    });
    if (r2.statusCode !== 200) {
      console.error("secret request failed", r2.statusCode, r2.body);
      process.exit(2);
    }
    const s = JSON.parse(r2.body);
    console.log("secret value:", s.value);
  } catch (e) {
    console.error("error", e && e.message);
    process.exit(3);
  }
}

main();
