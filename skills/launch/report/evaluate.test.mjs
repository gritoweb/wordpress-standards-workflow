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
  not_found: { status: 404, themed: true, starter_default: null }, search: { status: 200, themed: true, no_results_marker: true, starter_default: null, blank: { status: 200, themed: true }, disabled: false },
  favicon: { status: 200, final_url: "https://acme.com/favicon.ico", content_type: "image/x-icon", is_image: true, default_wp_icon: false }, apple_touch_icon: 404, cache: { headers: {}, hit: false }, cdn: null, ...over,
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

test("Sage's own 404 and search fail; search switched off passes", () => {
  const sage404 = http({ not_found: { status: 404, themed: true, starter_default: "Sorry, but the page you are trying to view does not exist" } });
  assert.equal(EVALUATORS["SEO-10"]({ http: sage404 }).result, "FAIL");
  assert.equal(EVALUATORS["SEO-10"]({ http: http() }).result, "PASS");
  const sageSearch = http({ search: { status: 200, themed: true, no_results_marker: true, starter_default: "Sorry, no results were found", blank: { status: 200, themed: true }, disabled: false } });
  assert.match(EVALUATORS["PAGE-2"]({ http: sageSearch }).evidence, /starter's default text/);
  const off = http({ search: { status: 404, themed: true, no_results_marker: false, starter_default: null, blank: { status: 404, themed: true }, disabled: true } });
  assert.equal(EVALUATORS["PAGE-2"]({ http: off }).result, "PASS");
  const broken = http({ search: { status: 500, themed: false, no_results_marker: false, starter_default: null, blank: { status: 200, themed: true }, disabled: false } });
  assert.equal(EVALUATORS["PAGE-2"]({ http: broken }).result, "FAIL");
});

test("/favicon.ico must end at a real image that isn't WordPress's", () => {
  const html = http({ favicon: { status: 200, final_url: "https://acme.com/favicon.ico", content_type: "text/html; charset=UTF-8", is_image: false, default_wp_icon: false, icon_link: true } });
  assert.equal(EVALUATORS["PAGE-1"]({ http: html }).result, "FAIL", "a <link rel=icon> alone doesn't pass");
  const wp = http({ favicon: { status: 200, final_url: "https://acme.com/wp-includes/images/w-logo-blue-white-bg.png", content_type: "image/png", is_image: true, default_wp_icon: true } });
  assert.match(EVALUATORS["PAGE-1"]({ http: wp }).evidence, /WordPress's own icon/);
  assert.equal(EVALUATORS["PAGE-1"]({ http: http() }).result, "PASS");
});

test("a form whose action is a missing page fails MAIL-5; no forms is N/A", () => {
  const page = (actions) => ({ pages: [{ ...pages.pages[0], url: "https://acme.com/contact/", forms: 1, forms_protected: 0, form_actions: actions }] });
  assert.equal(EVALUATORS["MAIL-5"]({ pages: page([{ action: "https://acme.com/contact-thanks/", status: 404 }]) }).result, "FAIL");
  assert.equal(EVALUATORS["MAIL-5"]({ pages: page([{ action: "https://acme.com/wp-admin/admin-post.php", status: 400 }]) }).result, "PASS", "a handler that refuses GET still exists");
  assert.equal(EVALUATORS["MAIL-5"]({ pages: page([]) }).result, "PASS", "an empty action posts to its own page");
  assert.equal(EVALUATORS["MAIL-5"]({ pages }).result, "N/A");
  assert.equal(EVALUATORS["MAIL-4"]({ pages: page([]) }).result, "FAIL", "the form has no anti-spam");
});

test("served theme files, author enumeration and starter archives fail; switched-off archives pass", () => {
  const exposed = http({ theme_files: { theme_path: "/wp-content/themes/acme/", checked: 9, exposed: [{ path: "/wp-content/themes/acme/launch/report.pdf", status: 200 }, { path: "/wp-content/themes/acme/.env", status: 200 }] } });
  assert.match(EVALUATORS["SEC-18"]({ http: exposed }).evidence, /launch\/report\.pdf, \.env/);
  assert.equal(EVALUATORS["SEC-18"]({ http: http({ theme_files: { theme_path: "/t/", checked: 9, exposed: [] } }) }).result, "PASS");
  assert.equal(EVALUATORS["SEC-18"]({ http: http() }), null, "no theme scan: the agent must prove it");
  const enumerable = http({ user_enum: { author_param: { status: 301, location: "https://acme.com/author/luis/", login: "luis" }, author_sitemap: { status: 404, entries: 0 } } });
  assert.match(EVALUATORS["SEC-19"]({ http: enumerable }).evidence, /login "luis"/);
  assert.equal(EVALUATORS["SEC-19"]({ http: http({ user_enum: { author_param: { status: 301, location: "https://acme.com/", login: null }, author_sitemap: { status: 404, entries: 0 } } }) }).result, "PASS");
  const arch = (author, category) => http({ archives: { author: { url: "https://acme.com/?author=1", ...author }, date: { url: "https://acme.com/?m=2026", status: 404, final_url: "https://acme.com/?m=2026", starter_default: null }, category: { url: "https://acme.com/?cat=1", ...category } } });
  const templates = (t = {}) => ({ templates: { archive: false, author: false, date: false, category: false, tag: false, ...t } });
  const sage = arch({ status: 200, final_url: "https://acme.com/author/luis/", starter_default: "Sorry, no results were found" }, { status: 200, final_url: "https://acme.com/category/news/", starter_default: null });
  const r = EVALUATORS["PAGE-7"]({ http: sage, repo: templates() });
  assert.equal(r.result, "FAIL"); assert.match(r.evidence, /author archive \(\/author\/luis\/\) falls back to index\.blade\.php/); assert.match(r.evidence, /category archive/);
  assert.equal(EVALUATORS["PAGE-7"]({ http: arch({ status: 200, final_url: "https://acme.com/", starter_default: null }, { status: 200, final_url: "https://acme.com/category/news/", starter_default: null }), repo: templates({ archive: true }) }).result, "PASS");
  assert.equal(EVALUATORS["PAGE-7"]({ http: sage }), null, "without the theme's files the agent must prove it");
});

test("machine paths, copied repositories and untracked pending work fail", () => {
  const repo = (o = {}) => ({ files: 10, git_root: "/t", home_paths: [], embedded_repos: [], wordpress_copies: [], debt: { file: "docs/tech-debt.md", exists: true, open_blockers: [] }, todos: [], untracked_todos: [], templates: {}, ...o });
  assert.equal(EVALUATORS["CODE-5"]({ repo: repo({ home_paths: [{ file: "graphify-out/graph.json", line: 1, match: "/home/julio-jara/" }] }) }).result, "FAIL");
  assert.equal(EVALUATORS["CODE-6"]({ repo: repo({ embedded_repos: ["wordpress"], wordpress_copies: ["wordpress"] }) }).result, "FAIL");
  assert.equal(EVALUATORS["CODE-6"]({ repo: repo() }).result, "PASS");
  assert.match(EVALUATORS["LIVE-8"]({ repo: repo({ debt: { file: "docs/tech-debt.md", exists: false, open_blockers: [] } }) }).evidence, /no docs\/tech-debt\.md/);
  assert.equal(EVALUATORS["LIVE-8"]({ repo: repo({ debt: { file: "docs/tech-debt.md", exists: true, open_blockers: ["- [ ] [blocker] wire the contact form"] } }) }).result, "FAIL");
  assert.equal(EVALUATORS["LIVE-8"]({ repo: repo({ untracked_todos: [{ file: "resources/views/page.blade.php", line: 9, match: "TODO: placeholder form" }] }) }).result, "FAIL");
  assert.equal(EVALUATORS["LIVE-8"]({ repo: repo({ todos: [{ file: "app/setup.php", line: 3, match: "TODO @luis 2026-11-01: drop after migration" }] }) }).result, "PASS");
});
