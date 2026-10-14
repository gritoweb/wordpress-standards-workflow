#!/usr/bin/env node
// File-level checks of the theme for the launch list (CODE-5/6, LIVE-8, PAGE-7) as one JSON report. Reads only.
// usage: node repo-audit.mjs <theme-dir>
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = new Set(["node_modules", "vendor", ".git"]);
export const DEBT_FILE = "docs/tech-debt.md";

// Every file under dir, as paths relative to it; dependency and VCS folders are skipped.
export function listFiles(dir, { skip = SKIP } = {}) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(relative(dir, p));
    }
  };
  walk(dir);
  return out.sort();
}

const isText = (file) => { try { const s = statSync(file); if (s.size > 1_000_000) return false; return !readFileSync(file).subarray(0, 4096).includes(0); } catch { return false; } };
const grep = (dir, files, re, limit = 20) => {
  const hits = [];
  for (const f of files) {
    if (!isText(join(dir, f))) continue;
    readFileSync(join(dir, f), "utf8").split("\n").forEach((line, i) => { const m = line.match(re); if (m && hits.length < limit) hits.push({ file: f, line: i + 1, match: m[0] }); });
  }
  return hits;
};

export function repoAudit(themeDir) {
  const dir = resolve(themeDir);
  const files = listFiles(dir);
  const built = (f) => /^public\/build\//.test(f);
  const source = files.filter((f) => !built(f));

  // A path from someone's machine (Graphify, configs, docs) breaks elsewhere and leaks a username; .claude/ is the kit's own copy.
  const homePaths = grep(dir, source.filter((f) => !f.startsWith(".claude/")), /(\/home\/(?!runner\/)[a-z0-9._-]+\/|\/Users\/[A-Za-z0-9._-]+\/|C:\\Users\\[^\\\s]+\\)/);

  // A folder with its own .git that .gitmodules doesn't list is a copied repository (e.g. WordPress cloned inside the theme).
  let top = dir;
  try { top = execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
  const modules = existsSync(join(top, ".gitmodules")) ? [...readFileSync(join(top, ".gitmodules"), "utf8").matchAll(/path\s*=\s*(.+)/g)].map((m) => m[1].trim()) : [];
  const nested = [];
  const findGit = (d, depth = 0) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "node_modules" || e.name === "vendor") continue;
      const p = join(d, e.name);
      if (e.name === ".git") { if (depth > 0) nested.push(relative(top, d)); continue; }
      if (depth < 6) findGit(p, depth + 1);
    }
  };
  findGit(top);
  const embedded = nested.filter((p) => !modules.includes(p));
  const wpCopies = files.filter((f) => /(^|\/)wp-includes\/version\.php$/.test(f)).map((f) => f.replace(/\/?wp-includes\/version\.php$/, "") || ".");

  // Pending work lives in one file; a code TODO or an open [blocker] there means something was left for "later".
  const debtPath = join(dir, DEBT_FILE);
  const debt = existsSync(debtPath) ? readFileSync(debtPath, "utf8") : null;
  const openBlockers = debt ? debt.split("\n").filter((l) => /^\s*- \[ \] .*\[blocker\]/i.test(l)).map((l) => l.trim()) : [];
  const todos = grep(dir, source.filter((f) => /^(app|resources)\//.test(f)), /\b(TODO|FIXME)\b.*/, 50);
  // The kit's comment rule: a TODO carries an owner and a date (`TODO @name YYYY-MM-DD: …`); one without them has no one coming back for it.
  const untracked = todos.filter((t) => !/\b(TODO|FIXME) @\S+ \d{4}-\d{2}-\d{2}/.test(t.match));

  const views = new Set(files.filter((f) => /^resources\/views\/[^/]+\.blade\.php$/.test(f)).map((f) => f.slice("resources/views/".length, -".blade.php".length)));
  const templates = Object.fromEntries(["archive", "author", "date", "category", "tag", "404", "search"].map((t) => [t, views.has(t)]));

  return { theme_dir: dir, git_root: top, files: files.length, home_paths: homePaths, embedded_repos: embedded, wordpress_copies: wpCopies,
    debt: { file: DEBT_FILE, exists: debt != null, open_blockers: openBlockers }, todos, untracked_todos: untracked, templates };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node repo-audit.mjs <theme-dir>"); process.exit(2); }
  console.log(JSON.stringify(repoAudit(dir), null, 2));
}
