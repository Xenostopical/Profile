
/**
 * Cyber Discord OAuth2 Worker
 *
 * Endpoints:
 *   GET  /api/oauth/config       -> public OAuth configuration only
 *   POST /api/oauth/exchange     -> exchange a one-time Discord code server-side
 *   POST /api/verify-turnstile   -> verify a Cloudflare Turnstile token server-side
 *
 * IMPORTANT:
 *   - DISCORD_CLIENT_SECRET and DISCORD_BOT_TOKEN stay in Worker secrets.
 *   - TURNSTILE_SECRET stays in Worker secrets.
 *   - The frontend only receives the public client ID, redirect URI and scopes.
 *   - OAuth verification can add the user to both the primary guild and the
 *     secondary verification guild using the same bot token.
 *   - No OAuth access token is returned to the browser.
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

const OAUTH_SCOPES = "identify guilds.join";

const REDIRECT_PATH = "/oauth-callback.html";


/*
 * Extra origins (new hosts) come from the ALLOWED_ORIGINS Worker variable,
 * comma-separated, e.g. "https://xenostopic-cyber.github.io,https://mysite.com".
 * That way moving the site never needs a code edit, only a variable change.
 */
function loadExtraOrigins(env) {
  const extra = (env && env.ALLOWED_ORIGINS) || "";

  for (const o of String(extra).split(",")) {
    const clean = o.trim().replace(/\/$/, "");
    if (clean) ALLOWED_ORIGINS.add(clean);
  }
}


/*
 * Work out which redirect_uri to use for the token exchange. It MUST be the
 * exact one the frontend used in the authorize step, so the frontend sends it
 * along. We only trust it if it sits on the (already allow-listed) origin that
 * made the request and points at the callback page, so it can't be abused as
 * an open redirect. Falls back to the DISCORD_REDIRECT_URI variable.
 */
function resolveRedirectUri(request, env, requested) {
  if (typeof requested === "string" && requested) {
    let u;

    try {
      u = new URL(requested);
    } catch {
      return null;
    }

    if (
      u.origin !== getRequestOrigin(request) ||
      !u.pathname.endsWith(REDIRECT_PATH) ||
      u.search ||
      u.hash
    ) {
      return null;
    }

    return u.origin + u.pathname;
  }

  return env.DISCORD_REDIRECT_URI || null;
}


function getRequestOrigin(request) {
  return request.headers.get("Origin") || "";
}


function isAllowedOrigin(request) {
  return ALLOWED_ORIGINS.has(
    getRequestOrigin(request)
  );
}


function corsHeaders(request) {

  const origin =
    getRequestOrigin(request);

  const headers = {
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Vary":
      "Origin",
  };

  if (
    ALLOWED_ORIGINS.has(origin)
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;
  }

  return headers;
}


function json(
  request,
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "X-Content-Type-Options":
          "nosniff",

        ...corsHeaders(request),
      },
    }
  );

}


function isPlausibleCode(code) {

  return (
    typeof code === "string" &&
    /^[\w.-]{10,256}$/.test(code)
  );

}


/* ==========================================
   SIMPLE RATE LIMIT
========================================== */

async function isRateLimited(request, bucket = "oauth-exchange") {

  const ip =
    request.headers.get(
      "CF-Connecting-IP"
    ) || "unknown";

  const cache =
    caches.default;

  const key =
    new Request(
      `https://ratelimit.internal/${bucket}/${ip}`
    );

  const hit =
    await cache.match(key);

  if (hit) {
    return true;
  }

  await cache.put(
    key,
    new Response("1", {
      headers: {
        "Cache-Control":
          "max-age=5",
      },
    })
  );

  return false;
}


/* ==========================================
   PUBLIC OAUTH CONFIG
========================================== */

async function handleConfig(
  request,
  env
) {

  if (
    request.method === "OPTIONS"
  ) {

    return new Response(
      null,
      {
        status: 204,

        headers:
          corsHeaders(request),
      }
    );

  }


  if (
    request.method !== "GET"
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Method not allowed.",
      },
      405
    );

  }


  if (
    !isAllowedOrigin(request)
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Forbidden.",
      },
      403
    );

  }


  if (
    !env.DISCORD_CLIENT_ID
  ) {

    console.log(
      "OAuth config misconfigured."
    );

    return json(
      request,
      {
        success:
          false,

        error:
          "Server misconfigured.",
      },
      500
    );

  }


  /*
   * ONLY public values are returned.
   *
   * Never return:
   *   DISCORD_CLIENT_SECRET
   *   DISCORD_BOT_TOKEN
   *   TURNSTILE_SECRET
   */

  return json(
    request,
    {
      success:
        true,

      clientId:
        env.DISCORD_CLIENT_ID,

      // Optional fallback only. The frontend derives its own redirect URI
      // from wherever it is hosted.
      redirectUri:
        env.DISCORD_REDIRECT_URI || null,

      scopes:
        OAUTH_SCOPES,
    }
  );

}


/* ==========================================
   TURNSTILE VERIFY
========================================== */

