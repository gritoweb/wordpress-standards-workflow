// node --test "skills/launch/tools/*.test.mjs" — the parsing the launch tools rely on, without touching the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalHost } from "./http-audit.mjs";
import { auditHtml } from "./page-audit.mjs";
import { MIN_MOBILE_SCORE, psiLink, summarize } from "./psi.mjs";

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
  const a = auditHtml(html, "https://acme.com/");
  assert.equal(a.title, "Home - Acme"); assert.equal(a.meta_description, "Acme builds things.");
  assert.equal(a.h1_count, 1); assert.equal(a.canonical, "https://acme.com/");
  assert.deepEqual(a.og, { title: true, description: false, image: "/logo.png" });
  assert.deepEqual(a.images_without_alt, ["https://placehold.co/600x400"]); assert.deepEqual(a.placeholder_images, ["https://placehold.co/600x400"]);
  assert.equal(a.lorem, true); assert.equal(a.powered_by_wordpress, true); assert.equal(a.analytics, true); assert.equal(a.consent_banner, true);
  assert.equal(a.footer_privacy_link, true); assert.equal(a.footer_terms_link, false);
  assert.equal(a.forms, 2); assert.equal(a.forms_protected, 1);
  assert.deepEqual(a.links, ["https://acme.com/about/", "https://other.com/x", "https://acme.com/privacy-policy/", "https://wordpress.org/"]);
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
