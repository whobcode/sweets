#!/usr/bin/env node

/**
 * netmcp Worker smoke test
 *
 * Exercises the deployed Worker (auth + MCP protocol live behind it).
 *   node test-netmcp.js
 *   NETMCP_API=https://host node test-netmcp.js
 */

const API = (process.env.NETMCP_API || "https://netapi.hwmnbn.me").replace(/\/$/, "");

let passed = 0;
let failed = 0;

async function test(description, fn) {
  process.stdout.write(`Testing: ${description}... `);
  try {
    await fn();
    console.log("✓ PASS");
    passed++;
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    failed++;
  }
}

async function getJson(path, init) {
  const res = await fetch(`${API}${path}`, init);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function runTests() {
  console.log("\n🧪 netmcp Worker Test Suite");
  console.log(`API: ${API}\n` + "=".repeat(50) + "\n");

  await test("/health responds ok", async () => {
    const { res, data } = await getJson("/health");
    if (!res.ok || data.status !== "ok") throw new Error(`status ${res.status}`);
  });

  await test("/auth/status can mint a token", async () => {
    const { res, data } = await getJson("/auth/status");
    if (!res.ok || !data.ok) throw new Error(data.reason || `HTTP ${res.status}`);
  });

  await test("/tools.json lists tools", async () => {
    const { res, data } = await getJson("/tools.json");
    if (!res.ok || !Array.isArray(data.tools) || data.tools.length === 0) {
      throw new Error(`got ${data.count} tools`);
    }
  });

  await test("add(20,22) == 42 (GET, type coercion)", async () => {
    const { data } = await getJson("/tool/add?a=20&b=22");
    const text = data.result?.content?.find((c) => c.type === "text")?.text;
    if (text !== "42") throw new Error(`got ${text}`);
  });

  await test("ipwhois_enrichment returns data (POST)", async () => {
    const { data } = await getJson("/tool/ipwhois_enrichment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: "8.8.8.8" }),
    });
    const text = data.result?.content?.find((c) => c.type === "text")?.text || "";
    if (!text.includes("8.8.8.8")) throw new Error("no WHOIS data");
  });

  await test("unknown tool returns 404", async () => {
    const { res, data } = await getJson("/tool/definitely_not_a_tool");
    if (res.status !== 404 || !data.available) throw new Error(`HTTP ${res.status}`);
  });

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Results — ✓ ${passed} passed, ✗ ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
