package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Config struct {
	CentralMcpServerUrl   string            `json:"centralMcpServerUrl"`
	CentralMcpServerToken string            `json:"centralMcpServerToken"`
	CentralMcpJwtSecret   string            `json:"centralMcpJwtSecret"`
	Secrets               map[string]string `json:"secrets"`
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func loadConfig() (*Config, error) {
	cfg := &Config{}
	// First, read environment overrides (they take precedence)
	if v := os.Getenv("CENTRAL_MCP_SERVER_URL"); v != "" {
		cfg.CentralMcpServerUrl = v
	}
	if v := os.Getenv("CENTRAL_MCP_SERVER_TOKEN"); v != "" {
		cfg.CentralMcpServerToken = v
	}
	if v := os.Getenv("CENTRAL_MCP_JWT_SECRET"); v != "" {
		cfg.CentralMcpJwtSecret = v
	}

	// Candidate file locations (prefer C:\ if present to match server behavior)
	candidates := []string{
		`C:\central-mcp-config.json`,
		"central-mcp-config.json",
	}

	for _, p := range candidates {
		if fileExists(p) {
			b, err := os.ReadFile(p)
			if err != nil {
				return nil, fmt.Errorf("failed to read %s: %w", p, err)
			}
			var fcfg Config
			if err := json.Unmarshal(b, &fcfg); err != nil {
				return nil, fmt.Errorf("failed to parse %s: %w", p, err)
			}
			// Merge: environment values already set take precedence
			if cfg.CentralMcpServerUrl == "" {
				cfg.CentralMcpServerUrl = fcfg.CentralMcpServerUrl
			}
			if cfg.CentralMcpServerToken == "" {
				cfg.CentralMcpServerToken = fcfg.CentralMcpServerToken
			}
			if cfg.CentralMcpJwtSecret == "" {
				cfg.CentralMcpJwtSecret = fcfg.CentralMcpJwtSecret
			}
			if cfg.Secrets == nil {
				cfg.Secrets = fcfg.Secrets
			}
			return cfg, nil
		}
	}

	// No file found, return whatever we have from env (may be empty)
	return cfg, nil
}

func requestJWT(serverURL, serverToken string) (string, error) {
	if serverURL == "" {
		return "", errors.New("server URL is empty")
	}
	if serverToken == "" {
		return "", errors.New("server token is empty")
	}
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("POST", strings.TrimRight(serverURL, "/")+"/token", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+serverToken)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request failed %d: %s", resp.StatusCode, string(b))
	}
	var body struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	if body.AccessToken == "" {
		return "", errors.New("no access_token in response")
	}
	return body.AccessToken, nil
}

func getSecret(serverURL, jwt, name string) (string, error) {
	if serverURL == "" {
		return "", errors.New("server URL is empty")
	}
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("GET", strings.TrimRight(serverURL, "/")+"/secrets/"+urlEscape(name), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("secret request failed %d: %s", resp.StatusCode, string(b))
	}
	var out struct {
		Name  string `json:"name"`
		Value string `json:"value"`
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return "", err
	}
	return out.Value, nil
}

func urlEscape(s string) string {
	// simple escape for path segment
	return strings.ReplaceAll(s, " ", "%20")
}

func mask(s string) string {
	if s == "" {
		return ""
	}
	if len(s) <= 4 {
		return "****"
	}
	return s[:2] + strings.Repeat("*", len(s)-4) + s[len(s)-2:]
}

func main() {
	secretFlag := flag.String("secret", "", "Secret name to fetch from central server")
	showCfg := flag.Bool("show", false, "Print resolved configuration (masked)")
	flag.Parse()

	cfg, err := loadConfig()
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to load config:", err)
		os.Exit(1)
	}

	if *showCfg {
		fmt.Println("resolved config:")
		fmt.Println("  serverUrl:", cfg.CentralMcpServerUrl)
		fmt.Println("  serverToken:", mask(cfg.CentralMcpServerToken))
		fmt.Println("  jwtSecret:", mask(cfg.CentralMcpJwtSecret))
		os.Exit(0)
	}

	if *secretFlag == "" {
		// if no secret requested print available local secrets from file
		if cfg.Secrets != nil && len(cfg.Secrets) > 0 {
			fmt.Println("local secrets:")
			for k := range cfg.Secrets {
				fmt.Println(" -", k)
			}
			os.Exit(0)
		}
		fmt.Println("no secret requested and no local secrets available; use -secret NAME to fetch from server")
		os.Exit(0)
	}

	// Need server URL and server token (either from env/file)
	if cfg.CentralMcpServerUrl == "" {
		fmt.Fprintln(os.Stderr, "no server URL configured (env CENTRAL_MCP_SERVER_URL or central-mcp-config.json)")
		os.Exit(2)
	}
	if cfg.CentralMcpServerToken == "" {
		fmt.Fprintln(os.Stderr, "no server token configured (env CENTRAL_MCP_SERVER_TOKEN or central-mcp-config.json)")
		os.Exit(2)
	}

	jwt, err := requestJWT(cfg.CentralMcpServerUrl, cfg.CentralMcpServerToken)
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to obtain JWT:", err)
		os.Exit(3)
	}

	val, err := getSecret(cfg.CentralMcpServerUrl, jwt, *secretFlag)
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to fetch secret:", err)
		os.Exit(4)
	}
	fmt.Printf("%s\n", val)
}
