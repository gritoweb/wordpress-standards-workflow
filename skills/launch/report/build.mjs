#!/usr/bin/env node
// Builds the launch report from the agent's per-item results (JSON on stdin) plus the tools' raw JSON; counts and verdict are computed, never typed.
// usage: node build.mjs [--dir launch] [--no-pdf] < results.json   |   node build.mjs --todo [--dir launch] [--url <audited url>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { printPdf, renderReport } from "./report.mjs";
import { EVALUATORS, merge } from "./evaluate.mjs";
import { isLocalHost } from "../tools/http-audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const RESULTS = ["PASS", "FIXED", "FAIL", "LOCAL", "MANUAL", "N/A"];
const ITEM = /^- \[ \] \*\*([A-Z]+-\d+)\*\* (Required|Recommended|Optional)((?: `[a-z-]+`)*): (.+)$/;

// The checklist is the source of truth for every item's section, severity, title and manual steps.
export function parseList(markdown) {
  const items = [];
  let section = null;
  for (const line of markdown.split("\n")) {
    const h = line.match(/^## (.+)$/);
    if (h) { section = h[1].trim(); continue; }
    const m = line.match(ITEM);
    if (m) { items.push({ id: m[1], severity: m[2], tags: m[3].match(/[a-z-]+/g) ?? [], title: m[4].trim(), section, steps: null }); continue; }
    const steps = line.match(/^ {2}- Steps: (.+)$/);
    if (steps && items.length) items[items.length - 1].steps = steps[1].trim();
  }
  return items;
}

const cell = (s) => String(s ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim() || "-";
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);

export function validate(input, list) {
  const errors = [];
  const known = new Map(list.map((i) => [i.id, i]));
  const seen = new Set();
  for (const r of input.items ?? []) {
    if (!known.has(r.id)) errors.push(`unknown item ${r.id}`);
    else if (seen.has(r.id)) errors.push(`${r.id} appears twice`);
    if (!RESULTS.includes(r.result)) errors.push(`${r.id}: result must be one of ${RESULTS.join(", ")}`);
    if (!r.evidence) errors.push(`${r.id}: evidence is required`);
    if (r.result === "FAIL" && !r.action) errors.push(`${r.id}: a FAIL needs an action (what to do)`);
    seen.add(r.id);
  }
  const missing = list.filter((i) => !seen.has(i.id)).map((i) => i.id);
  if (missing.length) errors.push(`missing items: ${missing.join(", ")}`);
  if (!input.project) errors.push("project is required");
  return errors;
}

function pageSpeed(psi, target) {
  if (!psi) return ["## PageSpeed", "", "Not measured in this run."];
  const row = (label, d) => d?.scores
    ? `| ${label} | ${label === "Mobile" ? `**${d.scores.performance}**` : d.scores.performance} | ${d.scores.accessibility} | ${d.scores["best-practices"]} | ${d.scores.seo} | ${cell(d.metrics.lcp)} | ${cell(d.metrics.cls)} | ${cell(d.metrics.tbt)} |`
    : `| ${label} | ${cell(d?.error ?? "not measured")} | | | | | | |`;
  const out = ["## PageSpeed", "", "| Device | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |", "|---|---|---|---|---|---|---|---|", row("Mobile", psi.mobile), row("Desktop", psi.desktop), ""];
  const audited = target?.url ? new URL(target.url).host : null;
  if (audited && new URL(psi.url).host !== audited) out.push(`PageSpeed measured \`${psi.url}\`, not the audited site (\`${target.url}\`).`, "");
  out.push(`Minimum: ${psi.min_mobile_score} on mobile${psi.mobile_pass === false ? " (**not met**)" : ""}. Real users (Core Web Vitals): ${psi.mobile?.field_core_web_vitals ?? "not measured"}.`);
  out.push(`Source: ${psi.source}. ${psi.report_url ? `Full report: [PageSpeed Insights](${psi.report_url})` : `Open in PageSpeed Insights: [mobile](${psi.psi_link}) · [desktop](${psi.psi_link_desktop})`}`);
  if (psi.borderline) out.push("", "The mobile score is within 5 points of the minimum, and lab scores move between runs: run it again before deciding.");
  return out;
}

function migration(r) {
  if (!r) return [];
  const out = ["## Migration", ""];
  if (r.error) return [...out, cell(r.error)];
  out.push(`Old URLs from ${r.source}: ${r.checked} checked. ${r.ok} answer directly, ${r.redirected} redirect permanently, ${r.temporary_redirect} redirect temporarily, **${r.broken} broken**.`);
  if (r.old_domain) out.push("", `Old domain: answers ${r.old_domain.status}, ends at \`${r.old_domain.final_url}\`${r.old_domain.permanent_to_new ? " (permanent redirect to the new site)" : " (**not** a permanent redirect to the new site)"}.`);
  if (r.broken_urls?.length) out.push("", "| Old path | Status | Add a 301 to |", "|---|---|---|", ...r.broken_urls.map((b) => `| \`${cell(b.path)}\` | ${b.status || cell(b.error)} | (choose the new page) |`));
  if (r.temporary_urls?.length) out.push("", "| Temporary redirect | Goes to |", "|---|---|", ...r.temporary_urls.map((t) => `| \`${cell(t.path)}\` | ${cell(t.to)} |`));
  return out;
}

export function buildMarkdown(input, list, raw = {}) {
  const meta = new Map(list.map((i) => [i.id, i]));
  const rows = input.items.map((r) => ({ ...meta.get(r.id), ...r }));
  const by = (res) => rows.filter((r) => r.result === res);
  const requiredFail = by("FAIL").filter((r) => r.severity === "Required");
  const verdict = requiredFail.length ? `**Verdict: Not ready** (${requiredFail.length} required item${requiredFail.length > 1 ? "s" : ""} fail)`
    : by("LOCAL").length ? `**Verdict: Ready locally** (${by("LOCAL").length} checks pending on the public URL or the launch environment)`
    : "**Verdict: Ready to launch**";
  const rank = { Required: 0, Recommended: 1, Optional: 2 };
  const next = [...by("FAIL")].sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 3);
  const md = [`# Launch report: ${input.project}`, "", verdict, ""];
  if (next.length) md.push(`**Next steps:** ${next.map((r, i) => `${i + 1}. **${r.id}** ${r.action}`).join(" ")}`, "");
  md.push("| Result | Items |", "|---|---|", ...RESULTS.map((res) => `| ${res} | **${by(res).length}**${res === "FAIL" && by(res).length ? ` (${requiredFail.length} required)` : ""} |`), "");
  md.push(...pageSpeed(raw.psi, input.target), "");
  if (requiredFail.length) md.push("## Required items still failing", "", "| ID | Item | Evidence | What to do |", "|---|---|---|---|", ...requiredFail.map((r) => `| ${r.id} | ${cell(r.title)} | ${cell(r.evidence)} | ${cell(r.action)} |`), "");
  if (input.fixed?.length) md.push("## Fixed during this run", "", "| ID | Command | Re-check |", "|---|---|---|", ...input.fixed.map((f) => `| ${f.id} | \`${cell(f.command)}\` | ${cell(f.recheck)} |`), "", `Backup: ${input.backup ? `\`${cell(input.backup)}\`` : "none (nothing was changed)"}`, "");
  md.push(...migration(raw.redirects), "");
  for (const section of [...new Set(list.map((i) => i.section))]) {
    const sectionRows = rows.filter((r) => r.section === section).sort((a, b) => list.findIndex((i) => i.id === a.id) - list.findIndex((i) => i.id === b.id));
    md.push(`## ${section}`, "", "| ID | Severity | Item | Result | Evidence |", "|---|---|---|---|---|",
      ...sectionRows.map((r) => `| ${r.id} | ${r.severity} | ${cell(r.title)} | ${r.result} | ${cell(r.evidence)}${r.suggested ? " (suggested value, confirm)" : ""} |`), "");
  }
  const manual = by("MANUAL");
  if (manual.length) md.push("## Manual checks", "", ...manual.map((r, i) => `${i + 1}. **${r.id}** ${r.title}: ${r.action ?? r.steps ?? r.evidence}`), "");
  if (input.notes?.length) md.push("## Notes", "", ...input.notes.map((n) => `- ${n}`), "");
  const t = input.target ?? {};
  md.push("## How this was checked", "", `Target: ${t.environment ?? "?"} (\`${t.siteurl ?? "?"}\`). URL: ${t.url ?? "-"}. PageSpeed URL: ${t.psi_url ?? "-"}. Remote: ${t.remote ?? "none"}. Date: ${input.date ?? new Date().toISOString().slice(0, 10)}. Tools: http-audit, page-audit, psi${raw.redirects ? ", redirect-audit" : ""}.`);
  return { markdown: md.join("\n") + "\n", verdict: requiredFail.length ? "Not ready" : by("LOCAL").length ? "Ready locally" : "Ready to launch", counts: Object.fromEntries(RESULTS.map((r) => [r, by(r).length])) };
}

