#!/usr/bin/env node
// Markdown report → one self-contained HTML page in the shared visual language, optionally printed to PDF by a headless browser.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { escapeHtml, markdownToHtml } from "./markdown.mjs";
import { COPY_BUTTONS_JS, PAGE_CSS } from "./style.mjs";


const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

// Only image files next to the report (no URLs, no absolute paths, no ..) are embedded, so the page stays one self-contained file.
export function localImage(baseDir) {
  return (path) => {
    const type = IMAGE_TYPES[extname(path).toLowerCase()];
    if (!type || /^[a-z]+:|^\/|(^|\/)\.\.(\/|$)/i.test(path)) return null;
    const file = join(baseDir, path);
    return existsSync(file) ? `data:${type};base64,${readFileSync(file).toString("base64")}` : null;
  };
}

export function renderReport(markdown, o = {}) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  // The first H1 is the page title unless one was given; it is not repeated in the body.
  const h1 = lines.findIndex((l) => /^#\s+/.test(l));
  const title = o.title ?? (h1 >= 0 ? lines[h1].replace(/^#\s+/, "") : "Report");
  const body = h1 >= 0 && !o.title ? [...lines.slice(0, h1), ...lines.slice(h1 + 1)].join("\n") : markdown;
  const pills = (o.meta ?? []).map(([k, v]) => `<span class="pill">${escapeHtml(k)} <b>${escapeHtml(v)}</b></span>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<main class="page">
<header class="masthead">
${o.eyebrow ? `<div class="eyebrow">${escapeHtml(o.eyebrow)}</div>` : ""}
<h1 class="title">${escapeHtml(title)}</h1>
${o.subtitle ? `<p class="lede">${escapeHtml(o.subtitle)}</p>` : ""}
${pills ? `<div class="meta">${pills}</div>` : ""}
</header>
<article class="text">
${markdownToHtml(body, { image: o.baseDir ? localImage(o.baseDir) : undefined })}
</article>
</main>
<script>${COPY_BUTTONS_JS}</script>
</body>
</html>
`;
}

const BROWSERS = {
  win32: [
    join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
    join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/snap/bin/chromium"],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
};

export const findBrowser = () => (BROWSERS[process.platform] ?? []).find((p) => existsSync(p));

export function printPdf(htmlFile, pdfFile, browser = findBrowser()) {
  if (!browser) throw new Error("no Chrome, Edge or Chromium found to print the PDF; the HTML was written anyway");
  const r = spawnSync(browser, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, pathToFileURL(htmlFile).href], { stdio: "ignore", timeout: 60000, windowsHide: true });
  if (r.status !== 0 || !existsSync(pdfFile)) throw new Error(`the browser did not write the PDF (exit ${r.status ?? r.error?.message})`);
}

function main(argv) {
  const input = argv.find((a, i) => !a.startsWith("-") && !["-o", "--title", "--subtitle", "--about", "--meta"].includes(argv[i - 1] ?? ""));
  const value = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  if (!input) {
    console.error('usage: node report.mjs report.md [-o out.html] [--title "..."] [--subtitle "..."] [--about "Project"] [--meta "Date=2026-10-01"]... [--pdf]');
    return 2;
  }
  const meta = argv.flatMap((a, i) => (a === "--meta" && argv[i + 1]?.includes("=") ? [argv[i + 1].split(/=(.*)/s).slice(0, 2)] : []));
  const output = resolve(value("-o") ?? join(dirname(input), basename(input).replace(/\.md$/i, "") + ".html"));
  writeFileSync(output, renderReport(readFileSync(input, "utf8"), { title: value("--title"), subtitle: value("--subtitle"), eyebrow: value("--about"), meta, baseDir: dirname(resolve(input)) }));
  console.log(`html: ${output}`);
  if (argv.includes("--pdf")) {
    const pdf = output.replace(/\.html?$/i, "") + ".pdf";
    try {
      printPdf(output, pdf);
      console.log(`pdf: ${pdf}`);
    } catch (e) {
      console.error(`[report] ${e.message}`);
      return 1;
    }
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
