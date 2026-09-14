// Live "N online" counter — a Vercel Function backed by Redis.
//
// Each open page POSTs {id} every ~30s. We keep a sorted set of id → last-seen time,
// drop anyone not seen for WINDOW_MS, and return how many are left.
//
// Works with whichever Redis you connect in Vercel → Storage:
//   • Upstash for Redis  → KV_REST_API_URL + KV_REST_API_TOKEN (REST, preferred)
//   • Redis (Redis Cloud) or any redis:// URL → REDIS_URL / KV_URL
// Env var names with a custom prefix (e.g. STORAGE_KV_REST_API_URL) are found too.

import { createClient } from "redis";

const KEY = "bappa:online";
const WINDOW_MS = 90_000; // counted as online if seen in the last 90s
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const env = process.env;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// First env var whose name is exactly `name` or ends with `_${name}`
function findEnv(name) {
  if (env[name]) return { key: name, value: env[name] };
  const key = Object.keys(env).find((k) => k.endsWith(`_${name}`) && env[k]);
  return key ? { key, value: env[key] } : null;
}

function restConfig() {
  for (const [urlName, tokenName] of [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ]) {
    const url = findEnv(urlName);
    if (!url) continue;
    const prefix = url.key.slice(0, url.key.length - urlName.length);
    const token = env[prefix + tokenName] || findEnv(tokenName)?.value;
    if (token) return { url: url.value.replace(/\/$/, ""), token };
  }
  return null;
}

function tcpUrl() {
  return (findEnv("REDIS_URL") || findEnv("KV_URL"))?.value || null;
}

// Env var names (never values) that look Redis-related — shown when nothing usable is found.
const relatedEnvNames = () => Object.keys(env).filter((k) => /REDIS|KV|UPSTASH/i.test(k)).sort();

class NotConfigured extends Error {}

async function runRest({ url, token }, commands) {
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis rest ${res.status}`);
  const out = await res.json();
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(failed.error);
  return out.map((r) => r.result);
}

let tcpClient = null; // reused across invocations of a warm function
async function runTcp(url, commands) {
  if (!tcpClient) {
    tcpClient = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: false } });
    tcpClient.on("error", () => { /* handled per call */ });
    await tcpClient.connect().catch((err) => { tcpClient = null; throw err; });
  }
  try {
    const results = [];
    for (const cmd of commands) results.push(await tcpClient.sendCommand(cmd));
    return results;
  } catch (err) {
    tcpClient.destroy?.();
    tcpClient = null;
    throw err;
  }
}

async function run(commands) {
  const rest = restConfig();
  if (rest) return runRest(rest, commands);
  const url = tcpUrl();
  if (url) return runTcp(url, commands);
  throw new NotConfigured();
}

async function countWith(extra) {
  const now = Date.now();
  const results = await run([
    ...extra(now),
    ["ZREMRANGEBYSCORE", KEY, "-inf", String(now - WINDOW_MS)],
    ["ZCARD", KEY],
    ["PEXPIRE", KEY, String(WINDOW_MS * 2)],
  ]);
  return Number(results[results.length - 2]);
}

function errorResponse(err) {
  if (err instanceof NotConfigured) {
    return json({
      error: "presence store not configured",
      hint: "Connect Upstash for Redis (or Redis) in Vercel → Storage, then redeploy.",
      found: relatedEnvNames(),
    }, 503);
  }
  console.error("online counter:", err);
  return json({ error: "presence store error" }, 502);
}

// Heartbeat (and "leave" when the page closes)
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty or invalid body */
  }
  if (typeof body.id !== "string" || !ID_RE.test(body.id)) {
    return json({ error: "invalid id" }, 400);
  }
  try {
    const online = await countWith((now) =>
      body.leave ? [["ZREM", KEY, body.id]] : [["ZADD", KEY, String(now), body.id]]
    );
    return json({ online });
  } catch (err) {
    return errorResponse(err);
  }
}

// Read-only count — open /api/online in a browser to check the setup
export async function GET() {
  try {
    return json({ online: await countWith(() => []) });
  } catch (err) {
    return errorResponse(err);
  }
}
