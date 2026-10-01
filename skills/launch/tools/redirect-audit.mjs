#!/usr/bin/env node
// SEO-11: after a migration, every old URL must answer on the new site, directly (200) or through a permanent redirect (301/308).
// usage: node redirect-audit.mjs <new-url> (--old <old-site-url> | --list <file with one URL or path per line>)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_URLS = 300;
const CONCURRENCY = 4;
const SITEMAPS = ["sitemap_index.xml", "wp-sitemap.xml", "sitemap.xml"];
const ASSET = /\.(jpe?g|png|gif|webp|svg|css|js|pdf|zip|mp4|woff2?)(\?|$)/i;

async function get(url, redirect = "manual", timeout = 20000) {
  try {
    const r = await fetch(url, { redirect, headers: { "user-agent": "GritoWeb-launch-check/1.0" }, signal: AbortSignal.timeout(timeout) });
    return { status: r.status, location: r.headers.get("location"), url: r.url, text: redirect === "manual" ? "" : await r.text() };
  } catch (e) { return { status: 0, error: e.cause?.code ?? e.message }; }
}

export const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

// Walks a sitemap index into its child sitemaps, collecting page URLs only.
async function fromSitemaps(oldSite) {
  for (const name of SITEMAPS) {
    const root = await get(new URL(name, oldSite).href, "follow");
    if (root.status !== 200 || !/<(sitemapindex|urlset)/.test(root.text)) continue;
    const pages = new Set(), queue = [root.text];
    let fetched = 0;
    while (queue.length && pages.size < MAX_URLS && fetched < 50) {
      const xml = queue.shift();
      for (const loc of locs(xml)) {
        if (/\.xml(\.gz)?(\?|$)/i.test(loc)) { const child = await get(loc, "follow"); fetched++; if (child.status === 200) queue.push(child.text); }
        else if (!ASSET.test(loc)) pages.add(loc);
      }
    }
    return { source: `sitemap (${name})`, urls: [...pages] };
  }
  return null;
}

async function fromWayback(oldSite) {
  const host = new URL(oldSite).host;
  const r = await get(`https://web.archive.org/cdx/search/cdx?url=${host}/*&output=json&fl=original&collapse=urlkey&filter=statuscode:200&filter=mimetype:text/html&limit=${MAX_URLS}`, "follow", 20000);
  if (r.status !== 200) return null;
  try { return { source: "Wayback Machine", urls: JSON.parse(r.text).slice(1).map((row) => row[0]) }; } catch { return null; }
}

// Same path on the new site; query strings are kept because old plugins often used them as routes.
export const onNewSite = (oldUrl, newSite) => { const o = new URL(oldUrl, newSite); return new URL(o.pathname + o.search, newSite).href; };

export async function checkPath(url) {
  const hops = [], chain = [];
  let current = url;
  for (let i = 0; i < 6; i++) {
    const r = await get(current);
    hops.push(r.status);
    chain.push({ url: current, status: r.status, location: r.location ?? null });
    if (r.status >= 300 && r.status < 400 && r.location) { current = new URL(r.location, current).href; continue; }
    const temporary = hops.slice(0, -1).some((s) => s === 302 || s === 307);
    const redirected = hops.length > 1;
    let result;
    if (r.status === 200) result = !redirected ? "ok" : temporary ? "temporary-redirect" : "redirected";
    else result = "broken";
    return { url, result, status: r.status, hops, chain, final_url: current, error: r.error ?? null };
  }
  return { url, result: "broken", status: 0, hops, chain, final_url: current, error: "too many redirects" };
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await worker(items[i]); } }));
  return out;
}

export async function redirectAudit(newSite, { old, list } = {}) {
  let collected = null;
  if (list) collected = { source: `list (${list})`, urls: readFileSync(list, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) };
  else if (old) collected = (await fromSitemaps(old)) ?? (await fromWayback(old));
  if (!collected || !collected.urls.length) return { new_site: newSite, old_site: old ?? null, source: null, error: "no old URLs found: give a list with --list", checked: 0 };

  const paths = [...new Set(collected.urls.map((u) => onNewSite(u, newSite)))].slice(0, MAX_URLS);
  const results = await pool(paths, checkPath);
  const count = (r) => results.filter((x) => x.result === r).length;
  const out = {
    new_site: newSite, old_site: old ?? null, source: collected.source,
    found: collected.urls.length, checked: results.length,
    ok: count("ok"), redirected: count("redirected"), temporary_redirect: count("temporary-redirect"), broken: count("broken"),
    broken_urls: results.filter((r) => r.result === "broken").map((r) => ({ path: new URL(r.url).pathname + new URL(r.url).search, status: r.status, error: r.error })),
    temporary_urls: results.filter((r) => r.result === "temporary-redirect").map((r) => ({ path: new URL(r.url).pathname, to: r.final_url, chain: r.chain })),
  };
  // A different old domain that still answers must send visitors to the new one permanently.
  if (old && new URL(old).host !== new URL(newSite).host) {
    const home = await checkPath(new URL("/", old).href);
    out.old_domain = { status: home.hops[0], final_url: home.final_url, permanent_to_new: [301, 308].includes(home.hops[0]) && new URL(home.final_url).host === new URL(newSite).host };
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const newSite = args.find((a) => /^https?:\/\//.test(a) && a !== opt("--old"));
  if (!newSite || (!opt("--old") && !opt("--list"))) { console.error("usage: node redirect-audit.mjs <new-url> (--old <old-site-url> | --list <file>)"); process.exit(2); }
  if (/\.lndo\.site|localhost/.test(newSite)) process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
  console.log(JSON.stringify(await redirectAudit(newSite, { old: opt("--old"), list: opt("--list") }), null, 2));
}
