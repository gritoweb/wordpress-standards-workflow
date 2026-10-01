#!/usr/bin/env node
// PERF-2 / LIVE-6: reads PageSpeed Insights from pagespeed.web.dev in headless Chrome (no API key), falling back to local Lighthouse.
// usage: node psi.mjs <url> [--screenshot <file.png>]
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findBrowser } from "../report/report.mjs";
import { isLocalHost } from "./http-audit.mjs";

export const MIN_MOBILE_SCORE = 70;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const METRICS = { lcp: "largest-contentful-paint", cls: "cumulative-layout-shift", tbt: "total-blocking-time", fcp: "first-contentful-paint", si: "speed-index" };
const WEB_TIMEOUT_MS = 120000;

export const psiLink = (url, formFactor = "mobile") => `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${formFactor}`;

// Runs inside the PSI page: the active tab panel's gauges, lab metrics and real-user Core Web Vitals verdict.
export const READ_PANEL = `(() => {
  const panel = document.querySelector('[role="tabpanel"][data-tab-panel-active="true"]');
  if (!panel) return null;
  const scores = {};
  for (const g of panel.querySelectorAll("a.lh-gauge__wrapper")) {
    const label = g.querySelector(".lh-gauge__label")?.textContent.trim().toLowerCase().replace(/\\s+/g, "-");
    const value = Number(g.querySelector(".lh-gauge__percentage")?.textContent.trim());
    if (label && Number.isFinite(value) && !(label in scores)) scores[label] = value;
  }
  const metrics = {};
  for (const m of panel.querySelectorAll(".lh-metric[id]")) metrics[m.id] = m.querySelector(".lh-metric__value")?.textContent.replace(/\\u00a0/g, " ").trim() ?? null;
  const text = panel.innerText;
  const field = /Core Web Vitals Assessment:\\s*(Passed|Failed)/i.exec(text)?.[1] ?? (/No Data/i.test(text) ? "No data" : null);
  const error = /(Lighthouse returned error|An error has occurred|unable to reliably load|Try again)[^\\n]*/i.exec(text)?.[0] ?? null;
  return { scores, metrics, field, error };
})()`;

// Normalizes what READ_PANEL returned; complete only when all four scores and the five lab metrics are there.
export function fromPanel(panel) {
  if (!panel) return { complete: false };
  const scores = Object.fromEntries(CATEGORIES.map((c) => [c, panel.scores?.[c] ?? null]));
  const metrics = Object.fromEntries(Object.entries(METRICS).map(([k, id]) => [k, panel.metrics?.[id] ?? null]));
  const complete = Object.values(scores).every((v) => v != null) && Object.values(metrics).every((v) => v != null);
  return { complete, scores, metrics, field_core_web_vitals: panel.field ?? null, page_error: panel.error ?? null };
}

// Same shape from a local Lighthouse run.
export function summarize(lighthouse) {
  const score = (c) => (lighthouse.categories?.[c]?.score == null ? null : Math.round(lighthouse.categories[c].score * 100));
  return {
    scores: Object.fromEntries(CATEGORIES.map((c) => [c, score(c)])),
    metrics: Object.fromEntries(Object.entries(METRICS).map(([k, id]) => [k, lighthouse.audits?.[id]?.displayValue ?? null])),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A minimal Chrome DevTools Protocol session over Node's built-in WebSocket (Node 22+).
async function openChrome(chrome) {
  const dir = mkdtempSync(join(tmpdir(), "launch-psi-"));
  const version = spawnSync(chrome, ["--version"], { encoding: "utf8" }).stdout.match(/\d+\.[\d.]+/)?.[0] ?? "130.0.0.0";
  // The default HeadlessChrome user agent makes the PSI page fail its analysis with a 4xx.
  const ua = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
  const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--window-size=1350,1100", `--user-agent=${ua}`, "about:blank"], { stdio: "ignore" });
  let port;
  for (let i = 0; i < 100 && !port; i++) { await sleep(100); const f = join(dir, "DevToolsActivePort"); if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0]; }
  if (!port) { proc.kill(); throw new Error("Chrome did not open a debugging port"); }
  const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error("DevTools connection failed")); });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((ok) => { pending.set(++id, ok); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;
  const close = () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500); };
  return { send, evaluate, close };
}

async function waitForPanel(evaluate, deadline) {
  let last = { complete: false };
  while (Date.now() < deadline) {
    last = fromPanel(await evaluate(READ_PANEL));
    if (last.complete || last.page_error) return last;
    await sleep(1000);
  }
  return last;
}

// Crops the score gauges down to the end of the lab metrics, on the PSI page or on a Lighthouse HTML report alike.
async function captureScores(send, evaluate, file) {
  await evaluate(`[...document.querySelectorAll("button, a")].find((b) => /^ok, got it/i.test(b.textContent.trim()))?.click()`);
  await sleep(400);
  const box = await evaluate(`(() => {
    const root = document.querySelector('[role="tabpanel"][data-tab-panel-active="true"]') ?? document;
    // Skip the sticky header's copy of the gauges, which sits at the top of the page.
    const gauge = [...root.querySelectorAll(".lh-gauge__wrapper")].find((g) => !g.closest(".lh-sticky-header"));
    const top = gauge?.getBoundingClientRect();
    const end = root.querySelector(".lh-metrics-container")?.getBoundingClientRect();
    return top && end ? { x: end.left + scrollX - 24, y: top.top + scrollY - 70, width: end.width + 48, height: end.bottom - top.top + 100 } : null;
  })()`);
  const clip = box ? { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: Math.min(box.height, 1400), scale: 1 } : undefined;
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(clip ? { clip } : {}) });
  if (!shot.result?.data) { process.stderr.write(`psi: screenshot failed: ${JSON.stringify(shot.error ?? shot)}\n`); return null; }
  writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  return file;
}

