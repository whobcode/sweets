# sweets — netmcp shortcuts toolkit

A complete toolkit that exposes the [`netmcp`](https://github.com/whobcode/netmcp) MCP server's
security-research / OSINT / vulnerability tools as **plain HTTP endpoints**, plus ready-made
clients for the CLI, the browser, and iOS Shortcuts.

`netmcp` is a streamable-HTTP MCP server behind GitHub OAuth. Speaking the MCP protocol from a
shortcut or a shell is awkward, so this project wraps it: the Cloudflare Worker mints/refreshes
access tokens (KV-backed OAuth, PKCE public client), speaks the real MCP handshake, and re-exposes
every tool at a simple `/tool/:name` URL.

## Components

| File | What it is |
|------|------------|
| `src/index.js`, `src/auth.js`, `src/mcp.js` | The Cloudflare Worker (HTTP → MCP bridge) |
| `netmcp-cli.js` | Node CLI (`npx netmcp ...`) |
| `netmcp-bookmarklet.js` | Browser bookmarklet |
| `netmcp-ios-shortcuts.md` | iOS Shortcuts recipes |
| `netmcp-worker.js` | Standalone single-file worker variant |
| `test-netmcp.js` | Smoke test (`npm test`) |

## Endpoints

```
GET  /tools                              # help page, lists every tool + params
GET  /tool/ipwhois_enrichment?ip=8.8.8.8 # GET: params from query string
POST /tool/browser_screenshot            # POST: params as JSON body
     {"url":"https://example.com"}
```

GET query strings are coerced to the JSON types each tool's schema expects (see `TOOL_SCHEMA` in
`src/index.js`). Available tools include CVE lookup, OSV scan, ExploitDB, Shodan/Censys, SecurityTrails
DNS history, IP whois, Wayback, a full headless-browser suite, and image generation.

## Configuration

`wrangler.toml` ships with working public values:

- `NETMCP_URL`, `NETMCP_TOKEN_URL`, `NETMCP_CLIENT_ID` — public PKCE client config (safe to commit)
- `NETMCP_TOKEN_TTL` — access-token cache TTL (kept low; tokens expire faster than advertised)
- KV namespace `NETMCP_AUTH` — stores the rotating refresh + cached access token
- Custom domain route `netapi.hwmnbn.me` (requires the `hwmnbn.me` zone in your Cloudflare account)

The only secret is the netmcp refresh/access token, set out-of-band:

```bash
wrangler secret put NETMCP_TOKEN
```

## Deploy

```bash
npm install
npm run worker:dev      # local
npm run worker:deploy   # production
npm test                # smoke test
```

## CLI

```bash
npm run cli -- ipwhois_enrichment --ip 8.8.8.8
# or after `npm link`:
netmcp browser_markdown --url https://example.com
```

## License

MIT
