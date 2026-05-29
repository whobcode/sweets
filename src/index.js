/**
 * netmcp Cloudflare Worker Wrapper
 * Exposes netmcp tools as HTTP endpoints
 * 
 * Deploy with: wrangler deploy
 * Usage: https://your-worker.workers.dev/tool/screenshot?url=https://example.com
 */

import { getAccessToken, authStatus } from "./auth.js";

const NETMCP_URL = "https://netmcp.hwmnbn.me/mcp";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route: /auth/status — confirms the KV-backed token layer can mint a token
    if (path === "/auth/status") {
      const status = await authStatus(env);
      return jsonResponse(status, status.ok ? 200 : 503);
    }

    // Route: /tool/:toolName or /tool/:toolName?params
    if (path.startsWith("/tool/")) {
      return handleToolCall(request, url, env);
    }

    // Route: /tools (list available tools)
    if (path === "/tools") {
      return handleListTools();
    }

    // Route: /health
    if (path === "/health") {
      return new Response(JSON.stringify({ status: "ok", url: NETMCP_URL }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Route: / (home)
    return handleHome();
  },
};

async function handleToolCall(request, url, env) {
  const pathParts = url.pathname.split("/");
  const toolName = pathParts[2];

  if (!toolName) {
    return jsonResponse({ error: "Tool name required" }, 400);
  }

  try {
    let params = {};

    if (request.method === "GET") {
      // Extract query parameters
      for (const [key, value] of url.searchParams) {
        params[key] = value;
      }
    } else if (request.method === "POST") {
      // Parse JSON body
      const body = await request.json();
      params = body;
    }

    // KV-backed OAuth: always attach a fresh Bearer token to the upstream call.
    const accessToken = await getAccessToken(env);

    const payload = {
      jsonrpc: "2.0",
      id: "1",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params,
      },
    };

    // NOTE: netmcp is a streamable-HTTP MCP server. A working tool call also
    // requires an `initialize` handshake (to obtain an Mcp-Session-Id), the
    // `Accept: application/json, text/event-stream` header, SSE response
    // parsing, and the server's real tool names. That protocol rewrite is the
    // deferred next step; this layer's job is supplying a valid access token.
    const response = await fetch(NETMCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      return jsonResponse({ error: data.error.message }, 400);
    }

    return jsonResponse(data.result);
  } catch (error) {
    return jsonResponse(
      { error: error.message, tool: toolName },
      500
    );
  }
}

function handleListTools() {
  const tools = {
    browser: {
      screenshot: "POST /tool/screenshot - Take screenshot of webpage",
      get_content: "GET /tool/get_content?url=... - Extract text from webpage",
      click: "POST /tool/click - Click element on page",
      fill_form: "POST /tool/fill_form - Fill form on page",
      get_markdown: "GET /tool/get_markdown?url=... - Fetch as markdown",
    },
    osint: {
      shodan_search: "GET /tool/shodan_search?query=... - Search Shodan",
      censys_search: "GET /tool/censys_search?query=... - Search Censys",
      securitytrails_dns:
        "GET /tool/securitytrails_dns?domain=... - DNS history",
      ipwhois_lookup: "GET /tool/ipwhois_lookup?ip=... - IP geolocation",
    },
    github: {
      github_search: "GET /tool/github_search?query=... - Search GitHub repos",
      github_exploit_search:
        "GET /tool/github_exploit_search?query=... - Search for exploits",
    },
    security: {
      nvd_lookup: "GET /tool/nvd_lookup?cve=... - Search CVE database",
      exploitdb_search: "GET /tool/exploitdb_search?query=... - Search ExploitDB",
      osv_scan: "GET /tool/osv_scan?package=... - Scan for vulnerabilities",
    },
    image: {
      generate_image: "POST /tool/generate_image - Generate image with AI",
    },
  };

  return new Response(
    `
<!DOCTYPE html>
<html>
<head>
  <title>netmcp Worker</title>
  <style>
    body { font-family: monospace; margin: 20px; background: #1e1e1e; color: #d4d4d4; }
    .category { margin: 20px 0; }
    .endpoint { padding: 10px; background: #2d2d2d; margin: 5px 0; border-left: 3px solid #0e7; }
    h1 { color: #0e7; }
    h2 { color: #4ec9b0; }
    code { background: #1e1e1e; padding: 2px 5px; }
  </style>
</head>
<body>
  <h1>🔧 netmcp Worker Endpoints</h1>
  <p>Proxy to: <code>${NETMCP_URL}</code></p>
  
  ${Object.entries(tools)
    .map(
      ([category, endpoints]) => `
    <div class="category">
      <h2>${category.toUpperCase()}</h2>
      ${Object.values(endpoints)
        .map((ep) => `<div class="endpoint"><code>${ep}</code></div>`)
        .join("")}
    </div>
  `
    )
    .join("")}
  
  <h2>Examples</h2>
  <pre>
# Browser screenshot
curl -X POST https://your-worker.workers.dev/tool/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'

# OSINT: IP lookup
curl https://your-worker.workers.dev/tool/ipwhois_lookup?ip=8.8.8.8

# GitHub search
curl https://your-worker.workers.dev/tool/github_search?query=exploit
  </pre>
</body>
</html>
  `,
    {
      headers: { "Content-Type": "text/html", ...corsHeaders },
    }
  );
}

function handleHome() {
  return new Response(
    `
<!DOCTYPE html>
<html>
<head>
  <title>netmcp</title>
  <style>
    body { font-family: sans-serif; margin: 40px; text-align: center; }
    h1 { color: #0e7; }
  </style>
</head>
<body>
  <h1>⚡ netmcp Worker</h1>
  <p>Visit <code>/health</code> or <code>/tools</code></p>
</body>
</html>
  `,
    { headers: { "Content-Type": "text/html", ...corsHeaders } }
  );
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
