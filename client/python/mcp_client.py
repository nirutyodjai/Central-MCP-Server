import os
import time
import json
import requests
from typing import Optional


class MCPClient:
    def __init__(
        self,
        url: Optional[str] = None,
        token: Optional[str] = None,
        cache_ttl: int = 30,
    ):
        self.url = url or os.environ.get("CENTRAL_MCP_SERVER_URL")
        self.token = token or os.environ.get("CENTRAL_MCP_CLIENT_TOKEN")
        self.cache_ttl = cache_ttl
        self._cache = {"data": None, "ts": 0}

    def _now(self):
        return int(time.time())

    def _read_local(self):
        # prefer absolute C: path, then workspace file
        candidates = [
            r"C:\central-mcp-config.json",
            os.path.join(
                os.path.dirname(__file__), "..", "..", "central-mcp-config.json"
            ),
        ]
        for p in candidates:
            try:
                if os.path.exists(p):
                    with open(p, "r", encoding="utf-8") as f:
                        return json.load(f)
            except Exception:
                continue
        return None

    def _fetch_remote(self):
        if not self.url:
            raise RuntimeError("MCP URL not configured")
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        resp = requests.get(
            self.url.rstrip("/") + "/context", headers=headers, timeout=5
        )
        resp.raise_for_status()
        return resp.json()

    def get_all(self):
        if self._cache["data"] and (self._now() - self._cache["ts"]) < self.cache_ttl:
            return self._cache["data"]
        # 1) env vars starting with CENTRAL_
        env_obj = {k: v for k, v in os.environ.items() if k.startswith("CENTRAL_")}
        if env_obj:
            self._cache = {"data": env_obj, "ts": self._now()}
            return env_obj
        # 2) local file
        local = self._read_local()
        if local:
            self._cache = {"data": local, "ts": self._now()}
            return local
        # 3) remote
        remote = self._fetch_remote()
        self._cache = {"data": remote, "ts": self._now()}
        return remote

    def get(self, key: str):
        allcfg = self.get_all()
        return allcfg.get(key) if allcfg else None

    def get_secret(self, name: str):
        # 1) check environment directly
        if name in os.environ:
            return os.environ[name]
        env_key = name.upper()
        if env_key in os.environ:
            return os.environ[env_key]

        # 2) check local config file
        local = self._read_local()
        if local:
            if isinstance(local, dict):
                if "secrets" in local and name in local["secrets"]:
                    return local["secrets"][name]
                if name in local:
                    return local[name]

        # 3) try remote: first try direct token (server token) then try obtaining short-lived JWT
        if not self.url:
            return None
        headers = {}
        # try direct token (may be server token)
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            try:
                r = requests.get(
                    self.url.rstrip("/") + f"/secrets/{name}",
                    headers=headers,
                    timeout=5,
                )
                if r.status_code == 200:
                    return r.json().get("value")
            except Exception:
                pass

        # try obtain short-lived JWT
        try:
            if self.token:
                hdr = {"Authorization": f"Bearer {self.token}"}
                t = requests.post(
                    self.url.rstrip("/") + "/token", headers=hdr, timeout=5
                )
                if t.status_code == 200:
                    token = t.json().get("access_token")
                    if token:
                        hdr2 = {"Authorization": f"Bearer {token}"}
                        r2 = requests.get(
                            self.url.rstrip("/") + f"/secrets/{name}",
                            headers=hdr2,
                            timeout=5,
                        )
                        if r2.status_code == 200:
                            return r2.json().get("value")
        except Exception:
            pass

        return None


if __name__ == "__main__":
    c = MCPClient()
    print("MCP URL from client:", c.url)
    print("Client token exists:", bool(c.token))
    print("All config:", c.get_all())
    print("Secret mySecretKey via env/local/remote:", c.get("mySecretKey"))
