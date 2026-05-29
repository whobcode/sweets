/**
 * KV-backed OAuth token manager for the netmcp upstream.
 *
 * netmcp issues short-lived access tokens and ROTATING refresh tokens (each
 * refresh invalidates the previous refresh token). A stateless Worker therefore
 * can't hold a static token — we persist the latest refresh token in KV
 * (binding: NETMCP_AUTH, key: "auth") and re-mint access tokens on demand,
 * caching each access token until just before it expires.
 *
 * KV "auth" value shape:
 *   { refresh_token: string, access_token: string|null, access_expires_at: number }
 */

const KV_KEY = "auth";
// Leave a small margin so we never hand back a token that's about to expire.
const EXPIRY_MARGIN_MS = 5000;

async function refresh(env, refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.NETMCP_CLIENT_ID,
  });

  const res = await fetch(env.NETMCP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`netmcp token refresh failed: ${detail}`);
  }
  return data;
}

/**
 * Returns a valid netmcp access token, refreshing (and persisting the rotated
 * refresh token) when the cached one is missing or expired.
 */
export async function getAccessToken(env) {
  const now = Date.now();
  const raw = await env.NETMCP_AUTH.get(KV_KEY);
  if (!raw) {
    throw new Error(
      "No auth state in KV. Seed the 'auth' key with a JSON object containing a refresh_token."
    );
  }

  const state = JSON.parse(raw);

  // Reuse the cached access token while it's still comfortably valid.
  if (state.access_token && state.access_expires_at > now + EXPIRY_MARGIN_MS) {
    return state.access_token;
  }

  if (!state.refresh_token) {
    throw new Error("No refresh_token in KV auth state — re-run the OAuth flow.");
  }

  const refreshed = await refresh(env, state.refresh_token);
  const ttlSec = Math.min(
    Number(refreshed.expires_in) || 3600,
    Number(env.NETMCP_TOKEN_TTL) || 60
  );

  const next = {
    // Refresh tokens rotate — persist the new one (fall back to the old if the
    // server didn't return a fresh one).
    refresh_token: refreshed.refresh_token || state.refresh_token,
    access_token: refreshed.access_token,
    access_expires_at: now + ttlSec * 1000,
  };
  await env.NETMCP_AUTH.put(KV_KEY, JSON.stringify(next));
  return next.access_token;
}

/**
 * Diagnostic helper. Confirms the Worker can produce a valid access token
 * WITHOUT ever returning the token itself.
 */
export async function authStatus(env) {
  const raw = await env.NETMCP_AUTH.get(KV_KEY);
  if (!raw) return { ok: false, reason: "no auth state in KV" };
  const state = JSON.parse(raw);

  try {
    const token = await getAccessToken(env);
    const after = JSON.parse(await env.NETMCP_AUTH.get(KV_KEY));
    return {
      ok: true,
      access_token_present: Boolean(token),
      access_token_prefix: token ? `${token.slice(0, 12)}…` : null,
      access_expires_in_ms: Math.max(0, after.access_expires_at - Date.now()),
      has_refresh_token: Boolean(after.refresh_token),
    };
  } catch (e) {
    return {
      ok: false,
      reason: e.message,
      has_refresh_token: Boolean(state.refresh_token),
    };
  }
}
