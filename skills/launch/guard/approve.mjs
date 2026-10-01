#!/usr/bin/env node
// Fallback for sessions without the question UI: the USER runs `! node .claude/skills/launch/guard/approve.mjs [numbers]`.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { PENDING_FILE, approveCommands, verdict } from "./guard.mjs";

if (!existsSync(PENDING_FILE)) {
  console.error(`No ${PENDING_FILE} in ${process.cwd()}: nothing to approve.`);
  process.exit(1);
}
const pending = readFileSync(PENDING_FILE, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
const picked = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= pending.length);
const chosen = picked.length ? picked.map((n) => pending[n - 1]) : pending;

console.log("Commands, in the order they will run:");
pending.forEach((c, i) => {
  const v = verdict(c);
  console.log(`  ${i + 1}. [${v.level === "never" ? "BLOCKED (never runs: " + v.reason + ")" : chosen.includes(c) ? "APPROVED" : "skipped"}] ${c}`);
});
approveCommands(chosen);
rmSync(PENDING_FILE);
console.log(`\nEach approved command runs once, exactly as written, in this order, within 2 hours.`);
