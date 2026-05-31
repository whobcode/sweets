/**
 * Minimal client for the netmcp streamable-HTTP MCP transport.
 *
 * The server is NOT plain JSON-RPC. A working call requires:
 *   1. `Authorization: Bearer <token>` (see auth.js)
 *   2. `Accept: application/json, text/event-stream`
 *   3. An `initialize` request → server returns an `Mcp-Session-Id` header
 *   4. A `notifications/initialized` notification
 *   5. The actual `tools/call` / `tools/list` request, carrying the session id
 * Responses come back as Server-Sent Events (`event: message\ndata: {...}`).
 */

import { getAccessToken } from "./auth.js";

const PROTOCOL_VERSION = "2024-11-05";

/** Extract the first JSON-RPC object from an SSE (or plain-JSON) response body. */
function parseSSE(text) {
  // Plain JSON (some errors come back without SSE framing).
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through to SSE parsing */
    }
  }
  // SSE: collect `data:` lines and parse the first that is a JSON object.
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      return JSON.parse(payload);
    } catch {
      /* keep scanning */
    }
  }
  throw new Error(`Unparseable MCP response: ${text.slice(0, 200)}`);
}

function baseHeaders(token, sessionId) {
  const h = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
    "Mcp-Protocol-Version": PROTOCOL_VERSION,
  };
  if (sessionId) h["Mcp-Session-Id"] = sessionId;
  return h;
}

/** Open a session: initialize handshake + initialized notification. */
async function openSession(env, token) {
  const initRes = await fetch(env.NETMCP_URL, {
    method: "POST",
    headers: baseHeaders(token),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "init",
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "sweets-netmcp-api", version: "1.0.0" },
      },
    }),
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw new Error(`MCP initialize failed (HTTP ${initRes.status}): ${body.slice(0, 200)}`);
  }

  const sessionId = initRes.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("MCP initialize did not return an Mcp-Session-Id");
  // Drain the init body so the connection is reusable / closed cleanly.
  await initRes.text();

  // Tell the server we're ready (fire-and-forget; 202 expected).
  await fetch(env.NETMCP_URL, {
    method: "POST",
    headers: baseHeaders(token, sessionId),
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  return sessionId;
}

/** Issue a single JSON-RPC request within a session and return the parsed result. */
async function rpc(env, token, sessionId, method, params, id = "1") {
  const res = await fetch(env.NETMCP_URL, {
    method: "POST",
    headers: baseHeaders(token, sessionId),
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  const text = await res.text();
  const msg = parseSSE(text);

  if (msg.error) {
    const e = new Error(msg.error.message || "MCP error");
    e.code = msg.error.code;
    e.data = msg.error.data;
    throw e;
  }
  return msg.result;
}

/** Call a tool by name. Returns the MCP `result` (with `.content`). */
export async function callTool(env, name, args) {
  const token = await getAccessToken(env);
  const sessionId = await openSession(env, token);
  return rpc(env, token, sessionId, "tools/call", { name, arguments: args || {} });
}

/** List the tools the server actually exposes. */
export async function listTools(env) {
  const token = await getAccessToken(env);
  const sessionId = await openSession(env, token);
  const result = await rpc(env, token, sessionId, "tools/list", {});
  return result.tools || [];
}
