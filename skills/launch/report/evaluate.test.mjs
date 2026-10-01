// node --test "skills/launch/report/*.test.mjs" — tool-backed results are computed, and the agent can't contradict them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EVALUATORS, merge } from "./evaluate.mjs";

const http = (over = {}) => ({
  https: { http_status: 301, http_location: "https://acme.com/", redirects_to_https: true, https_status: 200, https_error: null },
  headers: { "x-content-type-options": "nosniff", "x-frame-options": "SAMEORIGIN", "referrer-policy": "strict-origin", "strict-transport-security": "max-age=31536000" },
  powered_by: null, soft_404: false, exposed: [], directory_listing: { "wp-content/uploads/": false },
  xmlrpc: { status: 403, open: false }, rest_users: { status: 401, exposes_users: false },
  robots: { status: 200, disallow_all: false, sitemap_line: true }, sitemap: { path: "sitemap_index.xml", entries: 3 },
  not_found: { status: 404, themed: true }, search: { status: 200, themed: true, no_results_marker: true },
  favicon: { status: 200, default_wp_icon: false }, apple_touch_icon: 404, cache: { headers: {}, hit: false }, cdn: null, ...over,
});
const pages = { pages: [{ url: "https://acme.com/", final_url: "https://acme.com/", status: 200, title: "Acme", meta_description: "A".repeat(80), h1_count: 1, canonical: "https://acme.com/", og: { title: true, description: true, image: "/og.png", image_status: 200 }, images_without_alt: [], placeholder_images: [], forms: 0, analytics: "gtag('config','G-1", consent_banner: null, footer_links: { privacy: null, terms: null } }], duplicate_titles: [], links: { checked: 4, broken: [] } };

test("the agent can't report PASS where the tools saw a FAIL", () => {
  const { errors } = merge([{ id: "SEC-11", result: "PASS", evidence: "looked fine" }], { http: http({ xmlrpc: { status: 200, open: true } }), pages }, { local: false });
  assert.match(errors[0], /SEC-11: reported PASS, but the tools show FAIL/);
});

test("FIXED is accepted when the re-run tools now see PASS; tool items are filled without the agent", () => {
  const { items, errors } = merge([{ id: "SEO-2", result: "FIXED", evidence: "robots.txt edited" }], { http: http(), pages }, { local: false });
  assert.deepEqual(errors, []);
  assert.equal(items.find((i) => i.id === "SEO-2").result, "FIXED");
  assert.equal(items.find((i) => i.id === "SEC-10").result, "PASS");
  assert.equal(items.find((i) => i.id === "LEGAL-4").result, "FAIL", "no consent manager found");
  assert.ok(items.find((i) => i.id === "LEGAL-4").action);
});

test("public-only items are LOCAL on a local URL, and local logs are a launch-environment matter", () => {
  const raw = { http: http({ https: { http_status: 200, http_location: null, redirects_to_https: false, https_status: 200, https_error: null }, exposed: [{ path: "debug.log", status: 200, content_type: null, bytes: 9, wordpress_file: false }] }), pages };
  const { items } = merge([], raw, { local: true });
  assert.equal(items.find((i) => i.id === "SEC-7").result, "LOCAL");
  assert.equal(items.find((i) => i.id === "SEC-9").result, "LOCAL");
  const wp = merge([], { ...raw, http: http({ exposed: [{ path: "readme.html", status: 200, content_type: "text/html", bytes: 7000, wordpress_file: true }] }) }, { local: true }).items;
  assert.equal(wp.find((i) => i.id === "SEC-9").result, "FAIL", "WordPress's own files count everywhere");
});

test("PageSpeed decides PERF-2 only when the reading is decisive", () => {
  const psi = (o) => ({ min_mobile_score: 70, psi_link: "https://pagespeed.web.dev/x", source: "PageSpeed Insights (pagespeed.web.dev)", mobile: { scores: { performance: 64, accessibility: 95 }, metrics: { lcp: "3 s", cls: "0", tbt: "1 ms" } }, ...o });
  assert.equal(EVALUATORS["PERF-2"]({ psi: psi({ decisive: true }) }).result, "FAIL");
  assert.equal(EVALUATORS["PERF-2"]({ psi: psi({ decisive: false }) }).result, "MANUAL");
  assert.equal(EVALUATORS["PERF-2"]({ psi: psi({ decisive: true, source: "Lighthouse (local estimate, re-run on PageSpeed Insights). Reason: local URL" }) }).result, "LOCAL");
});
