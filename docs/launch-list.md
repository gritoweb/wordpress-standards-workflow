# Launch Checklist

Pre-launch verification for WordPress sites built on the GritoWeb standards.
Run it before any production go-live. The `launch` skill
(`.claude/skills/launch/`) reads this file, checks every item it can, asks
before fixing anything, and writes the report. You can also tick items by hand.

**Severity**

- 🚫 **Required**: the site does not launch until it passes. Every security
  and base-SEO item is required.
- ⚠️ **Recommended**: fix as soon as possible after launch.
- 💡 **Nice to have**: improves quality, not strictly required.

**Tags**

- `auto`: the agent verifies it alone (wp-cli, files, HTTP).
- `fix`: the agent knows a fix too, and runs it only after you approve it.
- `manual`: needs a human or panel access. The report lists it as a manual check.

**How to read the commands**

- `wp …` runs locally as `lando wp …`. On a remote environment, it runs as
  `terminus wp <site>.<env> -- …`, which is read-only unless you approve a write.
- `$URL` is the public site URL (`https://…`). Without one, the HTTP checks
  become manual.
- `$THEME` is the active theme root (`wp-content/themes/<theme>/`).

Each item: **ID**, tags and title, then **Check** (the exact command or place), **Pass if**
(what counts as pass) and, for `fix`, **Fix** (the command offered).

---

## 🔒 Security

- [ ] 🚫 **SEC-1** `auto` `fix`: No user with the login `admin`
  - Check: `wp user list --field=user_login`
  - Pass if: no line is exactly `admin`
  - Fix: `wp user create <new-login> <email> --role=administrator`, then `wp user delete admin --reassign=<new-id>`
- [ ] 🚫 **SEC-2** `auto` `fix`: No test or demo users left
  - Check: `wp user list --fields=ID,user_login,user_email,roles`
  - Pass if: no login or email matches `test|teste|demo|dev|example\.(com|org)|mailinator`
  - Fix: `wp user delete <id> --reassign=<owner-id>`
- [ ] 🚫 **SEC-3** `auto`: WordPress core, plugins and the active theme up to date
  - Check: `wp core check-update`, `wp plugin list --update=available`, `wp theme list --update=available`
  - Pass if: all three are empty
  - Updates are not auto-fixed: they change third-party code, so the dev runs them and tests.
- [ ] 🚫 **SEC-4** `auto` `fix`: No inactive or dev-only plugins
  - Check: `wp plugin list --fields=name,status`
  - Pass if: no plugin is `inactive`, and none of these is installed: `query-monitor`, `debug-bar*`, `fakerpress`, `user-switching`, `wp-reset`, `wp-crontrol`, `theme-check`, `show-current-template`, `what-the-file`
  - Fix: `wp plugin delete <name>`
- [ ] 🚫 **SEC-5** `auto`: No abandoned plugins
  - Check: open `https://wordpress.org/plugins/<name>/` for each active plugin
  - Pass if: each was updated in the last 2 years and is not closed. Premium or custom plugins are `n/a`.
- [ ] 🚫 **SEC-6** `auto` `fix`: Required security and SEO plugins active
  - Check: `wp plugin list --status=active --field=name`
  - Pass if: `disable-wp-rest-api`, `sg-security` (Security Optimizer), `sg-cachepress` (Speed Optimizer), `wordpress-seo` (Yoast SEO) and `safe-svg` are all listed
  - Fix: `wp plugin install <name> --activate`
- [ ] 🚫 **SEC-7** `auto`: HTTPS enforced
  - Check: `curl -sI http://<host>/` and `curl -sI $URL`
  - Pass if: HTTP answers `301`/`308` with `Location: https://…`, and HTTPS answers `200` with a valid certificate (no `-k` needed)
- [ ] 🚫 **SEC-8** `auto` `fix`: `WP_DEBUG` off in production
  - Check: `wp config get WP_DEBUG`, `wp config get WP_DEBUG_DISPLAY` on the production environment
  - Pass if: both are `false` or undefined. On Pantheon, `wp-config.php` sets these per environment, so check `live`.
  - Fix: `wp config set WP_DEBUG false --raw`
- [ ] 🚫 **SEC-9** `auto`: No sensitive files exposed
  - Check: `curl -s -o /dev/null -w "%{http_code}" $URL/<path>` for `.env`, `wp-config.php.bak`, `wp-config.php~`, `wp-config.old`, `debug.log`, `wp-content/debug.log`, `backup.zip`, `backup.sql`, `db.sql`, `dump.sql`, `.git/HEAD`, `composer.json`, `readme.html`
  - Pass if: every one answers `403` or `404`
  - A hit is removed by hand. Deleting files in the web root is not auto-fixed.
