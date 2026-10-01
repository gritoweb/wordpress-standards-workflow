#!/usr/bin/env node
// PAGE-1 / SEO-7 / PAGE-5: renders the logo onto a 512×512 site icon and a 1200×630 Open Graph image with headless Chrome.
// usage: node brand-images.mjs <logo.(png|svg|jpg|webp)> --out <dir> [--bg <css colour>]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findBrowser } from "../report/report.mjs";

const TYPES = { ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
export const SIZES = { "site-icon-512.png": [512, 512, 0.78], "og-default-1200x630.png": [1200, 630, 0.6] };

// The logo is scaled to `fill` of the canvas's shorter side and centred, so a wide wordmark still fits the square icon.
export const page = (dataUri, [width, height, fill], bg) => `<!doctype html><html><head><style>
html,body{margin:0;width:${width}px;height:${height}px;background:${bg};overflow:hidden}
body{display:flex;align-items:center;justify-content:center}
img{width:${Math.round(width * fill)}px;height:${Math.round(height * fill)}px;object-fit:contain}
</style></head><body><img src="${dataUri}"></body></html>`;

export const pngSize = (buf) => (buf.subarray(1, 4).toString() === "PNG" ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null);

export function brandImages(logo, outDir, bg = "#ffffff") {
  const type = TYPES[extname(logo).toLowerCase()];
  if (!type) throw new Error(`unsupported logo type: ${extname(logo)} (png, svg, jpg, webp)`);
  if (!/^(#[0-9a-f]{3,8}|[a-z]+|rgb\([\d\s,.%]+\))$/i.test(bg)) throw new Error(`not a CSS colour: ${bg}`);
  const chrome = findBrowser();
  if (!chrome) throw new Error("no Chrome, Edge or Chromium found");
  const dataUri = `data:${type};base64,${readFileSync(logo).toString("base64")}`;
  const work = mkdtempSync(join(tmpdir(), "launch-brand-"));
  mkdirSync(outDir, { recursive: true });
  const files = {};
  for (const [name, size] of Object.entries(SIZES)) {
    const html = join(work, name + ".html"), out = resolve(outDir, name);
    writeFileSync(html, page(dataUri, size, bg));
    const r = spawnSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${size[0]},${size[1]}`, `--screenshot=${out}`, `file://${html}`], { stdio: "ignore", timeout: 60000 });
    const got = existsSync(out) ? pngSize(readFileSync(out)) : null;
    if (r.status !== 0 || !got) throw new Error(`Chrome did not render ${name} (exit ${r.status})`);
    const bytes = readFileSync(out).length;
    // A flat canvas compresses to a few hundred bytes: under 1 KB the logo did not render.
    if (bytes < 1024) throw new Error(`${name} is ${bytes} bytes: the logo did not render (is the file a valid image?)`);
    files[name] = { path: out, width: got[0], height: got[1], bytes };
  }
  return { logo: resolve(logo), background: bg, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const logo = args.find((a, i) => !a.startsWith("--") && !["--out", "--bg"].includes(args[i - 1]));
  if (!logo || !opt("--out")) { console.error("usage: node brand-images.mjs <logo> --out <dir> [--bg <colour>]"); process.exit(2); }
  console.log(JSON.stringify(brandImages(logo, opt("--out"), opt("--bg")), null, 2));
}
