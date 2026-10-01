# Launch Checklist

Pre-launch verification for WordPress sites built on the GritoWeb standards.
The `launch` skill reads this file (it ships in the skill's folder), checks
every item it can, fixes what the user approves, and writes the report.

**Severity**

- **Required**: the site does not launch until it passes. Every security and base-SEO item is required.
- **Recommended**: fix as soon as possible after launch.
- **Optional**: improves quality, not strictly required.

**Tags**

- `auto`: the agent verifies it alone.
- `fix`: the agent can also fix it. It runs the fix only after the user approves it.
- `ask`: the fix needs a value from the user (an email, a name, a text). The skill asks for all of
  these in one round, with a suggested answer.
- `manual`: only a human can do it. The report gives the exact steps.
- `public`: needs the real public URL. On a local URL (`.lndo.site`, `localhost`, `.test`) the
  result is `LOCAL` ("re-check on the public URL"), never `FAIL`.
- `launch-env`: only matters on the environment that goes live (debug flags, dev packages, logs and
  backups). Checked on a local site, the result is `LOCAL` ("check on the launch environment").

**Commands**

- `wp …` runs locally as `lando wp …`. Remotely it runs as `terminus wp <site>.<env> -- …` or
  `wp --ssh=<user>@<host>:<port>/<path> …`.
- `$URL` is the site URL, and `$THEME` is the active theme root.
- `$TOOLS` is `.claude/skills/launch/tools`. Its scripts return JSON:
  - `http-audit.mjs $URL` runs the site-level HTTP checks (`H.<field>` below)
  - `page-audit.mjs <urls…> --links [--w3c]` runs the page checks (`P.<field>`)
  - `psi.mjs $PSI_URL --screenshot launch/pagespeed-mobile.png` runs PageSpeed (`S.<field>`)
  - `redirect-audit.mjs $URL (--old <old-site> | --list <file>)` checks a migration (`R.<field>`)
  - `brand-images.mjs <logo> --out launch/brand [--bg <colour>]` makes the site icon and OG image

  Run each one once and read every item from its output.
- The pages for the `P.` checks are the home page plus every page in the main menu
  (`wp menu item list <menu> --fields=url`), 15 at most.

Each item: **ID**, severity, tags, title, then **Check**, **Pass if** and, when there is one, **Fix**.

- **Old copy:** if the project still has `docs/launch-list.md` (from before the list moved into the skill), the
  report says it is unused, and the approval list offers `rm docs/launch-list.md`.

---

## Security

- [ ] **SEC-1** Required `auto` `fix` `ask`: No user with the login `admin`
  - Check: `wp user list --field=user_login`
  - Pass if: no line is exactly `admin`
  - Fix: `wp user create <login> <email> --role=administrator`. Then, after `wp user get <login>` confirms the new user, `wp user delete admin --reassign=<new-id>`.
- [ ] **SEC-2** Required `auto` `fix` `ask`: No test users, and every admin has a real email
  - Check: `wp user list --fields=ID,user_login,user_email,roles`
  - Pass if: no login or email matches `test|teste|demo|dev|example\.(com|org)|mailinator|\.local$|\.test$`
  - Fix: a test user is deleted with `wp user delete <id> --reassign=<owner-id>`. The last administrator is never deleted; their email is changed with `wp user update <id> --user_email=<email>`.
- [ ] **SEC-3** Required `auto`: WordPress core, plugins and themes up to date
  - Check: `wp core check-update`, `wp plugin list --update=available --field=name`, `wp theme list --update=available --field=name`
  - Pass if: all three are empty
  - The fix is the dev's: updates change third-party code and need testing.
- [ ] **SEC-4** Required `auto` `fix`: No inactive or dev-only plugins
  - Check: `wp plugin list --fields=name,status`
  - Pass if: no plugin is `inactive`, and none of these is installed: `query-monitor`, `debug-bar*`, `fakerpress`, `user-switching`, `wp-reset`, `wp-crontrol`, `theme-check`, `show-current-template`, `what-the-file`, `hello`
  - Fix: `wp plugin delete <names…>`
- [ ] **SEC-5** Required `auto`: No abandoned plugins
  - Check: for each active plugin, open `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=<name>`
  - Pass if: `last_updated` is within 2 years and there is no `closed` error. Premium or custom plugins are `N/A`.
- [ ] **SEC-6** Required `auto` `fix`: Required plugins active
  - Check: `wp plugin list --status=active --field=name`
  - Pass if: `disable-wp-rest-api`, `sg-security`, `sg-cachepress`, `wordpress-seo` and `safe-svg` are listed
  - Fix: `wp plugin install <missing…> --activate`
- [ ] **SEC-7** Required `auto` `public`: HTTPS enforced
  - Check: `H.https`
  - Pass if: `redirects_to_https` is true, and `https_status` is 200 with no `https_error`
- [ ] **SEC-8** Required `auto` `fix` `launch-env`: Debug off
  - Check: `wp config get WP_DEBUG`, `wp config get WP_DEBUG_DISPLAY` on the environment being launched
  - Pass if: both are false or undefined. On Pantheon, check `live`.
  - Fix: `wp config set WP_DEBUG false --raw`
- [ ] **SEC-9** Required `auto` `fix`: No sensitive or fingerprinting files exposed
  - Check: `H.exposed`
  - Pass if: the list is empty
  - Fix: one `rm <file>` per line for WordPress's own `readme.html`, `license.txt` and `wp-config-sample.php`. Logs, backups, `.env` and `.git` are reported for the dev to remove and to rotate any secret, never deleted by the agent.
  - On a local site, the logs, backups and `.env` part is `launch-env` (`LOCAL`); the WordPress files still count.
- [ ] **SEC-10** Required `auto`: No directory listing
  - Check: `H.directory_listing`
  - Pass if: every value is false
- [ ] **SEC-11** Required `auto`: XML-RPC closed
  - Check: `H.xmlrpc.open`
  - Pass if: false
- [ ] **SEC-12** Required `auto`: REST API doesn't list users
  - Check: `H.rest_users.exposes_users`
  - Pass if: false
- [ ] **SEC-13** Required `auto` `fix`: File editing disabled in the admin
  - Check: `wp config get DISALLOW_FILE_EDIT`
  - Pass if: `true`
  - Fix: `wp config set DISALLOW_FILE_EDIT true --raw`
- [ ] **SEC-14** Required `auto` `public`: Security headers
  - Check: `H.headers`
  - Pass if: `x-content-type-options` is set, `x-frame-options` or a `content-security-policy` with `frame-ancestors` is set, and `referrer-policy` is set
- [ ] **SEC-15** Required `auto`: 2FA on every administrator
  - Check: for each administrator, `wp user meta get <id> sg_security_2fa_configured`
  - Pass if: `1` for every one. Enabling 2FA needs each admin's phone, so a failure is a manual step for that admin.
- [ ] **SEC-16** Recommended `auto` `public`: HSTS
  - Check: `H.headers.strict-transport-security`
  - Pass if: set, with `max-age` of at least 15552000
- [ ] **SEC-17** Recommended `auto`: The server doesn't advertise its stack
  - Check: `H.powered_by`, `P.generator`
  - Pass if: both are null

## Base SEO

- [ ] **SEO-1** Required `auto` `fix`: Search engines allowed
  - Check: `wp option get blog_public`, `P.robots_meta` on the home page
  - Pass if: the option is `1`, and the home page has no `noindex`
  - Fix: `wp option update blog_public 1`
- [ ] **SEO-2** Required `auto`: `robots.txt` doesn't block the site
  - Check: `H.robots`
  - Pass if: status 200, `disallow_all` is false and `sitemap_line` is true
- [ ] **SEO-3** Required `auto`: XML sitemap
  - Check: `H.sitemap`
  - Pass if: not null, with at least one entry
- [ ] **SEO-4** Required `auto` `fix` `ask`: Title and meta description on every key page
  - Check: `P.title`, `P.meta_description`, `duplicate_titles`
  - Pass if: every page has a title and a 50–160 character description, and no title is repeated
  - Fix: `wp post update <id> --meta_input='{"_yoast_wpseo_metadesc":"<text>"}'` for each page, including a static front page. It must be `post update`, not `post meta update`, so that Yoast refreshes its index. Only a front page showing the latest posts uses `wp option patch update wpseo_titles metadesc-home-wpseo "<text>"`. The agent drafts each text from the page's content, and the user accepts or edits it.
- [ ] **SEO-5** Required `auto`: Exactly one H1 per page
  - Check: `P.h1_count`
  - Pass if: 1 on every page. A fix is a template change, so the report names the page and the template.
- [ ] **SEO-6** Required `auto` `public`: Canonical
  - Check: `P.canonical`
  - Pass if: present, `https://`, and the page's own URL
- [ ] **SEO-7** Required `auto` `fix` `ask`: Open Graph on the home page
  - Check: `P.og` on the home page
  - Pass if: title, description and image are all present, and `image_status` is 200
  - Fix: see **Logo** below. The image is `launch/brand/og-default-1200x630.png`: `wp media import <file> --porcelain`, then `wp option patch update wpseo_social og_default_image "<url>"` and `wp option patch update wpseo_social og_default_image_id <id>`. The description comes from SEO-4.
- [ ] **SEO-8** Required `auto`: Images have `alt`
  - Check: `P.images_without_alt`
  - Pass if: empty on every page. Decorative images may have `alt=""`. For a single page in depth, use `html-qa-smoketest`.
- [ ] **SEO-9** Required `auto` `fix`: Pretty permalinks
  - Check: `wp option get permalink_structure`
  - Pass if: not empty
  - Fix: `wp rewrite structure '/%postname%/'`, then `wp rewrite flush`
- [ ] **SEO-10** Required `auto`: A themed 404
  - Check: `H.not_found`
  - Pass if: status 404 and `themed` is true
- [ ] **SEO-11** Required `auto` `ask`: Every old URL still works after a migration
  - Ask: is this site replacing an old one? No / the old site's URL / a file with the old URLs
  - Check: `R` from `redirect-audit.mjs $URL --old <old-site>` (it reads the old sitemap, or the Wayback
    Machine as a fallback) or `--list <file>`
  - Pass if: `broken` is 0, `temporary_redirect` is 0, and, when the old domain differs,
    `old_domain.permanent_to_new` is true. Not a migration: `N/A`.
  - The fix is the dev's: the report lists every broken path, ready for the redirect plugin.
- [ ] **SEO-12** Recommended `manual`: Google Search Console verified and the sitemap submitted
  - Steps: Search Console › Add property › verify it (DNS or the Yoast meta tag) › Sitemaps › submit `<URL>/sitemap_index.xml`

## Performance

- [ ] **PERF-1** Recommended `auto` `public`: Caching active
  - Check: `H.cache`, and `sg-cachepress` active (SEC-6)
  - Pass if: `hit` is true, or Speed Optimizer is active
- [ ] **PERF-2** Required `auto`: PageSpeed mobile on the home page of at least 70
  - Check: `S.mobile.scores.performance`, `S.mobile.metrics`, `S.desktop`, `S.mobile.field_core_web_vitals`
  - Pass if: the mobile performance score is at least 70. `psi.mjs` reads it from pagespeed.web.dev
    for the public `$PSI_URL` (no API key), saves a screenshot and the shareable `report_url`. With no
    public URL, or when the page fails, it runs local Lighthouse, and the result is labelled "local
    estimate, re-run on PageSpeed Insights". `borderline` (within 5 points of 70) means run it again.
- [ ] **PERF-3** Optional `auto` `public`: CDN in front of static files
  - Check: `H.cdn`
  - Pass if: true, or the host's own edge (Pantheon, SiteGround) is detected

## Content cleanup

- [ ] **CON-1** Required `auto` `fix`: No sample content
  - Check: `wp post list --post_type=post,page --fields=ID,post_title,post_name`, `wp comment list --fields=comment_ID,comment_author`
  - Pass if: no `hello-world`, no `sample-page`, and no comment by `A WordPress Commenter`
  - Fix: `wp post delete <ids…> --force`, `wp comment delete <ids…> --force`
- [ ] **CON-2** Required `auto` `fix` `ask`: No drafts and an empty trash
  - Check: `wp post list --post_type=any --post_status=draft,trash --fields=ID,post_title,post_status`
  - Pass if: empty
  - Fix: list the titles, then ask for each: publish it (`wp post update <id> --post_status=publish`) or delete it (`wp post delete <id> --force`). A draft that is the configured privacy page (`wp option get wp_page_for_privacy_policy`) is offered as publish only.
- [ ] **CON-3** Required `auto`: No placeholder text
  - Check: `wp db query "SELECT ID, post_title FROM wp_posts WHERE post_status='publish' AND post_content REGEXP 'lorem ipsum|dolor sit amet'"` and `P.lorem`
  - Pass if: no rows, and false on every page
- [ ] **CON-4** Required `auto`: No placeholder images
  - Check: `P.placeholder_images`, and `wp post list --post_type=attachment --fields=ID,post_title` for names like `placeholder|dummy|sample`
  - Pass if: both are empty
- [ ] **CON-5** Recommended `auto` `fix` `ask`: Default category renamed
  - Check: `wp term list category --fields=term_id,slug`
  - Pass if: no `uncategorized` slug
  - Fix: `wp term update category <id> --name="<name>" --slug=<slug>`
- [ ] **CON-6** Recommended `auto` `fix`: Only the active theme installed
  - Check: `wp theme list --fields=name,status`
  - Pass if: only the active theme and its parent, if any
  - Fix: `wp theme delete <names…>`
- [ ] **CON-7** Recommended `auto`: The Styleguide page is private
  - Check: `wp post list --post_type=page --name=styleguide --fields=ID,post_status`, and `P.status` for `$URL/styleguide/`
  - Pass if: status `private` and HTTP 404, or no such page
- [ ] **CON-8** Required `auto`: No broken links
  - Check: `P.links.broken` (from `page-audit.mjs … --links`)
  - Pass if: empty. A menu item that points to a deleted page shows up here.

## Theme

- [ ] **CODE-1** Required `auto` `fix`: No `console.log` in the theme
  - Check: `grep -rn "console\.log" $THEME/resources/ --include=*.js --include=*.ts --include=*.jsx --include=*.tsx --include=*.mjs`
  - Pass if: no matches
  - Fix: remove the lines (one `sed -i` per file), then `npm run build`. `public/build/` is never edited by hand.
- [ ] **CODE-2** Required `auto`: Built assets present
  - Check: `$THEME/public/build/manifest.json`, and every file it lists
  - Pass if: they all exist
- [ ] **CODE-3** Required `auto` `launch-env`: No dev dependencies shipped
  - Check: `composer show --direct --no-dev --name-only` against the `packages-dev` in `$THEME/composer.lock`, with `ls $THEME/vendor/<package>`
  - Pass if: no dev package is installed in `vendor/` on the environment being launched
- [ ] **ID-1** Required `auto` `fix` `ask`: The `style.css` header is the project's
  - Check: `head -20 $THEME/style.css`
  - Pass if: `Theme Name` isn't `Sage`, `Author` isn't blank, `Roots` or `Sage`, and `Author URI` is a real URL (not `roots.io`)
  - Fix: edit the header with the values the user gives
- [ ] **ID-2** Required `auto` `fix`: A real theme screenshot
  - Check: `$THEME/screenshot.png`
  - Pass if: it exists, is 1200×900, and is not blank or Sage's default. The agent opens the image to judge it.
  - Fix: `<chrome> --headless=new --hide-scrollbars --window-size=1200,900 --screenshot=$THEME/screenshot.png $URL`. `<chrome>` is the browser `report.mjs` finds.
- [ ] **ID-3** Recommended `auto`: `Description`, `Version` and `Text Domain` in `style.css` are the project's

## WordPress settings

- [ ] **SET-1** Required `auto` `fix` `ask`: Timezone is a region
  - Check: `wp option get timezone_string`
  - Pass if: not empty and not `UTC`
  - Fix: `wp option update timezone_string <Region/City>`. The suggestion comes from the site language (`pt_BR` suggests `America/Sao_Paulo`).
- [ ] **SET-2** Required `auto` `fix` `ask`: Site title and tagline are the brand's
  - Check: `wp option get blogname`, `wp option get blogdescription`
  - Pass if: the tagline isn't `Just another WordPress site`, and the title isn't `WordPress` or a starter name
  - Fix: `wp option update blogdescription "<text>"`
- [ ] **SET-3** Required `auto`: Front page set
  - Check: `wp option get show_on_front`, `wp option get page_on_front`
  - Pass if: a static page with an existing published ID, or the latest posts on purpose
- [ ] **SET-4** Required `auto` `fix`: New users aren't administrators
  - Check: `wp option get default_role`
  - Pass if: not `administrator`
  - Fix: `wp option update default_role subscriber`
- [ ] **SET-5** Recommended `auto` `fix`: Comments closed (kit rule)
  - Check: `wp option get default_comment_status`, `wp option get default_ping_status`
  - Pass if: both are `closed`
  - Fix: `wp option update default_comment_status closed`, then `wp option update default_ping_status closed`
- [ ] **SET-6** Recommended `auto` `fix`: Date and time format match the locale
  - Check: `wp option get WPLANG`, `wp option get date_format`, `wp option get time_format`
  - Pass if: for `pt_BR`, `d/m/Y` and `H:i`. For `en_US`, the defaults.
  - Fix: `wp option update date_format "d/m/Y"`, then `wp option update time_format "H:i"`

## Email and forms

- [ ] **MAIL-1** Required `auto` `fix`: SMTP plugin active
  - Check: `wp plugin list --status=active --field=name`
  - Pass if: `wp-mail-smtp` or `fluent-smtp` is listed
  - Fix: `wp plugin install wp-mail-smtp --activate`. The credentials stay manual (MAIL-3).
- [ ] **MAIL-2** Required `auto` `fix` `ask`: WordPress sends email, and every form delivers
  - Ask: an inbox to receive the test (suggest the admin email)
  - Fix (it sends one real email, so it goes in the approval list):
    `wp eval 'var_export(wp_mail("<inbox>", "Launch check: <site>", "Sent by the launch skill."));'`
  - Pass if: it prints `true`, meaning WordPress handed the message to the mailer. The report still asks the user
    to confirm it arrived (not in spam), and to submit each form on the site once.
- [ ] **MAIL-3** Recommended `auto`: Sender is a real domain address, and the mailer is configured
  - Check: `wp option pluck wp_mail_smtp mail from_email`, `wp option pluck wp_mail_smtp mail mailer`
  - Pass if: the From Email ends with the site's own domain (not `wordpress@` or a free webmail), and the mailer
    is not `mail` (PHP's default). The SMTP credentials stay the dev's: WP Mail SMTP › Settings.
- [ ] **MAIL-4** Recommended `auto`: Every form has anti-spam
  - Check: `P.forms`, `P.forms_protected`
  - Pass if: they are equal on every page (each form has Turnstile, reCAPTCHA, hCaptcha or a honeypot)

## Analytics and legal

- [ ] **LEGAL-1** Recommended `auto`: Privacy Policy and Terms linked in the footer
  - Check: `wp option get wp_page_for_privacy_policy`, `P.footer_privacy_link`, `P.footer_terms_link`
  - Pass if: the privacy page is published, and both links are in the footer
- [ ] **LEGAL-2** Recommended `auto` `public`: Analytics tag present
  - Check: `P.analytics`
  - Pass if: true on the home page
- [ ] **LEGAL-3** Recommended `manual`: GA4 is receiving data
  - Steps: GA4 › Reports › Realtime: open the site in another tab, and your visit appears
- [ ] **LEGAL-4** Recommended `auto`: Cookie consent banner (LGPD)
  - Check: `P.consent_banner`
  - Pass if: true

## Pages and icons

- [ ] **PAGE-1** Required `auto` `fix` `ask`: Site icon
  - Check: `H.favicon`, `wp option get site_icon`
  - Pass if: `site_icon` is set (non-zero) or `icon_link` is true, and `default_wp_icon` is false
  - Fix: see **Logo** below. `wp media import launch/brand/site-icon-512.png --porcelain`, then `wp option update site_icon <id>`.
- [ ] **PAGE-2** Recommended `auto`: Search results themed, with a "no results" state
  - Check: `H.search`
  - Pass if: `themed` and `has_no_results_text` are true
- [ ] **PAGE-3** Recommended `auto`: The password-protected page form is themed
  - Check: `grep -rln "post_password_required\|the_password_form" $THEME/app $THEME/resources/views`
  - Pass if: at least one match (the theme handles the form). Otherwise WordPress's bare form shows inside the theme.
- [ ] **PAGE-4** Recommended `auto`: Every public custom taxonomy has an archive template or `has_archive => false`
  - Check: `wp taxonomy list --public=1 --field=name` against the `$THEME/resources/views/taxonomy-*.blade.php` and `archive.blade.php` templates
- [ ] **PAGE-5** Optional `auto`: Apple touch icon
  - Check: `H.apple_touch_icon`
  - Pass if: 200, or `site_icon` is set (WordPress then outputs the touch icon)
- [ ] **PAGE-6** Optional `auto`: Login page logo is the client's
  - Check: `grep -rln "login_enqueue_scripts\|login_headerurl" $THEME/app`
  - Pass if: at least one match. The fix is the `login_enqueue_scripts`, `login_headerurl` and `login_headertext` filters.

**Logo** (shared by SEO-7, PAGE-1 and PAGE-5): find it in `wp option get site_logo`, the `custom_logo` theme mod
(`wp theme mod get custom_logo`), `$THEME/resources/**/*logo*` and `$THEME/public/**/*logo*` (png, svg, jpg, webp),
or `wp post list --post_type=attachment --s=logo --fields=ID,guid`. When there's none, the values question asks for a
file path (for the icon, a square symbol works better than a wide wordmark). Then `node $TOOLS/brand-images.mjs <logo> --out launch/brand --bg <colour>` makes
`site-icon-512.png` and `og-default-1200x630.png`. The agent opens both images before offering the fix.

## Go-live

- [ ] **LIVE-1** Required `auto`: Backup taken right before go-live
  - Check: the skill's own backup from this run (safety rule 3)
  - Pass if: it exists, with its path or ID recorded. With no fixes, take it anyway when the target is production.
- [ ] **LIVE-2** Required `auto`: No "Powered by WordPress" and no starter names
  - Check: `P.powered_by_wordpress`, `P.starter_names`
  - Pass if: both are false on every page
- [ ] **LIVE-3** Required `auto` `ask`: Contact details are correct
  - Check: `P.contacts` (every `tel:` and `mailto:` and the footer text, across the audited pages)
  - Ask: "Are these the client's correct phone, email and address?", showing what was found. Yes, or type the right ones.
  - Pass if: the user confirms. If the user corrects a value, `FAIL`, naming the page where the wrong value appears.
- [ ] **LIVE-4** Required `manual`: Checkout works end to end (e-commerce only)
  - Steps: buy one product with a sandbox payment, and confirm the order and the emails
- [ ] **LIVE-5** Recommended `auto` `public`: Valid HTML
  - Check: `P.w3c` (from `page-audit.mjs … --w3c`, public URL only, because it sends the page's HTML to validator.w3.org)
  - Pass if: 0 errors on every page
- [ ] **LIVE-6** Recommended `auto`: Accessibility
  - Check: `S.mobile.scores.accessibility`
  - Pass if: at least 90
- [ ] **LIVE-7** Recommended `manual`: Cross-browser and device test
  - Steps: Chrome, Firefox, Safari and Edge on desktop, and iOS Safari and Chrome Android: header, menu, forms and the main pages
