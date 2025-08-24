from mcp_client import MCPClient

if __name__ == "__main__":
    c = MCPClient()
    cfg = c.get_all()
    print("CONFIG:", cfg)
    print("mySecretKey:", c.get("mySecretKey"))
    print("secret via get_secret:", c.get_secret("mySecretKey"))
