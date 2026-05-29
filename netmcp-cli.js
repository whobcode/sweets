#!/usr/bin/env node

import fetch from "node-fetch";
import readline from "readline";

const NETMCP_URL = "https://netmcp.hwmnbn.me/mcp";
const FALLBACK_URL = "https://tru-bone.workers.dev/mcp";

// Available tools organized by category
const TOOLS = {
  browser: {
    screenshot: { desc: "Take screenshot of webpage", params: ["url"] },
    get_content: {
      desc: "Extract text from webpage",
      params: ["url"],
    },
    click: {
      desc: "Click element on page",
      params: ["url", "selector"],
    },
    fill_form: {
      desc: "Fill out form on page",
      params: ["url", "data"],
    },
    get_markdown: {
      desc: "Fetch page as markdown",
      params: ["url"],
    },
  },
  osint: {
    shodan_search: {
      desc: "Search Shodan for devices",
      params: ["query"],
    },
    censys_search: {
      desc: "Search Censys hosts",
      params: ["query"],
    },
    securitytrails_dns: {
      desc: "Query DNS history",
      params: ["domain"],
    },
    ipwhois_lookup: {
      desc: "Get IP geolocation/WHOIS",
      params: ["ip"],
    },
  },
  github: {
    github_search: {
      desc: "Search GitHub repositories",
      params: ["query"],
    },
    github_exploit_search: {
      desc: "Search GitHub for exploits",
      params: ["query"],
    },
  },
  security: {
    nvd_lookup: {
      desc: "Search NVD for CVE",
      params: ["cve"],
    },
    exploitdb_search: {
      desc: "Search ExploitDB",
      params: ["query"],
    },
    osv_scan: {
      desc: "Scan package for vulnerabilities",
      params: ["package"],
    },
  },
  image: {
    generate_image: {
      desc: "Generate image with AI",
      params: ["prompt"],
    },
  },
};

// Interactive CLI
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log("\n🔧 netmcp CLI Tool");
  console.log("==================\n");

  // List tools
  console.log("Available Tool Categories:");
  Object.entries(TOOLS).forEach(([cat, tools], idx) => {
    console.log(`\n${idx + 1}. ${cat.toUpperCase()}`);
    Object.entries(tools).forEach(([name, { desc }]) => {
      console.log(`   • ${name}: ${desc}`);
    });
  });

  const categoryNames = Object.keys(TOOLS);
  let categoryChoice = await question(
    `\nSelect category (1-${categoryNames.length}): `
  );
  const category = categoryNames[parseInt(categoryChoice) - 1];

  if (!category) {
    console.log("Invalid category");
    rl.close();
    return;
  }

  const tools = TOOLS[category];
  const toolNames = Object.keys(tools);
  console.log(`\n${category.toUpperCase()} Tools:`);
  toolNames.forEach((name, idx) => {
    console.log(`${idx + 1}. ${name}`);
  });

  let toolChoice = await question(`Select tool (1-${toolNames.length}): `);
  const toolName = toolNames[parseInt(toolChoice) - 1];
  const toolConfig = tools[toolName];

  if (!toolConfig) {
    console.log("Invalid tool");
    rl.close();
    return;
  }

  console.log(`\nTool: ${toolName}`);
  console.log(`Description: ${toolConfig.desc}`);

  const params = {};
  for (const param of toolConfig.params) {
    const value = await question(`Enter ${param}: `);
    params[param] = value;
  }

  console.log("\n⏳ Executing...\n");

  try {
    const response = await callTool(toolName, params);
    console.log("✅ Result:\n");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  rl.close();
}

async function callTool(toolName, params) {
  const payload = {
    jsonrpc: "2.0",
    id: "1",
    method: "tools/call",
    params: {
      name: toolName,
      arguments: params,
    },
  };

  try {
    const response = await fetch(NETMCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  } catch (error) {
    // Try fallback URL
    const fallbackResponse = await fetch(FALLBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!fallbackResponse.ok) {
      throw new Error(`Failed: ${error.message}`);
    }

    const data = await fallbackResponse.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }
}

main().catch(console.error);
