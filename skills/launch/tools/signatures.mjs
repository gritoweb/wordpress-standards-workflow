// Loads signatures.json (detection data with source and date) and fails loudly if a list is missing or malformed.
import { readFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(new URL("./signatures.json", import.meta.url), "utf8"));
const REQUIRED = { consent_vendors: "patterns", captcha_vendors: "patterns", honeypot_fields: "patterns", placeholder_image_hosts: "patterns", lorem: "patterns", analytics: "patterns", exposed_paths: "paths", security_headers: "names", cache_headers: "names", cdn_hints: "patterns" };
for (const [key, field] of Object.entries(REQUIRED)) {
  const entry = raw[key];
  if (!entry?.source || !entry?.updated || !Array.isArray(entry[field]) || !entry[field].length) throw new Error(`signatures.json: "${key}" needs source, updated and a non-empty ${field} list`);
}

const any = (patterns) => new RegExp(patterns.join("|"), "i");
export const SIG = {
  consent: any(raw.consent_vendors.patterns),
  captcha: any(raw.captcha_vendors.patterns),
  honeypot: any(raw.honeypot_fields.patterns),
  placeholder: any(raw.placeholder_image_hosts.patterns),
  lorem: any(raw.lorem.patterns),
  analytics: any(raw.analytics.patterns),
  cdn: any(raw.cdn_hints.patterns),
  exposedPaths: raw.exposed_paths.paths,
  wordpressFiles: raw.exposed_paths.wordpress_files ?? [],
  securityHeaders: raw.security_headers.names,
  cacheHeaders: raw.cache_headers.names,
};
