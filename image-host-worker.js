/**
 * Cyber Image Host — R2-free upload Worker.
 *
 * The static portfolio site POSTs images here. Instead of requiring a
 * Cloudflare R2 binding, this Worker forwards the upload to picrd.com's
 * free image-hosting API and returns the same shape the frontend expects.
 *
 * No R2 bucket is required.
 *
 * Endpoint:
 *   POST /api/upload
 *
 * Frontend request field:
 *   image=<file>
 *
 * Successful response:
 *   {
 *     success: true,
 *     id: "...",
 *     viewUrl: "https://picrd.com/...",
 *     rawUrl: "https://i.picrd.com/..."
 *   }
 */

const SITE_NAME = 'Cyber Image Host';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const PICRD_UPLOAD_URL = 'https://picrd.com/api/upload';
const DEFAULT_ORIGIN = 'https://gg.overgrown.site.je';
const ALLOWED_ORIGINS = new Set([DEFAULT_ORIGIN]);

// Extra origins come from the ALLOWED_ORIGINS Worker variable
// (comma-separated, e.g. "https://USERNAME.github.io").
function loadExtraOrigins(env) {
  const extra = (env && env.ALLOWED_ORIGINS) || '';
  for (const o of String(extra).split(',')) {
    const clean = o.trim().replace(/\/$/, '');
    if (clean) ALLOWED_ORIGINS.add(clean);
  }
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

function isAllowedOrigin(request) {
  const origin = request.headers.get('Origin');
  // Direct requests (e.g. curl) have no Origin. We still allow the Worker
  // to be tested directly, while browser cross-origin requests are locked
  // to the production site above.
  return !origin || ALLOWED_ORIGINS.has(origin);
}

async function handleUpload(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return json(request, { success: false, error: 'Method not allowed.' }, 405);
  }

  if (!isAllowedOrigin(request)) {
    return json(request, { success: false, error: 'Forbidden.' }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json(request, { success: false, error: 'Malformed upload.' }, 400);
  }

  const file = form.get('image');
  if (!file || typeof file === 'string') {
    return json(request, { success: false, error: 'No image was provided.' }, 400);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return json(
      request,
      {
        success: false,
        error: 'Unsupported file type. Please upload a PNG, JPEG, GIF, or WEBP image.',
      },
      415,
    );
  }

  if (file.size === 0) {
    return json(request, { success: false, error: 'The uploaded file is empty.' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return json(
      request,
      {
        success: false,
        error: `Image exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.`,
      },
      413,
    );
  }

  try {
    const upstreamForm = new FormData();
    upstreamForm.append('file', file, file.name || 'upload');
    upstreamForm.append('visibility', 'unlisted');
    // Deliberately omit ttl_seconds so picrd returns a non-expiring upload.

    const upstream = await fetch(PICRD_UPLOAD_URL, {
      method: 'POST',
      body: upstreamForm,
    });

    let data = null;
    try {
      data = await upstream.json();
    } catch {
      data = null;
    }

    if (!upstream.ok || !data || !data.image_id || !data.image_url) {
      console.log('picrd upload failed', upstream.status, data);
      return json(
        request,
        {
          success: false,
          error: 'The image storage service rejected the upload. Please try again.',
        },
        upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502,
      );
    }

    return json(
      request,
      {
        success: true,
        id: data.image_id,
        viewUrl: data.page_url || `https://picrd.com/${data.image_id}`,
        rawUrl: data.image_url,
      },
      201,
    );
  } catch (err) {
    console.log('picrd upload error', err && err.message);
    return json(
      request,
      { success: false, error: 'Image storage service unavailable. Please try again.' },
      502,
    );
  }
}

export default {
  async fetch(request, env) {
    loadExtraOrigins(env);
    const url = new URL(request.url);

    if (url.pathname === '/api/upload') {
      return handleUpload(request);
    }

    return new Response('Not found', {
      status: 404,
      headers: { 'X-Content-Type-Options': 'nosniff' },
    });
  },
};
