// node --test "skills/launch/report/*.test.mjs" — the report builder: completeness check, computed counts and verdict.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMarkdown, parseList, todo, validate } from "./build.mjs";
import { EVALUATORS } from "./evaluate.mjs";

const LIST = parseList(readFileSync(new URL("../launch-list.md", import.meta.url), "utf8"));
const all = (result = "PASS") => LIST.map((i) => ({ id: i.id, result, evidence: "checked" }));

test("the checklist parses into items with section, severity and title", () => {
  assert.ok(LIST.length > 60);
  const sec1 = LIST.find((i) => i.id === "SEC-1");
  assert.deepEqual([sec1.section, sec1.severity, sec1.title], ["Security", "Required", "No user with the login `admin`"]);
  assert.ok(sec1.tags.includes("fix"));
  assert.equal(new Set(LIST.map((i) => i.id)).size, LIST.length, "IDs are unique");
});

test("an incomplete or malformed result set is refused, naming what is wrong", () => {
  const items = all().slice(1);
  items.push({ id: "SEC-99", result: "PASS", evidence: "x" }, { id: "SEO-1", result: "OK", evidence: "x" }, { id: "SEO-2", result: "FAIL", evidence: "x" });
  const errors = validate({ project: "Acme", items }, LIST);
  assert.ok(errors.some((e) => /missing items: SEC-1\b/.test(e)));
  assert.ok(errors.some((e) => /unknown item SEC-99/.test(e)));
  assert.ok(errors.some((e) => /SEO-1: result must be one of/.test(e)));
  assert.ok(errors.some((e) => /SEO-2 appears twice/.test(e)) && errors.some((e) => /SEO-2: a FAIL needs an action/.test(e)));
});

test("counts and verdict are computed: a required FAIL means Not ready; only LOCAL left means Ready locally", () => {
  const items = all();
  items.find((i) => i.id === "SEC-1").result = "FAIL";
  Object.assign(items.find((i) => i.id === "SEC-1"), { evidence: "`admin` exists", action: "create a new admin, delete `admin`" });
  items.find((i) => i.id === "SEC-7").result = "LOCAL";
  let r = buildMarkdown({ project: "Acme", items }, LIST);
  assert.equal(r.verdict, "Not ready"); assert.equal(r.counts.FAIL, 1); assert.equal(r.counts.LOCAL, 1);
  assert.match(r.markdown, /\*\*Next steps:\*\* 1\. \*\*SEC-1\*\* create a new admin/);
  assert.match(r.markdown, /## Required items still failing[\s\S]*\| SEC-1 \|/);
  items.find((i) => i.id === "SEC-1").result = "FIXED";
  r = buildMarkdown({ project: "Acme", items }, LIST);
  assert.equal(r.verdict, "Ready locally");
  items.find((i) => i.id === "SEC-7").result = "PASS";
  assert.equal(buildMarkdown({ project: "Acme", items }, LIST).verdict, "Ready to launch");
});

test("pipes in evidence can't break a table row, and PageSpeed for another URL is called out", () => {
  const items = all();
  items[0].evidence = "a | b\nc";
  const psi = { url: "https://live.example/", min_mobile_score: 70, mobile_pass: true, source: "PageSpeed Insights (pagespeed.web.dev)", report_url: "https://pagespeed.web.dev/analysis/x", mobile: { scores: { performance: 83, accessibility: 100, "best-practices": 100, seo: 92 }, metrics: { lcp: "4.1 s", cls: "0", tbt: "30 ms" }, field_core_web_vitals: "No data" } };
  const { markdown } = buildMarkdown({ project: "Acme", items, target: { url: "http://acme.lndo.site/" } }, LIST, { psi });
  assert.match(markdown, /a \\\| b c/);
  assert.match(markdown, /PageSpeed measured `https:\/\/live.example\/`, not the audited site/);
  assert.match(markdown, /\| Mobile \| \*\*83\*\* \|/);
});

test("--todo lists exactly the items the tools can't decide for this run", () => {
  const none = todo(LIST, {});
  assert.equal(none.length, LIST.length, "with no tool output, the agent owns every item");
  const raw = { http: { https: { redirects_to_https: true, https_status: 200 }, headers: {}, exposed: [], directory_listing: {}, xmlrpc: { open: false, status: 403 }, rest_users: { exposes_users: false, status: 401 }, robots: { status: 200, disallow_all: false, sitemap_line: true }, sitemap: null, not_found: { status: 404, themed: true }, search: { themed: true, no_results_marker: true }, favicon: {}, cache: { hit: false }, cdn: null, powered_by: null } };
  const left = todo(LIST, raw).map((i) => i.id);
  assert.ok(left.includes("SEC-1"), "wp-cli items stay with the agent");
  assert.ok(!left.includes("SEC-11"), "xmlrpc is decided by http-audit");
  assert.ok(left.every((id) => LIST.some((i) => i.id === id)));
  assert.ok(Object.keys(EVALUATORS).every((id) => LIST.some((i) => i.id === id)), "every evaluator matches a list item");
});
