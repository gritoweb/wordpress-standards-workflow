#!/usr/bin/env node
// Site-level HTTP checks for the launch list (SEC-7/9/10/11/12/14/16, SEO-2/3/10, PAGE-1/2/5, PERF-1/3) as one JSON report.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { SIG } from "./signatures.mjs";

export const isLocalHost = (host) => /(^localhost$|^127\.|\.lndo\.site$|\.test$|\.local$|\.ddev\.site$|\.localhost$)/.test(host);

async function get(url, { method = "GET", body, redirect = "manual", headers } = {}) {
  try {
    const r = await fetch(url, { method, body, redirect, headers: { "user-agent": "GritoWeb-launch-check/1.0", ...headers }, signal: AbortSignal.timeout(20000) });
    const text = method === "HEAD" ? "" : await r.text();
    return { status: r.status, headers: Object.fromEntries(r.headers), text, error: null };
  } catch (e) {
    return { status: 0, headers: {}, text: "", error: e.cause?.code ?? e.message };
  }
}

export async function httpAudit(base) {
  const url = new URL(base.endsWith("/") ? base : base + "/");
  const origin = url.origin, host = url.hostname, local = isLocalHost(host);
  const out = { url: url.href, host, local };

  const plain = await get(`http://${url.host}/`);
  const secure = await get(`https://${url.host}/`);
  out.https = {
    http_status: plain.status, http_location: plain.headers.location ?? null,
    redirects_to_https: [301, 308].includes(plain.status) && /^https:/.test(plain.headers.location ?? ""),
    https_status: secure.status, https_error: secure.error,
  };

  const home = await get(url.href, { redirect: "follow" });
  out.home = { status: home.status, error: home.error };
  out.headers = Object.fromEntries(SIG.securityHeaders.map((h) => [h, home.headers[h] ?? null]));
  out.powered_by = home.headers["x-powered-by"] ?? null;

  // A 200 alone is not proof: some servers answer 200 for any path. Compare HTML answers with a known-missing path.
  const probe = await get(origin + "/launch-check-missing-" + Date.now() + ".txt", { redirect: "follow" });
  const soft404 = probe.status === 200 ? probe.text.length : null;
  out.soft_404 = soft404 != null;
  out.exposed = [];
  for (const path of SIG.exposedPaths) {
    const head = await get(origin + "/" + path, { method: "HEAD" });
    if (head.status !== 200) continue;
    const type = head.headers["content-type"] ?? null;
    if (/text\/html/i.test(type ?? "") && soft404 != null) {
      const page = await get(origin + "/" + path);
      if (Math.abs(page.text.length - soft404) <= soft404 * 0.05) continue;
    }
    out.exposed.push({ path, status: 200, content_type: type, bytes: Number(head.headers["content-length"]) || null, wordpress_file: SIG.wordpressFiles.includes(path) });
  }

  out.directory_listing = {};
  for (const path of ["wp-content/uploads/", "wp-content/plugins/", "wp-includes/"]) {
    const r = await get(origin + "/" + path, { redirect: "follow" });
    out.directory_listing[path] = /<title>Index of \//i.test(r.text);
  }

  const xml = await get(origin + "/xmlrpc.php", { method: "POST", body: "<methodCall><methodName>system.listMethods</methodName></methodCall>", headers: { "content-type": "text/xml" } });
  out.xmlrpc = { status: xml.status, open: /<methodResponse>/.test(xml.text) };

  const users = await get(origin + "/wp-json/wp/v2/users", { redirect: "follow" });
  out.rest_users = { status: users.status, exposes_users: users.status === 200 && /"slug"/.test(users.text) };

  const robots = await get(origin + "/robots.txt", { redirect: "follow" });
  const blocks = robots.text.split(/\n(?=user-agent:)/i).some((g) => /user-agent:\s*\*/i.test(g) && /^\s*disallow:\s*\/\s*$/im.test(g));
  out.robots = { status: robots.status, disallow_all: blocks, sitemap_line: /^sitemap:/im.test(robots.text) };

  out.sitemap = null;
  for (const path of ["sitemap_index.xml", "wp-sitemap.xml", "sitemap.xml"]) {
    const r = await get(origin + "/" + path, { redirect: "follow" });
    if (r.status === 200 && /<(sitemapindex|urlset)/.test(r.text)) { out.sitemap = { path, entries: (r.text.match(/<loc>/g) ?? []).length }; break; }
  }

  const missing = await get(origin + "/launch-check-missing-page-" + Date.now() + "/", { redirect: "follow" });
  out.not_found = { status: missing.status, themed: /<header|class="[^"]*(site-header|banner)/i.test(missing.text) && !/wp-die-message/.test(missing.text) };

  const search = await get(origin + "/?s=zzzzlaunchcheck", { redirect: "follow" });
  // body_class() marks an empty search with search-no-results, whatever the site's language.
  out.search = { status: search.status, themed: /<header/i.test(search.text), no_results_marker: /<body[^>]*class=["'][^"']*\bsearch-no-results\b/i.test(search.text) };

  const fav = await get(origin + "/favicon.ico", { method: "HEAD" });
  out.favicon = { status: fav.status, location: fav.headers.location ?? null, default_wp_icon: /w-logo/.test(fav.headers.location ?? ""), icon_link: /<link[^>]+rel=["'][^"']*icon/i.test(home.text) };
  out.apple_touch_icon = (await get(origin + "/apple-touch-icon.png", { method: "HEAD" })).status;

  const second = await get(url.href, { redirect: "follow" });
  const cache = Object.fromEntries(SIG.cacheHeaders.filter((h) => second.headers[h] != null).map((h) => [h, second.headers[h]]));
  out.cache = { headers: cache, hit: Object.values(cache).some((v) => /hit/i.test(v)) || Number(cache.age) > 0 };
  out.cdn = Object.entries(second.headers).map(([k, v]) => `${k}: ${v}`).find((h) => SIG.cdn.test(h)) ?? null;

  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.argv[2];
  if (!url) { console.error("usage: node http-audit.mjs <site-url>"); process.exit(2); }
  if (/(^|\.)lndo\.site|localhost/.test(url)) process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
  console.log(JSON.stringify(await httpAudit(url), null, 2));
}
