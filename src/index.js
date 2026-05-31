/**
 * netmcp Cloudflare Worker Wrapper
 * Exposes netmcp MCP tools as plain HTTP endpoints.
 *
 * netmcp is a streamable-HTTP MCP server behind GitHub OAuth. This Worker:
 *   - mints/refreshes access tokens via a KV-backed OAuth layer (auth.js)
 *   - speaks the real MCP protocol — initialize/session/SSE (mcp.js)
 *   - exposes each tool at /tool/:name (GET query params or POST JSON body)
 *
 * Deploy with: wrangler deploy
 * Usage:  GET  /tool/ipwhois_enrichment?ip=8.8.8.8
 *         POST /tool/browser_screenshot   {"url":"https://example.com"}
 */

import { getAccessToken, authStatus } from "./auth.js";
import { callTool, listTools } from "./mcp.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// The tools netmcp actually exposes, with their parameter types. Used to coerce
// GET query strings (always strings) into the JSON types the schema expects,
// and to render the /tools help page. Keep in sync with `tools/list`.
const TOOL_SCHEMA = {
  // security / CVE
  nvd_cve_lookup: { cveId: "string", keyword: "string", resultsPerPage: "integer", startIndex: "integer", response_format: "string" },
  osv_vulnerability_scan: { packageName: "string", version: "string", ecosystem: "string", commit: "string", response_format: "string" },
  exploitdb_search: { query: "string", platform: "string", type: "string", verified: "boolean", kind: "string", limit: "integer", response_format: "string" },
  exploitdb_get: { id: "integer", response_format: "string" },
  exploitdb_info: { response_format: "string" },
  // osint
  github_exploit_search: { query: "string", language: "string", limit: "integer", response_format: "string" },
  gitlab_code_search: { query: "string", scope: "string", limit: "integer", response_format: "string" },
  shodan_device_search: { query: "string", facets: "string", limit: "integer", response_format: "string" },
  censys_host_search: { query: "string", perPage: "integer", response_format: "string" },
  securitytrails_dns_history: { domain: "string", type: "string", response_format: "string" },
  ipwhois_enrichment: { ip: "string", response_format: "string" },
  wayback_machine_lookup: { url: "string", timestamp: "string", limit: "integer", response_format: "string" },
  // browser
  browser_screenshot: { url: "string", fullPage: "boolean", width: "number", height: "number", format: "string", quality: "number", waitUntil: "string", selector: "string" },
  browser_get_content: { url: "string", contentType: "string", waitUntil: "string", selector: "string", waitForSelector: "string", timeout: "number" },
  browser_get_markdown: { url: "string", waitUntil: "string", selector: "string", includeLinks: "boolean" },
  browser_pdf: { url: "string", format: "string", landscape: "boolean", printBackground: "boolean", scale: "number", waitUntil: "string" },
  browser_scrape: { url: "string", selectors: "object", multiple: "boolean", attributes: "array", waitUntil: "string", waitForSelector: "string", response_format: "string" },
  browser_execute_script: { url: "string", script: "string", waitUntil: "string", waitForSelector: "string" },
  browser_get_links: { url: "string", selector: "string", includeExternal: "boolean", waitUntil: "string", response_format: "string" },
  browser_fill_form: { url: "string", fields: "object", submitSelector: "string", waitAfterSubmit: "number", screenshotAfter: "boolean", waitUntil: "string" },
  browser_click: { url: "string", selector: "string", waitForNavigation: "boolean", waitForSelector: "string", screenshot: "boolean", waitUntil: "string" },
  // misc
  add: { a: "number", b: "number" },
  userInfoOctokit: {},
  generateImage: { prompt: "string", steps: "number" },
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/auth/status") {
      const status = await authStatus(env);
      return jsonResponse(status, status.ok ? 200 : 503);
    }

    if (path === "/tools.json") {
      // Live tool list straight from the server.
      try {
        const tools = await listTools(env);
        return jsonResponse({ count: tools.length, tools });
      } catch (e) {
        return jsonResponse({ error: e.message }, 502);
      }
    }

    if (path === "/tools") {
      return handleListTools(env, url);
    }

    if (path.startsWith("/tool/")) {
      return handleToolCall(request, url, env);
    }

    if (path === "/health") {
      return jsonResponse({ status: "ok", url: env.NETMCP_URL });
    }

    return handleHome();
  },
};

