// node --test "skills/launch/report/*.test.mjs" — Markdown safety and the report page the launch skill writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { markdownToHtml } from "./markdown.mjs";
import { findBrowser, localImage, printPdf, renderReport } from "./report.mjs";

test("evidence pasted from a site can never inject HTML or script links", () => {
  const html = markdownToHtml('<script>alert(1)</script>\n\n**<img src=x onerror=alert(1)>** and [click](javascript:alert(1)) and `<b>`');
  assert.doesNotMatch(html, /<script|<img|href="javascript/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<code>&lt;b&gt;<\/code>/, "code spans stay literal");
  assert.match(html, /\[click\]\(javascript:alert\(1\)\)/, "an unsafe link is left as plain text");
});

test("the report's result tables, lists and code blocks render", () => {
  const html = markdownToHtml(["## Security", "", "| ID | Item | Result |", "|---|---|---|", "| SEC-1 | No `admin` user | ❌ Fail |", "", "- [ ] Check 2FA", "", "```bash", "lando wp user list", "```"].join("\n"));
  assert.match(html, /<h3>Security<\/h3>/);
  assert.match(html, /<th>ID<\/th><th>Item<\/th><th>Result<\/th>.*<td>SEC-1<\/td><td>No <code>admin<\/code> user<\/td>/s);
  assert.match(html, /<ul><li>\[ \] Check 2FA<\/li><\/ul>/);
  assert.match(html, /<pre><code data-lang="bash">lando wp user list<\/code><\/pre>/);
});

test("a report page takes its title from the first H1, shows the meta pills, in English", () => {
  const html = renderReport("# Launch report\n\nText.\n\n```bash\nlando wp option get blog_public\n```", { eyebrow: "Acme", meta: [["Date", "2026-10-01"]] });
  assert.match(html, /<title>Launch report<\/title>/);
  assert.equal(html.match(/Launch report/g)?.length, 2, "title tag and heading, not repeated in the body");
  assert.match(html, /<html lang="en">/); assert.match(html, /class="eyebrow">Acme</); assert.match(html, /Date <b>2026-10-01<\/b>/);
  assert.match(html, /prefers-color-scheme: dark/); assert.match(html, /"Copy"/); assert.doesNotMatch(html, /Copiar|Relatório/);
});

test("--pdf prints the page with a headless browser", { skip: !findBrowser() && "no Chrome, Edge or Chromium on this machine" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "launch-report-"));
  const html = join(dir, "r.html");
  writeFileSync(html, renderReport("# PDF\n\ncontent"));
  printPdf(html, join(dir, "r.pdf"));
  assert.ok(existsSync(join(dir, "r.pdf")) && statSync(join(dir, "r.pdf")).size > 1000);
  assert.equal(readFileSync(join(dir, "r.pdf")).subarray(0, 4).toString(), "%PDF");
});

test("result and severity words become coloured labels, other cells stay escaped text", () => {
  const html = markdownToHtml("| ID | Severity | Result |\n|---|---|---|\n| SEC-1 | Required | FAIL |\n| SEC-2 | Optional | PASS |\n| X | <b>FAIL</b> | PASSED |");
  assert.match(html, /<td><span class="tag tag-bad">Required<\/span><\/td><td><span class="tag tag-bad">FAIL<\/span><\/td>/);
  assert.match(html, /<td><span class="tag tag-none">Optional<\/span><\/td><td><span class="tag tag-ok">PASS<\/span><\/td>/);
  assert.match(html, /<td>&lt;b&gt;FAIL&lt;\/b&gt;<\/td><td>PASSED<\/td>/, "only an exact word becomes a label");
});

test("a local image next to the report is embedded; URLs, absolute paths and .. stay text", () => {
  const dir = mkdtempSync(join(tmpdir(), "launch-img-"));
  writeFileSync(join(dir, "shot.png"), Buffer.from("89504e470d0a1a0a", "hex"));
  const image = localImage(dir);
  const html = markdownToHtml(["![PageSpeed mobile](shot.png)", "", "![x](https://evil.example/x.png)", "", "![x](/etc/x.png)", "", "![x](../shot.png)", "", "![x](missing.png)"].join("\n"), { image });
  assert.match(html, /<figure><img src="data:image\/png;base64,iVBORw0KGgo=" alt="PageSpeed mobile"><\/figure>/);
  assert.equal((html.match(/<img/g) ?? []).length, 1, "only the local file becomes an image");
  assert.doesNotMatch(html, /<img[^>]+(evil|etc|\.\.\/|missing)/);
  assert.match(renderReport("# R\n\n![s](shot.png)", { baseDir: dir }), /data:image\/png;base64/);
});
