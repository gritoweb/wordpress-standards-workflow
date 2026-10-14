// Results the tools' JSON decides on its own: the agent can't type over them. Each evaluator returns {result, evidence, action?},
// or null when the tools alone can't decide (the agent's wp-cli/file check then decides, with its own evidence).

const all = (pages, fn) => (pages ?? []).filter((p) => p.status === 200).every(fn);
const where = (pages, fn) => (pages ?? []).filter((p) => p.status === 200 && fn(p)).map((p) => new URL(p.url).pathname);
const pass = (evidence) => ({ result: "PASS", evidence });
const fail = (evidence, action) => ({ result: "FAIL", evidence, action });
const home = (raw) => raw.pages?.pages?.[0];

// Items that need the real public URL: on a local URL they are LOCAL, whatever the tool saw.
export const PUBLIC_ITEMS = new Set(["SEC-7", "SEC-14", "SEC-16", "SEO-6", "PERF-1", "PERF-3", "LIVE-5", "LEGAL-2"]);

export const EVALUATORS = {
  "SEC-7": ({ http }) => http && (http.https.redirects_to_https && http.https.https_status === 200 && !http.https.https_error
    ? pass(`http → ${http.https.http_status} ${http.https.http_location}; https → 200`)
    : fail(`http → ${http.https.http_status} (no redirect to https); https → ${http.https.https_status || http.https.https_error}`, "Force HTTPS at the host or with a 301 in the server config.")),
  "SEC-9": ({ http }, { local }) => {
    if (!http) return null;
    const wp = http.exposed.filter((e) => e.wordpress_file), other = http.exposed.filter((e) => !e.wordpress_file);
    const list = (xs) => xs.map((e) => `${e.path} (${e.content_type ?? "no type"}, ${e.bytes ?? "?"} B)`).join(", ");
    if (wp.length) return fail(`exposed: ${list(http.exposed)}`, `Remove ${wp.map((e) => e.path).join(", ")}${other.length ? `; delete ${other.map((e) => e.path).join(", ")} and rotate any secret in them` : ""}.`);
    if (other.length) return local ? { result: "LOCAL", evidence: `exposed locally: ${list(other)}; check the launch environment` } : fail(`exposed: ${list(other)}`, `Delete ${other.map((e) => e.path).join(", ")} from the web root and rotate any secret in them.`);
    return pass(`none of ${http.soft_404 ? "the probed paths (soft-404 site, HTML answers compared)" : "the probed paths"} answer 200`);
  },
  "SEC-10": ({ http }) => http && (Object.values(http.directory_listing).some(Boolean)
    ? fail(`listing on: ${Object.entries(http.directory_listing).filter(([, v]) => v).map(([k]) => k).join(", ")}`, "Disable directory indexes (Options -Indexes, or the host's setting).")
    : pass("no 'Index of /' on uploads, plugins or wp-includes")),
  "SEC-11": ({ http }) => http && (http.xmlrpc.open ? fail(`xmlrpc.php answers system.listMethods (${http.xmlrpc.status})`, "Disable XML-RPC (Security Optimizer › Site Security).") : pass(`xmlrpc.php → ${http.xmlrpc.status}, no method list`)),
  "SEC-12": ({ http }) => http && (http.rest_users.exposes_users ? fail(`/wp-json/wp/v2/users → ${http.rest_users.status} with user slugs`, "Activate disable-wp-rest-api (SEC-6).") : pass(`/wp-json/wp/v2/users → ${http.rest_users.status}`)),
  "SEC-18": ({ http }) => {
    const t = http?.theme_files;
    if (!t) return null;
    if (!t.exposed.length) return pass(`${t.checked} theme files probed under ${t.theme_path}, none served`);
    const short = t.exposed.map((e) => e.path.replace(t.theme_path, ""));
    // Every path is listed: each one is a file the dev must stop serving, and a secret may hide in any of them.
    return fail(`the site serves ${short.length} theme file(s): ${short.join(", ")}`,
      "Stop serving them: don't deploy dev files (.env, CLAUDE.md, .claude/, docs/, launch/, graphify-out/), or deny them (Apache: `Require all denied` in the theme; Pantheon: `protected_web_paths` in pantheon.yml). Rotate any secret that was exposed.");
  },
  "SEC-19": ({ http }) => {
    const u = http?.user_enum;
    if (!u) return null;
    const leaks = [u.author_param.login && `/?author=1 → ${u.author_param.location} (login "${u.author_param.login}")`, u.author_sitemap.entries && `/author-sitemap.xml lists ${u.author_sitemap.entries} author(s)`].filter(Boolean);
    return leaks.length ? fail(leaks.join("; "), "Stop author enumeration: send ?author=N and author archives to the home page (Security Optimizer or a template_redirect in the theme), and turn off Yoast's author archives and sitemap.")
      : pass(`/?author=1 → ${u.author_param.status}${u.author_param.location ? ` ${u.author_param.location}` : ""}, no author sitemap`);
  },
  "SEC-14": ({ http }) => {
    if (!http) return null;
    const h = http.headers, frame = h["x-frame-options"] || /frame-ancestors/i.test(h["content-security-policy"] ?? "");
    const missing = [!h["x-content-type-options"] && "x-content-type-options", !frame && "x-frame-options (or CSP frame-ancestors)", !h["referrer-policy"] && "referrer-policy"].filter(Boolean);
    return missing.length ? fail(`missing: ${missing.join(", ")}`, "Add the headers at the host/CDN, or in Security Optimizer.") : pass("x-content-type-options, frame protection and referrer-policy set");
  },
  "SEC-16": ({ http }) => {
    if (!http) return null;
    const v = http.headers["strict-transport-security"], age = Number(/max-age=(\d+)/i.exec(v ?? "")?.[1] ?? 0);
    return age >= 15552000 ? pass(`strict-transport-security: ${v}`) : fail(v ? `max-age ${age} is under 15552000` : "no strict-transport-security header", "Send HSTS with max-age of at least 15552000 from the host/CDN.");
  },
  "SEC-17": ({ http, pages }) => {
    if (!http) return null;
    const gen = (pages?.pages ?? []).map((p) => p.generator).filter(Boolean);
    return http.powered_by || gen.length ? fail([http.powered_by && `x-powered-by: ${http.powered_by}`, gen.length && `generator: ${gen[0]}`].filter(Boolean).join("; "), "Remove the X-Powered-By header and the generator meta.") : pass("no x-powered-by header, no generator meta");
  },
  "SEO-1": ({ pages }) => { const r = home({ pages })?.robots_meta ?? ""; return /noindex/i.test(r) ? fail(`home robots meta: ${r}`, "Turn off 'Discourage search engines' (blog_public = 1).") : null; },
  "SEO-2": ({ http }) => http && (http.robots.status === 200 && !http.robots.disallow_all && http.robots.sitemap_line
    ? pass("robots.txt 200, no 'Disallow: /' for *, has a Sitemap line")
    : fail(`robots.txt ${http.robots.status}${http.robots.disallow_all ? ", blocks the whole site" : ""}${http.robots.sitemap_line ? "" : ", no Sitemap line"}`, "Fix robots.txt (Yoast › Tools › File editor).")),
  "SEO-3": ({ http }) => http && (http.sitemap?.entries ? pass(`${http.sitemap.path}: ${http.sitemap.entries} entries`) : fail("no XML sitemap found", "Enable the Yoast XML sitemap.")),
  "SEO-4": ({ pages }) => {
    if (!pages) return null;
    const bad = where(pages.pages, (p) => !p.title || !p.meta_description || p.meta_description.length < 50 || p.meta_description.length > 160);
    if (bad.length || pages.duplicate_titles.length) return fail([bad.length && `missing/short description or title on ${bad.join(", ")}`, pages.duplicate_titles.length && `duplicate titles: ${pages.duplicate_titles.join(" | ")}`].filter(Boolean).join("; "), "Write a 50–160 character description for each page (SEO-4 fix).");
    return pass(`title and 50–160 char description on ${pages.pages.length} page(s), titles unique`);
  },
  "SEO-5": ({ pages }) => { if (!pages) return null; const bad = where(pages.pages, (p) => p.h1_count !== 1); return bad.length ? fail(`H1 count ≠ 1 on ${bad.join(", ")}`, "Fix the template so each page has exactly one H1.") : pass("exactly one H1 on every audited page"); },
  "SEO-6": ({ pages }) => {
    if (!pages) return null;
    const bad = where(pages.pages, (p) => !p.canonical || !p.canonical.startsWith("https://") || p.canonical.replace(/\/+$/, "") !== p.final_url.replace(/^http:/, "https:").replace(/\/+$/, ""));
    return bad.length ? fail(`canonical missing, not https or not self on ${bad.join(", ")}`, "Check Yoast's canonical and the site URL (https).") : pass("self-referencing https canonical on every audited page");
  },
  "SEO-7": ({ pages }) => { const h = home({ pages }); if (!h?.og) return null; const ok = h.og.title && h.og.description && h.og.image && h.og.image_status === 200; return ok ? pass(`og:title, og:description, og:image (${h.og.image}, 200)`) : fail(`og: title ${h.og.title}, description ${h.og.description}, image ${h.og.image ?? "none"}${h.og.image ? ` (${h.og.image_status})` : ""}`, "Set the default OG image and the home description (SEO-7 fix)."); },
  "SEO-8": ({ pages }) => { if (!pages) return null; const bad = (pages.pages ?? []).flatMap((p) => p.images_without_alt ?? []); return bad.length ? fail(`img without alt: ${bad.slice(0, 5).join(", ")}${bad.length > 5 ? ` (+${bad.length - 5})` : ""}`, "Add alt text in the Media Library or the block.") : pass("every img has an alt attribute"); },
  "SEO-10": ({ http }) => {
    if (!http) return null;
    const n = http.not_found;
    if (n.status === 404 && n.themed && !n.starter_default) return pass("missing page → 404 with the project's own template");
    return fail(`missing page → ${n.status}${n.themed ? "" : ", not themed"}${n.starter_default ? `, starter's default text: "${n.starter_default}"` : ""}`, "Write the project's 404 template (resources/views/404.blade.php): message, search or links back.");
  },
  "SEO-11": ({ redirects }) => {
    if (!redirects) return null;
    if (redirects.error) return { result: "MANUAL", evidence: redirects.error, action: "Paste the old URLs into a file and run redirect-audit with --list." };
    const domainOk = !redirects.old_domain || redirects.old_domain.permanent_to_new;
    const ev = `${redirects.checked} old URLs (${redirects.source}): ${redirects.ok} ok, ${redirects.redirected} 301, ${redirects.temporary_redirect} temporary, ${redirects.broken} broken${redirects.old_domain ? `; old domain ${redirects.old_domain.permanent_to_new ? "301s to the new one" : "does not 301 to the new one"}` : ""}`;
    return redirects.broken || redirects.temporary_redirect || !domainOk ? fail(ev, "Add 301s for the broken paths listed under Migration, and make temporary redirects permanent.") : pass(ev);
  },
  "PERF-1": ({ http }) => http?.cache?.hit ? pass(`cache hit: ${Object.entries(http.cache.headers).map(([k, v]) => `${k}: ${v}`).join(", ")}`) : null,
  "PERF-2": ({ psi }) => {
    if (!psi?.mobile?.scores) return null;
    const s = psi.mobile.scores.performance, ev = `mobile ${s} (LCP ${psi.mobile.metrics.lcp}, CLS ${psi.mobile.metrics.cls}, TBT ${psi.mobile.metrics.tbt}), desktop ${psi.desktop?.scores?.performance ?? "-"}; ${psi.source}`;
    if (psi.decisive === false) return { result: "MANUAL", evidence: ev, action: `Open ${psi.psi_link} and read the mobile score.` };
    if (/local estimate/.test(psi.source)) return { result: "LOCAL", evidence: ev };
    return s >= psi.min_mobile_score ? pass(ev) : fail(ev, "Improve LCP/TBT (images, caching, render-blocking scripts) until mobile ≥ 70.");
  },
  "PERF-3": ({ http }) => http && (http.cdn ? pass(http.cdn) : fail("no CDN or edge header", "Put a CDN (or the host's edge) in front of static files.")),
  "CON-4": ({ pages }) => { if (!pages) return null; const bad = (pages.pages ?? []).flatMap((p) => p.placeholder_images ?? []); return bad.length ? fail(`placeholder images: ${bad.slice(0, 3).join(", ")}`, "Replace them with real images.") : null; },
  "CON-8": ({ pages }) => pages?.links && (pages.links.broken.length ? fail(`${pages.links.broken.length} broken: ${pages.links.broken.slice(0, 3).map((b) => `${b.url} (${b.status})`).join(", ")}`, "Fix or remove the broken links (menus, buttons, Site Settings).") : pass(`${pages.links.checked} links checked, none broken`)),
  "LIVE-2": ({ pages }) => { if (!pages) return null; const p = (pages.pages ?? []).find((x) => x.powered_by_wordpress || x.starter_names); return p ? fail(`${new URL(p.url).pathname}: "${p.powered_by_wordpress ?? p.starter_names}"`, "Remove the credit or starter name from the template.") : pass("no 'Powered by WordPress' or starter names"); },
  "LIVE-5": ({ pages }) => {
    const v = (pages?.pages ?? []).filter((p) => p.w3c && p.w3c.errors != null);
    if (!v.length) return null;
    const bad = v.filter((p) => p.w3c.errors > 0);
    return bad.length ? fail(bad.map((p) => `${new URL(p.url).pathname}: ${p.w3c.errors} errors (${p.w3c.first_errors[0] ?? ""})`).join("; "), "Fix the markup errors the W3C validator lists.") : pass(`0 W3C errors on ${v.length} page(s)`);
  },
  "LIVE-6": ({ psi }) => { const a = psi?.mobile?.scores?.accessibility; if (a == null || psi.decisive === false) return null; return a >= 90 ? pass(`accessibility ${a}`) : fail(`accessibility ${a}`, "Fix the accessibility issues PageSpeed lists."); },
  "LEGAL-1": ({ pages }) => {
    const l = home({ pages })?.footer_links;
    if (!l?.privacy && !l?.terms) return null;
    const missing = ["privacy", "terms"].filter((k) => l[k] && !l[k].found);
    return missing.length ? fail(`footer has no link to ${missing.map((k) => l[k].expected).join(", ")}`, "Link the privacy and terms pages in the footer.") : null;
  },
  "LEGAL-2": ({ pages }) => { const h = home({ pages }); if (!h || h.status !== 200) return null; return h.analytics ? pass(`tag: ${h.analytics}`) : fail("no Google tag/Tag Manager on the home page", "Install GA4 (Site Kit or the GTM snippet)."); },
  "LEGAL-4": ({ pages }) => { const h = home({ pages }); if (!h || h.status !== 200) return null; return h.consent_banner ? pass(`consent: ${h.consent_banner}`) : fail("no known consent manager on the home page", "Install a consent banner (e.g. Complianz or CookieYes)."); },
  "MAIL-4": ({ pages }) => {
    if (!pages) return null;
    const withForms = (pages.pages ?? []).filter((p) => p.forms > 0);
    if (!withForms.length) return { result: "N/A", evidence: "no forms on the audited pages" };
    const bad = withForms.filter((p) => p.forms_protected < p.forms);
    return bad.length ? fail(`unprotected forms on ${bad.map((p) => new URL(p.url).pathname).join(", ")}`, "Add Turnstile/reCAPTCHA or a honeypot to each form.") : pass(`${withForms.reduce((n, p) => n + p.forms, 0)} form(s), all with anti-spam`);
  },
  "PAGE-1": ({ http }) => {
    const f = http?.favicon;
    if (!f) return null;
    if (f.status === 200 && f.is_image && !f.default_wp_icon) return pass(`/favicon.ico → ${f.final_url} (${f.content_type})`);
    return fail(`/favicon.ico → ${f.status} ${f.final_url ?? ""} (${f.content_type ?? "no type"})${f.default_wp_icon ? ", WordPress's own icon" : ""}`, "Set the site icon (PAGE-1 fix), so WordPress answers /favicon.ico with it.");
  },
  "PAGE-2": ({ http }) => {
    const s = http?.search;
    if (!s) return null;
    if (s.disabled) return pass(`search switched off: /?s= → ${s.blank.status}, /?s=zzzz → ${s.status}`);
    const problems = [s.status !== 200 && `/?s=zzzz → ${s.status}`, s.blank.status !== 200 && `/?s= → ${s.blank.status}`, !s.themed && "not themed",
      s.starter_default && `starter's default text: "${s.starter_default}"`, !s.no_results_marker && "no search-no-results state"].filter(Boolean);
    return problems.length ? fail(`search: ${problems.join(", ")}`, "Write the project's search template with a 'no results' state, or switch search off in code (404 on ?s=) if the site doesn't use it.")
      : pass("/?s= and /?s=zzzz render the project's search template with a no-results state");
  },
  "MAIL-5": ({ pages }) => {
    if (!pages) return null;
    const withForms = (pages.pages ?? []).filter((p) => p.forms > 0);
    if (!withForms.length) return { result: "N/A", evidence: "no forms on the audited pages" };
    const broken = withForms.flatMap((p) => (p.form_actions ?? []).filter((a) => a.status === 0 || a.status === 404 || a.status === 410 || a.status >= 500).map((a) => `${new URL(p.url).pathname} → ${a.action} (${a.status})`));
    return broken.length ? fail(`form action is missing: ${broken.join(", ")}`, "Point each form at its real handler (form plugin or theme endpoint), then submit it once.")
      : pass(`${withForms.reduce((n, p) => n + p.forms, 0)} form(s); every action exists or posts to its own page`);
  },
  "PAGE-7": ({ http, repo }) => {
    const a = http?.archives;
    if (!a || !repo) return null;
    const own = { author: ["author", "archive"], date: ["date", "archive"], category: ["category", "archive"] };
    const origin = new URL(a.author.url).origin + "/";
    const bad = Object.entries(a).flatMap(([kind, r]) => {
      if (r.status === 404 || r.final_url === origin) return [];
      if (r.status !== 200) return [`${kind} archive → ${r.status}`];
      const tpl = own[kind].find((t) => repo.templates[t]);
      return [!tpl && `${kind} archive (${new URL(r.final_url).pathname}) falls back to index.blade.php`, r.starter_default && `${kind} archive shows "${r.starter_default}"`].filter(Boolean);
    });
    return bad.length ? fail(bad.join("; "), "For each archive: write its template (archive.blade.php covers all of them), or switch it off (404, or a redirect to the home page) if the site doesn't use it.")
      : pass(Object.entries(a).map(([k, r]) => `${k} → ${r.status === 404 ? "404 (off)" : r.final_url === origin ? "home (off)" : `${r.status}, own template`}`).join("; "));
  },
  "CODE-5": ({ repo }) => repo && (repo.home_paths.length ? fail(`machine paths: ${repo.home_paths.slice(0, 5).map((h) => `${h.file}:${h.line} ${h.match}`).join(", ")}`, "Replace them with relative paths or remove the generated files (e.g. graphify-out/) from the repository.") : pass(`${repo.files} files, no /home/<user>/ or /Users/<user>/ path`)),
  "CODE-6": ({ repo }) => repo && (repo.embedded_repos.length || repo.wordpress_copies.length
    ? fail([repo.embedded_repos.length && `folders with their own .git, not in .gitmodules: ${repo.embedded_repos.join(", ")}`, repo.wordpress_copies.length && `WordPress copied into the theme: ${repo.wordpress_copies.join(", ")}`].filter(Boolean).join("; "), "Remove the copy, or add it as a submodule (git submodule add <url> <path>). WordPress core never lives in the theme.")
    : pass(`no embedded repository or WordPress copy under ${repo.git_root}`)),
  "LIVE-8": ({ repo }) => {
    if (!repo) return null;
    const d = repo.debt, problems = [!d.exists && `no ${d.file}`, d.open_blockers.length && `open blockers: ${d.open_blockers.join(" | ")}`,
      repo.untracked_todos.length && `TODO/FIXME without owner and date: ${repo.untracked_todos.slice(0, 5).map((t) => `${t.file}:${t.line}`).join(", ")}`].filter(Boolean);
    return problems.length ? fail(problems.join("; "), `Write ${d.file} (one "- [ ]" line per pending item, "[blocker]" when it must be done before launch), finish every blocker, and give each code TODO an owner and date or move it to the file.`)
      : pass(`${d.file}: no open blocker; ${repo.todos.length} dated TODO(s) in the theme`);
  },
  "PAGE-5": ({ http }) => (http?.apple_touch_icon === 200 ? pass("/apple-touch-icon.png → 200") : null),
};

// The agent may report FIXED where the tools now see PASS; otherwise it must agree with the tools.
export function merge(agentItems, raw, { local }) {
  const byId = new Map(agentItems.map((i) => [i.id, i]));
  const errors = [], out = [];
  for (const [id, evaluate] of Object.entries(EVALUATORS)) {
    let e = evaluate(raw, { local });
    if (!e) continue;
    if (local && PUBLIC_ITEMS.has(id) && e.result !== "LOCAL") e = { result: "LOCAL", evidence: `local URL: ${e.evidence}`, action: "Re-check on the public URL." };
    const agent = byId.get(id);
    if (agent && agent.result !== e.result && !(agent.result === "FIXED" && e.result === "PASS")) {
      errors.push(`${id}: reported ${agent.result}, but the tools show ${e.result} (${e.evidence})`);
      continue;
    }
    out.push({ id, ...e, ...(agent?.result === "FIXED" ? { result: "FIXED", evidence: agent.evidence || e.evidence } : {}), source: "tools" });
    byId.delete(id);
  }
  return { items: [...out, ...byId.values()], errors };
}
