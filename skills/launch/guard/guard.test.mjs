// node --test "skills/launch/guard/*.test.mjs" — what the launch guard lets through, asks for, and never runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.LAUNCH_GUARD_DIR = mkdtempSync(join(tmpdir(), "launch-guard-"));
const { verdict, decide } = await import("./guard.mjs");
const level = (c) => verdict(c).level;
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

test("the launch list's checks run without asking", () => {
  for (const c of [
    "lando wp user list --field=user_login",
    "wp option get blog_public",
    "terminus wp acme.live -- plugin list --status=active --field=name",
    "wp --ssh=u1@host:65002/home/u1/public_html config get WP_DEBUG",
    "ssh -p 65002 u1@host 'cd domains/x/public_html && wp option get siteurl'",
    "curl -sI https://example.com",
    "curl -s -X POST -d '<methodCall><methodName>system.listMethods</methodName></methodCall>' https://example.com/xmlrpc.php",
    `lando wp db query "SELECT ID FROM wp_posts WHERE post_content REGEXP 'lorem'"`,
    "grep -rn console.log resources/ | head",
    "node .claude/skills/launch/report/report.mjs docs/launch-report.md --pdf",
  ]) assert.equal(level(c), "allow", c);
});

test("anything that writes needs the user's approval", () => {
  for (const c of [
    "lando wp option update blog_public 1",
    "wp user delete 3 --reassign=1",
    "terminus wp acme.live -- plugin install safe-svg --activate",
    "wp --ssh=u1@host/path search-replace old new",
    "ssh u1@host 'cd public_html && wp plugin delete query-monitor'",
    "ssh u1@host",
    "ssh u1@host 'cat wp-config.php > /tmp/x; mv a b'",
    "terminus backup:create acme.live --element=db",
    "lando wp db export ~/b.sql",
    `wp db query "UPDATE wp_options SET option_value=1"`,
    `wp db query "SELECT 1; DELETE FROM wp_users"`,
    "rm debug.log",
    "sed -i '/console.log/d' resources/js/app.js",
    "curl -X DELETE https://example.com/wp-json/wp/v2/posts/1",
    "bash -c 'wp option update x 1'",
    "echo $(wp option update x 1)",
    `python3 -c "import subprocess; subprocess.run(['wp','user','delete','1'])"`,
    "git push origin refactor",
    "scp x u1@host:public_html/",
  ]) assert.equal(level(c), "approve", c);
});

test("catastrophic commands are blocked even if approved", () => {
  for (const c of [
    "ssh u1@host 'rm -rf domains/'",
    "rm -rf public_html",
    "wp db reset --yes",
    "lando wp site empty --yes",
    "terminus env:wipe acme.live",
    "terminus env:clone-content acme.dev live",
    `wp db query "DROP TABLE wp_users"`,
  ]) assert.equal(level(c), "never", c);
});

test("the agent can't approve itself", () => {
  assert.match(decide(bash("node .claude/skills/launch/guard/approve.mjs")).hookSpecificOutput.permissionDecisionReason, /Only the user/);
  assert.match(decide(bash("echo '[]' > ~/.launch-guard/approved.json")).hookSpecificOutput.permissionDecisionReason, /Only the user/);
  assert.ok(decide({ tool_name: "Write", tool_input: { file_path: "/home/u/.launch-guard/approved.json" } }));
  assert.equal(decide({ tool_name: "Write", tool_input: { file_path: "docs/launch-report.md" } }), null);
});

test("an approved command runs once, exactly as approved", () => {
  const dir = mkdtempSync(join(tmpdir(), "launch-pending-"));
  const cmd = "lando wp option update blog_public 1";
  assert.equal(decide(bash(cmd)).hookSpecificOutput.permissionDecision, "deny");
  const approve = fileURLToPath(new URL("./approve.mjs", import.meta.url));
  spawnSync("sh", ["-c", `printf '%s\\n%s\\n' "${cmd}" "rm -rf /" > .launch-pending.txt`], { cwd: dir });
  const r = spawnSync(process.execPath, [approve], { cwd: dir, env: process.env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1\. \[APPROVED\]/); assert.match(r.stdout, /2\. \[BLOCKED/);
  assert.equal(decide(bash(cmd + " --quiet"))?.hookSpecificOutput.permissionDecision, "deny", "a different command is not covered");
  assert.equal(decide(bash(cmd)), null, "the approved command runs");
  assert.equal(decide(bash(cmd)).hookSpecificOutput.permissionDecision, "deny", "and only once");
});

test("the hook process blocks when its input can't be read", () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./guard.mjs", import.meta.url))], { input: "not json", encoding: "utf8" });
  assert.equal(r.status, 2);
});
