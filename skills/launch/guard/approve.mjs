#!/usr/bin/env node
// Run by the USER (`! node .claude/skills/launch/guard/approve.mjs [numbers]`): approves the agent's pending commands for one run each.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { APPROVED_FILE, PENDING_FILE, STORE_DIR, verdict } from "./guard.mjs";

const TTL_MS = 2 * 60 * 60 * 1000;

if (!existsSync(PENDING_FILE)) {
  console.error(`No ${PENDING_FILE} in ${process.cwd()}: nothing to approve.`);
  process.exit(1);
}
const pending = readFileSync(PENDING_FILE, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
const picked = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= pending.length);
const chosen = picked.length ? picked.map((n) => pending[n - 1]) : pending;

let approved = [];
try { approved = JSON.parse(readFileSync(APPROVED_FILE, "utf8")).filter((a) => a.expires > Date.now()); } catch {}

console.log("Pending commands:");
pending.forEach((c, i) => {
  const v = verdict(c);
  const mark = v.level === "never" ? "BLOCKED (never runs: " + v.reason + ")" : chosen.includes(c) ? "APPROVED" : "skipped";
  console.log(`  ${i + 1}. [${mark}] ${c}`);
  if (chosen.includes(c) && v.level !== "never") approved.push({ command: c, expires: Date.now() + TTL_MS });
});

mkdirSync(STORE_DIR, { recursive: true });
writeFileSync(APPROVED_FILE, JSON.stringify(approved, null, 2));
rmSync(PENDING_FILE);
console.log(`\nEach approved command may run once, exactly as written, within 2 hours.`);