async function handleTurnstileVerify(
  request,
  env
) {

  if (
    request.method === "OPTIONS"
  ) {

    return new Response(
      null,
      {
        status: 204,

        headers:
          corsHeaders(request),
      }
    );

  }


  if (
    request.method !== "POST"
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Method not allowed.",
      },
      405
    );

  }


  if (
    !isAllowedOrigin(request)
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Forbidden.",
      },
      403
    );

  }


  if (
    !env.TURNSTILE_SECRET
  ) {

    console.log(
      "Turnstile secret missing."
    );

    return json(
      request,
      {
        success:
          false,

        error:
          "Turnstile is not configured.",
      },
      500
    );

  }


  /*
   * Throttle repeated verification requests
   * separately from the OAuth exchange bucket.
   */

  if (
    await isRateLimited(request, "verify-turnstile")
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Too many requests — slow down.",
      },
      429
    );

  }


  let bodyPayload;


  try {

    bodyPayload =
      await request.json();

  } catch {

    return json(
      request,
      {
        success:
          false,

        error:
          "Malformed request.",
      },
      400
    );

  }


  const token =
    bodyPayload &&
    bodyPayload.token;


  if (
    typeof token !== "string" ||
    token.length < 10 ||
    token.length > 4096
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Missing or invalid Turnstile token.",
      },
      400
    );

  }


  try {

    const formData =
      new FormData();

    formData.append(
      "secret",
      env.TURNSTILE_SECRET
    );

    formData.append(
      "response",
      token
    );

    const ip =
      request.headers.get(
        "CF-Connecting-IP"
      );

    if (ip) {
      formData.append(
        "remoteip",
        ip
      );
    }


    const verifyRes =
      await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method:
            "POST",

          body:
            formData,
        }
      );


    let result;

    try {

      result =
        await verifyRes.json();

    } catch {

      result = null;

    }


    if (
      !verifyRes.ok ||
      !result ||
      result.success !== true
    ) {

      console.log(
        "Turnstile verification failed",
        verifyRes.status,
        (result && result["error-codes"]) || []
      );

      return json(
        request,
        {
          success:
            false,

          error:
            "Security check could not be verified.",
        },
        403
      );

    }


    return json(
      request,
      {
        success:
          true,
      }
    );


  } catch (err) {

    console.log(
      "Turnstile verification error",
      err &&
      err.message
    );

    return json(
      request,
      {
        success:
          false,

        error:
          "Security verification service unavailable.",
      },
      502
    );

  }

}


/* ==========================================
   OAUTH CODE EXCHANGE
========================================== */

