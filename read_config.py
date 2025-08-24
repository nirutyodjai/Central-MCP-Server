import json

with open("C:/central-mcp-config.json", "r") as f:
    config = json.load(f)
mcp_url = config["centralMcpServerUrl"]
print(mcp_url)
