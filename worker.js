const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400"
};

const ASSET_BASE_MARKER = "/* HATSU_WORKER_INJECT_ASSET_BASE */";

function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function injectStHtmlAssetBase(html, origin) {
  const base = origin.endsWith("/") ? origin : `${origin}/`;
  let out = html;
  if (out.includes(ASSET_BASE_MARKER)) {
    out = out.replace(
      ASSET_BASE_MARKER,
      `window.HATSU_ASSET_BASE = "${base}";`
    );
  }
  out = out.replaceAll('data-asset-base=""', `data-asset-base="${base}"`);
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const isStHtml = pathname.endsWith("/st.html") || pathname.endsWith("/st2.html");
    if (isStHtml && response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("html")) {
        const html = injectStHtmlAssetBase(await response.text(), url.origin);
        response = new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
    }
    return withCors(response);
  }
};
