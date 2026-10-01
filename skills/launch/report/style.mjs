// The visual language of the launch report: tokens first, then components (vendored from Luis's report tool).

export const PAGE_CSS = `
:root {
  --font: 15px/1.6 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: 13px/1.55 ui-monospace, "Cascadia Code", "SF Mono", Consolas, monospace;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px; --s7: 48px;
  --r1: 6px; --r2: 10px; --r3: 14px; --pill: 999px;
  --bg: #f7f7f5; --surface: #ffffff; --sunken: #f1f1ee; --line: #e4e4df; --line-strong: #d3d3cc;
  --text: #1f1f1c; --muted: #6b6b64; --faint: #9a9a92;
  --accent: #c2410c; --accent-soft: #fdf1ea; --ok: #15803d; --ok-soft: #ecf7ef; --warn: #b45309; --warn-soft: #fdf5e7; --bad: #b91c1c; --bad-soft: #fcefef;
  --shadow: 0 1px 2px rgb(0 0 0 / .05), 0 1px 1px rgb(0 0 0 / .03);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #161614; --surface: #1f1f1c; --sunken: #262623; --line: #32322e; --line-strong: #44443f;
    --text: #ecece7; --muted: #a3a39b; --faint: #75756e;
    --accent: #fb8a4f; --accent-soft: #3a261b; --ok: #4ade80; --ok-soft: #1c2e22; --warn: #fbbf24; --warn-soft: #33291a; --bad: #f87171; --bad-soft: #3a1f1f;
    --shadow: none; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #161614; --surface: #1f1f1c; --sunken: #262623; --line: #32322e; --line-strong: #44443f;
  --text: #ecece7; --muted: #a3a39b; --faint: #75756e;
  --accent: #fb8a4f; --accent-soft: #3a261b; --ok: #4ade80; --ok-soft: #1c2e22; --warn: #fbbf24; --warn-soft: #33291a; --bad: #f87171; --bad-soft: #3a1f1f;
  --shadow: none; color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: var(--font); -webkit-font-smoothing: antialiased; }
.page { max-width: 880px; margin: 0 auto; padding-block: var(--s7); padding-inline: var(--s4); }
header.masthead { margin-bottom: var(--s6); }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
h1.title { margin: var(--s2) 0 var(--s3); font-size: clamp(26px, 4vw, 34px); line-height: 1.2; letter-spacing: -.02em; }
.lede { margin: 0; color: var(--muted); font-size: 17px; }
.meta { display: flex; flex-wrap: wrap; gap: var(--s2); margin-top: var(--s4); }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: var(--pill); background: var(--surface); color: var(--muted); font-size: 12.5px; white-space: nowrap; }
.pill b { color: var(--text); font-weight: 600; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dot, var(--faint)); flex: none; }

.tabs { display: flex; gap: var(--s1); border-bottom: 1px solid var(--line); margin-bottom: var(--s5); }
/* Tabs without JavaScript: two radio inputs placed before the tab bar and the panels they switch. */
.tab-state { position: absolute; opacity: 0; pointer-events: none; }
.tabs label { padding: var(--s2) var(--s4); border-bottom: 2px solid transparent; color: var(--muted); font-weight: 600; cursor: pointer; margin-bottom: -1px; }
.tabs label:hover { color: var(--text); }
.tabs .count { color: var(--faint); font-weight: 500; margin-left: 4px; }
.panel { display: none; }
#tab-debate:checked ~ .tabs label[for="tab-debate"], #tab-summary:checked ~ .tabs label[for="tab-summary"] { color: var(--text); border-color: var(--accent); }
#tab-debate:focus-visible ~ .tabs label[for="tab-debate"], #tab-summary:focus-visible ~ .tabs label[for="tab-summary"] { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r1); }
#tab-debate:checked ~ #panel-debate, #tab-summary:checked ~ #panel-summary { display: block; }

.round { margin: var(--s6) 0 var(--s3); display: flex; align-items: center; gap: var(--s3); color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.round::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r3); box-shadow: var(--shadow); padding: var(--s4) var(--s5); margin-bottom: var(--s3); border-left: 3px solid var(--dot, var(--line-strong)); }
.card-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s2) var(--s3); margin-bottom: var(--s2); }
.card-head .who { font-weight: 700; }
.card-head .model { color: var(--muted); font-size: 13px; }
.card-head time { margin-left: auto; color: var(--faint); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.card > h3 { margin: 0 0 var(--s2); font-size: 17px; }
.card .text h2, .card .text h3, .card .text h4, .card .text h5 { font-size: 15px; margin: var(--s4) 0 var(--s2); }
.reply-to { color: var(--muted); font-size: 12.5px; margin-bottom: var(--s2); }
.reply-to a { color: var(--accent); text-decoration: none; }
.reply-to a:hover { text-decoration: underline; }
.note { display: flex; gap: var(--s3); align-items: baseline; padding: var(--s2) var(--s3); color: var(--muted); font-size: 13.5px; border-radius: var(--r1); }
.note b { color: var(--text); font-weight: 600; white-space: nowrap; }
.note .type { font-size: 11px; font-weight: 700; letter-spacing: .04em; padding: 1px 6px; border-radius: var(--pill); background: var(--sunken); color: var(--muted); }
.empty { padding: var(--s6); text-align: center; color: var(--muted); border: 1px dashed var(--line-strong); border-radius: var(--r3); }

.summary-block { margin-bottom: var(--s6); }
.summary-block > h2 { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 0 0 var(--s3); }
.finding { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r2); padding: var(--s3) var(--s4); margin-bottom: var(--s2); }
.finding b { display: block; margin-bottom: 2px; }
.finding .text p:last-child { margin-bottom: 0; }
.solution { background: var(--ok-soft); border: 1px solid color-mix(in srgb, var(--ok) 25%, transparent); border-radius: var(--r3); padding: var(--s4) var(--s5); }
.open { background: var(--warn-soft); border-radius: var(--r2); padding: var(--s3) var(--s4); }

.text > :first-child { margin-top: 0; }
.text > :last-child { margin-bottom: 0; }
.text p, .text ul, .text ol { margin: 0 0 var(--s3); }
.text ul, .text ol { padding-left: 22px; }
.text li + li { margin-top: 2px; }
.text h2 { font-size: 20px; margin: var(--s6) 0 var(--s3); letter-spacing: -.01em; }
.text h3 { font-size: 17px; margin: var(--s5) 0 var(--s2); }
.text h4, .text h5 { font-size: 15px; margin: var(--s4) 0 var(--s2); }
.text a { color: var(--accent); }
.text code { font: var(--mono); background: var(--sunken); padding: 1px 5px; border-radius: 5px; }
.text pre { position: relative; font: var(--mono); background: var(--sunken); border: 1px solid var(--line); padding: var(--s3) var(--s4); border-radius: var(--r2); overflow-x: auto; margin: 0 0 var(--s3); }
.text pre code { background: none; padding: 0; }
.text blockquote { margin: 0 0 var(--s3); padding: var(--s1) var(--s4); border-left: 3px solid var(--line-strong); color: var(--muted); }
.text figure { margin: 0 0 var(--s3); }
.text figure img { display: block; max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: var(--r2); }
.text hr { border: 0; border-top: 1px solid var(--line); margin: var(--s5) 0; }
.text .table { overflow-x: auto; margin: 0 0 var(--s3); border: 1px solid var(--line); border-radius: var(--r2); }
.text table { border-collapse: collapse; width: 100%; font-size: 14px; }
.text th, .text td { padding: var(--s2) var(--s3); border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
.text th { background: var(--sunken); font-weight: 600; }
.text td:first-child { white-space: nowrap; }
.text tr:last-child td { border-bottom: 0; }
.tag { display: inline-block; padding: 1px 8px; border-radius: var(--pill); font-size: 11.5px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
.tag-ok { background: var(--ok-soft); color: var(--ok); }
.tag-bad { background: var(--bad-soft); color: var(--bad); }
.tag-warn { background: var(--warn-soft); color: var(--warn); }
.tag-none { background: var(--sunken); color: var(--muted); }
.copy { position: absolute; top: var(--s2); right: var(--s2); border: 1px solid var(--line); background: var(--surface); color: var(--muted); font: 12px var(--font); padding: 2px 8px; border-radius: var(--r1); cursor: pointer; }
.copy:hover { color: var(--text); }
footer.foot { margin-top: var(--s7); color: var(--faint); font-size: 12.5px; }
@media print {
  body { background: #fff; }
  .page { padding: 0; max-width: none; }
  .tabs, .copy { display: none !important; }
  .panel { display: block !important; }
  .card, .finding, figure { break-inside: avoid; box-shadow: none; }
  .text figure img { max-height: 9cm; width: auto; }
  .text h2, .text h3, .text h4 { break-after: avoid; }
  .text tr { break-inside: avoid; }
  /* A scroll container prints as a fixed box: let tables flow across pages instead. */
  .text .table { overflow: visible; border: 0; border-radius: 0; }
  .text table { border: 1px solid var(--line); }
  .text thead { display: table-header-group; }
}
`;

// Adds a copy button to every code block; a plain textarea fallback keeps it working on file:// pages.
export const COPY_BUTTONS_JS = `
for (const pre of document.querySelectorAll(".text pre")) {
  const button = document.createElement("button");
  button.className = "copy"; button.type = "button"; button.textContent = "Copy";
  button.addEventListener("click", async () => {
    const text = pre.querySelector("code")?.textContent ?? pre.textContent;
    try { await navigator.clipboard.writeText(text); }
    catch { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
    button.textContent = "Copied"; setTimeout(() => { button.textContent = "Copy"; }, 1500);
  });
  pre.append(button);
}
`;
