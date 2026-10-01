#!/usr/bin/env node
// PERF-2 / LIVE-6: PageSpeed Insights for the home page (mobile + desktop), with a local Lighthouse fallback using the same lab settings.
// usage: node psi.mjs <url>   (reads PAGESPEED_API_KEY from the environment when set)
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findBrowser } from "../report/report.mjs";

export const MIN_MOBILE_SCORE = 70;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const METRICS = { lcp: "largest-contentful-paint", cls: "cumulative-layout-shift", tbt: "total-blocking-time", fcp: "first-contentful-paint", si: "speed-index" };

export const psiLink = (url, formFactor = "mobile") => `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${formFactor}`;

// Same shape whether the result came from the PSI API or from a local Lighthouse run.
export function summarize(lighthouse) {
  const score = (c) => (lighthouse.categories?.[c]?.score == null ? null : Math.round(lighthouse.categories[c].score * 100));
  return {
    scores: Object.fromEntries(CATEGORIES.map((c) => [c, score(c)])),
    metrics: Object.fromEntries(Object.entries(METRICS).map(([k, id]) => [k, lighthouse.audits?.[id]?.displayValue ?? null])),
    lcp_ms: lighthouse.audits?.[METRICS.lcp]?.numericValue ?? null,
    cls_value: lighthouse.audits?.[METRICS.cls]?.numericValue ?? null,
  };
}

async function fromApi(url, strategy, key) {
  const q = new URLSearchParams({ url, strategy });
  for (const c of CATEGORIES) q.append("category", c);
  if (key) q.set("key", key);
  const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(120000) });
  const d = await r.json();
  if (d.error) throw new Error(`PSI API ${d.error.code}: ${d.error.message.split(".")[0]}`);
  return { source: "PageSpeed Insights API", ...summarize(d.lighthouseResult), field_data: d.loadingExperience?.overall_category ?? null };
}

function fromLighthouse(url, strategy) {
  const dir = mkdtempSync(join(tmpdir(), "launch-lh-"));
  const out = join(dir, "lh.json");
  const chrome = findBrowser();
  const args = ["-y", "lighthouse@12", url, "--output=json", `--output-path=${out}`, "--quiet", `--only-categories=${CATEGORIES.join(",")}`,
    "--chrome-flags=--headless=new --ignore-certificate-errors", ...(strategy === "desktop" ? ["--preset=desktop"] : [])];
  const r = spawnSync("npx", args, { encoding: "utf8", timeout: 240000, env: { ...process.env, ...(chrome ? { CHROME_PATH: chrome } : {}) } });
  if (r.status !== 0) throw new Error(`lighthouse exit ${r.status}: ${(r.stderr || "").trim().split("\n").pop()}`);
  return { source: "Lighthouse (local, same lab settings as PageSpeed Insights)", ...summarize(JSON.parse(readFileSync(out, "utf8"))) };
}

export async function psi(url, key = process.env.PAGESPEED_API_KEY) {
  const result = { url, min_mobile_score: MIN_MOBILE_SCORE, psi_link: psiLink(url), psi_link_desktop: psiLink(url, "desktop") };
  for (const strategy of ["mobile", "desktop"]) {
    try { result[strategy] = await fromApi(url, strategy, key); }
    catch (apiError) {
      try { result[strategy] = { ...fromLighthouse(url, strategy), api_error: apiError.message }; }
      catch (lhError) { result[strategy] = { error: `${apiError.message}; ${lhError.message}` }; }
    }
  }
  const m = result.mobile.scores?.performance;
  result.mobile_pass = m == null ? null : m >= MIN_MOBILE_SCORE;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.argv[2];
  if (!url) { console.error("usage: node psi.mjs <url>"); process.exit(2); }
  console.log(JSON.stringify(await psi(url), null, 2));
}
