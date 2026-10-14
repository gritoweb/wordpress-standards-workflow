# Tech debt

Everything this project left for "later": placeholders, stubs, shortcuts,
fixes promised to the client. One `- [ ]` line per item, with the file it
touches. Mark it `[blocker]` when the site can't launch until it's done (a
placeholder form, a fake endpoint, test content). Tick it when it's done.

The launch skill reads this file (LIVE-8): an open `[blocker]` line, or a
`TODO`/`FIXME` in `app/` or `resources/` without an owner and a date, fails
the launch.

<!-- Example:
- [ ] [blocker] Contact form posts to a placeholder URL; wire it to the form plugin (resources/views/forms/contact.blade.php)
- [ ] Replace the stock hero photo once the client sends theirs (front page)
-->