async function fromWeb(url, screenshot) {
  if (typeof WebSocket !== "function") throw new Error(`Node ${process.versions.node} has no built-in WebSocket (needs Node 22+)`);
  const chrome = findBrowser();
  if (!chrome) throw new Error("no Chrome, Edge or Chromium found");
  const { send, evaluate, close } = await openChrome(chrome);
  try {
    const deadline = Date.now() + WEB_TIMEOUT_MS;
    await send("Page.enable");
    await send("Page.navigate", { url: psiLink(url) });
    let mobile = await waitForPanel(evaluate, deadline);
    if (!mobile.complete) throw new Error(mobile.page_error ? `PageSpeed page: ${mobile.page_error}` : "PageSpeed page did not finish in 120 s");
    // The real-user (CrUX) block loads after the lab scores.
    for (let i = 0; i < 15 && !mobile.field_core_web_vitals; i++) { await sleep(1000); mobile = fromPanel(await evaluate(READ_PANEL)); }
    const reportUrl = (await evaluate("location.href")).replace(/form_factor=\w+/, "form_factor=mobile");
    const shotFile = screenshot ? await captureScores(send, evaluate, screenshot) : null;
    await evaluate(`document.getElementById("desktop_tab")?.click()`);
    const desktop = await waitForPanel(evaluate, Date.now() + 30000);
    const strip = ({ complete, page_error, ...rest }) => rest;
    return {
      source: "PageSpeed Insights (pagespeed.web.dev)",
      report_url: reportUrl,
      mobile: strip(mobile),
      desktop: desktop.complete && desktop.scores.performance != null ? strip(desktop) : { error: "desktop tab did not load" },
      screenshot: shotFile,
    };
  } finally { close(); }
}

// Lighthouse writes base.report.json and base.report.html; the HTML is kept next to the report as the full local evidence.
function fromLighthouse(url, strategy, keepDir) {
  const dir = mkdtempSync(join(tmpdir(), "launch-lh-"));
  const base = join(dir, "lh");
  const chrome = findBrowser();
  const args = ["-y", "lighthouse@12", url, "--output=json", "--output=html", `--output-path=${base}`, "--quiet", `--only-categories=${CATEGORIES.join(",")}`,
    "--chrome-flags=--headless=new --ignore-certificate-errors", ...(strategy === "desktop" ? ["--preset=desktop"] : [])];
  const r = spawnSync("npx", args, { encoding: "utf8", timeout: 240000, env: { ...process.env, ...(chrome ? { CHROME_PATH: chrome } : {}) } });
  if (r.status !== 0) throw new Error(`lighthouse exit ${r.status}: ${(r.stderr || "").trim().split("\n").pop()}`);
  const result = summarize(JSON.parse(readFileSync(`${base}.report.json`, "utf8")));
  if (keepDir) { const html = join(keepDir, `lighthouse-${strategy}.html`); copyFileSync(`${base}.report.html`, html); result.report_file = html; }
  return result;
}

async function shootFile(htmlFile, screenshot) {
  const chrome = findBrowser();
  if (!chrome || typeof WebSocket !== "function") return null;
  const { send, evaluate, close } = await openChrome(chrome);
  try {
    await send("Page.enable");
    await send("Page.navigate", { url: `file://${htmlFile}` });
    for (let i = 0; i < 20 && !(await evaluate(`!!document.querySelector(".lh-metrics-container")`)); i++) await sleep(500);
    return await captureScores(send, evaluate, screenshot);
  } finally { close(); }
}

export async function psi(url, { screenshot } = {}) {
  const base = { url, min_mobile_score: MIN_MOBILE_SCORE, psi_link: psiLink(url), psi_link_desktop: psiLink(url, "desktop") };
  let result, fallbackReason;
  if (isLocalHost(new URL(url).hostname)) fallbackReason = "local URL: PageSpeed Insights can't reach it";
  else {
    try { result = await fromWeb(url, screenshot); }
    catch (e) { fallbackReason = e.message; }
  }
  if (!result) {
    result = { source: `Lighthouse (local estimate, re-run on PageSpeed Insights). Reason: ${fallbackReason}`, report_url: null, screenshot: null };
    const keepDir = screenshot ? dirname(screenshot) : null;
    for (const strategy of ["mobile", "desktop"]) {
      try { result[strategy] = fromLighthouse(url, strategy, keepDir); } catch (e) { result[strategy] = { error: e.message }; }
    }
    if (screenshot && result.mobile.report_file) result.screenshot = await shootFile(result.mobile.report_file, screenshot);
  }
  // An estimate stands in only where Google can't reach (local URLs); on a public URL it is shown but never decides PERF-2.
  result.decisive = !fallbackReason || fallbackReason.startsWith("local URL");
  const m = result.mobile?.scores?.performance;
  // PSI lab scores move several points between runs; a score near the line deserves a second look.
  return { ...base, ...result, mobile_pass: m == null ? null : m >= MIN_MOBILE_SCORE, borderline: m != null && Math.abs(m - MIN_MOBILE_SCORE) <= 5 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const url = args.find((a) => /^https?:\/\//.test(a));
  if (!url) { console.error("usage: node psi.mjs <url> [--screenshot <file.png>]"); process.exit(2); }
  const i = args.indexOf("--screenshot");
  console.log(JSON.stringify(await psi(url, { screenshot: i >= 0 ? resolve(args[i + 1]) : undefined }), null, 2));
  process.exit(0);
}
