const request = require("supertest");
const app = require("../server"); // Adjust the path to your server.js file
const fs = require("fs");
const path = require("path");

// Read the token from the config file
const configPath = path.join(__dirname, "..", "central-mcp-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const authToken = config.centralMcpServerToken;

describe("API Endpoints", () => {
  let server;

  beforeAll(() => {
    server = app.listen(5051); // Use a different port for testing
  });

  afterAll(() => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  // Reset context before each test in this block
  describe("Context Sharing", () => {
    beforeEach(async () => {
      // Reset the context to an empty object
      await request(server)
        .post("/context")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
    });

    it("should update and retrieve context", async () => {
      const contextData = { user: "test", data: { id: 123 } };

      // Set the context
      const postRes = await request(server)
        .post("/context")
        .set("Authorization", `Bearer ${authToken}`)
        .send(contextData);
      expect(postRes.statusCode).toEqual(200);
      expect(postRes.body.sharedContext).toEqual(contextData);

      // Get the context and verify
      const getRes = await request(server).get("/context");
      expect(getRes.statusCode).toEqual(200);
      expect(getRes.body).toEqual(contextData);
    });
  });

  describe("Authentication", () => {
    it("should issue a JWT token for a valid server token", async () => {
      const res = await request(server)
        .post("/token")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body).toHaveProperty("token_type", "bearer");
      expect(res.body).toHaveProperty("expires_in", 900);
    });

    it("should reject an invalid server token", async () => {
      const res = await request(server)
        .post("/token")
        .set("Authorization", "Bearer invalid-token");

      expect(res.statusCode).toEqual(403);
    });
  });

  describe("Public Endpoints", () => {
    it("should respond to /health", async () => {
      const res = await request(server).get("/health");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("status", "ok");
    });

    it("should respond to /status", async () => {
      const res = await request(server).get("/status");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("pid");
    });
  });

  describe("Protected Endpoints", () => {
    it("should protect /context endpoint", async () => {
      const res = await request(server).post("/context").send({ key: "value" });
      expect(res.statusCode).toEqual(401); // Unauthorized without token
    });

    it("should protect /secrets endpoint", async () => {
      const res = await request(server).get("/secrets/someSecret");
      expect(res.statusCode).toEqual(401); // Unauthorized without token
    });

    it("should allow access to /context with a valid token", async () => {
      const res = await request(server)
        .post("/context")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ test: "data" });
      expect(res.statusCode).toEqual(200);
      // This will be affected by other tests, so we just check for the property
      expect(res.body).toHaveProperty("sharedContext");
    });

    it("should allow access to /secrets with a valid token", async () => {
      const res = await request(server)
        .get("/secrets/mySecretKey")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        name: "mySecretKey",
        value: "supersecret-value",
      });
    });
  });
});