/** Coerce a raw string (from a query param) into the schema-declared type. */
function coerce(value, type) {
  switch (type) {
    case "integer":
    case "number": {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    case "boolean":
      return value === "true" || value === "1";
    case "object":
    case "array":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

async function handleToolCall(request, url, env) {
  const toolName = decodeURIComponent(url.pathname.split("/")[2] || "");

  if (!toolName) return jsonResponse({ error: "Tool name required" }, 400);
  if (!(toolName in TOOL_SCHEMA)) {
    return jsonResponse(
      { error: `Unknown tool '${toolName}'`, available: Object.keys(TOOL_SCHEMA) },
      404
    );
  }

  try {
    const schema = TOOL_SCHEMA[toolName];
    let args = {};

    if (request.method === "POST") {
      const text = await request.text();
      args = text ? JSON.parse(text) : {};
    } else {
      // GET: pull from query string, coercing to the declared types.
      for (const [key, raw] of url.searchParams) {
        args[key] = key in schema ? coerce(raw, schema[key]) : raw;
      }
    }

    const result = await callTool(env, toolName, args);

    // MCP tool results wrap output in a `content` array. Surface the common
    // text case directly while still returning the full structured result.
    return jsonResponse({ tool: toolName, result });
  } catch (error) {
    const status = error.code === -32601 ? 404 : 502;
    return jsonResponse({ error: error.message, tool: toolName, code: error.code }, status);
  }
}

const CATEGORIES = {
  "Security / CVE": ["nvd_cve_lookup", "osv_vulnerability_scan", "exploitdb_search", "exploitdb_get", "exploitdb_info"],
  OSINT: ["github_exploit_search", "gitlab_code_search", "shodan_device_search", "censys_host_search", "securitytrails_dns_history", "ipwhois_enrichment", "wayback_machine_lookup"],
  Browser: ["browser_screenshot", "browser_get_content", "browser_get_markdown", "browser_pdf", "browser_scrape", "browser_execute_script", "browser_get_links", "browser_fill_form", "browser_click"],
  Misc: ["add", "userInfoOctokit", "generateImage"],
};

function handleListTools(env, url) {
  const origin = url.origin;
  const section = Object.entries(CATEGORIES)
    .map(([cat, names]) => {
      const rows = names
        .map((name) => {
          const params = Object.entries(TOOL_SCHEMA[name] || {})
            .map(([k, t]) => `${k}:${t}`)
            .join(", ");
          return `<div class="endpoint"><code>/tool/${name}</code><span class="params">${params || "no params"}</span></div>`;
        })
        .join("");
      return `<div class="category"><h2>${cat}</h2>${rows}</div>`;
    })
    .join("");

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>netmcp Worker</title>
<style>
  body { font-family: monospace; margin: 24px; background: #1e1e1e; color: #d4d4d4; }
  h1 { color: #0e7; } h2 { color: #4ec9b0; margin-bottom: 6px; }
  .category { margin: 18px 0; }
  .endpoint { padding: 8px 10px; background: #2d2d2d; margin: 4px 0; border-left: 3px solid #0e7; display: flex; justify-content: space-between; gap: 16px; }
  .params { color: #888; font-size: 12px; }
  code { color: #dcdcaa; }
  pre { background: #2d2d2d; padding: 12px; border-radius: 6px; overflow-x: auto; }
</style></head><body>
  <h1>🔧 netmcp Worker</h1>
  <p>Authenticated MCP proxy → <code>${env.NETMCP_URL}</code></p>
  <p>Machine-readable list: <code>${origin}/tools.json</code> · auth check: <code>${origin}/auth/status</code></p>
  ${section}
  <h2>Examples</h2>
  <pre># IP enrichment (GET)
curl "${origin}/tool/ipwhois_enrichment?ip=8.8.8.8"

# GitHub exploit search (GET)
curl "${origin}/tool/github_exploit_search?query=log4j&limit=5"

# Screenshot (POST)
curl -X POST ${origin}/tool/browser_screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","fullPage":true}'</pre>
</body></html>`,
    { headers: { "Content-Type": "text/html", ...corsHeaders } }
  );
}

function handleHome() {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>netmcp</title>
<style>body{font-family:sans-serif;margin:40px;text-align:center}h1{color:#0e7}code{background:#eee;padding:2px 6px;border-radius:4px}</style>
</head><body><h1>⚡ netmcp Worker</h1>
<p>See <code>/tools</code> · <code>/tools.json</code> · <code>/health</code> · <code>/auth/status</code></p>
</body></html>`,
    { headers: { "Content-Type": "text/html", ...corsHeaders } }
  );
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
