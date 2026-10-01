// node --test "skills/launch/tools/*.test.mjs" — the parsing the launch tools rely on, without touching the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalHost } from "./http-audit.mjs";
import { auditHtml } from "./page-audit.mjs";
import { MIN_MOBILE_SCORE, fromPanel, psiLink, summarize } from "./psi.mjs";
import { brandImages } from "./brand-images.mjs";
import { findBrowser } from "../report/report.mjs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("local hosts give LOCAL results, real hosts don't", () => {
  for (const h of ["luistest1300.lndo.site", "localhost", "127.0.0.1", "acme.test", "acme.local", "acme.ddev.site"]) assert.ok(isLocalHost(h), h);
  for (const h of ["acme.com.br", "dev-acme.pantheonsite.io", "sienna-dragonfly-984197.hostingersite.com"]) assert.ok(!isLocalHost(h), h);
});

test("page audit reads the SEO, content and legal signals from the HTML", () => {
  const html = `<html><head><title>Home - Acme</title><meta name="description" content="Acme builds things.">
    <link rel="canonical" href="https://acme.com/"><meta property="og:title" content="Acme"><meta property="og:image" content="/logo.png">
    <script>gtag('config','G-1')</script><script src="https://cdn.cookieyes.com/x.js"></script></head>
    <body><h1>Acme</h1><h2>x</h2><img src="/a.webp" alt="A"><img src="https://placehold.co/600x400"><p>Lorem ipsum dolor</p>
    <form><input name="email"><div class="cf-turnstile"></div></form><form><input name="q2"></form>
    <a href="/about/">About</a><a href="https://other.com/x">x</a><a href="#top">top</a>
    <footer><a href="/privacy-policy/">Privacy</a> Powered by <a href="https://wordpress.org">WordPress</a></footer></body></html>`;
  const a = auditHtml(html, "https://acme.com/", { privacyUrl: "https://acme.com/privacy-policy", termsUrl: "https://acme.com/terms/" });
  assert.equal(a.title, "Home - Acme"); assert.equal(a.meta_description, "Acme builds things.");
  assert.equal(a.h1_count, 1); assert.equal(a.canonical, "https://acme.com/");
  assert.deepEqual(a.og, { title: true, description: false, image: "/logo.png" });
  assert.deepEqual(a.images_without_alt, ["https://placehold.co/600x400"]); assert.deepEqual(a.placeholder_images, ["https://placehold.co/600x400"]);
  assert.match(a.lorem, /Lorem ipsum/i); assert.match(a.powered_by_wordpress, /Powered by/); assert.match(a.analytics, /gtag\('config','G-1/); assert.equal(a.consent_banner, "cookieyes");
  assert.deepEqual(a.footer_links.privacy, { expected: "https://acme.com/privacy-policy", found: true }, "matched by URL, trailing slash ignored");
  assert.deepEqual(a.footer_links.terms, { expected: "https://acme.com/terms/", found: false });
  assert.equal(auditHtml(html, "https://acme.com/").footer_links.privacy, null, "no URL given: unknown, never guessed from words");
  assert.equal(a.forms, 2); assert.equal(a.forms_protected, 1);
  assert.deepEqual(a.links, ["https://acme.com/about/", "https://other.com/x", "https://acme.com/privacy-policy/", "https://wordpress.org/"]);
  const c = auditHtml('<footer>Call <a href="tel:+55%2011%204000-1234">us</a> or <a href="mailto:Hello@Acme.com?subject=hi">mail</a>, Rua A 1</footer>', "https://acme.com/").contacts;
  assert.deepEqual(c.phones, ["+55 11 4000-1234"]); assert.deepEqual(c.emails, ["hello@acme.com"]); assert.match(c.footer_text, /Rua A 1/);
});

test("PageSpeed results are summarized the same way from the API or Lighthouse", () => {
  const lh = { categories: { performance: { score: 0.69 }, accessibility: { score: 0.95 }, "best-practices": { score: 1 }, seo: { score: 0.9 } },
    audits: { "largest-contentful-paint": { displayValue: "3.1 s", numericValue: 3100 }, "cumulative-layout-shift": { displayValue: "0.02", numericValue: 0.02 }, "total-blocking-time": { displayValue: "120 ms" } } };
  const s = summarize(lh);
  assert.deepEqual(s.scores, { performance: 69, accessibility: 95, "best-practices": 100, seo: 90 });
  assert.equal(s.metrics.lcp, "3.1 s"); assert.equal(s.metrics.fcp, null);
  assert.ok(s.scores.performance < MIN_MOBILE_SCORE, "69 fails the 70 minimum");
  assert.equal(psiLink("https://acme.com/"), "https://pagespeed.web.dev/analysis?url=https%3A%2F%2Facme.com%2F&form_factor=mobile");
});

test("the PageSpeed page is read only once all four scores and five lab metrics are there", () => {
  const partial = { scores: { performance: 64 }, metrics: {}, field: null, error: null };
  assert.equal(fromPanel(partial).complete, false);
  assert.equal(fromPanel(null).complete, false);
  const full = fromPanel({
    scores: { performance: 64, accessibility: 100, "best-practices": 100, seo: 100 },
    metrics: { "first-contentful-paint": "2.0 s", "largest-contentful-paint": "11.4 s", "total-blocking-time": "330 ms", "cumulative-layout-shift": "0", "speed-index": "4.0 s" },
    field: "Failed", error: null,
  });
  assert.equal(full.complete, true);
  assert.deepEqual(full.metrics, { lcp: "11.4 s", cls: "0", tbt: "330 ms", fcp: "2.0 s", si: "4.0 s" });
  assert.equal(full.field_core_web_vitals, "Failed");
  assert.equal(fromPanel({ scores: {}, metrics: {}, error: "Lighthouse returned error: NO_FCP" }).page_error, "Lighthouse returned error: NO_FCP");
});

test("brand images come out at 512×512 and 1200×630", { skip: !findBrowser() && "no Chrome, Edge or Chromium on this machine" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "launch-brand-test-"));
  const logo = join(dir, "mark.svg");
  writeFileSync(logo, '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#123"/></svg>');
  const r = brandImages(logo, join(dir, "out"));
  assert.deepEqual([r.files["site-icon-512.png"].width, r.files["site-icon-512.png"].height], [512, 512]);
  assert.deepEqual([r.files["og-default-1200x630.png"].width, r.files["og-default-1200x630.png"].height], [1200, 630]);
  assert.throws(() => brandImages(logo, dir, "red;}</style><script>"), /not a CSS colour/);
});
