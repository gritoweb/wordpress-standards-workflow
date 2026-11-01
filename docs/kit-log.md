# Kit log

What this project had to work around, fix, or build beyond what the kit
shipped. One line per entry, in this format:

``- YYYY-MM-DD [tag] What happened. `path/from/theme/root` ``

Use exactly one tag per entry:

| Tag | Use it for |
| --- | --- |
| `kit-bug` | A kit bug or a wrong instruction. |
| `lesson` | A gotcha that belongs in a skill or doc. |
| `framework-gap` | Something the kit lacked and the site worked around. |
| `pattern-candidate` | A new block or pattern that might belong in the kit. |
| `site-specific` | Something that belongs to this site only. |

Log it and move on: don't fix the kit from inside a project. After the site
ships, the `kit-harvest` skill in the kit repo reads this log and proposes
what goes back into the kit.
