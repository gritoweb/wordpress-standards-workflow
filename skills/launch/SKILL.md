---
name: launch
description: >
  Pre-launch audit of a WordPress site against its own launch-list.md. It checks every item it can (wp-cli, theme files, HTTP on the public URL), runs HTTP/page tools and reads PageSpeed Insights from pagespeed.web.dev (no API key), asks for missing values in one round, fixes everything it can after one user approval of the ordered command list (enforced by a hook), re-checks, and writes a professional pass/fail report as Markdown + HTML + PDF. Use when the user says "/launch", "launch check", "is the site ready to go live?", "pre-launch audit" or "go-live checklist".
hooks:
  PreToolUse:
    - matcher: "Bash|Write|Edit|MultiEdit|NotebookEdit|AskUserQuestion"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/launch/guard/guard.mjs" || exit 2'
  PostToolUse:
    - matcher: "AskUserQuestion"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/launch/guard/guard.mjs" post'
---

# /launch: pre-launch audit and report

The source of truth is **`launch-list.md` in this skill's folder** (`.claude/skills/launch/launch-list.md`). It is read-only: if it is missing or has no item IDs, stop and ask. Never replace or rewrite it. Every item there has an ID,
tags (`auto`, `fix`, `manual`), a **Check**, a **Pass if** and sometimes a
**Fix**. This skill runs those checks. It never invents items, and it never
marks an item as passed without evidence. If the list and this file disagree,
the list wins.

Everything the skill writes (the report, chat summaries of results, commit text) is **English**.

## The guard (enforced, not advisory)

Loading this skill registers a `PreToolUse` hook (`guard/guard.mjs`) for the rest of the session.
It sorts every Bash command into one of three groups:

- **Reads** run: the read-only wp-cli, Terminus and SSH commands, `curl` GET/HEAD, `grep`, `ls`.
- **Writes are denied until the USER approves them.** This covers a wp-cli write, `rm`, `mv`,
  `sed -i`, `scp`, `rsync`, `mysql`, interactive `ssh`, a remote non-read command, `curl` with data,
  `git push`, and `bash -c`/`eval` wrapping any of these.
- **Never** runs, even if it was approved:
  - `rm -r`
  - `wp db reset|drop|clean`, `wp site empty|delete`
  - `terminus env:wipe|site:delete|env:clone-content`
  - `DROP`/`TRUNCATE` SQL
  - `mkfs`, `dd`, `chmod -R 777`

  The user runs these by hand if they are ever really needed.

How a write gets approved (one click):
1. Put every command you need, **in run order**, into **one** `AskUserQuestion`:
   - header `Launch fixes`
   - the question says where they run (local / staging / **PRODUCTION** + `siteurl`)
   - an option labelled exactly `Approve all`, whose `preview` is the numbered list, one exact
     command per line: `1. lando wp db export - > ~/launch-backup-<site>-<date>.sql`
   - a `Cancel` option

   Never pre-fill `answers`; the guard denies it.
2. The user clicks. A `PostToolUse` hook reads the answer and approves **exactly the previewed lines**
   (minus anything on the never-run list). It tells you how many were approved.
3. Run them **exactly** as written and **in the listed order**. The guard refuses a command that
   skips ahead. Reads (re-checks) can run between them. Every approval works once and expires in
   2 hours, and a new question replaces whatever was left of the last batch. `Cancel` clears it.

Fallback without the question UI: write the list to `.launch-pending.txt` and ask the user to type
`! node .claude/skills/launch/guard/approve.mjs`.

You can't approve anything yourself. The guard denies any tool call that touches
`approve.mjs` or `~/.launch-guard/`, and any question with pre-filled answers. Never try to get around a denial: no rewording the command,
no other interpreter, no editing the guard. A denial means you stop and ask.

## Safety rules (they override every step below)

1. **Only listed commands run.** The check phase runs only the **Check** commands from
   `launch-list.md`. These are read-only: `wp … get|list|check-update|config get`,
   `curl` GET/HEAD, `grep`, `ls`, `head`. The fix phase runs only that item's **Fix**.
   Anything else that writes needs its own explicit ask, even when it looks harmless. That includes:
   - `wp db query` with UPDATE/DELETE/INSERT, `wp search-replace`, `wp db import|reset`
   - `wp plugin update`, `wp core update`
   - `rm`, `mv`, `chmod`
   - `terminus` deploy/clone/wipe, `lando push`
