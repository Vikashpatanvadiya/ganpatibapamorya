// Live "N online" counter — a Vercel Function backed by Upstash Redis (REST API, no npm deps).
//
// Each open page POSTs {id} every ~30s. We keep a sorted set of id → last-seen time,
// drop anyone not seen for WINDOW_MS, and return how many are left.
//
// Needs these env vars (added automatically when you connect Upstash Redis to the
// project from Vercel → Storage / Marketplace):
//   KV_REST_API_URL + KV_REST_API_TOKEN   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)

const KEY = "bappa:online";
const WINDOW_MS = 90_000; // counted as online if seen in the last 90s
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function redis(commands) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("not-configured");

  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis-${res.status}`);
  const out = await res.json();
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(failed.error);
  return out.map((r) => r.result);
}

async function countWith(commands) {
  const now = Date.now();
  const results = await redis([
    ...commands(now),
    ["ZREMRANGEBYSCORE", KEY, "-inf", String(now - WINDOW_MS)],
    ["ZCARD", KEY],
    ["PEXPIRE", KEY, String(WINDOW_MS * 2)],
  ]);
  return results[results.length - 2];
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
    const notConfigured = err.message === "not-configured";
    return json({ error: notConfigured ? "presence store not configured" : "presence store error" }, notConfigured ? 503 : 502);
  }
}

// Read-only count (handy for checking the setup in a browser)
export async function GET() {
  try {
    return json({ online: await countWith(() => []) });
  } catch (err) {
    return json({ error: err.message === "not-configured" ? "presence store not configured" : "presence store error" }, 503);
  }
}
