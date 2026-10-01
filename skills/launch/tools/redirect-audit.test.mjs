// node --test "skills/launch/tools/*.test.mjs" — the migration check against two in-memory sites (old and new).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locs, onNewSite, redirectAudit } from "./redirect-audit.mjs";

const serve = (routes) => new Promise((ok) => {
  const s = createServer((req, res) => {
    const r = routes[req.url] ?? [404, {}, "not found"];
    res.writeHead(r[0], r[1]); res.end(r[2] ?? "");
  }).listen(0, "127.0.0.1", () => ok(s));
});
const base = (s) => `http://127.0.0.1:${s.address().port}/`;

test("sitemap locs are read and old URLs map onto the new site's paths", () => {
  assert.deepEqual(locs("<urlset><url><loc> https://old.example/a/?p=1&amp;x=2 </loc></url></urlset>"), ["https://old.example/a/?p=1&x=2"]);
  assert.equal(onNewSite("https://old.example/services/?id=3", "https://new.example/"), "https://new.example/services/?id=3");
});

test("a migration is checked from the old site's sitemap: ok, permanent, temporary and broken", async () => {
  const fresh = await serve({
    "/about/": [200, {}, "about"],
    "/services/": [301, { location: "/what-we-do/" }],
    "/what-we-do/": [200, {}, "services"],
    "/blog/": [302, { location: "/news/" }],
    "/news/": [200, {}, "news"],
  });
  const old = await serve({});
  const oldUrl = base(old);
  const pages = ["about/", "services/", "blog/", "team/"].map((p) => `<url><loc>${oldUrl}${p}</loc></url>`).join("");
  old.removeAllListeners("request");
  old.on("request", (req, res) => {
    if (req.url === "/sitemap_index.xml") { res.writeHead(200); return res.end(`<sitemapindex><sitemap><loc>${oldUrl}page-sitemap.xml</loc></sitemap></sitemapindex>`); }
    if (req.url === "/page-sitemap.xml") { res.writeHead(200); return res.end(`<urlset>${pages}<url><loc>${oldUrl}logo.png</loc></url></urlset>`); }
    if (req.url === "/") { res.writeHead(301, { location: base(fresh) }); return res.end(); }
    res.writeHead(404); res.end();
  });
  try {
    const r = await redirectAudit(base(fresh), { old: oldUrl });
    assert.equal(r.source, "sitemap (sitemap_index.xml)");
    assert.equal(r.checked, 4, "the logo.png asset is skipped");
    assert.deepEqual([r.ok, r.redirected, r.temporary_redirect, r.broken], [1, 1, 1, 1]);
    assert.deepEqual(r.broken_urls, [{ path: "/team/", status: 404, error: null }]);
    assert.equal(r.temporary_urls[0].path, "/blog/");
  } finally { fresh.close(); old.close(); }
});

test("a pasted list of paths works without the old site", async () => {
  const fresh = await serve({ "/contact/": [200, {}, "ok"] });
  const list = join(mkdtempSync(join(tmpdir(), "launch-redirects-")), "old-urls.txt");
  writeFileSync(list, "# old URLs\n/contact/\nhttps://old.example/gone/\n\n");
  try {
    const r = await redirectAudit(base(fresh), { list });
    assert.deepEqual([r.checked, r.ok, r.broken], [2, 1, 1]);
    assert.equal(r.broken_urls[0].path, "/gone/");
  } finally { fresh.close(); }
});
