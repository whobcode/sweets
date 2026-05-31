#!/usr/bin/env node

/**
 * netmcp CLI
 *
 * Talks to the netmcp Worker (which handles OAuth + the MCP protocol), NOT the
 * raw netmcp endpoint — that one requires GitHub OAuth and the streamable-HTTP
 * MCP handshake, which a thin client can't do. The Worker exposes each tool at
 * GET/POST /tool/:name and returns plain JSON.
 *
 *   node netmcp-cli.js                      # interactive menu
 *   node netmcp-cli.js <tool> '{"k":"v"}'   # one-shot call
 *   NETMCP_API=https://host node netmcp-cli.js
 */

import readline from "readline";

const API = (process.env.NETMCP_API || "https://netapi.hwmnbn.me").replace(/\/$/, "");

// Real server tools grouped for the menu, with their parameters.
// (* marks required — keep in sync with the Worker's TOOL_SCHEMA.)
const TOOLS = {
  "Security / CVE": {
    nvd_cve_lookup: { desc: "Look up CVEs in the NVD", params: ["cveId", "keyword"] },
    osv_vulnerability_scan: { desc: "Scan a package for vulns", params: ["packageName*", "ecosystem*", "version"] },
    exploitdb_search: { desc: "Search ExploitDB", params: ["query", "platform", "type"] },
    exploitdb_get: { desc: "Fetch an ExploitDB entry by id", params: ["id*"] },
    exploitdb_info: { desc: "ExploitDB metadata", params: [] },
  },
  OSINT: {
    github_exploit_search: { desc: "Search GitHub for exploits", params: ["query*", "language", "limit"] },
    gitlab_code_search: { desc: "Search GitLab code", params: ["query*", "scope", "limit"] },
    shodan_device_search: { desc: "Search Shodan devices", params: ["query*", "facets", "limit"] },
    censys_host_search: { desc: "Search Censys hosts", params: ["query*", "perPage"] },
    securitytrails_dns_history: { desc: "Historical DNS", params: ["domain*", "type"] },
    ipwhois_enrichment: { desc: "IP geolocation / WHOIS", params: ["ip*"] },
    wayback_machine_lookup: { desc: "Wayback Machine snapshots", params: ["url*", "timestamp", "limit"] },
  },
  Browser: {
    browser_screenshot: { desc: "Screenshot a page", params: ["url*", "fullPage"] },
    browser_get_content: { desc: "Extract page text", params: ["url*", "selector"] },
    browser_get_markdown: { desc: "Page as markdown", params: ["url*"] },
    browser_pdf: { desc: "Render page to PDF", params: ["url*"] },
    browser_scrape: { desc: "Scrape via selectors", params: ["url*", "selectors*"] },
    browser_execute_script: { desc: "Run JS on a page", params: ["url*", "script*"] },
    browser_get_links: { desc: "Extract links", params: ["url*"] },
    browser_fill_form: { desc: "Fill a form", params: ["url*", "fields*"] },
    browser_click: { desc: "Click an element", params: ["url*", "selector*"] },
  },
  Misc: {
    add: { desc: "Add two numbers", params: ["a*", "b*"] },
    userInfoOctokit: { desc: "Authenticated GitHub user info", params: [] },
    generateImage: { desc: "Generate an image with AI", params: ["prompt*", "steps"] },
  },
};

const ALL = Object.assign({}, ...Object.values(TOOLS));

async function callTool(name, args) {
  const res = await fetch(`${API}/tool/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

/** Pretty-print an MCP tool result: text content first, then the raw object. */
function printResult(data) {
  const result = data.result || data;
  const texts = (result.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text);
  if (result.isError) console.log("\n⚠️  Tool reported an error:");
  if (texts.length) {
    console.log("\n" + texts.join("\n"));
  } else {
    console.log("\n" + JSON.stringify(result, null, 2));
  }
}

async function oneShot(name, jsonArgs) {
  if (!(name in ALL)) {
    console.error(`Unknown tool '${name}'. Available:\n  ${Object.keys(ALL).join("\n  ")}`);
    process.exit(1);
  }
  let args = {};
  if (jsonArgs) {
    try {
      args = JSON.parse(jsonArgs);
    } catch {
      console.error('Arguments must be valid JSON, e.g. \'{"ip":"8.8.8.8"}\'');
      process.exit(1);
    }
  }
  try {
    printResult(await callTool(name, args));
  } catch (e) {
    console.error("❌ " + e.message);
    process.exit(1);
  }
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));

  console.log("\n🔧 netmcp CLI");
  console.log(`API: ${API}\n`);

  const categories = Object.keys(TOOLS);
  categories.forEach((cat, i) => {
    console.log(`${i + 1}. ${cat}`);
    Object.entries(TOOLS[cat]).forEach(([n, { desc }]) => console.log(`     • ${n} — ${desc}`));
  });

  const catIdx = parseInt(await ask(`\nSelect category (1-${categories.length}): `), 10) - 1;
  const category = categories[catIdx];
  if (!category) {
    console.log("Invalid category");
    return rl.close();
  }

  const tools = TOOLS[category];
  const names = Object.keys(tools);
  names.forEach((n, i) => console.log(`${i + 1}. ${n}`));
  const toolIdx = parseInt(await ask(`Select tool (1-${names.length}): `), 10) - 1;
  const name = names[toolIdx];
  if (!name) {
    console.log("Invalid tool");
    return rl.close();
  }

  const args = {};
  for (const p of tools[name].params) {
    const key = p.replace(/\*$/, "");
    const required = p.endsWith("*");
    const val = await ask(`Enter ${key}${required ? " (required)" : ""}: `);
    if (val !== "") {
      // Try JSON (for object/array/number/bool params); fall back to string.
      try {
        args[key] = JSON.parse(val);
      } catch {
        args[key] = val;
      }
    }
  }

  console.log("\n⏳ Calling " + name + " ...");
  try {
    printResult(await callTool(name, args));
  } catch (e) {
    console.error("❌ " + e.message);
  }
  rl.close();
}

const [, , toolArg, argsArg] = process.argv;
if (toolArg) {
  oneShot(toolArg, argsArg);
} else {
  interactive().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