2. **Say where before every write.** Before the first fix, run `wp option get siteurl` on
   the target and show it with the environment's name (local, staging or **PRODUCTION**). If the URL
   isn't what the user named, stop. Production gets the word **PRODUCTION** in the ask.
3. **Back up before the first write**, on that same environment, and show the backup's path or ID:
   - local: `lando wp db export - > ~/launch-backup-<site>-<date>.sql`. Stream to the host: `~` inside `lando wp` is the container's home, which the host can't see.
   - Pantheon: `terminus backup:create <site>.<env> --element=db`
   - other remote: `wp db export ~/launch-backup-<date>.sql` in the user's home, **never** inside the web root (an exposed `.sql` is SEC-9's failure)

   If the backup fails, no fix runs.
4. **Never lock anyone out.**
   - SEC-1: create the new admin first. Confirm with `wp user get <new>` that it exists with
     role `administrator`, then delete `admin`, always with `--reassign`.
   - `wp user delete` without `--reassign` is forbidden. It deletes the user's posts.
   - Never delete the last administrator, or the user the person said they log in with.
   - Activate security plugins (SEC-6) with their defaults. Never change the login URL, never
     enable 2FA for other users, and never turn on blocking rules from the CLI.
5. **One fix at a time, then verify.** If a fix fails, or the site answers 5xx after it
   (`curl -s -o /dev/null -w "%{http_code}" $URL`), stop. Show the output, tell the user which
   backup restores the site, and ask before doing anything else.
6. **No secrets or personal data in the report or chat.**
   - Never print `wp config list`, DB credentials, salts, API keys or `.env` content. Read only the
     named constant (`wp config get WP_DEBUG`).
   - Users appear as login and role, never email.
   - SSH/Terminus credentials are never written to any file.
7. **Be gentle with the site.** At most 15 pages and one request at a time. No crawling, load tests or brute-force probes.
8. **No git.** The skill never commits or pushes. The report files are left for the user.
9. **When unsure, stop and ask.** This applies to unexpected output, a plugin that may be custom, or a value the list doesn't give. Never guess.

## 0. Gather everything first: one message, typed answers

There are **exactly two interactions per run**: this intake message, and the `Launch fixes` click at
the end. Never ask anything in between, never ask the same thing twice, never turn a value into options.

**Detect first, without asking:**
- **wp-cli:** `lando wp option get siteurl`, then `wp option get siteurl`. If Lando is installed but
  stopped, the first line of the approval list is `lando start`.
- **Project name:** `Theme Name` in `$THEME/style.css`.
- **Privacy page:** `wp option get wp_page_for_privacy_policy` (an ID), then `wp post get <id> --field=url`.
- **Terms page:** a published page whose slug contains `terms`, `termos` or `conditions`.
- **Logo:** see **Logo** in `launch-list.md`.
- **Contacts on the site:** run `page-audit.mjs` on the home page now and read `contacts` (`tel:`, `mailto:`, footer text).
- **Admin email:** `wp user list --role=administrator --fields=user_login,user_email`.
- **Timezone:** from `wp option get WPLANG` (`pt_BR` suggests `America/Sao_Paulo`).
- **Default category:** `wp term list category --fields=term_id,slug,name`.
- **Previous report:** whether `launch/report.md` exists.

**Then send one plain chat message** (no `AskUserQuestion`) with every value numbered, the detected
value or your suggestion after each, and `—` where there is nothing. End with the reply instruction:

```
Before I start, confirm or fill in (reply only what changes, e.g. "3 https://acme.com, 4 https://old.acme.com", or "ok"):
1. Mode: full audit                      (or "re-check": only what failed in launch/report.md)
2. Site to audit: http://acme.lndo.site  (detected)
3. PageSpeed URL (public): —             (Google can't reach Lando; leave — for a local estimate)
4. Old site, if this is a migration: —   (its URL, or a file with the old URLs)
5. Terms page: —
6. Logo file: —                          (for the site icon and share image)
7. Inbox for the test email: luis@acme.com
8. Client contacts (phone / email / address): —
9. Admin's real email: luis@acme.com
10. Timezone: America/Sao_Paulo
11. Default category name: Blog
```

