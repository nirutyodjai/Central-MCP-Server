const axios = require("axios");

const MCP_SERVER_URL = "http://localhost:5050";
const MY_CLIENT_NAME = "MyDynamicTestClient";

let clientToken = null;

async function registerClient() {
  console.log(`\n--- Registering client: ${MY_CLIENT_NAME} ---`);
  try {
    const response = await axios.post(`${MCP_SERVER_URL}/register`, {
      clientName: MY_CLIENT_NAME,
    });
    clientToken = response.data.clientToken;
    console.log("Registration successful!");
    console.log("Received token:", clientToken);
  } catch (error) {
    console.error(
      "Error during registration:",
      error.response ? error.response.data : error.message
    );
  }
}

async function getContextWithToken() {
  if (!clientToken) {
    console.log("No token available. Cannot get context.");
    return;
  }
  console.log("\n--- Attempting to get context with our new token ---");
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/context`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    console.log("Successfully retrieved context:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(
      "Error getting context:",
      error.response ? error.response.data : error.message
    );
  }
}

async function unregisterClient() {
  if (!clientToken) {
    console.log("No token available. Cannot unregister.");
    return;
  }
  console.log("\n--- Unregistering client ---");
  try {
    const response = await axios.post(`${MCP_SERVER_URL}/unregister`, {
      clientToken: clientToken,
    });
    console.log("Unregistration successful:", response.data.message);
    clientToken = null;
  } catch (error) {
    console.error(
      "Error during unregistration:",
      error.response ? error.response.data : error.message
    );
  }
}

async function testAccessAfterUnregister() {
  console.log("\n--- Verifying access is denied after unregistering ---");
  try {
    await axios.get(`${MCP_SERVER_URL}/context`, {
      // Using the old, now invalid token
      headers: { Authorization: `Bearer ${clientToken || "dummy-token"}` },
    });
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log(
        "Access correctly denied with status 403 (Forbidden). Test passed!"
      );
    } else {
      console.error(
        "An unexpected error occurred or the status was not 403:",
        error.message
      );
    }
  }
}

async function main() {
  await registerClient();
  await getContextWithToken();
  await unregisterClient();
  await testAccessAfterUnregister();
}

main();
