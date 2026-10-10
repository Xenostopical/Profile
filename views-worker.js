/**
 * Cyber Profile Views Counter Worker
 *
 * Replaces the (now-retired) counterapi.dev v1 API that script.js used to
 * call. counterapi.dev shut down v1 on Aug 7, 2026 — every request to it
 * 404s now, which is why the counter on the profile page was stuck. v2
 * requires a pre-registered account + workspace, so instead of depending on
 * another third party this Worker stores the count in your own Workers KV,
 * the same way discord-oauth-worker.js and image-host-worker.js already
 * handle their own jobs.
 *
 * Endpoint:
 *   GET /  -> increments the counter by 1 and returns { count }
 *
 * Setup (same flow you used for the other workers):
 *   1. wrangler kv namespace create xenostopic-views
 *   2. Paste the returned id into wrangler-views.toml
 *   3. wrangler deploy --config wrangler-views.toml
 *   4. Copy the resulting *.workers.dev URL into COUNTER_URL in script.js
 */

const ALLOWED_ORIGINS = new Set([
  // Production site
  "https://gg.overgrown.site.je",

  // Local development
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8000",

  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8000",
]);

const COUNT_KEY = "profile-views";

/*
 * Extra allowed origins (new hosts) come from the ALLOWED_ORIGINS Worker
 * variable, comma-separated, e.g. "https://USERNAME.github.io". Moving the
 * site then only needs a variable change, not a code edit.
 */
function loadExtraOrigins(env) {
  const extra = (env && env.ALLOWED_ORIGINS) || "";
  for (const o of String(extra).split(",")) {
    const clean = o.trim().replace(/\/$/, "");
    if (clean) ALLOWED_ORIGINS.add(clean);
  }
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow  = ALLOWED_ORIGINS.has(origin) ? origin : "https://gg.overgrown.site.je";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    loadExtraOrigins(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders(request),
      });
    }

    const current = parseInt((await env.VIEWS_KV.get(COUNT_KEY)) || "0", 10);
    const next = current + 1;
    await env.VIEWS_KV.put(COUNT_KEY, String(next));

    return new Response(JSON.stringify({ count: next }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...corsHeaders(request),
      },
    });
  },
};