- [ ] 🚫 **SEC-10** `auto`: No directory listing
  - Check: `curl -s $URL/wp-content/uploads/` and `curl -s $URL/wp-content/plugins/`
  - Pass if: neither body contains `Index of /`
- [ ] 🚫 **SEC-11** `auto`: XML-RPC disabled
  - Check: `curl -s -X POST -d '<methodCall><methodName>system.listMethods</methodName></methodCall>' $URL/xmlrpc.php`
  - Pass if: the status is `403`/`404`/`405`, or the body has no `<methodResponse>`
- [ ] 🚫 **SEC-12** `auto`: REST API closed to visitors
  - Check: `curl -s -o /dev/null -w "%{http_code}" $URL/wp-json/wp/v2/users`
  - Pass if: `401` or `403`, so user enumeration is blocked (this is what `disable-wp-rest-api` does)
- [ ] 🚫 **SEC-13** `auto` `fix`: File editing disabled in the admin
  - Check: `wp config get DISALLOW_FILE_EDIT`
  - Pass if: `true`
  - Fix: `wp config set DISALLOW_FILE_EDIT true --raw`
- [ ] 🚫 **SEC-14** `auto`: Security headers
  - Check: `curl -sI $URL`
  - Pass if: `X-Content-Type-Options: nosniff`, `X-Frame-Options` (or CSP `frame-ancestors`) and `Referrer-Policy` are present
- [ ] 🚫 **SEC-15** `manual`: 2FA on every administrator
  - Check: Security Optimizer › Login Security, per admin user
- [ ] ⚠️ **SEC-16** `auto`: HSTS header
  - Check: `curl -sI $URL`
  - Pass if: `Strict-Transport-Security` is present

## 📈 Base SEO

- [ ] 🚫 **SEO-1** `auto` `fix`: Search engines not discouraged
  - Check: `wp option get blog_public` and `curl -s $URL | grep -i 'name="robots"'`
  - Pass if: the option is `1` and no `noindex` meta is on the home page
  - Fix: `wp option update blog_public 1`
- [ ] 🚫 **SEO-2** `auto`: `robots.txt` does not block the site
  - Check: `curl -s $URL/robots.txt`
  - Pass if: `200`, no `Disallow: /` under `User-agent: *`, and it has a `Sitemap:` line
- [ ] 🚫 **SEO-3** `auto`: XML sitemap
  - Check: `curl -s -o /dev/null -w "%{http_code}" $URL/sitemap_index.xml` (Yoast) or `$URL/wp-sitemap.xml`
  - Pass if: `200` and the body is XML listing the site's URLs
- [ ] 🚫 **SEO-4** `auto`: Title and meta description on key pages
  - Check: the home page plus every page in the main menu (`wp menu item list <menu> --fields=url`): `curl -s <page>` and read `<title>` and `<meta name="description">`
  - Pass if: each page has a non-empty, unique title and a description. Not `Just another WordPress site`, not the bare site name.
- [ ] 🚫 **SEO-5** `auto`: Exactly one H1 per page
  - Check: the same pages as SEO-4, counting `<h1` in the HTML
  - Pass if: the count is exactly 1 on each
- [ ] 🚫 **SEO-6** `auto`: Canonical tag
  - Check: the same pages, `<link rel="canonical">`
  - Pass if: present and pointing at the page's own `https://` URL
- [ ] 🚫 **SEO-7** `auto`: Open Graph on the home page
  - Check: `curl -s $URL` for `og:title`, `og:description`, `og:image`
  - Pass if: all three are present, and the `og:image` URL answers `200`
- [ ] 🚫 **SEO-8** `auto`: Images have `alt`
  - Check: the same pages, every `<img`
  - Pass if: every `<img>` has an `alt` attribute (empty only for decorative images). For per-element details, use the `html-qa-smoketest` skill.
- [ ] 🚫 **SEO-9** `auto` `fix`: Pretty permalinks
  - Check: `wp option get permalink_structure`
  - Pass if: not empty (empty means "Plain", `?p=123`)
  - Fix: `wp rewrite structure '/%postname%/' && wp rewrite flush`
- [ ] 🚫 **SEO-10** `auto`: 404 works and is themed
  - Check: `curl -s -w "%{http_code}" $URL/launch-check-missing-page`
  - Pass if: status `404`, and the body contains the theme's header/footer markup (not the bare WordPress 404)
- [ ] 🚫 **SEO-11** `manual`: 301 redirects from the old site (migration projects only)
  - Check: each old URL from the client's list answers `301` to the right new page. Without a list, `n/a`.