async function handleExchange(
  request,
  env
) {

  if (
    request.method === "OPTIONS"
  ) {

    return new Response(
      null,
      {
        status: 204,

        headers:
          corsHeaders(request),
      }
    );

  }


  if (
    request.method !== "POST"
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Method not allowed.",
      },
      405
    );

  }


  if (
    !isAllowedOrigin(request)
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Forbidden.",
      },
      403
    );

  }


  /*
   * Required configuration
   */

  if (
    !env.DISCORD_CLIENT_ID ||
    !env.DISCORD_CLIENT_SECRET
  ) {

    console.log(
      "OAuth worker misconfigured."
    );

    return json(
      request,
      {
        success:
          false,

        error:
          "Server misconfigured.",
      },
      500
    );

  }


  /*
   * Throttle repeated code exchange requests.
   */

  if (
    await isRateLimited(request, "oauth-exchange")
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Too many requests — slow down.",
      },
      429
    );

  }


  let bodyPayload;


  try {

    bodyPayload =
      await request.json();

  } catch {

    return json(
      request,
      {
        success:
          false,

        error:
          "Malformed request.",
      },
      400
    );

  }


  const code =
    bodyPayload &&
    bodyPayload.code;


  if (
    !isPlausibleCode(code)
  ) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Missing or invalid authorization code.",
      },
      400
    );

  }


  const redirectUri =
    resolveRedirectUri(
      request,
      env,
      bodyPayload.redirectUri
    );


  if (!redirectUri) {

    return json(
      request,
      {
        success:
          false,

        error:
          "Invalid redirect URI.",
      },
      400
    );

  }


  try {

    /* =====================================
       DISCORD TOKEN EXCHANGE
    ====================================== */

    const tokenRes =
      await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            new URLSearchParams({

              client_id:
                env.DISCORD_CLIENT_ID,

              client_secret:
                env.DISCORD_CLIENT_SECRET,

              grant_type:
                "authorization_code",

              code:
                code,

              redirect_uri:
                redirectUri,

            }),
        }
      );


    if (
      !tokenRes.ok
    ) {

      const errText =
        await tokenRes.text();


      console.log(
        "Discord token exchange failed",
        tokenRes.status,
        errText
      );


      return json(
        request,
        {
          success:
            false,

          error:
            "Discord rejected the authorization code.",
        },
        400
      );

    }


    const tokenData =
      await tokenRes.json();


    if (
      !tokenData ||
      !tokenData.access_token ||
      !tokenData.token_type
    ) {

      return json(
        request,
        {
          success:
            false,

          error:
            "Discord returned an invalid token response.",
        },
        502
      );

    }


    /* =====================================
       FETCH DISCORD USER
    ====================================== */

    const meRes =
      await fetch(
        "https://discord.com/api/users/@me",
        {
          headers: {
            Authorization:
              `${tokenData.token_type} ${tokenData.access_token}`,
          },
        }
      );


    if (
      !meRes.ok
    ) {

      return json(
        request,
        {
          success:
            false,

          error:
            "Failed to fetch Discord profile.",
        },
        502
      );

    }


    const me =
      await meRes.json();


    if (
      !me ||
      !me.id ||
      !me.username
    ) {

      return json(
        request,
        {
          success:
            false,

          error:
            "Unexpected response from Discord.",
        },
        502
      );

    }


    /* =====================================
       DISCORD AVATAR
    ====================================== */

    const avatarUrl =
      me.avatar

        ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128`

        : `https://cdn.discordapp.com/embed/avatars/${
            Number(
              BigInt(me.id) >> 22n
            ) % 6
          }.png`;


    /* =====================================
       GUILD JOIN
    ====================================== */

    if (
      !env.DISCORD_BOT_TOKEN ||
      !env.DISCORD_GUILD_ID
    ) {

      console.log(
        "Guild join configuration missing."
      );


      return json(
        request,
        {
          success:
            false,

          error:
            "Server join is not configured.",
        },
        500
      );

    }


    /*
     * The same bot is used for both verification destinations.
     * The existing primary guild remains configurable through
     * DISCORD_GUILD_ID, while the second verification server is
     * fixed here as requested. If you later want to change it
     * without editing code, set DISCORD_SECOND_GUILD_ID in the
     * Worker environment.
     */
    const secondGuildId =
      env.DISCORD_SECOND_GUILD_ID ||
      "1553683927300964413";

    const guildIds =
      [...new Set([
        env.DISCORD_GUILD_ID,
        secondGuildId,
      ])].filter(Boolean);

    const joinedGuilds =
      await joinGuilds(
        env,
        me.id,
        tokenData.access_token,
        guildIds
      );


    /*
     * Only report success when the user is confirmed in every
     * configured verification server. This keeps the existing
     * gate behaviour compatible while making the second server
     * part of the same verification flow.
     */

    if (
      !joinedGuilds.every(Boolean)
    ) {

      return json(
        request,
        {
          success:
            false,

          error:
            "Discord authorization succeeded, but one or more server joins could not be confirmed.",

          user: {
            id:
              me.id,

            username:
              me.global_name ||
              me.username,

            avatarUrl:
              avatarUrl,
          },

          joinedGuild:
            false,

          joinedGuilds:
            guildIds.map((guildId, index) => ({
              guildId,
              joined: joinedGuilds[index] === true,
            })),
        },
        403
      );

    }


    /* =====================================
       SUCCESS
    ====================================== */

    return json(
      request,
      {
        success:
          true,

        user: {

          id:
            me.id,

          username:
            me.global_name ||
            me.username,

          avatarUrl:
            avatarUrl,

        },

        joinedGuild:
          true,
      }
    );


  } catch (err) {

    console.log(
      "OAuth exchange error",
      err &&
      err.message
    );


    return json(
      request,
      {
        success:
          false,

        error:
          "Unexpected error during authorization.",
      },
      500
    );

  }

}


/* ==========================================
   ADD USER TO MULTIPLE GUILDS
========================================== */

async function joinGuild(
  env,
  userId,
  userAccessToken,
  guildId
) {

  try {

    const res =
      await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
        {
          method:
            "PUT",

          headers: {

            "Content-Type":
              "application/json",

            Authorization:
              `Bot ${env.DISCORD_BOT_TOKEN}`,

          },

          body:
            JSON.stringify({
              access_token:
                userAccessToken,
            }),

        }
      );


  /*
   * 201 = newly added
   * 204 = already a member
   */

  if (
    res.status === 201 ||
    res.status === 204
  ) {

    return true;

  }


  const errText =
    await res.text();


  console.log(
    "Guild join failed",
    guildId,
    res.status,
    errText
  );


  return false;


  } catch (err) {

    console.log(
      "Guild join error",
      guildId,
      err &&
      err.message
    );


    return false;

  }

}


async function joinGuilds(
  env,
  userId,
  userAccessToken,
  guildIds
) {

  return Promise.all(
    guildIds.map(guildId =>
      joinGuild(
        env,
        userId,
        userAccessToken,
        guildId
      )
    )
  );
}


/* ==========================================
   ROUTER
========================================== */

export default {

  async fetch(
    request,
    env
  ) {

    loadExtraOrigins(env);

    const url =
      new URL(request.url);


    if (
      url.pathname ===
      "/api/oauth/config"
    ) {

      return handleConfig(
        request,
        env
      );

    }


    if (
      url.pathname ===
      "/api/oauth/exchange"
    ) {

      return handleExchange(
        request,
        env
      );

    }


    if (
      url.pathname ===
      "/api/verify-turnstile"
    ) {

      return handleTurnstileVerify(
        request,
        env
      );

    }


    return new Response(
      "Not found",
      {
        status:
          404,

        headers: {
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );

  },

};
