const MCPClient = require("./mcp-client");

(async () => {
  const client = new MCPClient();
  const all = await client.getAll();
  console.log("ALL:", all);
  const secret = await client.getSecret("mySecretKey");
  console.log("mySecretKey via getSecret():", secret);
})();
