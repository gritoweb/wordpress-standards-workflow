#!/usr/bin/env node
// PreToolUse hook of the launch skill: reads pass, writes need the user's approval, catastrophic commands never run.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STORE_DIR = process.env.LAUNCH_GUARD_DIR ?? join(homedir(), ".launch-guard");
export const APPROVED_FILE = join(STORE_DIR, "approved.json");
export const PENDING_FILE = ".launch-pending.txt";

const NEVER = [
  [/\brm\s+(-\w*[rR]\w*|--recursive)\b/, "recursive rm"],
  [/\bwp\b.*\b(db\s+(reset|drop|clean)|site\s+(empty|delete))\b/, "wp command that wipes the site or database"],
  [/\bterminus\b.*\b(env:wipe|site:delete|env:clone-content|multidev:delete|import:\w+)\b/, "terminus command that wipes or overwrites an environment"],
  [/\b(drop\s+(database|schema|table)|truncate\s+table)\b/i, "SQL that drops or empties data"],
  [/\b(mkfs|shred)\b|\bdd\s+if=|chmod\s+-R\s+0?777/, "destructive system command"],
];

const WP_READ = new Set([
  "option get", "option list", "option pluck", "config get", "config has", "config path",
  "user list", "user get", "user meta get", "user meta list", "role list", "cap list",
  "plugin list", "plugin get", "plugin status", "plugin is-active", "plugin is-installed", "plugin path", "plugin verify-checksums", "plugin search",
  "theme list", "theme get", "theme status", "theme is-active", "theme is-installed", "theme path",
  "core version", "core check-update", "core is-installed", "core verify-checksums",
  "post list", "post get", "post meta get", "post meta list", "post-type list", "post-type get", "taxonomy list", "taxonomy get",
  "comment list", "comment get", "comment count", "term list", "term get",
  "menu list", "menu item list", "menu location list", "rewrite list", "sidebar list", "widget list",
  "db size", "db tables", "db check", "db columns", "db prefix", "cli version", "cli info", "site list",
  "cron event list", "cron schedule list", "transient get", "language core list", "language plugin list", "media image-size", "help",
]);
const READ_SQL = /^\s*(select|show|describe|desc|explain)\b(?![\s\S]*;\s*\S)(?![\s\S]*\binto\s+(out|dump)file\b)/i;
const REMOTE_READ = new Set(["cd", "ls", "pwd", "head", "tail", "grep", "test", "stat", "df", "du", "wc", "whoami", "hostname", "echo", "find"]);
const LANDO_READ = new Set(["list", "info", "logs", "version", "config"]);
const TERMINUS_READ = /^(auth:whoami|site:info|env:info|env:list|site:list|backup:list|upstream:updates:list|domain:list|env:code-log|self:info)$/;
const ALWAYS_APPROVE = new Set(["scp", "rsync", "sftp", "mysql", "mariadb", "mv", "rm", "chmod", "chown", "truncate", "docker", "kill", "pkill", "sudo", "crontab"]);
const INLINE = { python: "-c", python3: "-c", node: "-e", php: "-r", perl: "-e", ruby: "-e" };
const SENSITIVE_WORDS = /\b(ssh|terminus|wp|lando|rm|unlink|rmtree|subprocess|child_process|exec|system|mysql)\b/;

// Splits on ; && || | and newlines outside quotes, and pulls $( ) / backtick bodies out as their own commands.
export function segments(command) {
  const out = [], inner = [];
  let cur = "", quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i], two = command.slice(i, i + 2);
    if (quote) { if (c === quote) quote = null; else if (c === "\\" && quote === '"') cur += command[i++]; cur += c; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (two === "$(") { let depth = 1, j = i + 2; for (; j < command.length && depth; j++) depth += command[j] === "(" ? 1 : command[j] === ")" ? -1 : 0; inner.push(command.slice(i + 2, j - 1)); cur += "SUBST"; i = j - 1; continue; }
    if (c === "`") { const j = command.indexOf("`", i + 1); inner.push(command.slice(i + 1, j < 0 ? undefined : j)); cur += "SUBST"; i = j < 0 ? command.length : j; continue; }
    if (two === "&&" || two === "||") { out.push(cur); cur = ""; i++; continue; }
    if (c === ";" || c === "|" || c === "\n" || c === "&") { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return [...out.map((s) => s.trim()).filter(Boolean), ...inner.flatMap(segments)];
}

export function words(segment) {
  const out = []; let cur = "", quote = null, has = false;
  for (const c of segment) {
    if (quote) { if (c === quote) quote = null; else cur += c; continue; }
    if (c === "'" || c === '"') { quote = c; has = true; continue; }
    if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ""; has = false; continue; }
    cur += c;
  }
  if (cur || has) out.push(cur);
  return out;
}

function wpVerdict(args) {
  const rest = args.filter((a) => !a.startsWith("-"));
  if (!rest.length) return null;
  for (const n of [3, 2, 1]) if (WP_READ.has(rest.slice(0, n).join(" "))) return null;
  if (rest[0] === "db" && rest[1] === "query" && READ_SQL.test(rest[2] ?? "")) return null;
  return `wp ${rest.slice(0, 2).join(" ")} writes or is not on the read list`;
}

