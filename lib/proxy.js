// proxy.js
// ---------------------------------------------------------------------------
// Single point of egress through the Webshare proxy.
//
// Every byte that flows through `proxiedFetch` counts against your 1 GB
// Webshare allowance, so this is the ONLY place in the codebase that is
// allowed to touch workrooms.ucalgary.ca. Nothing user-facing calls it.
// The cron poller (api/refresh.js -> DataRetrieval.js) is the only caller.
//
// Two things matter for bandwidth here:
//   1. We use undici's ProxyAgent as `dispatcher`. Node 18+ global fetch does
//      NOT honour the `agent` option (that was a node-fetch thing) — it needs
//      `dispatcher`. Using `agent` silently sends traffic straight to the
//      origin, bypassing Webshare, which "works" until you get IP-blocked.
//   2. We request gzip/br. For HTTPS the proxy tunnels the (compressed,
//      encrypted) TLS bytes, so a compressed body = fewer metered bytes.
// ---------------------------------------------------------------------------

import { ProxyAgent } from 'undici';

const PROXY_HOST = process.env.WEBSHARE_HOST || '';
const PROXY_PORT = process.env.WEBSHARE_PORT || '';
const PROXY_USER = process.env.WEBSHARE_USER || '';
const PROXY_PASS = process.env.WEBSHARE_PASS || '';

const ORIGIN = 'https://workrooms.ucalgary.ca';

// Build one dispatcher and reuse it (keep-alive) so we don't pay a fresh
// TLS handshake — through the proxy — on every single request.
const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
const dispatcher = new ProxyAgent(proxyUrl);

/**
 * Fetch a path on workrooms.ucalgary.ca THROUGH the Webshare proxy.
 * @param {string} endpoint  e.g. '/spaces/availability/grid' or '/space/12345'
 * @param {{method?: string, body?: string, headers?: object}} [opts]
 * @returns {Promise<Response>}
 */
export async function proxiedFetch(endpoint, opts = {}) {
  const { method = 'GET', body, headers = {} } = opts;

  return fetch(`${ORIGIN}${endpoint}`, {
    method,
    dispatcher, // route via Webshare (undici global fetch uses `dispatcher`, not `agent`)
    body,
    headers: {
      // Ask the origin to compress. undici transparently decompresses when you
      // read .json()/.text(), but the bytes on the wire (and through Webshare)
      // stay compressed — that is where the saving is.
      'Accept-Encoding': 'gzip, deflate, br',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${ORIGIN}/reserve/workrooms`,
      Origin: ORIGIN,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      ...headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Backward-compatible HTTP handler.
//
// You generally should NOT expose this to browsers any more — if every user
// hits it, Webshare usage scales with your user count and 1 GB is gone fast.
// Kept only so existing calls don't break during migration. Prefer:
//   - cron  -> /api/refresh   (writes fresh data to Supabase via Webshare)
//   - users -> /api/availability (reads Supabase, never touches Webshare)
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint parameter' });

  try {
    const upstream = await proxiedFetch(endpoint, {
      method: req.method,
      headers: { 'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:
        req.method === 'POST'
          ? typeof req.body === 'object'
            ? new URLSearchParams(req.body).toString()
            : req.body
          : undefined,
    });

    const text = await upstream.text();
    return res.status(upstream.status).send(text);
  } catch (error) {
    console.error('Webshare Proxy Route Error:', error);
    return res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}