// The items the agent must answer: everything the tools' JSON can't decide on its own for this run.
export function todo(list, raw, { local = false } = {}) {
  const decided = new Set(Object.entries(EVALUATORS).filter(([, fn]) => fn(raw, { local })).map(([id]) => id));
  return list.filter((i) => !decided.has(i.id)).map((i) => ({ id: i.id, severity: i.severity, title: i.title }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes("--todo")) {
  const args = process.argv.slice(2);
  const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const dir = resolve(opt("--dir") ?? "launch");
  const raw = { http: readJson(join(dir, "raw", "http.json")), pages: readJson(join(dir, "raw", "pages.json")), psi: readJson(join(dir, "raw", "psi.json")), redirects: readJson(join(dir, "raw", "redirects.json")) };
  const list = parseList(readFileSync(join(HERE, "..", "launch-list.md"), "utf8"));
  const local = opt("--url") ? isLocalHost(new URL(opt("--url")).hostname) : false;
  const items = todo(list, raw, { local });
  console.log(JSON.stringify({ agent_items: items.length, tools_decide: list.length - items.length, items }, null, 2));
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = resolve(args[args.indexOf("--dir") + 1] && args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "launch");
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8")); } catch (e) { console.error(`build: stdin is not valid JSON (${e.message})`); process.exit(2); }
  const list = parseList(readFileSync(join(HERE, "..", "launch-list.md"), "utf8"));
  const raw = { http: readJson(join(dir, "raw", "http.json")), pages: readJson(join(dir, "raw", "pages.json")), psi: readJson(join(dir, "raw", "psi.json")), redirects: readJson(join(dir, "raw", "redirects.json")) };
  if (!raw.http || !raw.pages) { console.error(`build: run the tools first, ${join(dir, "raw")} needs http.json and pages.json`); process.exit(1); }
  // Tool-backed items are decided from the JSON; the agent's results only fill in what the tools can't see.
  const local = input.target?.url ? isLocalHost(new URL(input.target.url).hostname) : false;
  const merged = merge(input.items ?? [], raw, { local });
  input.items = merged.items;
  const errors = [...merged.errors, ...validate(input, list)];
  if (errors.length) { console.error("build: the results are incomplete or contradict the tools, nothing was written:\n- " + errors.join("\n- ")); process.exit(1); }
  const { markdown, verdict, counts } = buildMarkdown(input, list, raw);
  const md = join(dir, "report.md"), html = join(dir, "report.html");
  writeFileSync(md, markdown);
  writeFileSync(html, renderReport(markdown, { eyebrow: input.project, subtitle: "Pre-launch audit", baseDir: dir, meta: [["Date", input.date ?? new Date().toISOString().slice(0, 10)], ["URL", input.target?.url ? new URL(input.target.url).host : "-"], ["Verdict", verdict]] }));
  let pdf = null;
  if (!args.includes("--no-pdf")) { pdf = join(dir, "report.pdf"); try { printPdf(html, pdf); } catch (e) { console.error(`build: ${e.message}`); pdf = null; } }
  console.log(JSON.stringify({ verdict, counts, files: { md, html, pdf } }, null, 2));
}
