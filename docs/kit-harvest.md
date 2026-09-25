# Kit harvest

How a finished site improves the kit. Run it **once, after the site ships**,
from this repo, never mid-build and never from inside the project.

## Steps

1. Open the site's `wp-content/themes/<theme>/docs/kit-log.md` (older sites: `_docs/kit-log.md`) and read every
   entry. The project is read-only: don't edit, build or commit there.
2. Sort each entry into one action:

   | Entry | Action |
   | --- | --- |
   | A kit bug or a wrong instruction | Fix it in the kit. |
   | A lesson or gotcha | Add it to the skill it belongs to, as one short rule. |
   | Something the kit lacked that the site had to work around | Fix it in the kit. |
   | A new block or component | Wait: it joins the kit only when **two sites** needed it, it works for another design with no client copy, and it follows the kit's rules. |
   | Site-specific | Leave it in the site. |

3. Write the proposal as a short list (entry → action → file in the kit) and
   let Luis approve **item by item**. Nothing changes before that.
4. Each approved item is its own small commit on `refactor`, with its
   `CHANGELOG.md` entry, and must not break an existing site that copies the
   updated kit.
5. Clear the site's log entries that were acted on; keep the site-specific
   ones as a record.
