#!/usr/bin/env node
// Page-level checks for the launch list (SEO-4..8, CON-3/4, LIVE-2/5/6, LEGAL-1/2/4, MAIL-4) as one JSON report.
// usage: node page-audit.mjs <url> [url…] [--links] [--w3c]
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const PLACEHOLDER_IMG = /placehold\.(co|it)|placeholder\.com|via\.placeholder|picsum\.photos|dummyimage\.com|lorempixel|placekitten|source\.unsplash\.com|fakeimg/i;
const LOREM = /lorem ipsum|dolor sit amet|consectetur adipiscing/i;
const CONSENT = /cookieyes|cookiebot|complianz|cookie-law-info|cookie-notice|borlabs|iubenda|onetrust|osano|termly|real-cookie-banner|gdpr-cookie|cmplz|adopt\.|cookie-consent|lgpd/i;
const CAPTCHA = /cf-turnstile|challenges\.cloudflare\.com\/turnstile|g-recaptcha|recaptcha\/api|hcaptcha|grecaptcha/i;
const HONEYPOT = /honeypot|ak_hp|hp_|name=["'][^"']*(website_url|your-website|hp)[^"']*["'][^>]*(display:\s*none|hidden|tabindex=["']-1)/i;

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(2).find((v) => v != null) ?? null;
const meta = (html, key, value) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => (attr(t, key) ?? "").toLowerCase() === value);
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function get(url, method = "GET") {
  try {
    const r = await fetch(url, { method, redirect: "follow", headers: { "user-agent": "GritoWeb-launch-check/1.0" }, signal: AbortSignal.timeout(20000) });
    return { status: r.status, url: r.url, text: method === "HEAD" ? "" : await r.text() };
  } catch (e) { return { status: 0, url, text: "", error: e.cause?.code ?? e.message }; }
}

export function auditHtml(html, pageUrl) {
  const body = html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, "");
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const ogImage = meta(html, "property", "og:image");
  const links = [...body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1]).filter((h) => /^(https?:|\/)/.test(h));
  const abs = [...new Set(links.map((h) => { try { return new URL(h, pageUrl).href; } catch { return null; } }).filter(Boolean))];
  const footer = body.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? "";
  const forms = [...body.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((m) => m[0]).filter((f) => !/role=["']search["']|name=["']s["']/.test(f));
  return {
    title: text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null,
    meta_description: attr(meta(html, "name", "description") ?? "", "content"),
    robots_meta: attr(meta(html, "name", "robots") ?? "", "content"),
    h1_count: (body.match(/<h1\b/gi) ?? []).length,
    canonical: attr(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] ?? "", "href"),
    og: { title: !!meta(html, "property", "og:title"), description: !!meta(html, "property", "og:description"), image: ogImage ? attr(ogImage, "content") : null },
    images: imgs.length,
    images_without_alt: imgs.filter((t) => attr(t, "alt") === null).map((t) => attr(t, "src")).slice(0, 20),
    placeholder_images: imgs.map((t) => attr(t, "src") ?? "").filter((s) => PLACEHOLDER_IMG.test(s)).slice(0, 20),
    lorem: LOREM.test(text(body)),
    powered_by_wordpress: /powered by\s*(<[^>]+>\s*)*wordpress/i.test(body),
    generator: attr(meta(html, "name", "generator") ?? "", "content"),
    starter_names: /\b(sage|roots\.io|just another wordpress site)\b/i.test(text(html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? "")),
    analytics: /gtag\(|googletagmanager\.com|google-analytics\.com\/analytics/i.test(html),
    consent_banner: CONSENT.test(html),
    footer_privacy_link: /privac|privacidade/i.test(footer),
    footer_terms_link: /terms|termos|condi[cç]/i.test(footer),
    forms: forms.length,
    forms_protected: forms.filter((f) => CAPTCHA.test(f) || HONEYPOT.test(f)).length,
    page_has_captcha_script: CAPTCHA.test(html),
    links: abs,
  };
}

async function checkLinks(urls) {
  const broken = [];
  for (const u of urls.slice(0, 200)) {
    let r = await get(u, "HEAD");
    if (r.status === 405 || r.status === 403 || r.status === 0) r = await get(u);
    if (r.status === 0 || r.status >= 400) broken.push({ url: u, status: r.status, error: r.error ?? null });
  }
  return { checked: Math.min(urls.length, 200), total: urls.length, broken };
}

async function w3c(html) {
  try {
    const r = await fetch("https://validator.w3.org/nu/?out=json", { method: "POST", body: html, headers: { "content-type": "text/html; charset=utf-8", "user-agent": "GritoWeb-launch-check/1.0" }, signal: AbortSignal.timeout(30000) });
    const msgs = (await r.json()).messages ?? [];
    const errors = msgs.filter((m) => m.type === "error");
    return { errors: errors.length, warnings: msgs.filter((m) => m.subType === "warning").length, first_errors: errors.slice(0, 5).map((m) => `${m.lastLine ?? "?"}: ${m.message}`) };
  } catch (e) { return { error: e.message }; }
}

export async function pageAudit(urls, { links = false, validate = false } = {}) {
  const pages = [];
  for (const url of urls) {
    const r = await get(url);
    const page = { url, final_url: r.url, status: r.status, error: r.error ?? null };
    if (r.status === 200) {
      const a = auditHtml(r.text, r.url);
      if (a.og.image) a.og.image_status = (await get(new URL(a.og.image, r.url).href, "HEAD")).status;
      Object.assign(page, a);
      if (validate) page.w3c = await w3c(r.text);
    }
    pages.push(page);
  }
  const titles = pages.map((p) => p.title).filter(Boolean);
  const result = { pages, duplicate_titles: titles.filter((t, i) => titles.indexOf(t) !== i) };
  if (links) result.links = await checkLinks([...new Set(pages.flatMap((p) => p.links ?? []))]);
  for (const p of pages) delete p.links;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), urls = args.filter((a) => !a.startsWith("--"));
  if (!urls.length) { console.error("usage: node page-audit.mjs <url> [url…] [--links] [--w3c]"); process.exit(2); }
  if (urls.some((u) => /\.lndo\.site|localhost/.test(u))) process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
  console.log(JSON.stringify(await pageAudit(urls.slice(0, 15), { links: args.includes("--links"), validate: args.includes("--w3c") }), null, 2));
}