- [ ] ⚠️ **SEO-12** `manual`: Google Search Console verified and the sitemap submitted

## 🧹 Content cleanup

- [ ] 🚫 **CON-1** `auto` `fix`: No sample content
  - Check: `wp post list --post_type=post,page --fields=ID,post_title,post_name` and `wp comment list --fields=comment_ID,comment_author`
  - Pass if: no `hello-world` post, no `sample-page`, and no comment by `A WordPress Commenter` / `Mr WordPress`
  - Fix: `wp post delete <id> --force`, `wp comment delete <id> --force`
- [ ] 🚫 **CON-2** `auto` `fix`: No drafts and an empty trash
  - Check: `wp post list --post_type=any --post_status=draft,trash --fields=ID,post_title,post_status`
  - Pass if: empty
  - Fix: `wp post delete <id> --force`. The fix lists the titles first, because a draft can be real work.
- [ ] 🚫 **CON-3** `auto`: No placeholder text
  - Check: `wp db query "SELECT ID, post_title FROM wp_posts WHERE post_status='publish' AND post_content REGEXP 'lorem ipsum|dolor sit amet|placeholder'"`, plus `curl` of the menu pages
  - Pass if: no rows and no matches
- [ ] 🚫 **CON-4** `manual`: No placeholder or dummy images
  - Check: look at every page from SEO-4
- [ ] ⚠️ **CON-5** `auto` `fix`: Default category renamed
  - Check: `wp term list category --fields=term_id,slug`
  - Pass if: no `uncategorized` slug
  - Fix: `wp term update category <id> --name=<name> --slug=<slug>`
- [ ] ⚠️ **CON-6** `auto` `fix`: No unused themes
  - Check: `wp theme list --fields=name,status`
  - Pass if: only the active theme (and its parent, if any) is installed
  - Fix: `wp theme delete <name>`
- [ ] ⚠️ **CON-7** `auto`: Styleguide page private
  - Check: `wp post list --post_type=page --name=styleguide --fields=ID,post_status` and `curl -s -o /dev/null -w "%{http_code}" $URL/styleguide/`
  - Pass if: status `private` and HTTP `404`, and it is not in any menu

## 🧑‍💻 Theme code

- [ ] 🚫 **CODE-1** `auto` `fix`: No `console.log` left in the theme
  - Check: `grep -rn "console\.log" $THEME/resources/ $THEME/public/build/ --include=*.js --include=*.ts --include=*.jsx --include=*.tsx --include=*.mjs`
  - Pass if: no matches
  - Fix: remove the lines in `resources/` and rebuild. `public/build/` is generated, so it is never edited by hand.
- [ ] 🚫 **CODE-2** `auto`: Built assets present
  - Check: `ls $THEME/public/build/manifest.json`
  - Pass if: the file exists and the files it lists exist
- [ ] 🚫 **CODE-3** `manual`: `composer install --no-dev` for production (no dev dependencies shipped)

## 🎨 Theme identity

> Never ship a theme that still identifies as Sage / Roots or anything generic.

- [ ] 🚫 **ID-1** `auto` `fix`: `style.css` header is the project's
  - Check: `head -20 $THEME/style.css`
  - Pass if: `Theme Name` is the project or brand (not `Sage`), `Author` is set (not blank, `Roots` or `Sage`), and `Author URI` is a real URL (not `https://roots.io/` or empty)
  - Fix: edit the header. The skill asks for the values and never invents them.
- [ ] 🚫 **ID-2** `auto`: Real theme screenshot
  - Check: `$THEME/screenshot.png`
  - Pass if: 1200×900 px and not Sage's default image. Compare its size or checksum with the one that ships with Sage, and if unsure, open it.
- [ ] ⚠️ **ID-3** `auto`: `Description`, `Version` and `Text Domain` in `style.css` are the project's, not Sage's defaults

## ⚙️ WordPress settings

- [ ] 🚫 **SET-1** `auto` `fix`: Timezone is a region
  - Check: `wp option get timezone_string`
  - Pass if: not empty and not `UTC` (for example `America/Sao_Paulo`)
  - Fix: `wp option update timezone_string <Region/City>`. The skill asks which region.
- [ ] 🚫 **SET-2** `auto`: Site title and tagline are the brand's
  - Check: `wp option get blogname`, `wp option get blogdescription`
  - Pass if: the tagline is not `Just another WordPress site` and the title is not `WordPress` or a starter name
- [ ] 🚫 **SET-3** `auto`: Front page set
  - Check: `wp option get show_on_front`, `wp option get page_on_front`
  - Pass if: it matches the project (a static page with an existing ID, or the latest posts)