// Returns null when the segment only reads, or the reason it needs the user's approval.
function segmentVerdict(segment) {
  let w = words(segment);
  while (w.length && /^\w+=/.test(w[0])) w = w.slice(1);
  const [cmd, ...args] = w;
  if (!cmd) return null;
  const base = cmd.split("/").pop();
  if (base === "wp") return wpVerdict(args);
  if (base === "lando") return args[0] === "wp" ? wpVerdict(args.slice(1)) : LANDO_READ.has(args[0]) ? null : `lando ${args[0] ?? ""} changes the environment`;
  if (base === "terminus") {
    if (args[0] === "wp" || args[0] === "remote:wp") { const i = args.indexOf("--"); return wpVerdict(i >= 0 ? args.slice(i + 1) : []); }
    return TERMINUS_READ.test(args[0] ?? "") ? null : `terminus ${args[0] ?? ""} is not on the read list`;
  }
  if (base === "ssh") {
    const remote = args.filter((a, i) => !a.startsWith("-") && !/^-[pilFoJ]$/.test(args[i - 1] ?? "")).slice(1).join(" ");
    if (!remote) return "interactive ssh session";
    for (const s of segments(remote)) {
      const [rc, ...ra] = words(s);
      if (rc === "wp") { const v = wpVerdict(ra); if (v) return `remote ${v}`; continue; }
      if (rc === "find" && ra.some((a) => a === "-delete" || a === "-exec")) return "remote find that deletes or executes";
      if (!REMOTE_READ.has(rc)) return `remote ${rc} is not on the read list`;
    }
    return null;
  }
  if (ALWAYS_APPROVE.has(base)) return `${base} changes files, databases or processes`;
  if (base === "curl" && args.some((a) => /^(-[A-Za-z]*[XdFT]|--(request|data[\w-]*|form|upload-file|json))/.test(a))) {
    return args.join(" ").includes("system.listMethods") ? null : "curl that sends data or a non-GET request";
  }
  if (base === "find" && args.some((a) => a === "-delete" || a === "-exec" || a === "-execdir")) return "find that deletes or executes";
  if (base === "sed" && args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith("--in-place"))) return "sed -i edits files in place";
  if (base === "git" && ["push", "reset", "clean", "checkout", "restore"].includes(args[0])) return `git ${args[0]} changes the repository`;
  if ((base === "bash" || base === "sh" || base === "zsh") && args[0] === "-c") return verdict(args[1] ?? "").reason;
  if (base === "eval" || base === "xargs") return `${base} runs commands the guard can't see`;
  if (INLINE[base] && args.includes(INLINE[base]) && SENSITIVE_WORDS.test(args.join(" "))) return `inline ${base} code touches the system`;
  return null;
}

export function verdict(command) {
  for (const [re, why] of NEVER) if (re.test(command)) return { level: "never", reason: why };
  for (const s of segments(command)) { const reason = segmentVerdict(s); if (reason) return { level: "approve", reason }; }
  return { level: "allow", reason: "" };
}

const readApproved = () => { try { return JSON.parse(readFileSync(APPROVED_FILE, "utf8")).filter((a) => a.expires > Date.now()); } catch { return []; } };

// One approval = one run of exactly that command.
export function consumeApproval(command) {
  const list = readApproved();
  const i = list.findIndex((a) => a.command === command.trim());
  if (i < 0) return false;
  list.splice(i, 1);
  mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(APPROVED_FILE, JSON.stringify(list, null, 2));
  return true;
}

export function decide(input) {
  const tool = input.tool_name, ti = input.tool_input ?? {};
  const touchesStore = (s) => /launch-guard|approve\.mjs/.test(s ?? "");
  if (tool !== "Bash") return touchesStore(ti.file_path ?? ti.notebook_path) ? deny("Only the user approves commands. Ask them to run the approve command themselves.") : null;
  const command = ti.command ?? "";
  if (touchesStore(command)) return deny("Only the user approves commands. Ask them to type: ! node .claude/skills/launch/guard/approve.mjs");
  const v = verdict(command);
  if (v.level === "allow") return null;
  if (v.level === "never") return deny(`Blocked by the launch guard: ${v.reason}. This never runs from the agent. If it is really needed, the user runs it by hand.`);
  if (consumeApproval(command)) return null;
  return deny(`Needs the user's approval (${v.reason}). Write the exact command as one line in ${PENDING_FILE} (one command per line), show the list to the user, and ask them to type: ! node .claude/skills/launch/guard/approve.mjs. Then run the command exactly as approved.`);
}

const deny = (reason) => ({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } });

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    let input;
    try { input = JSON.parse(raw); } catch { process.stderr.write("launch guard: unreadable hook input, blocking to be safe\n"); process.exit(2); }
    const out = decide(input);
    if (out) process.stdout.write(JSON.stringify(out));
    process.exit(0);
  });
}
