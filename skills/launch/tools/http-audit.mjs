#!/usr/bin/env node
// Site-level HTTP checks for the launch list (SEC-7/9/10/11/12/14/16/18/19, SEO-2/3/10, PAGE-1/2/5/7, PERF-1/3) as one JSON report.
// usage: node http-audit.mjs <site-url> [--theme-dir <theme root>]
import { fileURLToPath } from "node:url";
import { basename, resolve } from "node:path";

import { SIG } from "./signatures.mjs";
import { listFiles } from "./repo-audit.mjs";

export const isLocalHost = (host) => /(^localhost$|^127\.|\.lndo\.site$|\.test$|\.local$|\.ddev\.site$|\.localhost$)/.test(host);

async function get(url, { method = "GET", body, redirect = "manual", headers } = {}) {
  try {
    const r = await fetch(url, { method, body, redirect, headers: { "user-agent": "GritoWeb-launch-check/1.0", ...headers }, signal: AbortSignal.timeout(20000) });
    const text = method === "HEAD" ? "" : await r.text();
    return { status: r.status, url: r.url, headers: Object.fromEntries(r.headers), text, error: null };
  } catch (e) {
    return { status: 0, url, headers: {}, text: "", error: e.cause?.code ?? e.message };
  }
}

// Theme files a site must not serve: the dev's notes, the kit, reports, secrets, dependency manifests and logs.
const RISKY = /(^|\/)\.[^/]+$|^(launch|docs|\.claude|graphify-out)\/|\.(md|json|lock|pdf|sql|zip|gz|tar|log|csv|txt|ya?ml|sh|bak|html?|xml|neon|dist|env)$/i;
const GROUPS = [/(^|\/)\.env/, /\.(pdf|sql|zip|gz|tar|bak|log)$/i, /^launch\//, /^graphify-out\//, /(^|\/)CLAUDE\.md$/, /^docs\//, /^\.claude\//];
// A few files per group prove a folder is served; probing all of them would hammer the site (safety rule 7).
export function themeCandidates(files, perGroup = 5) {
  const group = (f) => { const i = GROUPS.findIndex((re) => re.test(f)); return i < 0 ? GROUPS.length : i; };
  const risky = files.filter((f) => !/^(public|launch-brand)\//.test(f) && !/^(theme\.json|style\.css)$/.test(f) && RISKY.test(f)).sort((a, b) => group(a) - group(b) || a.localeCompare(b));
  const taken = new Map();
  const picked = risky.filter((f) => { const g = group(f), n = taken.get(g) ?? 0; taken.set(g, n + 1); return n < perGroup; });
  return [...picked, "vendor/composer/installed.json"];
}

export async function httpAudit(base, { themeDir } = {}) {
  const url = new URL(base.endsWith("/") ? base : base + "/");
  const origin = url.origin, host = url.hostname, local = isLocalHost(host);
  const out = { url: url.href, host, local };

  const themed = (r) => /<header|class="[^"]*(site-header|banner)/i.test(r.text) && !/wp-die-message/.test(r.text);
  // A starter's own template renders inside the theme too, so "themed" alone can't tell a project 404 from Sage's.
  const starter = (r) => r.text.match(SIG.starterDefault)?.[0] ?? null;

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

  // An exposed file is one that answers 200 with content that isn't the soft-404 page.
  const serves = async (u) => {
    const head = await get(u, { method: "HEAD" });
    if (head.status !== 200) return null;
    const type = head.headers["content-type"] ?? null;
    if (/text\/html/i.test(type ?? "") && soft404 != null) { const page = await get(u); if (Math.abs(page.text.length - soft404) <= soft404 * 0.05) return null; }
    return { status: 200, content_type: type, bytes: Number(head.headers["content-length"]) || null };
  };
  if (themeDir) {
    const name = basename(resolve(themeDir));
    const themePath = home.text.match(new RegExp(`(/[^"'\\s]*?/themes/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/)`))?.[1] ?? `/wp-content/themes/${name}/`;
    const checked = themeCandidates(listFiles(resolve(themeDir)));
    const exposed = [];
    for (const f of checked) { const hit = await serves(origin + themePath + f.split("/").map(encodeURIComponent).join("/")); if (hit) exposed.push({ path: themePath + f, ...hit }); }
    out.theme_files = { theme_path: themePath, checked: checked.length, exposed };
  }

  // ?author=N redirects to /author/<login>/ unless the site stops it: the login is half of a brute-force attack.
  const byId = await get(origin + "/?author=1");
  const login = /\/author\/([^/?#]+)/.exec(byId.headers.location ?? "")?.[1] ?? null;
  const authorMap = await get(origin + "/author-sitemap.xml", { redirect: "follow" });
  out.user_enum = { author_param: { status: byId.status, location: byId.headers.location ?? null, login: login ? decodeURIComponent(login) : null },
    author_sitemap: { status: authorMap.status, entries: authorMap.status === 200 ? (authorMap.text.match(/<loc>/g) ?? []).length : 0 } };

  // Archives WordPress makes on its own; each must be the project's template or switched off (404 or a redirect away).
  const archive = async (path) => { const r = await get(origin + path, { redirect: "follow" }); return { url: origin + path, status: r.status, final_url: r.url, starter_default: starter(r) }; };
  out.archives = { author: await archive("/?author=1"), date: await archive(`/?m=${new Date().getFullYear()}`), category: await archive("/?cat=1") };

  const missing = await get(origin + "/launch-check-missing-page-" + Date.now() + "/", { redirect: "follow" });
  out.not_found = { status: missing.status, themed: themed(missing), starter_default: starter(missing) };

  // Search must be either a project template with an empty state, or switched off (404 or a redirect away from ?s=).
  const off = (r) => r.status === 404 || !/[?&]s=/.test(r.url);
  const search = await get(origin + "/?s=zzzzlaunchcheck", { redirect: "follow" });
  const blank = await get(origin + "/?s=", { redirect: "follow" });
  // body_class() marks an empty search with search-no-results, whatever the site's language.
  out.search = { status: search.status, themed: themed(search), no_results_marker: /<body[^>]*class=["'][^"']*\bsearch-no-results\b/i.test(search.text), starter_default: starter(search),
    blank: { status: blank.status, themed: themed(blank) }, disabled: off(search) && off(blank) };

  // Browsers and crawlers ask for /favicon.ico whatever the <link> says: it must end at a real image that isn't WordPress's.
  const fav = await get(origin + "/favicon.ico", { redirect: "follow" });
  const favType = fav.headers["content-type"] ?? null;
  out.favicon = { status: fav.status, final_url: fav.url, content_type: favType, is_image: /^image\//i.test(favType ?? ""), default_wp_icon: /w-logo/.test(fav.url ?? ""), icon_link: /<link[^>]+rel=["'][^"']*icon/i.test(home.text) };
  out.apple_touch_icon = (await get(origin + "/apple-touch-icon.png", { method: "HEAD" })).status;

  const second = await get(url.href, { redirect: "follow" });
  const cache = Object.fromEntries(SIG.cacheHeaders.filter((h) => second.headers[h] != null).map((h) => [h, second.headers[h]]));
  out.cache = { headers: cache, hit: Object.values(cache).some((v) => /hit/i.test(v)) || Number(cache.age) > 0 };
  out.cdn = Object.entries(second.headers).map(([k, v]) => `${k}: ${v}`).find((h) => SIG.cdn.test(h)) ?? null;

  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.argv[2];
  if (!url || url.startsWith("--")) { console.error("usage: node http-audit.mjs <site-url> [--theme-dir <theme root>]"); process.exit(2); }
  const t = process.argv.indexOf("--theme-dir");
  if (/(^|\.)lndo\.site|localhost/.test(url)) process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
  console.log(JSON.stringify(await httpAudit(url, { themeDir: t > 0 ? process.argv[t + 1] : undefined }), null, 2));
}
