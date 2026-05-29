# 🔧 netmcp Shortcuts - Complete Toolkit

Comprehensive shortcuts and integrations for your netmcp MCP server across all platforms.

**netmcp Endpoints:**
- Primary: `https://netmcp.hwmnbn.me/mcp`
- Fallback: `https://tru-bone.workers.dev/mcp`

---

## 📋 Quick Start

### Option 1: CLI Tool (Recommended for Development)

```bash
# Make executable
chmod +x netmcp-cli.js

# Run with Node
node netmcp-cli.js

# Or with npx
npx node netmcp-cli.js
```

**Features:**
- Interactive menu for selecting tools
- Guided parameter input
- Auto-fallback to backup URL
- JSON response formatting

---

### Option 2: Cloudflare Worker Wrapper

Deploy your own HTTP API wrapper for netmcp.

**Setup:**

```bash
# In your Wrangler project
cp netmcp-worker.js src/index.js

# Or create new project
wrangler generate netmcp-api
cd netmcp-api
cp ../netmcp-worker.js src/index.js

# Deploy
wrangler deploy
```

**Usage:**

```bash
# Get list of tools
curl https://your-worker.workers.dev/tools

# Take screenshot
curl -X POST https://your-worker.workers.dev/tool/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# IP lookup
curl https://your-worker.workers.dev/tool/ipwhois_lookup?ip=8.8.8.8

# GitHub search
curl https://your-worker.workers.dev/tool/github_search?query=exploit
```

**Features:**
- REST API endpoints for each tool
- GET and POST support
- CORS enabled
- Health check endpoint
- HTML dashboard at `/tools`

---

### Option 3: Browser Bookmarklet

Quick access from your browser toolbar.

**Installation:**

1. **Create a new bookmark** (Ctrl+D or Cmd+D)
2. **Title:** `🔧 netmcp`
3. **URL:** Paste the entire content from `netmcp-bookmarklet.js` (starting with `javascript:`)
4. Save to toolbar

**Usage:**

- Click the bookmark from any page
- Select a tool category
- Choose a tool
- Fill in parameters
- View results in modal

**Features:**
- Dark theme UI
- Auto-fills current URL for browser tools
- Shows results in modal
- ESC to close
- Zero dependencies

---

### Option 4: iOS Shortcuts

Automatable workflows on iPhone/iPad.

**Manual Setup:**

Follow the instructions in `netmcp-ios-shortcuts.md`:

1. Open **Shortcuts** app
2. Create a new shortcut for each tool
3. Add actions following the templates
4. Configure Siri voice triggers
5. Add to home screen widgets

**Creating a Master Launcher:**

1. Create shortcut called "netmcp Tools"
2. Add "Choose from List" action with all tool names
3. Use "Switch" action to run appropriate shortcut
4. Add Siri voice command

**Automation Examples:**

```
Trigger: Time of Day (Daily 9 AM)
→ Run "netmcp: GitHub Exploits" with saved search

Trigger: Share Sheet
→ Pass URL to "netmcp: Screenshot"

Trigger: Siri ("Hey Siri, netmcp lookup")
→ Ask for IP, run lookup, show result
```

**Share Sheet Integration:**

1. Edit shortcut → Info icon
2. Enable "Show in Share Sheet"
3. Select input type (URL, Text, etc.)
4. Now accessible from Share menu anywhere

---

## 🛠️ Integration Patterns

### CLI + Wrangler Script

```bash
#!/bin/bash
# netmcp wrapper in your project

case $1 in
  screenshot)
    node netmcp-cli.js <<< $'1\n1\n1\n'$2
    ;;
  ipinfo)
    node netmcp-cli.js <<< $'1\n4\n2\n'$2
    ;;
  *)
    node netmcp-cli.js
    ;;
esac
```

### Worker + Frontend

Create a simple HTML dashboard:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>netmcp Dashboard</h1>
  <button onclick="takeSS()">Screenshot</button>
  <button onclick="lookupIP()">IP Lookup</button>
  
  <script>
    const API = "https://your-worker.workers.dev";
    
    async function takeSS() {
      const url = prompt("URL:");
      const res = await fetch(`${API}/tool/screenshot`, {
        method: "POST",
        body: JSON.stringify({url})
      });
      console.log(await res.json());
    }
    
    async function lookupIP() {
      const ip = prompt("IP:");
      const res = await fetch(`${API}/tool/ipwhois_lookup?ip=${ip}`);
      console.log(await res.json());
    }
  </script>
