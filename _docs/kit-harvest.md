# Kit harvest checklist

Run this once, after a site built on the kit ships, never mid-build. See
`CLAUDE.md` › Kit log.

## Why it waits

Deciding what's reusable while still building a site means guessing at
scope from one data point. The kit log captures what happened; this
checklist decides what to do about it once the site is done and the whole
log is in front of you.

## Steps

In the kit repo, the `kit-harvest` skill (`skills/kit-harvest/SKILL.md`) does
the reading for steps 1 to 3: it runs the conformance checks over the finished
theme, sorts the log, compares the site to the patterns, and writes a proposal
in `docs/harvest/`. You decide each item.


1. Open the site's `_docs/kit-log.md`. Read every entry.
2. Sort each entry into one action:

   | Entry | Action |
   | --- | --- |
   | A kit bug or a wrong instruction | Fix it in the kit now. |
   | A lesson or gotcha | Add it to the skill it belongs to. |
   | A gap in the framework the site had to work around | Fix it in the kit. |
   | A new block or pattern | Promote it only if it meets the rules below. |
   | Site-specific | Leave it in the site. |

3. A block or pattern joins the kit only when **all** of these hold:
   - Two sites have needed it, or it's clearly generic and the kit maintainer agrees.
     Default to waiting for the second site.
   - A different design could use it with config alone: no client copy,
     no page-named variants.
   - It uses the framework (grounds, entrance, padding, Site Settings) and
     has tests.
4. For every fix or promotion, open a follow-up branch against the kit
   repo, never patch the kit from inside a site's checkout.
5. Bump the kit's own version and changelog per the fix (see `CLAUDE.md`).
6. Clear the site's `kit-log.md` entries that were acted on; leave
   site-specific ones as a record.
