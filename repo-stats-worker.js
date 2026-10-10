/**
 * Self-Hosted Git Replica — Repo Stats Worker
 *
 * Same pattern as views-worker.js: a tiny Cloudflare Worker backed by
 * Workers KV, running on your own account, so the repo cards can show a
 * live "clones / downloads" counter without calling any third-party API
 * (GitHub's repo stats included).
 *
 * Endpoints (all GET, all CORS-enabled):
 *   GET /?repo=<id>              -> current { clones, downloads } for that
 *                                    repo, WITHOUT incrementing anything.
 *                                    Used on page load to show the current
 *                                    numbers.
 *   GET /?repo=<id>&hit=clone    -> increments clones by 1, returns the
 *                                    updated { clones, downloads }. Called
 *                                    when the Clone button is clicked.
 *   GET /?repo=<id>&hit=zip      -> increments downloads by 1, returns the
 *                                    updated { clones, downloads }. Called
 *                                    when the Download ZIP button is
 *                                    clicked.
 *   GET /?all=1                  -> { "<id>": { clones, downloads }, ... }
 *                                    for every repo that has a stored
 *                                    counter yet. Used for the site-wide
 *                                    total shown on the main repo grid.
 *
 * Setup (same flow as views-worker.js):
 *   1. wrangler kv namespace create xenostopic-repo-stats
 *   2. Paste the returned id into wrangler-repostats.toml
 *   3. wrangler deploy --config wrangler-repostats.toml
 *   4. Copy the resulting *.workers.dev URL into REPO_STATS_URL in script.js
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

function keyFor(repo) {
  return `repo-stats:${repo}`;
}

async function readCounts(kv, repo) {
  const raw = await kv.get(keyFor(repo));
  if (!raw) return { clones: 0, downloads: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      clones: Number(parsed.clones) || 0,
      downloads: Number(parsed.downloads) || 0,
    };
  } catch (_) {
    return { clones: 0, downloads: 0 };
  }
}

export default {
  async fetch(request, env) {
    loadExtraOrigins(env);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders(request) });
    }

    const url  = new URL(request.url);
    const repo = url.searchParams.get("repo");
    const hit  = url.searchParams.get("hit"); // "clone" | "zip" | null
    const all  = url.searchParams.get("all");

    const jsonHeaders = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    };

    if (all) {
      const list = await env.REPO_STATS_KV.list({ prefix: "repo-stats:" });
      const out = {};
      for (const { name } of list.keys) {
        const id = name.slice("repo-stats:".length);
        out[id] = await readCounts(env.REPO_STATS_KV, id);
      }
      return new Response(JSON.stringify(out), { status: 200, headers: jsonHeaders });
    }

    if (!repo) {
      return new Response(JSON.stringify({ error: "missing ?repo=" }), { status: 400, headers: jsonHeaders });
    }

    const current = await readCounts(env.REPO_STATS_KV, repo);

    if (hit === "clone") current.clones += 1;
    else if (hit === "zip") current.downloads += 1;

    if (hit === "clone" || hit === "zip") {
      await env.REPO_STATS_KV.put(keyFor(repo), JSON.stringify(current));
    }

    return new Response(JSON.stringify(current), { status: 200, headers: jsonHeaders });
  },
};