</body>
</html>
```

### Siri Shortcuts + CLI

Call CLI tool from iOS Shortcut:

```
Shortcut: "netmcp via SSH"
1. Ask for tool name
2. Ask for parameters
3. Run script over SSH: node netmcp-cli.js
4. Display result
```

---

## 🗂️ Tool Categories & Endpoints

### Browser Tools
- `screenshot` - Take webpage screenshot
- `get_content` - Extract text from page
- `get_markdown` - Fetch as markdown
- `click` - Click element on page
- `fill_form` - Submit form data

### OSINT
- `shodan_search` - Search Shodan devices
- `censys_search` - Query Censys hosts
- `ipwhois_lookup` - IP geolocation
- `securitytrails_dns` - Historical DNS

### GitHub & Repos
- `github_search` - Find repositories
- `github_exploit_search` - Search exploits

### Security & CVE
- `nvd_lookup` - National Vulnerability Database
- `exploitdb_search` - Search ExploitDB
- `osv_scan` - Scan packages for vulns

### AI
- `generate_image` - AI image generation

---

## 📞 API Format

All requests follow JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    // Tool-specific output
  }
}
```

Error response:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "error": {
    "code": -1,
    "message": "Error description"
  }
}
```

---

## 🔐 Security Notes

- **No API keys stored** in CLI/bookmarklet
- **CORS enabled** for cross-origin requests
- **Fallback URL** available (`tru-bone.workers.dev`)
- **Public netmcp** - Rate limiting recommended in production
- **iOS:** Passwords never logged; stored in Keychain

---

## 🚀 Advanced Usage

### CLI with Environment Variables

```bash
export NETMCP_URL="https://custom-url.com"
node netmcp-cli.js
```

### Worker with Authentication

Add to Cloudflare Worker:

```javascript
const AUTH_TOKEN = env.NETMCP_TOKEN;

if (request.headers.get("Authorization") !== `Bearer ${AUTH_TOKEN}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

### iOS Shortcut with Scheduling

```
Automation: Time of Day
→ Run shortcut every hour
→ Search GitHub for new exploits
→ Send notification if found
```

### Bookmarklet with Custom Domain

Edit the NETMCP_URL in bookmarklet for custom deployment:

```javascript
const NETMCP_URL = 'https://your-custom-domain.com/mcp';
```

---

## 🐛 Troubleshooting

**CLI hangs on input:**
- Use piped input: `echo -e "1\n1\n1\n" | node netmcp-cli.js`
- Or redirect from file: `node netmcp-cli.js < inputs.txt`

**Worker CORS errors:**
- Ensure corsHeaders are in all responses
- Test with curl: `curl -i https://your-worker.workers.dev/health`

**Bookmarklet doesn't show:**
- Check browser console for errors (F12)
- Verify NETMCP_URL is accessible
- Test with fallback URL

**iOS Shortcut timeout:**
- Increase timeout in network request action
- Check device network connection
- Verify netmcp endpoint is reachable

---

## 📝 Examples

### Screenshot webpage with CLI
```bash
node netmcp-cli.js
# Select: 1 (Browser)
# Select: 1 (screenshot)
# Enter URL: https://example.com
```

### Quick IP lookup via Worker
```bash
curl "https://your-worker.workers.dev/tool/ipwhois_lookup?ip=1.1.1.1"
```

### Exploit search via bookmarklet
- Click 🔧 netmcp bookmark
- Select "GitHub Exploits"
- Enter search term
- View results in modal

### Automated daily CVE scan via iOS
- Create Shortcut "Daily CVE Check"
- Set automation: Time of Day → 9 AM
- Ask for CVE ID (or search recent)
- Send notification with severity
- Add to home screen widget

---

## 📦 File Overview

- **netmcp-cli.js** - Interactive terminal tool
- **netmcp-worker.js** - Cloudflare Worker wrapper
- **netmcp-bookmarklet.js** - Browser bookmarklet code
- **netmcp-ios-shortcuts.md** - iOS Shortcuts setup guide
- **README.md** - This file

---

## 🔄 Workflow Recommendations

**Development:** CLI tool
```bash
node netmcp-cli.js
```

**API Server:** Cloudflare Worker
```bash
wrangler deploy
# Use REST endpoints
```

**Quick Access:** Browser bookmarklet
```
Click 🔧 → Select tool → Run
```

**Mobile/Automated:** iOS Shortcuts
```
Siri + Automations + Widgets
```

---

**Need help?** Check the specific file documentation or review the netmcp repo at `github.com/whobcode/netmcp`
