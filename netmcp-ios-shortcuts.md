# netmcp iOS Shortcuts

Drive netmcp tools from iPhone/iPad via the Worker at **`https://netapi.hwmnbn.me`**.

> **Why the Worker?** The raw netmcp endpoint (`netmcp.hwmnbn.me/mcp`) is behind
> GitHub OAuth and speaks the streamable-HTTP MCP protocol (session handshake +
> SSE), which Shortcuts can't do. The Worker handles all of that and exposes
> each tool as a simple HTTP call: `POST https://netapi.hwmnbn.me/tool/<name>`
> with a plain JSON body of the tool's arguments. No tokens live on the device.

---

## The one pattern every shortcut uses

1. **Ask for Input** (or **Get Contents of Share Sheet**) → store as a variable.
2. **Get Contents of URL**:
   - URL: `https://netapi.hwmnbn.me/tool/<tool_name>`
   - Method: **POST**
   - Headers: `Content-Type` = `application/json`
   - Request Body: **JSON** → add the tool's arguments (see each tool below).
3. **Get Dictionary Value** → key path `result.content` (an array of
   `{type, text}` items). For text tools, get `text` from the first item.
4. **Show Result** / **Quick Look** / **Set Clipboard** / **Save to Photos**.

The response shape is always:

```json
{ "tool": "<name>", "result": { "content": [ { "type": "text", "text": "..." } ] } }
```

Image tools (`generateImage`) return `result.content[0].data` as base64 — use
**Base64 Encode → Decode** then **Save to Photos**.

---

## Ready-to-build shortcuts

### 📸 netmcp: Screenshot
- URL: `https://netapi.hwmnbn.me/tool/browser_screenshot`
- Body: `{ "url": "<URL or Share Sheet input>", "fullPage": true }`
- The result `content` includes image data — Quick Look it.

### 🔍 netmcp: IP Lookup
- URL: `https://netapi.hwmnbn.me/tool/ipwhois_enrichment`
- Body: `{ "ip": "<Ask for input>" }`
- Show `result.content[0].text`.

### 💻 netmcp: GitHub Exploits
- URL: `https://netapi.hwmnbn.me/tool/github_exploit_search`
- Body: `{ "query": "<Ask for input>", "limit": 5 }`

### 🔴 netmcp: CVE Lookup
- URL: `https://netapi.hwmnbn.me/tool/nvd_cve_lookup`
- Body: `{ "cveId": "<Ask for input, e.g. CVE-2021-44228>" }`

### 🌐 netmcp: Page to Markdown
- URL: `https://netapi.hwmnbn.me/tool/browser_get_markdown`
- Body: `{ "url": "<Share Sheet input>" }`

### 🎨 netmcp: Generate Image
- URL: `https://netapi.hwmnbn.me/tool/generateImage`
- Body: `{ "prompt": "<Ask for input>", "steps": 8 }`
- Read `result.content[0].data` (base64) → decode → Save to Photos.

> **Tip:** the full, live tool list is at `https://netapi.hwmnbn.me/tools.json`.
> Any tool name there works as `/tool/<name>`.

---

## Master launcher

Create one shortcut **"netmcp Tools"**:

1. **Choose from Menu**: Screenshot · IP Lookup · GitHub Exploits · CVE Lookup · Markdown · Generate Image · Custom.
2. Each menu item runs the matching shortcut (or inlines the steps above).
3. **Custom**: Ask for tool name, Ask for JSON arguments, POST to
   `https://netapi.hwmnbn.me/tool/[tool name]` with that body.

---

## Triggers & integration

- **Share Sheet:** shortcut → ⓘ → enable *Show in Share Sheet*, accept *URLs*. Share any page straight into Screenshot / Markdown.
- **Siri:** add a phrase like "netmcp lookup" to run a shortcut hands-free.
- **Automations:** Time of Day (daily exploit search), NFC tag (IP lookup), Focus change, etc.
- **Home Screen:** add a shortcut to the home screen or a widget for one-tap access.

---

## Best practices

1. Set the **Get Contents of URL** timeout generously — browser/image tools can take 10–30s.
2. Check for an `error` key in the response and surface it (the Worker returns
   `{ "error": "..." }` with a 4xx/5xx status on failure).
3. A tool can also return `result.isError: true` with an explanatory `text`
   (e.g. an upstream API key isn't configured) — show that text rather than
   treating it as success.
4. Store frequent queries as shortcut variables to avoid re-typing.