- **Always suggest a concrete value when a sensible default exists, so `ok` leads to fixes**, never `—`:
  - timezone: `America/Sao_Paulo` when `WPLANG` is `pt_BR` or empty (the agency's default);
  - default category: `Blog`;
  - inbox and admin email: the agency address the user writes once, or the admin's current email when
    it is real;
  - meta descriptions and tagline: always drafted (from the page title, headings and the site name
    when the content is thin), and shown in the approval preview.

  Leave `—` only where nothing can be guessed: the PageSpeed public URL, the old site, the terms page,
  the logo file and the client's contacts.
- Skip a number the user already gave in the command (for example `/launch https://acme.com`).
- Use the reply exactly as written. "ok" accepts every suggestion. A value the user typed is never
  re-asked and never offered as options.
- A field left as `—` is **not** asked later: the item it serves gets its next step in the report
  (for example, "SEO-11: give the old site's URL and run re-check").
- If the reply is unreadable, ask once more in plain text for those numbers only.

**Re-check mode** (field 1): re-run the tools and only the agent checks that were `FAIL` or `LOCAL`
in `launch/report.md`, then rebuild the report. This takes 1–2 minutes.

Remote wp-cli (Pantheon `terminus wp <site>.<env> -- …`, or SSH `wp --ssh=user@host:port/path …`)
is used only when the user writes it in the reply. The key must already work: test it with
`option get siteurl`.

`$THEME` is the active theme root (the folder containing `.claude/`). Everything the skill generates
goes in `launch/` at the theme root, so the user can delete it any time.

## 1. Check everything (read-only)

1. Run the tools **in parallel, in one Bash call**, writing their JSON to `launch/raw/`. Put the
   `mkdir` on its own line first. Write the paths literally, because the guard only lets the skill's
   own tools through. Leave out a flag whose value is unknown:
   ```bash
   mkdir -p launch/raw
   node .claude/skills/launch/tools/http-audit.mjs $URL > launch/raw/http.json 2>/dev/null &
   node .claude/skills/launch/tools/page-audit.mjs $URL <menu page URLs…> --links --privacy-url <url> --terms-url <url> > launch/raw/pages.json 2>/dev/null &
   node .claude/skills/launch/tools/psi.mjs $PSI_URL --screenshot launch/pagespeed-mobile.png > launch/raw/psi.json 2>/dev/null &
   node .claude/skills/launch/tools/redirect-audit.mjs $URL --old <old-site> > launch/raw/redirects.json 2>/dev/null &
   wait
   ```
   - `redirect-audit` runs only for a migration. With a list of old URLs, use `--list <file>`.
   - Add `--w3c` to `page-audit` only for a public `$URL`, because it sends the HTML to validator.w3.org.
   - `psi.mjs` reads pagespeed.web.dev in headless Chrome (about 25 s, no API key). On a local URL,
     or when the page fails, it falls back to local Lighthouse and says why.
2. Run `node .claude/skills/launch/report/build.mjs --todo --dir launch --url $URL`. It lists exactly
   the items you must answer this run (the rest the tools decide). Run the `wp …`, `grep` and `ls`
   checks of `launch-list.md` for those items only.
3. **The tools decide their own items.** `report/evaluate.mjs` computes, from the JSON, every item
   the tools can see, with its evidence: HTTPS, headers, exposed files, robots, sitemap, canonical,
   H1, OG, alt, broken links, PageSpeed, migration, analytics, consent, forms, search and so on.
   Don't re-judge those. You give results only for the rest, plus `FIXED` for anything you fixed.
   If you contradict a tool, the build refuses the report and says which item disagrees.
4. Give each of your items exactly one result:
   - `PASS`: the evidence matches **Pass if**.
   - `FAIL`: it doesn't. Add the action that fixes it.
   - `LOCAL`: a `launch-env` item checked on a local site (debug flags, dev packages, logs).
   - `MANUAL`: a `manual` item, or a check that couldn't run (say why).
   - `N/A`: the item doesn't apply (no e-commerce, not a migration). Say why.

   The evidence is real: the command's output line, or the file and line. A check that errors is
   `MANUAL` with the error, never `PASS`.

Nothing changes in this step, not even an "obvious" fix.

## 2. Prepare the fixes (no questions)

Use the intake values: logo, inbox, contacts, admin email, timezone, category name, terms page.
- **Logo:** run `brand-images.mjs`, then open both PNGs to check them.
- **Texts you draft** (meta descriptions from the page's real text, a tagline): they go **inside the
  commands** of the approval preview, so the user reads them before clicking. Approving accepts them.
  Mark them `"suggested": true` in the results.
- **Contacts (LIVE-3):** compare the user's values with `contacts` from `pages.json`. A field left
  `—` makes LIVE-3 `MANUAL`, with the found values in the evidence.
- A fix whose value is `—` isn't offered. Its item stays `FAIL`, and the report says which value to
  give on the next run.

## 3. One approval for every fix

Build the fix list from every `FAIL` tagged `fix` (with the intake values), **in this order**:
1. `lando start`, if it's needed
2. the backup (safety rule 3)
3. the fixes, in the list's order
4. `rm docs/launch-list.md`, if that old copy is still in the project

Then ask the single `Launch fixes` question (see **The guard**). Its question text says the environment
and `siteurl`. Its `Approve all` preview is the numbered list of exact commands. Write remote commands
one per line, never chained.

Never offer as a fix:
- updates (SEC-3)
- deleting logs, backups or `.env` (SEC-9)
- redirects (SEO-11)
- template changes (SEO-5, PAGE-3)
- `public/build/`

They go in the report as actions for the dev.

## 4. Apply, then re-check

- Run the approved commands exactly, in order, one at a time (safety rule 5).
- After each fix, re-run that item's check. It's `FIXED` only if the re-check passes.
- When everything has run, run `http-audit.mjs` and `page-audit.mjs` again into `launch/raw/`, because
  fixes change what they see. `psi.mjs` isn't re-run unless a fix targeted performance.

## 5. Build the report (no hand-written report)

Pipe your results as JSON on stdin to the builder. It merges them with the tools' decisions,
**refuses** an incomplete set or one that contradicts the tools, computes the counts, verdict and next
steps, and writes `launch/report.md`, `report.html` and `report.pdf`, with the PageSpeed screenshot
embedded:

```bash
node .claude/skills/launch/report/build.mjs --dir launch <<'JSON'
{
  "project": "<Theme Name>",
  "date": "<YYYY-MM-DD>",
  "target": { "environment": "local|staging|production", "siteurl": "<siteurl>", "url": "<$URL>", "psi_url": "<$PSI_URL>", "remote": null },
  "items": [
    { "id": "SEC-1", "result": "PASS", "evidence": "wp user list: no admin" },
    { "id": "SET-1", "result": "FIXED", "evidence": "timezone_string America/Sao_Paulo", "suggested": true },
    { "id": "MAIL-1", "result": "FAIL", "evidence": "no SMTP plugin active", "action": "Install WP Mail SMTP and set the credentials." }
  ],
  "fixed": [ { "id": "SET-1", "command": "wp option update timezone_string America/Sao_Paulo", "recheck": "option is set" } ],
  "backup": "<path or ID, or null>",
  "notes": ["<anything the reader must know, e.g. PageSpeed measured another URL>"]
}
JSON
```

- If it exits 1, read the list it prints (missing IDs, contradictions, a FAIL without an action), fix
  your results and run it again. Never work around it by writing the report by hand.
- It prints the verdict and counts as JSON. The verdict is computed: **Ready to launch** only with no
  Required `FAIL` and nothing `LOCAL`.
- The report opens with the verdict and a **count per status**, then:
  - **Fix before launch** (the required fails, with the action);
  - **Fixed during this run**;
  - **PageSpeed** (with the screenshot from pagespeed.web.dev or, for a local estimate, from
    Lighthouse's own report, saved as `launch/lighthouse-*.html`);
  - **Migration**;
  - **All checks**: one table per section with every item's status and evidence, plus the next step for
    FAIL, MANUAL and LOCAL items.

  `launch/results.json` has every result as data.
- `notes` are only for what no item says. Don't repeat an item's evidence or action there.

## 6. Close

Tell the user, briefly:
- the verdict line from the report
- the **Fix before launch** items, each with its action
- the PageSpeed mobile score (and whether it is a local estimate)
- `launch/report.pdf`

Don't repeat the whole report in the chat.

Don't commit anything.

## Never

- Mark `PASS` without evidence, contradict a tool's result, or downgrade a `FAIL` to `MANUAL`/`LOCAL`
  to make the verdict look better.
- Write or edit the report by hand.
- Ask anything between the intake message and the `Launch fixes` click, ask a value twice, or offer
  options for a value the user types.
- Change anything before the user's approval.
- Replace or rewrite `launch-list.md`, or any file the user didn't approve.
- Touch WordPress core, third-party plugin code or `public/build/`.
