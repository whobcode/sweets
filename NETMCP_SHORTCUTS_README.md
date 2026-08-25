# 🔧 netmcp Shortcuts

A toolkit for calling the **netmcp** MCP server from anywhere — CLI, browser, and HTTP — via a Cloudflare Worker that handles authentication and the MCP protocol for you.

**Public API (the Worker):** `https://netapi.hwmnbn.me`
**Upstream MCP server:** `https://netmcp.hwmnbn.me/mcp` (GitHub-OAuth protected; not called directly by clients)

---

## Why a Worker in front?

netmcp is a **streamable-HTTP MCP server behind GitHub OAuth**. Calling it directly requires:

- a GitHub-OAuth access token (short-lived, with a *rotating* refresh token),
- an MCP `initialize` handshake to obtain an `Mcp-Session-Id`,
- the `Accept: application/json, text/event-stream` header, and
- Server-Sent-Events response parsing.

A thin CLI or a browser bookmarklet can't reasonably do all that. So the **Worker** (`src/`) does it once, and exposes every tool as a plain HTTP endpoint:

```
GET  /tool/:name?param=value      # query params, coerced to the tool's types
POST /tool/:name   {json body}    # JSON arguments
```

```
client (CLI / bookmarklet / curl) ──HTTP──▶ Worker (netapi.hwmnbn.me)
                                              │  KV-backed OAuth token refresh
                                              │  MCP initialize → session → SSE
                                              ▼
                                          netmcp.hwmnbn.me/mcp
```

---

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Landing page |
| `GET /health` | Health check |
| `GET /tools` | Human-readable tool list (HTML, grouped by category) |
| `GET /tools.json` | Machine-readable tool list, live from the server |
| `GET /auth/status` | Confirms the token layer can mint an access token (never returns the token) |
| `GET\|POST /tool/:name` | Call a tool |

### Examples

```bash
# IP enrichment (GET)
curl "https://netapi.hwmnbn.me/tool/ipwhois_enrichment?ip=8.8.8.8"

# GitHub exploit search (GET, params coerced)
curl "https://netapi.hwmnbn.me/tool/github_exploit_search?query=log4j&limit=5"

# Screenshot (POST)
curl -X POST https://netapi.hwmnbn.me/tool/browser_screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","fullPage":true}'
```

---

## Clients

### CLI

```bash
node netmcp-cli.js                          # interactive menu
node netmcp-cli.js ipwhois_enrichment '{"ip":"8.8.8.8"}'   # one-shot
NETMCP_API=https://netapi.hwmnbn.me node netmcp-cli.js     # override target
```

### Browser bookmarklet

Create a bookmark whose URL is the entire `javascript:` line in `netmcp-bookmarklet.js`. Click it on any page → pick a tool → results render in a modal. It calls the Worker, so no keys live in the browser.

### iOS Shortcuts

See `netmcp-ios-shortcuts.md`. Point the network-request actions at `https://netapi.hwmnbn.me/tool/<name>`.

---

## Tools

24 tools. Several call third-party APIs and need a key configured **on the upstream netmcp Worker** (not on this proxy). Status as last verified:

### ✅ Work with no extra key
| Tool | Purpose |
|---|---|
| `nvd_cve_lookup` | NIST NVD CVE lookup (`NVD_API_KEY` optional, raises rate limit) |
| `exploitdb_search` / `exploitdb_get` / `exploitdb_info` | ExploitDB |
| `wayback_machine_lookup` | Wayback Machine snapshots |
| `ipwhois_enrichment` | IP geolocation / WHOIS |
| `userInfoOctokit` | Authenticated GitHub user info |
| `generateImage` | AI image generation |
| `add` | Trivial test tool |
| `browser_*` | `screenshot`, `get_content`, `get_markdown`, `pdf`, `scrape`, `execute_script`, `get_links`, `fill_form`, `click` |

### 🔑 Require an upstream API key
| Tool | Secret(s) | Status | Get a key |
|---|---|---|---|
| `github_exploit_search` | `GITHUB_TOKEN` | ✅ working | https://github.com/settings/tokens/new (`public_repo`) |
| `shodan_device_search` | `SHODAN_API_KEY` | ⚠️ key set, provider returns 403 (account likely lacks API/search entitlement) | https://account.shodan.io |
| `censys_host_search` | `CENSYS_API_ID`, `CENSYS_API_SECRET` | ⚠️ keys set, provider returns 401 (verify Search-API ID/secret, not a Platform token) | https://search.censys.io/account/api |
| `gitlab_code_search` | `GITLAB_TOKEN` (optional) | ➖ not set; public-only without it (401) | https://gitlab.com/-/user_settings/personal_access_tokens (`read_api`) |
| `securitytrails_dns_history` | `SECURITYTRAILS_API_KEY` | ⛔ unavailable — API is paid-only (~$500/mo) | https://securitytrails.com |

### Configuring upstream keys

Tool credentials are secrets on the **netmcp** Worker (the `whobcode/netmcp` repo), set via:

```bash
cd <netmcp repo>
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put SHODAN_API_KEY
npx wrangler secret put CENSYS_API_ID
npx wrangler secret put CENSYS_API_SECRET
# optional:
npx wrangler secret put GITLAB_TOKEN
npx wrangler secret put NVD_API_KEY
```

Secrets apply live — no redeploy needed. Confirm which names are set with `npx wrangler secret list` (shows names only).

---

## Deploying this Worker

```bash
npm install
npx wrangler deploy        # deploys to netapi.hwmnbn.me (custom domain) + workers.dev
npm test                   # smoke-tests the live Worker
```

### Auth layer (this Worker's own secret/state)

The Worker authenticates to netmcp using GitHub-OAuth tokens stored in the
`NETMCP_AUTH` KV namespace (key `auth`). It caches the access token until just
before expiry, then refreshes — persisting the rotated refresh token back to KV.
The refresh token lives **only in KV, never in git**. `/auth/status` reports
whether minting works without exposing the token.

---

## Files

| File | Role |
|---|---|
| `src/index.js` | Worker entry: routing, tool schema, query coercion, HTML/JSON listings |
| `src/mcp.js` | MCP client: initialize/session handshake + SSE parsing |
| `src/auth.js` | KV-backed OAuth access-token refresh |
| `netmcp-cli.js` | Terminal client (interactive + one-shot) |
| `netmcp-bookmarklet.js` | Browser bookmarklet client |
| `netmcp-ios-shortcuts.md` | iOS Shortcuts setup guide |
| `test-netmcp.js` | Live Worker smoke test |
| `wrangler.toml` | Worker config (KV binding, custom domain, vars) |

---

**License:** MIT