- [ ] 🚫 **SET-4** `auto` `fix`: New users are not administrators
  - Check: `wp option get default_role`
  - Pass if: not `administrator` (normally `subscriber`)
  - Fix: `wp option update default_role subscriber`
- [ ] ⚠️ **SET-5** `auto` `fix`: Comments disabled (kit rule)
  - Check: `wp option get default_comment_status`, `wp option get default_ping_status`
  - Pass if: both `closed`
  - Fix: `wp option update default_comment_status closed && wp option update default_ping_status closed`
- [ ] ⚠️ **SET-6** `auto`: Date and time format match the project's locale (`wp option get date_format`, `time_format`)

## 📧 Email & forms

- [ ] 🚫 **MAIL-1** `auto`: SMTP plugin active
  - Check: `wp plugin list --status=active --field=name`
  - Pass if: `wp-mail-smtp` or `fluent-smtp` is listed
- [ ] 🚫 **MAIL-2** `manual`: Submit every form on the site, and confirm the email arrives in the right inbox
- [ ] ⚠️ **MAIL-3** `manual`: The "From" address is a real domain address (not `wordpress@<domain>`)
- [ ] ⚠️ **MAIL-4** `auto`: Every public form has a honeypot or CAPTCHA
  - Check: `curl` each page with a `<form`
  - Pass if: each form has a Turnstile/reCAPTCHA widget or a honeypot field

## ⚡ Performance

- [ ] ⚠️ **PERF-1** `auto`: Caching active
  - Check: `curl -sI $URL` twice
  - Pass if: a cache header shows a hit (`x-cache`, `x-proxy-cache`, `cf-cache-status: HIT`, `age`), or Speed Optimizer is active (SEC-6)
- [ ] ⚠️ **PERF-2** `auto`: Lighthouse mobile ≥ 80 on the home page
  - Check: `npx lighthouse $URL --only-categories=performance --form-factor=mobile --quiet --chrome-flags="--headless"`
  - Pass if: the score is ≥ 80, LCP < 2.5s and CLS < 0.1
- [ ] 💡 **PERF-3** `manual`: CDN for static assets (if the host doesn't provide one)

## 📊 Analytics & legal pages

- [ ] ⚠️ **LEGAL-1** `auto`: Privacy Policy and Terms pages exist and are linked from the footer
  - Check: `wp option get wp_page_for_privacy_policy`, plus the footer links in `curl -s $URL`
- [ ] ⚠️ **LEGAL-2** `auto`: GA4 / Tag Manager tag on the page (`gtag(` or `googletagmanager.com` in the HTML)
- [ ] ⚠️ **LEGAL-3** `manual`: GA4 actually measuring (check the `Realtime` view)
- [ ] 💡 **LEGAL-4** `manual`: Cookie consent banner (LGPD)

## 📄 Required pages & layouts

- [ ] 🚫 **PAGE-1** `auto`: Favicon
  - Check: `curl -s -o /dev/null -w "%{http_code}" $URL/favicon.ico`, or a `<link rel="icon">` in the HTML
  - Pass if: `200`
- [ ] ⚠️ **PAGE-2** `auto`: Search results page themed, with a "no results" state (`curl -s "$URL/?s=zzzzlaunchcheck"`)
- [ ] ⚠️ **PAGE-3** `manual`: Password-protected page has a themed layout
- [ ] ⚠️ **PAGE-4** `auto`: Every custom taxonomy has an archive template, or `'has_archive' => false`
- [ ] 💡 **PAGE-5** `auto`: `apple-touch-icon.png` answers `200`
- [ ] 💡 **PAGE-6** `manual`: `wp-login.php` logo replaced (`login_enqueue_scripts`, `login_headerurl`, `login_headertext`)

## 🚀 Go-live and last mile

- [ ] 🚫 **LIVE-1** `manual`: Database and uploads backed up right before go-live
- [ ] 🚫 **LIVE-2** `auto`: No "Powered by WordPress" in the footer (`curl -s $URL`)
- [ ] 🚫 **LIVE-3** `manual`: Phone, address and email in the footer and on the Contact page are correct
- [ ] 🚫 **LIVE-4** `manual`: E-commerce checkout end to end with a real or sandbox payment (if applicable)
- [ ] ⚠️ **LIVE-5** `manual`: Site-wide broken-link scan (Screaming Frog / Dr. Link Check)
- [ ] ⚠️ **LIVE-6** `manual`: Accessibility audit (axe / Lighthouse a11y / WAVE) and W3C HTML validator
- [ ] ⚠️ **LIVE-7** `manual`: Cross-browser and device test (Chrome / Firefox / Safari / Edge, iOS Safari, Chrome Android)
