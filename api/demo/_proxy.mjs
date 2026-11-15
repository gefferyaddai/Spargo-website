// Shared by the homepage search demo's proxies (search.mjs, pending.mjs) → spargo-api's
// GET /api/public/search and /api/public/search/pending. Forwards the visitor's IP with a
// shared secret (DEMO_PROXY_SECRET, set here and on Railway), so the API can give each visitor
// their own live and online quotas; without it every visitor would look like one Vercel address.
// The API marks which answers are the same for everyone (CDN-Cache-Control), and Vercel's CDN
// serves repeats of those without calling it. Files starting with _ aren't deployed as functions.

const API = process.env.SPARGO_API_URL || 'https://spargo-app-production.up.railway.app';
const PASS_HEADERS = ['cache-control', 'cdn-cache-control', 'retry-after'];
// Only what the demo sends, so made-up parameters can't split the CDN cache
const PASS_PARAMS = ['q', 'category', 'sort', 'mode'];

export function demoProxy(path) {
  return {
    async fetch(request) {
      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: { allow: 'GET' } });
      }
      const from = new URL(request.url).searchParams;
      const params = new URLSearchParams();
      PASS_PARAMS.forEach(p => { const v = from.get(p); if (v) params.set(p, v.slice(0, 100)); });
      const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
      const secret = process.env.DEMO_PROXY_SECRET;
      const headers = { accept: 'application/json' };
      if (secret && ip) {
        headers['x-demo-proxy-secret'] = secret;
        headers['x-demo-visitor-ip'] = ip;
      }

      try {
        // A live scrape answers in a few seconds; well past that, give up
        const upstream = await fetch(`${API}${path}?${params}`, {
          headers,
          signal: AbortSignal.timeout(25000),
        });
        const out = new Headers({ 'content-type': 'application/json' });
        PASS_HEADERS.forEach(h => { const v = upstream.headers.get(h); if (v) out.set(h, v); });
        if (!out.has('cache-control')) out.set('cache-control', 'no-store');
        return new Response(upstream.body, { status: upstream.status, headers: out });
      } catch {
        return Response.json({ error: 'Search is unavailable right now.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
      }
    },
  };
}
