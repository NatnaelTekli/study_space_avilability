// worker/proxy.js
// ---------------------------------------------------------------------------
// Single point of egress through the Webshare proxy.
//
// Every byte that flows through `proxiedFetch` counts against your 1 GB
// Webshare allowance, so this is the ONLY place in the codebase that is
// allowed to touch workrooms.ucalgary.ca. Nothing user-facing calls it.
// The cron poller (scheduled() -> availabilityPoller.js) is the only caller.
//
// Why this is hand-rolled instead of fetch():
//   Cloudflare Workers' fetch() has no proxy/dispatcher option, and undici's
//   ProxyAgent (what the Vercel version used) needs Node's net/tls modules,
//   which Workers do not have. So we do by hand what ProxyAgent did:
//     1. open a TCP socket to Webshare (cloudflare:sockets)
//     2. send `CONNECT workrooms.ucalgary.ca:443` with proxy credentials
//     3. upgrade the tunnel to TLS for workrooms.ucalgary.ca (startTls)
//     4. speak plain HTTP/1.1 over it and turn the reply into a Response
//   There is deliberately NO fallback to a direct fetch — that would quietly
//   bypass Webshare and send traffic straight to the origin.
//
// Bandwidth: we request gzip/deflate (not br — Workers' DecompressionStream
// can't decode Brotli). The tunnel carries the compressed, encrypted bytes,
// so a compressed body = fewer metered bytes.
// ---------------------------------------------------------------------------

import { connect } from 'cloudflare:sockets';
import { env } from 'cloudflare:workers';

const ORIGIN_HOST = 'workrooms.ucalgary.ca';
const ORIGIN = `https://${ORIGIN_HOST}`;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CRLF = encoder.encode('\r\n');
const CRLFCRLF = encoder.encode('\r\n\r\n');

function indexOfBytes(haystack, needle, from = 0) {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function concatBytes(chunks) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

async function writeAll(writable, ...parts) {
  const writer = writable.getWriter();
  for (const p of parts) await writer.write(typeof p === 'string' ? encoder.encode(p) : p);
  writer.releaseLock();
}

/** Read from `reader` until the end of an HTTP header block. */
async function readHead(reader) {
  let buf = new Uint8Array(0);
  for (;;) {
    const end = indexOfBytes(buf, CRLFCRLF);
    if (end !== -1) return decoder.decode(buf.subarray(0, end));
    const { value, done } = await reader.read();
    if (done) throw new Error('proxy closed the connection during CONNECT');
    buf = concatBytes([buf, value]);
  }
}

async function readAll(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(chunk);
  return concatBytes(chunks);
}

/** Undo `Transfer-Encoding: chunked`. */
function dechunk(bytes) {
  const out = [];
  let i = 0;
  for (;;) {
    const lineEnd = indexOfBytes(bytes, CRLF, i);
    if (lineEnd === -1) break;
    const size = parseInt(decoder.decode(bytes.subarray(i, lineEnd)).split(';')[0].trim(), 16);
    if (!size) break; // 0 = last chunk (NaN = truncated stream)
    const start = lineEnd + 2;
    out.push(bytes.subarray(start, start + size));
    i = start + size + 2;
  }
  return concatBytes(out);
}

async function decompress(bytes, encoding) {
  if (encoding !== 'gzip' && encoding !== 'deflate') return bytes;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(encoding));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Parse a raw HTTP/1.1 response (read until the server closed) into a Response. */
async function parseResponse(raw) {
  const headEnd = indexOfBytes(raw, CRLFCRLF);
  if (headEnd === -1) throw new Error('malformed response from origin');

  const [statusLine, ...headerLines] = decoder.decode(raw.subarray(0, headEnd)).split('\r\n');
  const status = Number(statusLine.split(' ')[1]);
  const headers = new Headers();
  for (const line of headerLines) {
    const colon = line.indexOf(':');
    if (colon > 0) headers.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }

  let body = raw.subarray(headEnd + 4);
  if ((headers.get('transfer-encoding') || '').toLowerCase().includes('chunked')) body = dechunk(body);
  body = await decompress(body, (headers.get('content-encoding') || '').toLowerCase());

  // The body handed back is already de-chunked and decompressed.
  headers.delete('transfer-encoding');
  headers.delete('content-encoding');
  headers.delete('content-length');

  return new Response(body.length ? body : null, { status, headers });
}

/**
 * Fetch a path on workrooms.ucalgary.ca THROUGH the Webshare proxy.
 * @param {string} endpoint  e.g. '/spaces/availability/grid' or '/space/12345'
 * @param {{method?: string, body?: string, headers?: object}} [opts]
 * @returns {Promise<Response>}
 * */
export async function proxiedFetch(endpoint, opts = {}) {
  const { method = 'GET', body, headers = {} } = opts;
  const { WEBSHARE_HOST, WEBSHARE_PORT, WEBSHARE_USER = '', WEBSHARE_PASS = '' } = env;
  if (!WEBSHARE_HOST || !WEBSHARE_PORT) throw new Error('WEBSHARE_HOST / WEBSHARE_PORT are not set');

  // 1-2. Open a tunnel through Webshare to the origin.
  const proxySocket = connect(
    { hostname: WEBSHARE_HOST, port: Number(WEBSHARE_PORT) },
    { secureTransport: 'starttls' } // plain TCP for now; upgraded to TLS after CONNECT
  );
  let socket = proxySocket;
  try {
    await writeAll(
      proxySocket.writable,
      `CONNECT ${ORIGIN_HOST}:443 HTTP/1.1\r\n` +
        `Host: ${ORIGIN_HOST}:443\r\n` +
        `Proxy-Authorization: Basic ${btoa(`${WEBSHARE_USER}:${WEBSHARE_PASS}`)}\r\n\r\n`
    );
    const reader = proxySocket.readable.getReader();
    const connectStatus = (await readHead(reader)).split('\r\n')[0];
    reader.releaseLock();
    if (!/^HTTP\/1\.[01] 2\d\d/.test(connectStatus)) {
      throw new Error(`Webshare refused the tunnel: ${connectStatus}`);
    }

    // 3. TLS to the origin, inside the tunnel. The certificate is checked
    // against the origin's hostname, not the proxy's.
    socket = proxySocket.startTls({ expectedServerHostname: ORIGIN_HOST });

    // 4. Plain HTTP/1.1. `Connection: close` lets us read until EOF.
    const bodyBytes = body === undefined ? null : encoder.encode(body);
    const allHeaders = {
      Host: ORIGIN_HOST,
      Connection: 'close',
      // Ask the origin to compress; we decompress below, but the bytes on the
      // wire (and through Webshare) stay compressed — that is where the saving is.
      'Accept-Encoding': 'gzip, deflate',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${ORIGIN}/reserve/workrooms`,
      Origin: ORIGIN,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      ...headers, // This information is taken from the network tab of an inspect on workrooms.ucalgary.ca
      ...(bodyBytes ? { 'Content-Length': String(bodyBytes.length) } : {}),
    };
    const head =
      `${method} ${endpoint} HTTP/1.1\r\n` +
      Object.entries(allHeaders).map(([k, v]) => `${k}: ${v}\r\n`).join('') +
      '\r\n';
    await writeAll(socket.writable, head, ...(bodyBytes ? [bodyBytes] : []));

    return await parseResponse(await readAll(socket.readable));
  } finally {
    socket.close().catch(() => {});
  }
}
