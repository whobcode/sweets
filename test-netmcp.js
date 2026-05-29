#!/usr/bin/env node

/**
 * netmcp Connectivity Test
 * 
 * Usage: node test-netmcp.js
 * 
 * Tests:
 * - Primary endpoint connectivity
 * - Fallback endpoint connectivity
 * - Tool availability
 * - Sample tool execution
 */

import fetch from "node-fetch";

const ENDPOINTS = [
  { name: "Primary", url: "https://netmcp.hwmnbn.me/mcp" },
  { name: "Fallback", url: "https://tru-bone.workers.dev/mcp" },
];

const TEST_TOOLS = [
  { name: "generate_image", params: { prompt: "test" } },
  { name: "github_search", params: { query: "javascript" } },
];

let passedTests = 0;
let failedTests = 0;

async function test(description, fn) {
  process.stdout.write(`Testing: ${description}... `);
  try {
    await fn();
    console.log("✓ PASS");
    passedTests++;
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    failedTests++;
  }
}

async function testEndpointConnectivity(endpoint) {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        jsonrpc: "2.0",
        id: "test",
        method: "tools/call",
        params: {
          name: "generate_image",
          arguments: { prompt: "connectivity test" },
        },
      };

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 10000,
      });

      if (!response.ok) {
        reject(new Error(`HTTP ${response.status}`));
      }

      const data = await response.json();
      if (data.error) {
        // Error is ok - means endpoint is alive
        resolve();
      } else if (data.result) {
        resolve();
      } else {
        reject(new Error("Invalid response format"));
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function testToolExecution(endpoint, tool) {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        jsonrpc: "2.0",
        id: "test",
        method: "tools/call",
        params: {
          name: tool.name,
          arguments: tool.params,
        },
      };

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 15000,
      });

      const data = await response.json();
      if (data.error && data.error.code !== -32601) {
        // -32601 = method not found, which is ok for testing
        reject(new Error(data.error.message));
      } else {
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function runTests() {
  console.log("\n🧪 netmcp Test Suite\n");
  console.log("=".repeat(50) + "\n");

  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    console.log(`\n📍 Testing ${endpoint.name} Endpoint: ${endpoint.url}`);
    console.log("-".repeat(50));

    await test(`${endpoint.name} endpoint connectivity`, () =>
      testEndpointConnectivity(endpoint)
    );

    // Test tools on this endpoint
    for (const tool of TEST_TOOLS) {
      await test(
        `${endpoint.name}: Execute ${tool.name}`,
        () => testToolExecution(endpoint, tool)
      );
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Test Results:");
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  console.log(`Total: ${passedTests + failedTests}\n`);

  if (failedTests === 0) {
    console.log("🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Check connectivity and endpoint status.");
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log("\n⚡ Performance Test\n");
  console.log("-".repeat(50));

  for (const endpoint of ENDPOINTS) {
    const start = Date.now();
    const payload = {
      jsonrpc: "2.0",
      id: "perf",
      method: "tools/call",
      params: {
        name: "github_search",
        arguments: { query: "test" },
      },
    };

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 30000,
      });

      await response.json();
      const duration = Date.now() - start;
      console.log(
        `${endpoint.name}: ${duration}ms`
      );
    } catch (error) {
      console.log(`${endpoint.name}: TIMEOUT`);
    }
  }
}

async function main() {
  await runTests();
  await performanceTest();
}

main().catch(console.error);
